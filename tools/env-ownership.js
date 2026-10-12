/**
 * env-ownership.js —— 诊断「小程序能不能访问当前配置的环境」
 * ============================================================================
 * 为什么要这个脚本（2026-10-06 实测踩出来的）：
 *
 *   小程序报 -601034「没有权限，请先开通云开发或者云托管」，
 *   而云端一切正常（fn list 全绿、fn invoke 能跑、数据库有56 本书）。
 *
 *   根因是**两套账号体系**：
 *     · 微信云开发控制台（本地客户端）——看得到 cloud1 这类小程序环境
 *     · 腾讯云 CloudBase 网页控制台——看得到 memorize-doc 这类腾讯云环境
 *     而代码配的 ENV_ID 必须在**小程序名下**，否则小程序调不通。
 *
 * 关键陷阱（本脚本存在的理由）：
 *   **`tcb env list` 只按腾讯云账号列环境。**
 *   memorize-doc 不在这个列表里，**但不代表它不存在或不能用**——
 *   实测 CLI照样能给它部署和调用。
 *   所以不能用「env list 里有没有」来判断环境可用性。
 *
 * 用法：
 *   node tools/env-ownership.js
 *
 * 输出会明确区分：
 *   ✗CLI 账号下没有 → 需要在微信云开发控制台确认关联（详见 DUAL_ACCOUNT.md）
 *   ✓ CLI 账号下有   → 仍要以「真机调通」为最终验收
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const { ENV_ID, REGION } = require(path.join(ROOT, 'miniprogram/utils/env.js'));

const TCB = process.env.TCB_JS ||
  'C:/Users/Honor/.workbuddy/binaries/node/workspace/node_modules/@cloudbase/cli/bin/tcb';
// 🔴 路径不能再写死版本号（工具升级后目录名会变，见 tools/toolchain-path.js 注释）
const { resolveNode } = require('./toolchain-path.js');
const NODE = resolveNode().path;

function tcb(args, timeout = 120000) {
  try {
    return execFileSync(NODE, [TCB].concat(args), {
      encoding: 'utf8',
      timeout,
      // ⚠️ stdio 必须显式设 pipe，否则 execFileSync 默认返回 stdout 但
      // 在 Windows 上会因编码/句柄问题抛异常→ 被catch 成空字符串，
      // 表现为「命令其实跑通了，脚本却说连不上」（踩过）。
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
      env: Object.assign({}, process.env, {
        // CLI 会被代理变量干扰（踩过 os error 11001）
        HTTP_PROXY: '', HTTPS_PROXY: '', http_proxy: '', https_proxy: '',
        NO_PROXY: '*', no_proxy: '*'
      })
    });
  } catch (e) {
    // 拿不到 stdout 不代表命令失败 —— CLI 报错信息在 stderr，
    // 但 fn list 成功时 stdout 一定有表格。返回空串让调用方按特征判断。
    if (e && e.stdout) return e.stdout.toString();
    return '';
  }
}

const strip = (s) => s.replace(/\x1b\[[0-9;]*m/g, '');
const line = (s) => console.log(s);
const ok = (s) => line('  \x1b[32m' + s + '\x1b[0m');
const bad = (s) => line('  \x1b[31m' + s + '\x1b[0m');
const warn = (s) => line('  \x1b[33m' + s + '\x1b[0m');

line('');
line('========================================');
line(' 环境归属诊断（小程序能不能访问？）');
line('========================================');
line('代码配置的环境：' + ENV_ID);
line('地域：' + REGION);
line('');

// --- 1. 云函数是否真的在这个环境里 ---
line('[1/3] 云函数部署情况');
const fnOut = strip(tcb(['fn', 'list', '-e', ENV_ID]));
// 判据用**结构特征**（有没有 Nodejs 运行时行），不要用关键词正则。
// 环境不存在时 CLI 也会输出表头，只是不含函数行。
const rows = fnOut.split('\n').filter((l) => /Nodejs\d/.test(l));
const done = rows.filter((l) => /Deployment completed/.test(l)).length;
if (!rows.length) {
  bad('这个环境里查不到云函数 —— 检查网络/代理，或环境 ID 是否写错');
} else {
  line('  发现 ' + rows.length + ' 个云函数，其中 ' + done + ' 个部署完成');
  if (done) ok('云端侧正常（但这不能证明小程序有权限）');
}
line('');

// --- 2. CLI 账号名下有哪些环境 ---
line('[2/3] 当前 CLI 登录账号名下的环境');
const authPath = 'C:/Users/Honor/.config/.cloudbase/auth.json';
let uin = '(未知)';
let credEnv = '(无)';
try {
  const a = JSON.parse(fs.readFileSync(authPath, 'utf8'));
  uin = (a.credential && a.credential.uin) || uin;
  credEnv = (a.credential && a.credential.envId) || credEnv;
} catch (e) {
  warn('读不到凭据文件：' + authPath);
}
line('  CLI 登录 UIN：' + uin);
line('  凭据里的 envId：' + credEnv);

const envOut = strip(tcb(['env', 'list']));
const inList = new RegExp(ENV_ID.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(envOut);
if (inList) {
  ok('CLI 账号下能看到 ' + ENV_ID);
} else {
  warn('CLI 账号下看不到 ' + ENV_ID);
  line('');
  line('  ⚠ 这**不代表环境不存在或不能用** —— 实测 CLI 照样能给它部署和调用。');
  line('     它只是挂靠的授权链路与 env list 的展示维度不同。');
  line('');
  line('  但它**确实说明小程序侧很可能没有授权**，因为小程序只能访问自己名下的环境。');
}
line('');

// --- 2.5 官方 FAQ 里的关键操作入口（2026-10-06 查证，写进来省得再去别处找）---
line('[2.5/3] 为什么在控制台里搜不到这个环境（官方 FAQ）');
line('  https://cloud.tencent.com/document/faq/876/57380');
line('');
line('  官方原文：');
line('    「开发者工具中的云开发控制台，是使用**小程序绑定的腾讯云账号**登录的。');
line('      请先确认云侧账号与小程序绑定的账号是否一致。若一致，可在');
line('      设置 > 环境设置 > 展开环境列表 > 管理我的环境 > 使用已有腾讯云环境 导入。」');
line('');
line('  → 按这个顺序自查：');
line('     ① 腾讯云账号中心 → 登录方式 → 微信公众平台，看关联的 AppID 是不是你的');
line('     ② 若对不上 → 该页「绑定」用管理员微信扫码，把小程序绑到这个腾讯云账号');
line('        （前提：该账号没绑过其他小程序；必须在主账号下做）');
line('     ③ 若对得上 → 走上面那句「使用已有腾讯云环境」导入，别在');
line('        「开通腾讯云环境」弹窗里搜（那是套餐购买流程，搜不到是正常的）');
line('');
line('  ⚠ 别被「环境共享」绕进去：那是给同主体下多个小程序/公众号共用的，');
line('     你是「一个小程序 + 一个腾讯云环境」，用不上它。');
line('');

// --- 3. 结论 + 下一步 ---
line('[3/3] 结论');
line('');
line('  云端侧全部正常，但如果真机报以下任一错误，就是授权问题：');
bad('    errCode: -601034没有权限，请先开通云开发或者云托管');
bad('    errCode: -501001 invalid wx openapi access_token');
line('');
line('  → 两种解法：');
line('     A 保留现有数据：导入 memorize-doc（需先打通账号，见[2.5/3]）');
line('     B 彻底绕开绑定：在开发者工具里新建环境（自动关联），');
line('       再重跑导入和部署脚本 —— 注意必须选**文档型**数据库，不是 PostgreSQL');
line('  → 详见 DUAL_ACCOUNT.md');
line('  → 不要去开通「云托管」，报错文案里带它只是腾讯云的通用措辞');
line('');
line('  ⭐  唯一验收标准：**真机 →「我的 → 云函数自检」点一次**');
line('     本脚本全绿也证明不了小程序能用（这正是这次的盲区）。');
line('');