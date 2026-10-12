/**
 * 修复历史书籍「有内容但没有记忆卡片」的存量数据
 * ============================================================================
 * 现象（2026-10-11 用户报）：
 *   《非必修一测试》点「记忆」进去，知识点卡片空白，只剩 SMART 范例。
 *
 * 🔴 根因（和阶段 A/F 是同一类，但这次是**存量数据**）：
 *   1. 这本书解析于 `saveParsed` 生成 cards **之前**，
 *      所以 `units[].sections[]` 里**没有 `_id` 字段**（实测确认：
 *      整个文档只有书自己的 `_id`，sections 全都没有）。
 *   2. `book-detail.firstCardId()` 读 `sections[0]._id` → 拿到 undefined
 *      → 返回空串 → `memory-mode` 拿不到 cardId → `useDemo()`
 *      → 界面显示 SMART 范例。
 *
 * ⚠ 为什么不能直接调云函数 `rebuildCards`：
 *   服务端 API Key 只能部署、**调不动**（JWT aud 绑定 envId，见 call-fn.js 头注释）。
 *   所以这里用 nosql 直写，复刻 `upload.syncCards` 的同一套规则 ——
 *   **cardId 必须等于 section._id 形态的 `bk<bookId>-u<单元>s<小节>`**，
 *   且 id 必须**回写进 book 文档**，否则 firstCardId 仍然取不到。
 *
 * ⚠ 默认**只报告不改数据**，加 --apply 才执行。
 *   ⚠⚠ cards 里的卡片**永不删除**：那是用户自己的记忆内容。
 *
 * 用法：
 *   node tools/backfill-book-cards.js            # 只看会动什么
 *   node tools/backfill-book-cards.js --apply    # 实际补写
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

/* CommandType 映射见 clean-bad-books.js 的注释（DELETE/UPDATE 键名有坑） */
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

function query(table, filter) {
  const raw = nosql(table, 'QUERY', { find: table, filter: filter || {}, limit: 200 });
  const j = JSON.parse(extractJson(raw) || '[]');
  return Array.isArray(j) ? j : (j.Data || j.data || []);
}

/** 知识点数：三种结构都认（目录书units[].points 是纯字符串数组） */
function pointCountAny(b) {
  return (b.units || []).reduce((sum, u) => {
    const secs = u.sections || [];
    if (secs.length) {
      return sum + secs.reduce((a, s) => {
        if (Array.isArray(s.points) && s.points.length) return a + s.points.length;
        const hasBody =
          !!s.content || !!s.analogy || !!s.mnemonic ||
          (Array.isArray(s.mustScore) && s.mustScore.length > 0);
        return a + (hasBody ? 1 : 0);
      }, 0);
    }
    return sum + (Array.isArray(u.points) ? u.points.length : 0);
  }, 0);
}

function isOfficial(b) {
  return b.official === true || b.status === 'published';
}

console.log('环境 ' + ENV_ID + (APPLY ? '（--apply：真的会写）' : '（只报告）'));
console.log('');

/* 官方书不需要 —— 它们走现算的 cardId，不查 cards 集合 */
const books = query('books', {}).filter((b) => !isOfficial(b));
const cards = query('cards', {});
const cardIds = new Set(cards.map((c) => c._id));

const targets = books.filter((b) => pointCountAny(b) > 0);

console.log('非官方且有内容的书：' + targets.length + ' 本\n');

/* 逐本算需要补什么 */
const plan = [];
targets.forEach((b) => {
  const missingCard = [];
  const missingId = [];
  /*
   * 🔴 还必须查「结构污染」：第一版只查 _id 和卡片，
   *    结果线上 points 明明是对象数组，它却报「无需处理」——
   *    判据漏了一项，脏数据就被当成干净数据放过了。
   */
  const dirtyPoints = [];
  const missingUnitId = [];
  (b.units || []).forEach((u, ui) => {
    if (!String(u._id || '').trim()) missingUnitId.push({ ui, cid: 'bk' + b._id + '-u' + ui });
    (u.sections || []).forEach((s, si) => {
      const cid = 'bk' + b._id + '-u' + ui + 's' + si;
      if (!s._id) missingId.push({ ui, si, cid });
      if (!cardIds.has(cid)) missingCard.push({ ui, si, cid, name: s.name });
      if (Array.isArray(s.points) && s.points.some((x) => x && typeof x === 'object')) {
        dirtyPoints.push({ ui, si, cid });
      }
    });
  });
  if (missingCard.length || missingId.length || dirtyPoints.length || missingUnitId.length) {
    plan.push({ book: b, missingCard, missingId, dirtyPoints, missingUnitId });
  }
});

if (!plan.length) {
  console.log('✅ 没有需要补的书（卡片齐全、section._id 齐全、points 结构正常）');
  process.exit(0);
}

console.log('需要处理：' + plan.length + ' 本\n');
plan.forEach((p) => {
  console.log('《' + (p.book.title || '(无题)') + '》 ' + p.book._id);
  console.log('    🔴 unit 缺 _id：' + p.missingUnitId.length +
    (p.missingUnitId.length ? '（会导致详情页单元列表 key 撞车、卡片显示消失）' : ''));
  console.log('    section 缺 _id：' + p.missingId.length +
    (p.missingId.length ? '（如 ' + p.missingId.slice(0, 3).map((m) => m.cid).join(', ') + '）' : ''));
  console.log('    缺记忆卡片：' + p.missingCard.length +
    (p.missingCard.length ? '（如 ' + p.missingCard.slice(0, 3).map((m) => m.cid).join(', ') + '）' : ''));
  console.log('    🔴 points 结构污染：' + p.dirtyPoints.length + ' 个小节');
});

console.log('');
if (!APPLY) {
  console.log('以上是「会补什么」的清单。加 --apply 才真的写入。');
  process.exit(0);
}

/* ---------------- 实际写入 ---------------- */
let createdCards = 0;
let writtenIds = 0;
let skipped = 0;
let verifiedBooks = 0;
let cleaned = 0;   // points 被污染、已清洗的小节数
let filled = 0;    // points 为空、已用 mustScore 兜底的小节数
let writtenUnitIds = 0; // 补写到 unit._id 的数量（详情页 wx:key 靠它）

plan.forEach((p) => {
  const b = p.book;
  const units = (b.units || []).map((u) => Object.assign({}, u));

  units.forEach((u, ui) => {
    /*
     * 🔴🔴 unit 也必须补 _id（2026-10-11 用户报「打开后卡片又消失」的真凶）。
     *   书籍详情页单元目录是 `wx:key="_id"` + `expanded[item._id]`：
     *   unit._id 缺失 → 所有单元 key 都是 undefined → 列表复用错乱（卡片消失），
     *   展开状态也全写到 expanded[undefined]，点一个全部跟着开。
     *   格式与 upload.syncCards 一致：bk<bookId>-u<序号>。
     */
    if (!String(u._id || '').trim()) {
      u._id = 'bk' + b._id + '-u' + ui;
      writtenUnitIds++;
    }

    const sections = (u.sections || []).map((s, si) => {
      const sec = Object.assign({}, s);
      const cid = 'bk' + b._id + '-u' + ui + 's' + si;

      /*
       * 🔴🔴 清洗 `points`：线上数据里它被**污染成了对象数组** ——
       *   AI 解析时把 questions（{stem,answer,explain,...}）塞进了 points，
       *   还有一个 `_id` 混在里面（上一版回写时被原样带回来的）。
       *   正确形态是**纯字符串数组**（catalog 的 collectPoints 也是这么认的），
       *   对象数组会让前端把知识点显示成 "[object Object]"。
       *
       * ⚠ 只在**确认是对象**时才替换，原样字符串一律保留 ——
       *   不能无脑 `map(String)`，那会把真正的知识点名洗掉。
       */
      if (Array.isArray(sec.points) && sec.points.some((x) => x && typeof x === 'object')) {
        cleaned++;
        sec.points = sec.points
          .filter((x) => x && typeof x === 'object')
          .map((x) => String(x.name || x.point || x.title || x.text || '').trim())
          .filter(Boolean);
      }
      // points 为空但有 mustScore 时，用它兜底（否则这个知识点是空的）
      if (!(sec.points || []).length && (sec.mustScore || []).length) {
        sec.points = sec.mustScore.slice(0, 5);
        filled++;
      }

      // 🔴 _id 必须写在**section 层**，且格式与 upload.syncCards 完全一致
      sec._id = cid;
      writtenIds++;
      if (cardIds.has(cid)) {
        skipped++;
        return sec;
      }
      cardIds.add(cid);

      const points = (sec.points || []).join('；');
      const mustScore = Array.isArray(sec.mustScore) ? sec.mustScore : [];
      const errors = Array.isArray(sec.errors) ? sec.errors : [];
      const content =
        sec.content || [mustScore.join('；'), points].filter(Boolean).join('\n');
      const title = sec.name || u.name || '知识点';
      const indexWords = [title, sec.analogy, sec.mnemonic]
        .filter(Boolean)
        .join(' ')
        .split(/[\s，。！？、,.!?/]+/)
        .filter((w) => w.length >= 2 && w.length <= 12);

      nosql('cards', 'INSERT', {
        insert: 'cards',
        documents: [{
          _id: cid,
          _openid: b._openid,
          title,
          content,
          index: Array.from(new Set(indexWords)).slice(0, 8),
          subject: b.subject || '',
          bookId: b._id,
          bookTitle: b.title || '',
          unit: u.name || '',
          section: title,
          level: 'A',
          strength: 45,
          userMark: 'normal',
          history: [],
          nextReviewDate: new Date().toISOString().slice(0, 10),
          nextReviewTag: '今日必复习',
          tags: (b.tags || []).slice(0, 2),
          analogy: sec.analogy || '',
          mnemonic: sec.mnemonic || '',
          errors,
          createdAt: Date.now(),
          updatedAt: Date.now()
        }]
      });
      createdCards++;
      return sec;
    });
    u.sections = sections;
  });

  nosql('books', 'UPDATE', {
    update: 'books',
    updates: [{ q: { _id: b._id }, u: { $set: { units: units } }, multi: false }]
  });

  /*
   🔴🔴 必须回读校验，不能只打印「已回写 N 个」。
      第一版没校验就报了「已回写 section._id 9 个」，
      线上查回来一个 _id 都没有 —— 写脚本最怕这种「打印成功、线上没变」。
      写完立刻读，读不到就抛错停下，绝不假装成功。
  */
  const back = query('books', { _id: b._id });
  const backUnits = (back[0] && back[0].units) || [];
  const secs = backUnits.reduce(
    (a, u) => a.concat((u && u.sections) || []),
    []
  );
  const gotIds = secs.filter((s) => s && s._id).length;
  if (secs.length && gotIds < secs.length) {
    throw new Error(
      '回写 section._id 未生效：' + b._id + '（' + gotIds + '/' + secs.length + ' 有 _id）'
    );
  }
  /*
   * 🔴 unit._id 也要回读校验，且**必须真的校验「每个 unit 都有且不重复」**。
   *   只数个数不够：三个 unit 全写成同一个值，个数也是「齐」的，
   *   但 `wx:key="_id"` 照样撞车 → 用户看到的还是「卡片消失」。
   */
  const unitIds = backUnits.map((u) => String((u && u._id) || '').trim());
  const badUnits = unitIds.filter((x) => !x).length;
  const dupUnits = unitIds.length - new Set(unitIds).size;
  if (badUnits || dupUnits) {
    throw new Error(
      '回写 unit._id 未生效：' + b._id + '（缺 ' + badUnits + ' 个 / 重复 ' + dupUnits + ' 个）'
    );
  }
  // 🔴 还要验 points 确实是字符串数组 —— 上一版就是「id 写了但落错层」才没发现
  const badPoints = secs.filter(
    (s) => Array.isArray(s.points) && s.points.some((x) => typeof x === 'object')
  ).length;
  if (badPoints) {
    throw new Error('points 仍是对象数组：' + b._id + '（' + badPoints + ' 个小节未清洗）');
  }
  verifiedBooks++;
  console.log('  ✓ ' + (b.title || '(无题)') + '：' + gotIds + ' 个小节 _id、' +
    unitIds.length + ' 个单元 _id 已确认落库');
});

console.log('✓ 已补写卡片 ' + createdCards + ' 张');
console.log('✓ 已回写 section._id ' + writtenIds + ' 个（逐本回读确认）');
console.log('✓ 已回写 unit._id ' + writtenUnitIds + ' 个（详情页 wx:key 靠它）');
console.log('· 清洗被污染的 points：' + cleaned + ' 个小节');
console.log('· 用 mustScore 兜底空points：' + filled + ' 个小节');
console.log('  校验通过：' + verifiedBooks + ' / ' + plan.length + ' 本');
console.log('· 跳过（卡片已存在）' + skipped + ' 个');
console.log('');
console.log('⚠️ 请回小程序重新打开这本书。若仍显示示范内容，检查云函数 review 是否已部署。');