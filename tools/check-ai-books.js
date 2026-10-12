/**
 * 校验自编教材：统计知识点数、检查字段完整性、测试索引可搜性
 * 用法：node tools/check-ai-books.js
 */
const path = require('path');
const fs = require('fs');
const ix = require('../miniprogram/utils/knowledge-index.js');
const aids = require('../miniprogram/utils/memory-aids.js');
const { MEMORY_AIDS } = aids;

const AI_KEYS = MEMORY_AIDS.filter((a) => a.needAI).map((a) => a.key);
const FREE_KEYS = MEMORY_AIDS.filter((a) => !a.needAI);
// 数据里 aids 的键是「展示用 key」，但各条的字段名由 field 指定
// （如「关键词串联」key=keyword、字段名=chain）。校验要按 field 找。
const FREE_FIELDS = MEMORY_AIDS.filter((a) => !a.needAI).map((a) => a.field || a.key);

console.log('12类记忆辅助：');
console.log('  零额度（本地）:', FREE_KEYS.join(', '));
console.log('  需 AI      :', AI_KEYS.join(', '));
console.log('');

// 校验 miniprogram/data/ai-books/ 下随包发布的离线教材
//（database/ai-books/ 是同一份源码的工作副本，真机不读那份）
// ⚠ 这里必须**自动扫描目录**，不能硬编码书名列表。
//   之前写死5 本，后来新增教材文件时校验脚本根本没扫到 →
//   「文件生成了但从没人验证过内容质量」，等于白写。
//   现在改成读目录，新增教材自动纳入校验。
//
// ⚠⚠ 但「文件在目录里」≠「真的进了小程序包」：
//   包体只收**被 require 的**文件。local-books.js 的 AI_BOOKS 是硬编码注册表，
//   文件落盘但没注册 → app 里看不到这本书。
//   所以这里除了校验内容，还要双向核对：
//     目录里有但没注册 → 警告（占磁盘不占包体，但用户看不到）
//     注册了但文件不在 → 报错（app 崩溃级）
let problems = [];
const files = fs
  .readdirSync(path.join(__dirname, '../miniprogram/data/ai-books'))
  .filter((f) => f.endsWith('.js'))
  .map((f) => f.replace(/\.js$/, ''))
  .sort();
if (!files.length) problems.push('miniprogram/data/ai-books/ 下没有任何教材文件');
console.log('自动扫描到教材:', files.join(', '), `（共 ${files.length} 本）`);

// ── 双向核对：目录 ↔ local-books 注册表 ──
(function crossCheck() {
  const local = require('../miniprogram/utils/local-books.js');
  const registered = local.allIds(); // 已注册的 bookId（life-01、comp-01…）
  // 从注册表反推文件：对每个 bookId 找它来自哪个文件
  const regBooks = new Set();
  registered.forEach((id) => {
    const raw = local.getRaw(id);
    if (raw) regBooks.add(raw.title);
  });

  // 目录里有、但没出现在注册表里的书
  const orphans = [];
  files.forEach((f) => {
    const books = require(path.join(__dirname, '../miniprogram/data/ai-books/' + f + '.js'));
    books.forEach((b) => {
      if (!regBooks.has(b.title)) orphans.push(f + '（《' + b.title + '》）');
    });
  });
  if (orphans.length) {
    console.log('');
    console.log('ℹ 以下教材文件在目录里但**未被 local-books.js 注册**：');
    orphans.forEach((o) => console.log('    ' + o));
    console.log('  它们不占包体（包体只收被require 的），但 app 里看不到。');
    console.log('  如果想让它们随包发布，去local-books.js 的 AI_BOOKS 加 require。');
  }

  // 注册表里有、但文件不在目录里的书（这才是真错误）
  const missingFiles = [];
  registered.forEach((id) => {
    const raw = local.getRaw(id);
    if (!raw) {
      missingFiles.push(id);
      return;
    }
  });
  if (missingFiles.length) {
    problems.push(
      'local-books.js 注册了 ' + missingFiles.join(', ') +
      ' 但取不到内容 —— 文件可能被删了或路径错了'
    );
  }

  console.log('');
  console.log('注册生效的教材:', registered.length, '本 →', registered.join(', '));
})();
console.log('');

let totalPoints = 0;
const allEntries = [];

files.forEach((f) => {
  const books = require(path.join(__dirname, '../miniprogram/data/ai-books/' + f + '.js'));
  books.forEach((b) => {
    console.log(`《${b.title}》 ${b.subject} · ${b.stageName} · ${b.edition}`);
    let bp = 0;
    b.units.forEach((u) => {
      console.log(`  ${u.title}  (${u.points.length} 知识点)`);
      u.points.forEach((p) => {
        bp++;
        totalPoints++;
        // 字段检查
        if (!p.title) problems.push(`${b.title}/${u.title}: 缺 title`);
        if (!p.content || p.content.length < 50) {
          problems.push(`${b.title} / ${p.title}: content 太短或缺失`);
        }
        if (!p.keywords || !p.keywords.length) {
          problems.push(`${b.title} / ${p.title}: 缺 keywords（遮挡模式会没有内容）`);
        }
        if (!p.aids) {
          problems.push(`${b.title} / ${p.title}: 缺 aids`);
        } else {
          // 12 类里前 6 类（零额度）必须本地就有
          FREE_FIELDS.forEach((f) => {
            if (!p.aids[f]) problems.push(`${b.title} / ${p.title}: 缺零额度助记 ${f}`);
          });
        }
        // 建索引
        const entries = ix.build([
          Object.assign({}, p, {
            bookId: b.id,
            bookTitle: b.title,
            unit: u.title,
            stage: b.stage,
            subject: b.subject,
            source: 'local'
          })
        ]);
        entries.forEach((e) => allEntries.push(e));
        const idxs = entries.map((e) => e.index);
        console.log(`     · ${p.title}`);
        console.log(`       索引: ${JSON.stringify(idxs)}  关键词${p.keywords.length}个  正文字数${p.content.length}`);
      });
    });
    console.log(`  小计: ${bp} 个知识点`);
    console.log('');
  });
});

console.log('========================================');
console.log(`总计 ${totalPoints} 个知识点，建索引 ${allEntries.length} 条`);
console.log('========================================');

// 每本书挑一个代表性索引词做搜索冒烟
const SEARCH_TESTS = {
  'cell-biology': ['细胞膜', '钠钾泵', '细胞骨架'],
  'cet4-vocabulary': ['abandon', 'consequence', 'comprehensive', '放弃'],
  'high-chemistry': ['离子键', '阿伏加德罗', '氧化还原'],
  'elementary-math': ['勾股定理', '因式分解', '有理数'],
  'civil-service': ['朝代', '行政处罚', '实践']
};
console.log('\n=== 搜索测试 ===');
Object.keys(SEARCH_TESTS).forEach((book) => {
  SEARCH_TESTS[book].forEach((q) => {
    const r = ix.search(allEntries, q);
    const ok = r.length > 0 ? '\x1b[32m✔\x1b[0m' : '\x1b[31m✘\x1b[0m';
    console.log(`${ok} 搜「${q}」(${book}) → ${r.length} 条${r.length ? '：' + r.slice(0, 4).map((x) => x.title).join(' / ') : ''}`);
    if (!r.length) problems.push(`搜索「${q}」在《${book}》里搜不到结果`);
  });
});

if (problems.length) {
  console.log('\n❌ 发现问题：');
  problems.forEach((p) => console.log('  - ' + p));
  process.exit(1);
} else {
  console.log('\n✅ 字段完整性全部通过');
}
