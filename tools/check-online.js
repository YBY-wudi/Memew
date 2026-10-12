/**
 * 查线上数据库（绕开 fn invoke 的鉴权限制）。
 *
 * 🔴 为什么需要这个（2026-10-06 实测）：
 *   环境 API Key 能部署云函数，但**调不动云函数**：
 *     `tcb fn invoke` → `[Invoke] Cam authentication failed`
 *   而 `db nosql execute` 这条链路是通的 →
 *   所以「线上数据对不对」「云函数更新了没」这类验证，
 *   只能靠直查数据库 + 看控制台更新时间，**不能靠命令行调函数**。
 *
 * 用法：
 *   node tools/check-online.js            # 各集合条数 + 最近一本书
 *   node tools/check-online.js books 数学 # 查某集合/按学科过滤
 */
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const TCB = process.env.TCB_JS ||
  'C:/Users/Honor/.workbuddy/binaries/node/workspace/node_modules/@cloudbase/cli/bin/tcb';
// 🔴 路径不能再写死版本号（工具升级后目录名会变，见 tools/toolchain-path.js 注释）
const { resolveNode } = require('./toolchain-path.js');
const NODE = resolveNode().path;
const ENV_ID = JSON.parse(
  require('fs').readFileSync(path.join(ROOT, 'cloudbaserc.json'), 'utf8')
).envId;

function nosql(tableName, commandType, command) {
  const cmd = JSON.stringify([
    { TableName: tableName, CommandType: commandType, Command: JSON.stringify(command) }
  ]);
  const out = execFileSync(
    NODE,
    [TCB, 'db', 'nosql', 'execute', '--envId', ENV_ID, '--command', cmd],
    { encoding: 'utf8', timeout: 150000, cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] }
  );
  return out;
}

/**
 * count 结果解析。
 *
 * ⚠️踩过的坑：输出里的数值是 **BSON 扩展类型**，随大小/实现不同会变成
 *   `$numberInt` / `$numberLong` / `$numberDouble`，套法不一致：
 *     "n": { "$numberInt": "58" }        ← 实际是这种
 *     "n": { "$numberLong": "7638..." }   ← 一开始按这个写的，正则没匹配上，
 *                                         于是 11 个集合全被误报「可能不存在」
 *   所以三种都要认，且外层大括号可有可无。
 */
function parseCount(out) {
  const m =
    out.match(/"n"\s*:\s*\{?\s*"\$?number(?:Int|Long|Double)"?\s*:\s*"?([\d.]+)"?/) ||
    out.match(/"n"\s*:\s*(\d+)/);
  if (!m) return null;
  return Math.floor(Number(m[1]));
}

const COLLECTIONS = [
  'books', 'cards', 'users', 'quota', 'loginLog',
  'reviewLog', 'medals', 'wrongBook', 'shareLink', 'settings', 'tasks'
];

console.log('环境 ' + ENV_ID);
console.log('');

let ok = 0;
let fail = 0;
COLLECTIONS.forEach((c) => {
  try {
    const out = nosql(c, 'COMMAND', { count: c });
    const n = parseCount(out);
    if (n === null) {
      console.log('  ?  ' + c.padEnd(12) + '（集合可能不存在）');
    } else {
      console.log('  ✓  ' + c.padEnd(12) + n + ' 条');
      ok++;
    }
  } catch (e) {
    const msg = String((e && (e.stdout || '') + (e.stderr || '')) || e.message || '');
    const short = /not.*exist|does not exist|不存在/i.test(msg) ? '集合不存在' : msg.trim().split('\n')[0].slice(0, 60);
    console.log('  ✗  ' + c.padEnd(12) + short);
    fail++;
  }
});

console.log('');
console.log('可访问 ' + ok + ' 个，失败 ' + fail + ' 个');

// 用户带了参数就查指定集合的样本
const argC = process.argv[2];
if (argC) {
  console.log('');
  console.log('=== ' + argC + ' 样本 ===');
  try {
    const filter = process.argv[3] ? { subject: process.argv[3] } : {};
    const out = nosql(argC, 'QUERY', { find: argC, filter, limit: 3 });
    console.log(out.split('\n').slice(1, 40).join('\n'));
  } catch (e) {
    console.log('查询失败: ' + String(e.message).slice(0, 120));
  }
}