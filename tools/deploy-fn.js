/**
 * 一键部署云函数（需先跑 tools/login-with-key.js 登录）
 * ============================================================================
 * 用法：
 *   node tools/deploy-fn.js                # 部署本轮改过的三个
 *   node tools/deploy-fn.js aiService     # 部署单个
 *   node tools/deploy-fn.js --all         # 部署全部 8 个
 *
 * ⚠️ 每次改完云函数代码都要重新跑，否则线上还是旧版本。
 *    这是本项目最容易出的错：代码改了、测试全绿、线上行为没变。
 *
 * 依赖安装：**强制走「云端安装依赖」**。
 *   云函数要用 wx-server-sdk，本地没装 node_modules；
 *   本地安装会因版本漂移导致线上与本地行为不一致。
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

/*
 *🔴 路径不能再写死版本号 —— 真实事故见 tools/toolchain-path.js 的文件头注释。
 *   一句话版本：曾写死 `22.22.2-3`，工具升级后目录变成 `22.22.2-6`，
 *   于是 execFileSync 启动不存在的 exe 抛 ENOENT，
 *   catch 里拿到空输出 → 判定「读不到环境，通常是凭据不是这个账号的」，
 *   **凭据完全正常，方向却被带偏**。
 *
 * ⚠️ 注意 require 必须在使用之前 —— `const TCB = TCB_JS` 写在 require 前面
 *   会抛 ReferenceError（TDZ），而 `new Function()` 的语法检查**抓不到**
 *   这类错误（它只解析不执行）。所以脚本改完要真跑一次，别只看语法。
 */
const { resolveNode, checkExec, TCB_JS } = require('./toolchain-path.js');
const NODE = resolveNode().path;
const TCB = TCB_JS;

const rc = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'cloudbaserc.json'), 'utf8')
);
const ENV_ID = rc.envId;

/** 本轮改动过的函数（2026-10-06） */
const CHANGED = ['aiService', 'library', 'upload'];
const ALL = (rc.functions || []).map((f) => f.name);

const args = process.argv.slice(2);
let list;
if (args.includes('--all')) list = ALL;
else if (args.length) list = args.filter((a) => !a.startsWith('--'));
else list = CHANGED;

if (!ENV_ID) {
  console.error('✗ cloudbaserc.json 里没有 envId');
  process.exit(1);
}

// 登录状态预检
//
// ⚠️ **不能用 execFileSync 的「抛不抛异常」判断登录状态** ——
//   `tcb env list` 即使登录正常也会往 stderr 写提示行
//   （如「--envId is deprecated」「Try the tcb ai command」），
//   在 execFileSync 里会被当成失败抛错，于是一登录成功就被误判成「未登录」。
//   实测踩过：`fn list` / `fn deploy` 都成功，预检却一直报未登录。
//
//   正确判据：**看输出里有没有目标环境 ID**。
//🔴 先确认两个可执行文件都真的在。
//   少了这步，路径失效会伪装成「未登录」，报错方向完全错。
const badNode = checkExec('node', NODE);
const badTcb = checkExec('tcb CLI', TCB);
if (badNode || badTcb) process.exit(1);

let envOut = '';
try {
  envOut = execFileSync(NODE, [TCB, 'env', 'list', '-r', 'ap-shanghai'], {
    encoding: 'utf8',
    timeout: 120000,
    stdio: ['ignore', 'pipe', 'pipe']
  });
} catch (e) {
  // 抛错了也要先看 stdout —— 可能是 stderr 噪音导致的假失败
  envOut = String((e && e.stdout) || '');
}

if (envOut.indexOf(ENV_ID) === -1) {
  console.error('✗ 命令行读不到环境 ' + ENV_ID);
  console.error('');
  if (!envOut) {
    //🔴 空输出 = 命令压根没跑起来，不是「环境不存在」。
    //   两种原因的现象完全一样，但处理方式相反。
    console.error('  诊断：tcb 命令没有任何输出 —— 这**不是**凭据问题，');
    console.error('        而是命令没启动成功。手动跑一次看真实报错：');
    console.error('        "' + NODE + '" "' + TCB + '" env list -r ap-shanghai');
  } else {
    console.error('  诊断：tcb 有输出但里面没有目标环境 —— 这才是凭据问题。');
    console.error('        重新登录：node tools/login-with-key.js');
  }
  process.exit(1);
}
console.log('✓ 已连上环境 ' + ENV_ID);

/* ------------------------------------------------------------------
 * 依赖完整性预检
 * ------------------------------------------------------------------
 * 🔴 2026-10-06 实测事故：新增公共文件 ai-bridge.js 后，
 *   sync-shared 的文件名单是写死的三个，静默跳过了它。
 *   index.js 已经 require('./ai-bridge.js')，
 *   部署「成功」，但真机跑起来就
 *   `Error: Cannot find module './ai-bridge.js'`。
 *
 *   本地文件明明在、git 也提交了、部署也成功 ——
 *   三个「成功」叠在一起，反而最难查。
 *
 * 所以这里在部署**之前**把 require 链解析一遍，
 * 缺文件直接拦下，不让它跑到真机才炸。
 * ------------------------------------------------------------------ */
function checkRequires(fnName) {
  const dir = path.join(ROOT, 'cloudfunctions', fnName);
  const missing = [];
  const seen = {};

  function walk(file) {
    if (seen[file]) return;
    seen[file] = 1;
    let src;
    try {
      src = fs.readFileSync(file, 'utf8');
    } catch (e) {
      return;
    }
    // 剥注释，避免把注释里提到的路径当成依赖
    const code = src
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/.*$/gm, '$1');
    const re = /require\(\s*['"](\.[^'"]+)['"]\s*\)/g;
    let m;
    while ((m = re.exec(code))) {
      const spec = m[1];
      const base = path.resolve(path.dirname(file), spec);
      const cands = [base, base + '.js', path.join(base, 'index.js')];
      const hit = cands.find((c) => fs.existsSync(c) && fs.statSync(c).isFile());
      if (!hit) {
        missing.push(
          path.relative(ROOT, file) + ' → ' + spec +
          (fs.existsSync(base) ? '（目录里没有 index.js）' : '')
        );
      } else if (hit.endsWith('.js')) {
        walk(hit);
      }
    }
  }

  walk(path.join(dir, 'index.js'));
  return missing;
}

console.log('待部署：' + list.join('、'));
console.log('');

/* ---- 预检：所有云函数的 require 链必须完整 ---- */
let depBroken = false;
for (const fn of list) {
  const missing = checkRequires(fn);
  if (missing.length) {
    depBroken = true;
    console.error('✗ ' + fn + ' 缺少依赖文件：');
    missing.forEach((m) => console.error('    ' + m));
    console.error('  通常是改了 cloud-shared/ 却忘了同步。先跑：');
    console.error('    node cloudfunctions/sync-shared.js');
  }
}
if (depBroken) {
  console.error('\n已中止部署 —— 缺文件部署上去，真机也跑不起来。');
  process.exit(1);
}
console.log('✓ 依赖完整性检查通过');
console.log('');

/**
 * 同步跑一条 tcb 命令。
 *
 * 🔴 为什么需要重试 EBUSY：
 *   Windows 上**连续快速 spawn 同一个 node.exe 会报 `EBUSY`**
 *  （上一个进程的文件句柄还没释放，镜像加载被占用）。
 *   实测：预检刚跑完就立刻部署，3 个函数全部 `spawnSync ... EBUSY`失败；
 *   而单独再跑一次同样的命令就成功 —— 说明代码没问题，是并发时机问题。
 *   所以这里对 EBUSY 做退避重试，而不是让用户手动重跑。
 */
function runTcb(args, timeout) {
  const delays = [0, 800, 2000, 4500];
  let last = '';
  for (let i = 0; i < delays.length; i++) {
    if (delays[i]) execFileSync(process.execPath, ['-e', 'setTimeout(()=>{},' + delays[i] + ')']);
    try {
      return execFileSync(NODE, [TCB].concat(args), {
        encoding: 'utf8',
        timeout: timeout || 300000,
        cwd: ROOT,
        stdio: ['ignore', 'pipe', 'pipe']
      });
    } catch (e) {
      last = String((e && (e.stdout || '') + (e.stderr || '')) || e.message || '');
      if (last.indexOf('EBUSY') > -1) continue; // 重试
      throw e;
    }
  }
  throw new Error(last);
}

let failed = [];
list.forEach((name, i) => {
  // 逐个检查源文件是否存在，避免传了一半才报错
  const idx = path.join(ROOT, 'cloudfunctions', name, 'index.js');
  if (!fs.existsSync(idx)) {
    console.log('[' + (i + 1) + '/' + list.length + '] ' + name + ' ✗ 源文件不存在，跳过');
    failed.push(name + '(源文件缺失)');
    return;
  }
  const pkg = path.join(ROOT, 'cloudfunctions', name, 'package.json');
  if (!fs.existsSync(pkg)) {
    console.log('[' + (i + 1) + '/' + list.length + '] ' + name + ' ✗ 缺 package.json，云端装依赖会失败');
    failed.push(name + '(缺 package.json)');
    return;
  }

  console.log('[' + (i + 1) + '/' + list.length + '] ' + name + ' 上传中…');
  try {
    const out = runTcb([
      'fn', 'deploy', name,
      '--envId', ENV_ID,
      '--force',                    // ⚠️ 不加会因同名函数已存在而静默跳过，
      //                                表现为「部署成功但线上代码没变」
      '--install-dependency', 'true' // ⚠️ 选项名不是 --remoteInstall
      //     （那个会报 unknown option 直接失败）
    ]);
    const tail = (out || '').trim().split('\n').slice(-3).join('\n');
    console.log('    ✓ ' + name + ' 部署成功');
    if (tail) console.log('    ' + tail.split('\n').join('\n    '));
  } catch (e) {
    const msg = String((e && (e.stdout || '') + (e.stderr || '')) || e.message || '');
    console.log('    ✗ ' + name + ' 部署失败');
    console.log('    ' + msg.trim().split('\n').slice(0, 6).join('\n    '));
    failed.push(name);
  }
});

console.log('');
if (failed.length) {
  console.log('✗ 失败 ' + failed.length + ' 个：' + failed.join('、'));
  console.log('  若是超时，云函数超过 60s 属正常，命令行可能已断但服务端仍在上传；');
  console.log('  去控制台「云函数」看该函数的「最后更新时间」确认。');
  process.exit(1);
}
console.log('✓ 全部 ' + list.length + ' 个云函数已部署');
console.log('');
console.log('下一步：小程序里跑「我的 → 云函数自检」，');
console.log('特别是「图片识别模型自检」，看哪个模型读出了探针图里的数字。');