/**
 * bootstrap-db.js —— 用官方 CLI 建集合 + 导教材（不依赖 wx-server-sdk）
 * ------------------------------------------------------------
 * 为什么不用 database/init-cloud.js？
 *   那个脚本 require('wx-server-sdk')，本地没装就跑不了。
 *   改成用官方 CLI 的 `db nosql execute` 命令，纯 HTTP 调用，本地零依赖。
 *
 * 踩过的坑：
 *   - 必须清掉代理变量（HTTP_PROXY等），否则报 os error 11001/10051
 *   - CLI 必须在项目目录下运行，否则读不到 cloudbaserc.json
 *   - 集合要先建才能插入
 *
 * 用法：
 *   node database/bootstrap-db.js
 *   ENV_ID=xxx REGION=ap-shanghai node database/bootstrap-db.js
 */

const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..');
const ENV_ID = process.env.ENV_ID || 'cloudbase-d5gioeybt3ae71f68';
const REGION = process.env.REGION || 'ap-shanghai';

const NODE_BIN =
  process.env.NODE_BIN ||
  'C:/Users/Honor/.workbuddy/binaries/node/versions/22.22.2-3/node.exe';
const TCB_JS =
  process.env.TCB_JS ||
  'C:/Users/Honor/.workbuddy/binaries/node/workspace/node_modules/@cloudbase/cli/bin/tcb';

const COLLECTIONS = [
  ['users', '用户档案'],
  ['books', '书籍（含官方教材目录）'],
  ['user_books', '用户领用的书与进度'],
  ['cards', '记忆卡片'],
  ['questions', '题目'],
  ['answers', '答题记录'],
  ['checkins', '打卡记录'],
  ['user_medals', '用户勋章'],
  ['quota', '每日额度'],
  ['networks', 'AI 知识网络'],
  ['shares', '书籍分享（好友链接）'],
  ['submissions', '用户投稿']
];

/** 清掉代理后执行 tcb。CLI 报错时 exit code 非 0，但报错信息在 stderr 里，必须一起拿回来。 */
function tcb(args, allowFail) {
  const env = Object.assign({}, process.env);
  delete env.HTTP_PROXY;
  delete env.HTTPS_PROXY;
  delete env.http_proxy;
  delete env.https_proxy;
  try {
    return execFileSync(NODE_BIN, [TCB_JS].concat(args), {
      cwd: ROOT,
      env,
      encoding: 'utf8',
      timeout: 120000,
      stdio: ['ignore', 'pipe', 'pipe']
    });
  } catch (err) {
    // err.stdout / err.stderr 里才有真正的报错原因，缺了就什么都看不到
    const detail = [err.stdout, err.stderr].filter(Boolean).join('\n').trim();
    const msg = detail || err.message || '命令执行失败';
    if (allowFail) return msg;
    throw new Error(msg);
  }
}

/** 执行一条 Mongo 命令 */
function mongo(table, type, commandObj) {
  const payload = JSON.stringify([
    { TableName: table, CommandType: type, Command: JSON.stringify(commandObj) }
  ]);
  const out = tcb(
    ['db', 'nosql', 'execute', '--env-id', ENV_ID, '--region', REGION, '--command', payload],
    true
  );
  // CLI 出错时 exit code 非 0，输出里带 × 标记
  if (/^×|错误|error|未开通|失败/i.test(out)) {
    const reason = (out.match(/^×\s*(.+)$/m) || [])[1] || out.split('\n').pop() || '未知错误';
    return { ok: false, reason: reason.trim(), out };
  }
  return { ok: true, reason: '', out };
}

/**
 * 取集合文档条数。
 *
 * 踩过的坑（两次）：
 *   1. 用正则从文本输出抠 `"n": 123` → 格式一变就数出 0，假数据
 *   2. 改用 --json 后仍数出 0 → 因为 MongoDB 返回的是 **Extended JSON**：
 *      数字被包成 `{ "n": { "$numberInt": "50" } }`，
 *      `typeof node.n === 'number'` 判断永远不成立，于是返回 0
 *      —— 真实情况是 50 条，却报「条数没涨」，差点误判成导入失败
 *
 * 现在统一处理 Extended JSON：把 {"$numberInt":"50"} / {"$numberLong":"x"}
 * 之类的包装解成真实数值。
 */
function unwrapNumber(v) {
  if (typeof v === 'number') return v;
  if (v === null || typeof v !== 'object') return null;
  for (const k of Object.keys(v)) {
    if (k.startsWith('$number')) {
      const n = Number(v[k]);
      return Number.isNaN(n) ? null : n;
    }
  }
  return null;
}

function countDocs(table) {
  const payload = JSON.stringify([
    { TableName: table, CommandType: 'COMMAND', Command: JSON.stringify({ count: table }) }
  ]);
  const raw = tcb(
    [
      'db', 'nosql', 'execute',
      '--env-id', ENV_ID, '--region', REGION,
      '--command', payload, '--json'
    ],
    true
  );

  const walk = (node) => {
    if (node === null || typeof node !== 'object') return null;
    for (const k of ['n', 'count', 'num', 'total']) {
      const got = unwrapNumber(node[k]);
      if (got !== null) return got;
    }
    for (const k of Object.keys(node)) {
      const got = walk(node[k]);
      if (got !== null) return got;
    }
    return null;
  };

  try {
    return walk(JSON.parse(raw));
  } catch (e) {
    return null; // 返回 null = 查不到，别当成 0（0 是有效答案，null 是失败）
  }
}

/**
 * 诊断环境模式。
 * ⚠ 官方文档说「PG 模式下文档型数据库会默认初始化」，实测并非如此：
 *   实测 PG 模式环境的 pg_namespace 只有
 *   supavisor/storage/auth/extensions/public/cloudbase_migrations，无文档库痕迹。
 *   所以必须实测，不能照文档推断。
 * ⚠ 也不能用 --help 判断 —— 帮助文本对所有环境都一样。
 * 返回 'pg' | 'doc'
 */
function detectMode() {
  const alive = tcb(
    ['db', 'execute', '-e', ENV_ID, '--sql',
     "SELECT count(*) AS c FROM pg_namespace WHERE nspname NOT LIKE 'pg_%' AND nspname <> 'information_schema'"],
    true
  );
  if (!/record|column/i.test(alive) || /未开通|not\s*open/i.test(alive)) return 'doc';
  const ns = tcb(['db', 'execute', '-e', ENV_ID, '--sql', 'SELECT nspname FROM pg_namespace'], true);
  if (/nosql|mongo|\bdoc\b/i.test(ns)) return 'doc';
  return 'pg';
}

/** 探测数据库是否已开通 */
function probe() {
  const r = mongo('books', 'COMMAND', { count: 'books' });
  if (!r.ok && /未开通/.test(r.reason)) {
    const url = `https://tcb.cloud.tencent.com/dev?envId=${ENV_ID}#/db/doc`;

    // 情况 A：PG 模式环境 —— 文档库永远开不出来，只能换环境
    if (detectMode() === 'pg') {
      console.error('');
      console.error('  ✗ 当前环境是「PostgreSQL 模式」，不支持文档型数据库');
      console.error('');
      console.error('    原因：环境的数据库类型是创建时定的，事后无法切换。');
      console.error('    你的套餐是个人版（没白买），但这个环境的引擎只有 PG。');
      console.error('');
      console.error('    怎么办（推荐 A，代码零改动）：');
      console.error('      1. 打开 https://buy.cloud.tencent.com/lowcode?buyType=tcb');
      console.error('      2. 数据库类型选「云数据库」—— ⚠ 别选 PostgreSQL');
      console.error('      3. 地域选上海，套餐选个人版（¥19.9/月，40000 资源点）');
      console.error('      4. 建好后跑：bash tools/switch-env.sh <新envId>');
      console.error('         再跑本脚本');
      console.error('');
      console.error('    环境数量上限：每账号最多 50 个，你只有 1 个，够用。');
      console.error('');
      process.exit(2);
    }

    // 情况 B：正常环境，只是没点开通
    console.error('');
    console.error('  ✗ 当前环境未开通「文档型数据库」');
    console.error('');
    console.error('  ⚠ 确认进的是「文档型数据库」而不是「SQL 型数据库 / PostgreSQL」');
    console.error('');
    console.error('  开通路径（约 1 分钟）：');
    console.error(`    1. 打开 ${url}`);
    console.error('    2. 页面标题应显示「文档型数据库」，左侧有「集合管理」');
    console.error('    3. 点「开通」/「新建数据库」→ 选「文档型数据库（NoSQL）」→ 确认');
    console.error('');
    console.error('  开通后重跑本脚本即可：');
    console.error('    node database/bootstrap-db.js');
    console.error('');
    process.exit(2);
  }
  return r;
}

console.log('========================================');
console.log(' 咪猫爱背诵 · 数据库初始化');
console.log('========================================');
console.log('环境：', ENV_ID, ' 地域：', REGION);
console.log('');

/* ---------- 1. 先探测数据库是否开通 ---------- */
console.log('[0/3] 探测数据库状态');
const probeResult = probe();
if (!probeResult.ok) {
  console.error(`      ✗ ${probeResult.reason}`);
  console.error('');
  console.error('      常见原因：数据库里的某个集合名不对，或权限不足。');
  console.error('      错误详情：' + probeResult.out.split('\n').slice(-3).join(' '));
  process.exit(1);
}
console.log('      ✓ 数据库可用');
console.log('');

/* ---------- 2. 建集合 ---------- */
console.log('[1/3] 创建集合（已存在会跳过）');
for (const [name, desc] of COLLECTIONS) {
  const r = mongo(name, 'COMMAND', { create: name });
  // 「已存在」也算通过
  const created = r.ok || /exists|已存在/i.test(r.reason);
  console.log(`      ${created ? '✓' : '✗'} ${name.padEnd(14)} ${desc}${r.ok ? '' : '  ' + r.reason}`);
}
console.log('');

/* ---------- 3. 导入教材 ---------- */
console.log('[2/3] 导入全学段教材目录');
const seedFile = path.join(__dirname, 'seed-books.json');
if (!fs.existsSync(seedFile)) {
  console.log('      ✗ 找不到 seed-books.json，跳过');
} else {
  const books = JSON.parse(fs.readFileSync(seedFile, 'utf8'));
  const had = countDocs('books');
  console.log(`      云端已有 ${had} 条，待导入 ${books.length} 条`);

  const BATCH = 5;
  let failed = 0;
  for (let i = 0; i < books.length; i += BATCH) {
    const slice = books.slice(i, i + BATCH);
    const r = mongo('books', 'INSERT', { insert: 'books', documents: slice });
    if (!r.ok) {
      // 主键冲突视为已存在，不算失败
      if (!/duplicate|E11000|已存在/i.test(r.reason)) {
        failed++;
        console.log(`\n      ✗ 第 ${i + 1}-${i + slice.length} 条失败：${r.reason}`);
      }
    }
    process.stdout.write(`\r      进度 ${Math.min(i + BATCH, books.length)}/${books.length}`);
  }
  console.log('');

  const now = countDocs('books');
  // 导入后条数必须真的涨了，否则说明提交没生效 —— 宁可报可疑也不谎报成功
  const grew = now > had;
  console.log(
    `      导入后云端共 ${now} 条` +
      (failed ? `（${failed} 批失败）` : '') +
      (!grew && books.length ? '  ⚠ 条数没涨，请到控制台核对' : '')
  );
}
console.log('');

/* ---------- 3. 权限 ---------- */
console.log('[3/3] 权限说明');
console.log('      ⚠️ 需要你在控制台手动改一次：');
console.log('      数据库 → 权限设置 → 每个集合选「所有用户可读，仅创建者可写」');
console.log('      不要选「仅创建者可读写」，那样读不到官方教材目录。');
console.log('');

console.log('========================================');
console.log(' 集合已建好，教材已提交');
console.log('');
console.log(' 接下来：');
console.log('  1. 控制台改集合权限（见上方 [3/3]）');
console.log('  2. 控制台开通 AI 能力（云开发 → AI 能力）');
console.log('  3. 小程序 → 我的 → 云函数自检，点「一键测试全部」');
console.log('========================================');
