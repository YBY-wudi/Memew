/**
 * 为已有书籍补齐「类比/趣味解读/记忆技巧/纠错」三件套
 * ============================================================================
 * 背景（2026-10-12）：
 *   `cloud-shared/ai-normalize.js` 的 `normBook` 以前只映射
 *   `mnemonic` + `analogy`，把 AI 返回的 `funFact` / `tip` / `content`
 *   **静默丢弃**（不报错、不告警）。
 *   于是 `upload.syncCards` 落库时这三个字段全是空串，
 *   前端「类比记忆」板块的三个面板就是**只有标题的三个空框**。
 *
 *   映射层已修（见 normBook 的注释）。但**存量书的数据不会自己变**，
 *   需要把缺的字段补上。
 *
 * ⚠ 本脚本**不做 AI 生成**（服务端 API Key 调不动 AI，见 call-fn.js 头注释），
 *   只做两件能离线做的事：
 *   ① 报告：哪些书的哪些小节缺 funFact/tip
 *   ② 补齐**能从已有数据推出来的**字段：
 *      · content← points + mustScore（这些一直都在）
 *      · errorRight ← 已有内容首句
 *      · errorWrong ← errors[1] || errors[0]
 *      · errorDiff ← 有 errors 时给一句引导
 *   ⚠️ **绝不编造 funFact / tip** —— 那两个是 AI 的创作，
 *      凭空生成等于造假。它们靠 `rebuildCards --withAids` 真实调 AI 生成。
 *
 * ⚠ 默认只报告，加 --apply 才写。
 *
 * 用法：
 *   node tools/backfill-book-aids.js# 只看会动什么
 *   node tools/backfill-book-aids.js --apply
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
/*
 * 🔴 --dedupe：强制重整**已有**的 content（去掉重复段）。
 *   为什么需要：mustScore 与 points 语义重叠，第一版直接拼接，
 *   结果同一句话在正文里出现两遍 —— 背诵读两遍、遮挡重复命中。
 *   判据「content 为空」永远修不了这种重复，必须显式要求重整。
 */
const DEDUPE = process.argv.includes('--dedupe');

/* CommandType 映射见 clean-bad-books.js 的注释（UPDATE 的键是 q/u） */
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
    throw new Error(
      msg.split('\n').filter((l) => l.trim()).slice(-3).join(' | ') || e.message
    );
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
  const raw = nosql(table, 'QUERY', { find: table, filter: filter || {}, limit: 500 });
  const j = JSON.parse(extractJson(raw) || '[]');
  return Array.isArray(j) ? j : j.Data || j.data || [];
}

const txt = (v) => (typeof v === 'string' ? v.trim() : '');

/**
 * 合并几段文本，**按单条粒度去重**（先拆成句/条，再逐条判重）
 *
 * 🔴 为什么必须去重：AI 经常把同一批考点同时写进 mustScore 和 points，
 *   实测合并出来是这样（同一句话出现两遍）：
 *     「肌红蛋白只存储氧气不运输氧气；肌红蛋白存在于肌肉细胞
 *       肌红蛋白只存储氧气不运输氧气；肌红蛋白存在于肌肉细胞中」
 *   背诵模式会把这句读两遍，遮挡也会重复命中 —— 体验直接变差。
 *
 * ⚠ 去重必须在「**单条**」粒度上做，不能在「整段」粒度：
 *   第一版拿整段去比containment，结果
 *     must = 「异化扩散属于被动运输；异化扩散顺浓度梯度不需要消耗ATP」
 *     points = 「异化扩散属于被动运输；异化扩散顺浓度梯度；异化扩散不需要消耗ATP」
 *   两段**互不包含**（points 把must 的第二条拆成了两条），
 *   于是一个都没删掉，两段照旧全留着 —— 去重看起来没生效。
 *
 * 判定：剥掉末尾标点后互相包含就丢短的；再配一个「首句相同」兜底。
 */
function mergeNoDup(parts) {
  const list = parts.map((p) => txt(p)).filter(Boolean);
  if (list.length <= 1) return list[0] || '';

  //① 先拆成单条（；、\n、分号都是分隔符）
  const items = [];
  list.forEach((p) => {
    p.split(/[；;\n]/)
      .map((x) => x.replace(/[。，,.\s]+$/g, '').trim())
      .filter(Boolean)
      .forEach((x) => items.push(x));
  });

  // ② 逐条判重：**只丢短的那条**（被已保留的长条目包含）
  // ⚠ 不能写成 `k.indexOf(it)>-1 || it.indexOf(k)>-1`：
  //   那样「甲乙丙」会因包含「甲乙」而被删，但两者信息量不同、不是重复。
  //   只有短的被长的包住时，短的是冗余的。
  const kept = [];
  items.forEach((it) => {
    const dup = kept.some((k) => k.length > it.length && k.indexOf(it) > -1);
    if (!dup) kept.push(it);
  });
  return kept.join('；');
}

console.log('环境 ' + ENV_ID + (APPLY ? '（--apply：真的会写）' : '（只报告）'));
console.log('');

/* 🔴 limit 必须 500：books 里目录库就占了 56 本，limit 20 会一条用户书都查不到 */
const books = query('books', {});
const mine = books.filter(
  (b) => !b.official && b.status !== 'published' && (b.units || []).length
);

console.log('非目录且有单元的书：' + mine.length + ' 本\n');

/* 逐本算需要补什么 */
const plan = [];
/*
 * ⚠ needAids 必须在 forEach **外面**声明并被 plan 收集，
 *   写在 forEach 里再 push 到 plan 会拿到 undefined（闭包外的变量没被收集）。
 *   教训同「守门脚本自己错了整整一轮」：计数器要跟着数据流走。
 */
mine.forEach((b) => {
  const needSections = [];
  let needAids = 0;
  let needLocal = 0;
  (b.units || []).forEach((u, ui) => {
    (u.sections || []).forEach((s, si) => {
      const points = Array.isArray(s.points) ? s.points.filter((x) => txt(x)) : [];
      const must = Array.isArray(s.mustScore) ? s.mustScore.filter((x) => txt(x)) : [];
      const errs = Array.isArray(s.errors) ? s.errors : [];

      // 本地能推的：content / 纠错三件套
      const local = {};
      /*
       * 🔴 content 的判据要区分两种情况：
       *   · 本来就没有 → 必须补
       *   · 已经有了但**含重复段**（mustScore 与 points 语义重叠）→ 也要重整
       *       不然正文里同一句话出现两遍，背诵会读两次、遮挡会重复命中。
       * 所以判据不是「空」，而是「空或有重复」。
       */
      const existing = txt(s.content);
      if (!existing) {
        local.content = points.join('；') || must.join('；');
      } else {
        // 按句拆分，出现两次及以上的句子视为重复
        const seen = {};
        const dup = existing
          .split(/[\n；;]/)
          .map((x) => x.replace(/[。，,.\s]+$/g, '').trim())
          .filter(Boolean)
          .some((x) => {
            if (seen[x]) return true;
            seen[x] = true;
            return false;
          });
        const rebuilt = points.join('；') || must.join('；');
        if ((dup || DEDUPE) && rebuilt && rebuilt !== existing) {
          local.content = rebuilt;
        }
      }
      if (!txt(s.errorRight)) {
        local.errorRight =
          txt(s.content) || must[0] || points[0] || (built2(s) ? built2(s).slice(0, 120) : '');
      }
      if (!txt(s.errorWrong) && errs.length) {
        local.errorWrong = txt(errs[1]) || txt(errs[0]);
      }
      if (!txt(s.errorDiff) && errs.length) {
        local.errorDiff = '注意与上面两栏的表述区分';
      }

      // 只能靠 AI 的：funFact / tip
      const aids = [];
      if (!txt(s.funFact)) aids.push('funFact');
      if (!txt(s.tip)) aids.push('tip');
      if (aids.length) needAids++;

      if (Object.keys(local).length || aids.length) {
        if (Object.keys(local).length) needLocal++;
        needSections.push({ ui, si, name: s.name, local, aids });
      }
    });
  });
  if (needSections.length) plan.push({ book: b, needSections, needAids, needLocal });
});

function built2(s) {
  const pts = Array.isArray(s.points) ? s.points.filter((x) => txt(x)) : [];
  const mus = Array.isArray(s.mustScore) ? s.mustScore.filter((x) => txt(x)) : [];
  return pts.join('；') || mus.join('；');
}

if (!plan.length) {
  console.log('✅ 没有需要补的书');
  process.exit(0);
}

console.log('需要处理：' + plan.length + ' 本\n');
plan.forEach((p) => {
  console.log('  《' + (p.book.title || '(无题)') + '》 ' + p.book._id);
  console.log('    本地可补（正文/纠错）：' + p.needLocal + ' 个小节');
  console.log('    🔴 需 AI 生成（趣味解读/记忆技巧）：' + p.needAids + ' 个小节');
  p.needSections.slice(0, 4).forEach((s) => {
    console.log('      - ' + (s.name || '(无题)') +
      '｜可补: ' + (Object.keys(s.local).join(',') || '无') +
      '｜需AI: ' + (s.aids.join(',') || '无'));
  });
});

console.log('');
console.log('⚠️「趣味解读 / 记忆技巧」这两项本脚本**不会补** ——');
console.log('   它们是 AI 的创作，凭空生成等于造假。');
console.log('   真实生成走：上传解析页→「补全记忆卡片与助记内容」→选「生成助记」，');
console.log('   云端 rebuildCards --withAids 会调模型逐个生成并落库。');
console.log('');

if (!APPLY) {
  console.log('以上是「会补什么」的清单。加 --apply 才真的写入（只补本地可推的那些）。');
  process.exit(0);
}

/* ---------------- 实际写入 ---------------- */
let patched = 0;
let verified = 0;

plan.forEach((p) => {
  const b = p.book;
  const units = JSON.parse(JSON.stringify(b.units || []));

  p.needSections.forEach((it) => {
    const sec = units[it.ui].sections[it.si];
    /*
     * ⚠ 原来写的是 `if (sec._id) return;` —— **语义写反了**：
     *   意思是「有 _id 才处理」，而最需要补的恰恰是**没有 _id** 的书
     *   （unit._id/section._id 缺失是10-11 才修的老问题）。
     *   结果一轮跑下来什么都没写，回读校验报「回写未生效」——
     *   **回读校验又一次救了场**（它就是为了防这种「打印成功、线上没变」）。
     *   这里应该无条件处理：_id 由 syncCards / backfill-book-cards 负责补，
     *   本脚本只管内容字段。
     */
    if (!sec) return;
    Object.assign(sec, it.local);
    patched++;
  });

  nosql('books', 'UPDATE', {
    update: 'books',
    updates: [{ q: { _id: b._id }, u: { $set: { units: units } }, multi: false }]
  });

  /*
   * 🔴 必须回读校验：打印「已补 N 个」但线上没变的情况踩过。
   */
  const back = query('books', { _id: b._id });
  const bk = (back[0] && back[0].units) || [];
  let ok = true;
  p.needSections.forEach((it) => {
    const s = bk[it.ui] && bk[it.ui].sections && bk[it.ui].sections[it.si];
    if (!s) { ok = false; return; }
    Object.keys(it.local).forEach((k) => {
      if (txt(s[k]) !== txt(it.local[k])) ok = false;
    });
  });
  if (!ok) throw new Error('回写未生效：' + b._id);
  verified++;
  console.log('  ✓ ' + (b.title || '(无题)') + '：' +
    p.needSections.filter((x) => Object.keys(x.local).length).length + ' 个小节已回读确认');
});

console.log('');
console.log('✓ 已补写 ' + patched + ' 个小节字段');
console.log('  校验通过：' + verified + ' / ' + plan.length + ' 本');
console.log('');
console.log('下一步：回小程序点「补全记忆卡片与助记内容」→ 选「生成助记」，');
console.log('就会真实调 AI 生成「趣味解读 / 记忆技巧」。');