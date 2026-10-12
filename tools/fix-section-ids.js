/**
 * 为存量书补齐 `unit._id` 与 `section._id`
 * ============================================================================
 * 2026-10-12 用户报「上传解析后打开全是示例数据」。
 *
 * 🔴🔴 根因（这次终于查到索引层面）：
 *   书籍详情页跳转背诵时传的是 `sections[0]._id`，
 *   `memory-mode` 拿这个 id 去 `cards` 集合查。
 *   实测线上：
 *     · cards 里的 id 是对的：`bk<bookId>-u0s0`（6 本书 18 张全部正确）
 *     · 但 3 本新书的 **`section._id` 一个都没有** → 传出去的 cardId 是
 *       undefined → 查不到 → useDemo() → 示范内容
 *
 *   为什么 upload.syncCards 的回写没生效？
 *   那些书是在**云函数更新前**解析的，回写逻辑当时还没加；
 *   而已部署的新逻辑只在「新解析」时才跑 —— 存量数据不会自己变。
 *
 * ⚠ 已实测确认：`$set: { units }` 这种写法**完全可行**
 *   （本脚本就是这么补成功的），所以不是数据库能力问题。
 *
 * ⚠ 默认只报告，加 --apply 才写。
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { resolveNode, TCB_JS } = require('./toolchain-path.js');

const ROOT = path.resolve(__dirname, '..');
const NODE = resolveNode().path;
const TCB = TCB_JS;
const ENV_ID = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'cloudbaserc.json'), 'utf8')
).envId;
const APPLY = process.argv.includes('--apply');

function nosql(table, commandType, command) {
  const cmd = JSON.stringify([
    { TableName: table, CommandType: commandType, Command: JSON.stringify(command) }
  ]);
  try {
    return execFileSync(
      NODE,
      [TCB, 'db', 'nosql', 'execute', '--env-id', ENV_ID, '--command', cmd],
      { encoding: 'utf8', timeout: 180000, cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] }
    );
  } catch (e) {
    const msg = String(e.stdout || '') + String(e.stderr || '');
    throw new Error(msg.split('\n').filter((l) => l.trim()).slice(-3).join(' | ') || e.message);
  }
}

function extractJson(s) {
  const i = Math.max(s.lastIndexOf('\n['), s.lastIndexOf('\n{'));
  if (i < 0) return null;
  const start = i + 1;
  const open = s[start];
  const close = open === '[' ? ']' : '}';
  let depth = 0, inStr = false, esc = false;
  for (let k = start; k < s.length; k++) {
    const ch = s[k];
    if (esc) { esc = false; continue; }
    if (ch === '\\') { esc = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === open) depth++;
    else if (ch === close) { depth--; if (depth === 0) return s.slice(start, k + 1); }
  }
  return null;
}

function query(table, filter) {
  const raw = nosql(table, 'QUERY', { find: table, filter: filter || {}, limit: 500 });
  const j = JSON.parse(extractJson(raw) || '[]');
  return Array.isArray(j) ? j : j.Data || j.data || [];
}

console.log('环境 ' + ENV_ID + (APPLY ? '（--apply：真的会写）' : '（只报告）'));
console.log('');

const books = query('books', {});
const cards = query('cards', {});
const cardIds = new Set(cards.map((c) => c._id));

const mine = books.filter(
  (b) => !b.official && b.status !== 'published' && (b.units || []).length
);
console.log('非目录且有单元的书：' + mine.length + ' 本\n');

/* 逐本核对：section._id 缺不缺、对应卡片在不在 */
let need = 0;
mine.forEach((b) => {
  const missUnit = [];
  const missSec = [];
  const noCard = [];
  (b.units || []).forEach((u, ui) => {
    if (!String(u._id || '').trim()) missUnit.push(ui);
    (u.sections || []).forEach((s, si) => {
      const cid = 'bk' + b._id + '-u' + ui + 's' + si;
      if (!String(s._id || '').trim()) missSec.push(cid);
      if (!cardIds.has(cid)) noCard.push(cid);
    });
  });
  if (!missUnit.length && !missSec.length && !noCard.length) return;
  need++;
  console.log('  《' + (b.title || '(无题)') + '》 ' + b._id);
  console.log('    unit 缺 _id：' + missUnit.length + '｜section 缺 _id：' + missSec.length +
    '｜对应卡片不存在：' + noCard.length);
});

if (!need) {
  console.log('✅ 所有书的 unit/section _id 都齐全');
  process.exit(0);
}

console.log('\n需要处理：' + need + ' 本');
if (!APPLY) {
  console.log('加 --apply 才真的写入。');
  process.exit(0);
}

/* ---------------- 实际写入 ---------------- */
let fixed = 0;
mine.forEach((b) => {
  const units = JSON.parse(JSON.stringify(b.units || []));
  let changed = false;

  units.forEach((u, ui) => {
    if (!String(u._id || '').trim()) {
      u._id = 'bk' + b._id + '-u' + ui;
      changed = true;
    }
    (u.sections || []).forEach((s, si) => {
      const cid = 'bk' + b._id + '-u' + ui + 's' + si;
      if (!String(s._id || '').trim()) {
        s._id = cid;
        changed = true;
      }
    });
  });
  if (!changed) return;

  nosql('books', 'UPDATE', {
    update: 'books',
    updates: [{
      q: { _id: b._id },
      u: { $set: { units: units, updatedAt: Date.now() } },
      multi: false
    }]
  });

  /*
   * 🔴 回读校验：不能只打印「已补N 本」。
   *   而且要**逐条比对**取值 —— 只数个数的话，
   *   「全写成同一个值」也会被当成成功（实测踩过）。
   */
  const back = query('books', { _id: b._id })[0];
  const bu = (back && back.units) || [];
  const bad = [];
  bu.forEach((u, ui) => {
    if (!String(u._id || '').trim()) bad.push('unit' + ui);
    (u.sections || []).forEach((s, si) => {
      const want = 'bk' + b._id + '-u' + ui + 's' + si;
      if (String(s._id || '').trim() !== want) {
        bad.push('sec' + ui + '_' + si + '(' + s._id + ')');
      }
    });
  });
  if (bad.length) {
    throw new Error('回写未生效：' + b.title + ' → ' + bad.join(', '));
  }
  fixed++;
  console.log('  ✓ ' + (b.title || '(无题)') + '：unit/section _id 已回读确认');
});

console.log('\n✓ 已补齐 ' + fixed + ' 本');
console.log('下一步：重新上传体验版后打开书 → 展开单元 → 点知识点，');
console.log('        会跳到该知识点自己的内容（不再是示范数据）。');
