/**
 * 用环境 API Key 登录 CloudBase CLI（供 Agent 自动部署用）
 * ============================================================================
 * ⚠️⚠️ 安全前提 —— 用这个脚本之前必须先读这段
 * ----------------------------------------------------------------------------
 * 这个脚本会读取**明文密钥文件**。为避免密钥进入 git 仓库 /对话记录 / 命令历史：
 *
 *   1. 密钥只写进`.cloudbase-key.local.json`，此文件已在 .gitignore 中
 *   2. 脚本**不会打印**密钥内容，只打印是否登录成功
 *   3. 用完可以随时删掉该文件
 *   4. 控制台里也能随时「删除」这个 Key，删了脚本立刻失效
 *
 * ⚠️ 不要把密钥直接粘进聊天窗口或命令行参数 ——
 *    命令行参数会被系统记进 shell 历史，粘进聊天则会被记录留存。
 *    写进本地文件是唯一相对安全的做法。
 * ============================================================================
 *
 * 用法：
 *   1. 控制台「环境管理 → API Key 配置 → 服务端 API Key → 创建 API Key」
 *   2. 把复制到的 Key 写进本项目 `.cloudbase-key.local.json`（格式见下方 SKILL_FILE_HINT）
 *   3. node tools/login-with-key.js
 *   4. 验证：node tools/env-ownership.js
 *
 * 登录成功后，本次会话内就能自动部署云函数：
 *   node tools/deploy-fn.js aiService
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const KEY_FILE = path.join(ROOT, '.cloudbase-key.local.json');
const TCB = process.env.TCB_JS ||
  'C:/Users/Honor/.workbuddy/binaries/node/workspace/node_modules/@cloudbase/cli/bin/tcb';
// 🔴 路径不能再写死版本号（工具升级后目录名会变，见 tools/toolchain-path.js 注释）
const { resolveNode } = require('./toolchain-path.js');
const NODE = resolveNode().path;

/** ❌ 用的是「服务端 API Key」，不是「客户端 Publishable Key」 */
const SKILL_FILE_HINT =
  '{\n' +
  '  "apiKey": "这里填服务端 API Key（形如 AKID...）",\n' +
  '  "envId": "cloudbase-d5gioeybt3ae71f68"\n' +
  '}';

function fail(msg, hint) {
  console.error('✗ ' + msg);
  if (hint) console.error('\n' + hint);
  process.exit(1);
}

if (!fs.existsSync(KEY_FILE)) {
  fail(
    '没找到密钥文件：' + KEY_FILE,
    '请先创建它，格式如下（用记事本新建即可）：\n\n' +
      SKILL_FILE_HINT +
      '\n\n⚠️ 不要把 Key 直接粘到聊天窗口或命令行里。'
  );
}

let conf;
try {
  conf = JSON.parse(fs.readFileSync(KEY_FILE, 'utf8'));
} catch (e) {
  fail('密钥文件不是合法 JSON：' + e.message);
}

const apiKey = String(conf.apiKey || '').trim();
const envId = String(conf.envId || 'cloudbase-d5gioeybt3ae71f68').trim();

if (!apiKey) {
  fail(
    '密钥文件里没有 apiKey 字段',
    '文件内容应类似：\n' + SKILL_FILE_HINT
  );
}

// 🔴 必须用「服务端 API Key」。客户端 Publishable Key 只能给前端用，
//    拿它调CLI 会 401/权限错误。这是控制台页面上最容易选错的一个。
if (/^pk_/i.test(apiKey) || /publishable/i.test(conf.type || '')) {
  fail(
    '这看起来是「客户端 Publishable Key」，CLI 用不了。',
    '请回到控制台「环境管理 → API Key 配置」，\n' +
      '找到第二块「**服务端 API Key**」→ 点「创建 API Key」→ 用那个。\n' +
      '第一块「客户端 Publishable Key」只能给小程序前端调用。'
  );
}

console.log('· 密钥长度 ' + apiKey.length + ' 字符（前缀 ' + apiKey.slice(0, 6) + '…）');
console.log('· 目标环境 ' + envId);
console.log('· 正在通过服务端 API Key 登录…');

try {
  const out = execFileSync(
    NODE,
    [TCB, 'login', '--cloudbase-api-key', apiKey, '-e', envId],
    { encoding: 'utf8', timeout: 120000, stdio: ['ignore', 'pipe', 'pipe'] }
  );
  console.log((out || '').trim());
} catch (e) {
  const msg = String((e && (e.stdout || '') + (e.stderr || '')) || e.message || '');
  console.error('✗ 登录失败：\n' + msg.slice(0, 600));
  console.error(
    '\n排查方向：\n' +
      '  1. 确认用的是「服务端 API Key」而非「客户端 Publishable Key」\n' +
      '  2. Key 是否已被控制台删除或过期\n' +
      '  3. Key 所属环境是否就是 ' + envId
  );
  process.exit(1);
}

console.log('\n· 验证：拉取环境列表');
try {
  const out = execFileSync(NODE, [TCB, 'env', 'list', '-r', 'ap-shanghai'], {
    encoding: 'utf8',
    timeout: 120000
  });
  const hit = out.indexOf(envId) > -1;
  console.log(hit ? '✓ 已在环境列表中找到 ' + envId + ' —— 可以开始部署了' : '⚠ 登录成功但环境列表里仍没有它');
  console.log('\n下一步：node tools/deploy-fn.js aiService');
} catch (e) {
  console.log('（环境列表查询失败，但登录可能已成功，可直接试部署）');
}

console.log(
  '\n🔒 用完建议删除 .cloudbase-key.local.json，' +
    '或在控制台「API Key 配置」里删除该 Key。'
);