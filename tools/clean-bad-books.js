/**
 * 数据清理：空壳书 + 重复书 + 撞名卡片
 * ============================================================================
 * 用途（2026-10-11）：
 *   线上出现了 3 本同名《非必修一测试》，其中1 本「0 单元 0 知识点」，
 *   另有 2 本内容完全重复；还有 6 张 title全叫「碎片速记」的卡片。
 *
 *⚠️ 默认**只报告不改数据**。确认要删再加 --apply。
 *   对个人生产数据的批量删除不可逆，先看清楚再动手。
 *
 * 用法：
 *   node tools/clean-bad-books.js            # 只看会动什么
 *   node tools/clean-bad-books.js --apply    # 删空壳书 + 重复书
 *   node tools/clean-bad-books.js --apply --rename  # 额外把撞名卡片按内容改名
 *
 * ⚠⚠ cards 里的卡片**永远不删** —— 那是用户自己的记忆内容，
 *   只是标题撞了而已。清洗脚本没有资格删用户数据。
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
const RENAME_CARDS = process.argv.includes('--rename');

function nosql(table, commandType, command) {
  const cmd = JSON.stringify([
    { TableName: table, CommandType: commandType, Command: JSON.stringify(command) }
  ]);
  return execFileSync(
    NODE,
    [TCB, 'db', 'nosql', 'execute', '--envId', ENV_ID, '--command', cmd],
    { encoding: 'utf8', timeout: 180000, cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] }
  );
}

/** CLI stdout 前面有提示行，JSON 从最后一个换行后的 [ 或 { 开始（见 query-docs.js） */
function extractJson(s) {
  const i = Math.max(s.lastIndexOf('\n['), s.lastIndexOf('\n{'));
  if (i < 0) return null;
  const start = i + 1;
  const open = s[start];
  const close = open === '[' ? ']' : '}';
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let k = start; k < s.length; k++) {
    const ch = s[k];
    if (esc) { esc = false; continue; }
    if (ch === '\\') { esc = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return s.slice(start, k + 1);
    }
  }
  return null;
}

/**
 🔴🔴 CommandType 不是随意的 —— 写错会报「BSON field 'x' is an unknown field」，
   而且报错信息完全指不到真正的原因（第一次写 `{delete, filter}` 被拒，
   误以为是 BSON 不支持嵌套条件）。正确映射（官方 MgoCommandParam）：
     QUERY   → { find, filter, limit }
     INSERT  → { insert, documents }
     UPDATE  → { update, updates: [{ q, u, multi? }] }   ← 键是 q / u，不是 query/update
     DELETE  → { delete, deletes: [{ q, limit }] }        ← 键是 deletes + q，不是 filter
              limit:0 = 删全部匹配；limit:1 = 只删一条
   COMMAND 只用于 count / aggregate（aggregate 还必须带 cursor:{}）。
 */
const CMD = {
  QUERY: 'QUERY',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE'
};

function query(table, filter, limit) {
  const raw = nosql(table, CMD.QUERY, { find: table, filter: filter || {}, limit: limit || 200 });
  const j = JSON.parse(extractJson(raw) || '[]');
  return Array.isArray(j) ? j : (j.Data || j.data || []);
}

function remove(table, ids) {
  if (!ids.length) return;
  // 一次只删明确列出的 _id，且 limit:0 = 全删匹配（这里匹配条件就是 _id 列表）
  nosql(table, CMD.DELETE, {
    delete: table,
    deletes: [{ q: { _id: { $in: ids } }, limit: 0 }]
  });
}

function setField(table, id, patch) {
  nosql(table, CMD.UPDATE, {
    update: table,
    updates: [{ q: { _id: id }, u: { $set: patch }, multi: false }]
  });
}

console.log('环境 ' + ENV_ID + (APPLY ? '（--apply：真的会删）' : '（只报告）'));
console.log('');

/* ---- ① 空壳书：没有单元，或所有小节都没有任何内容 ---- */
const books = query('books');
const num = (v) =>
  v && typeof v === 'object'
    ? Number(v.$numberInt != null ? v.$numberInt : v.$numberDouble)
    : Number(v) || 0;

function realPoints(b) {
  return (b.units || []).reduce(
    (s, u) =>
      s +
      (u.sections || []).reduce(
        (a, x) => a + (Array.isArray(x.points) && x.points.length ? x.points.length : 0),
        0
      ),
    0
  );
}

/*
 🔴🔴 官方教材（official:true / status:'published'）**一律不碰**。
   它们的骨架是 `units[].points = ["知识点名", ...]`（**纯字符串数组**），
   不是 `units[].sections[].points`（对象数组）。
   第一版脚本只数后者 → 8 本官方教材全被算成「0 知识点」
   → 差一步就把官方书库删光。
   这跟项目里踩过的「三种书籍结构并存」是同一类坑：
     目录书：units[].name + points[]（字符串）
     离线包：units[].title + points[].title（对象）+ content
     用户解析：units[].name + sections[].name（对象）+ content
   判空必须**三种都认**，且 official书直接排除。
*/
function isOfficial(b) {
  return b.official === true || b.status === 'published';
}

/** 三种结构都算点数；返回 0 才是真的空 */
function pointCountAny(b) {
  if (num(b.pointCount) > 0) return num(b.pointCount);
  return (b.units || []).reduce((s, u) => {
    const secs = u.sections || [];
    if (secs.length) return s + realPoints({ units: [u] });
    // 骨架书：units[].points 是纯字符串数组
    return s + (Array.isArray(u.points) ? u.points.length : 0);
  }, 0);
}

const mine = books.filter((b) => !isOfficial(b));
const shells = mine.filter((b) => pointCountAny(b) === 0);
const emptyUnits = mine.filter((b) => !(b.units || []).length);

/* ---- ② 重复书：同一用户 + 同标题 + 同结构（只查非官方） ---- */
const seen = {};
const dupes = [];
mine.forEach((b) => {
  if (!(b.units || []).length) return;
  const key = (b._openid || '') + '|' + (b.title || '') + '|' + pointCountAny(b);
  if (seen[key]) dupes.push(b._id);
  else seen[key] = b._id;
});

console.log('【空壳书】（有单元结构但 0 个知识点）' + shells.length + ' 本');
shells.forEach((b) =>
  console.log('  ' + b._id + '  ' + (b.title || '') + '  units=' + (b.units || []).length +
    '  status=' + b.status)
);

console.log('');
console.log('【无单元结构的书】' + emptyUnits.length + ' 本');
emptyUnits.forEach((b) => console.log('  ' + b._id + '  ' + (b.title || '') + '  status=' + b.status));

console.log('');
console.log('【重复书】（同用户+同名+同结构，保留最早的一本）' + dupes.length + ' 本');
dupes.forEach((id) => console.log('  ' + id));

/* ---- ③ 撞名卡片：同用户多张同名卡 ---- */
const cards = query('cards');
const cardSeen = {};
const dupCards = [];
cards.forEach((c) => {
  if (!c.title) return;
  const key = (c._openid || '') + '|' + c.title;
  if (cardSeen[key]) dupCards.push(c._id);
  else cardSeen[key] = c._id;
});
console.log('');
console.log('【撞名卡片】（同一用户多张同名）' + dupCards.length + ' 张');
dupCards.forEach((id) => {
  const c = cards.find((x) => x._id === id);
  console.log('  ' + id + '  ' + (c && c.title) + '  ' + String((c && c.content) || '').slice(0, 30));
});

/*
 🔴 三类清单要**去重**再汇总。
    第一版是 shells.concat(emptyUnits, dupes) ——
    units=0 的书同时落在「空壳」和「无单元结构」两组，
    于是「已删除 21 本」实际只有 11 本，数字直接骗人。
    清单类 bug 同「不写死文件清单」是同一类：拼出来的结论没人验证过。
 */
const bookIds = Array.from(new Set(shells.map((b) => b._id)
  .concat(emptyUnits.map((b) => b._id))
  .concat(dupes)));

console.log('');
if (!APPLY) {
  console.log('以上是「会删/需处理」的清单。加 --apply 才真的执行。');
  process.exit(0);
}

if (bookIds.length) {
  remove('books', bookIds);
  console.log('✓ 已删除 ' + bookIds.length + ' 本问题书籍');
}

/*
 🔴 cards（撞名卡片）**只改标题、不删**。
   用户明确说过这些是他的记忆内容，只是名字撞了。
   删掉等于毁掉用户的数据 —— 清洗脚本没有资格做这个决定。
*/
if (dupCards.length && RENAME_CARDS) {
  /*
   🔴 改名后**必须重新查重**，不能只看「跟原标题不同」。
      6 张撞名卡里有 4 张正文首句几乎一样（都是肌红蛋白那段），
      按首句改名后它们会立刻撞成同一个新名字 —— 换个名字继续撞，等于没改。
      所以维护一个 used集合，重名就加 (2)(3) 后缀。
  */
  /*
   🔴 used 记的是「这个标题已经被占用了」，不是次数。
      原来初始化成计数（重复才=1）、判断写成 `> 1`，
      结果「已被占用 1 次」也被放行 → 首句相同的两张照样撞名。
      正确：占用即冲突，while(被占用) 加后缀。
  */
  const used = {};
  cards.forEach((c) => {
    if (!c.title) return;
    used[(c._openid || '') + '|' + c.title] = true;
  });
  let renamed = 0;
  dupCards.forEach((id) => {
    const c = cards.find((x) => x._id === id);
    if (!c) return;
    // 从内容首句取标题（≤20字），这正是云端现在用的兜底规则
    const first =
      String(c.content || '')
        .split(/[\n。！？!?]/)[0]
        .trim()
        .slice(0, 20);
    if (!first) return;
    let title = first;
    let n = 1;
    while (used[(c._openid || '') + '|' + title]) {
      n++;
      title = first + '(' + n + ')';
    }
    used[(c._openid || '') + '|' + title] = true;
    if (title === c.title) return;
    setField('cards', id, { title: title, updatedAt: Date.now() });
    renamed++;
    console.log('  → ' + id.slice(-8) + '  ' + c.title + '  改为  ' + title);
  });
  console.log('✓ 已重命名' + renamed + ' 张撞名卡片（按内容首句+去重后缀，未删除任何内容）');
} else if (dupCards.length) {
  console.log('（撞名卡片保留；加 --rename 可按内容首句改名，同样不会删除内容）');
}