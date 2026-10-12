#!/usr/bin/env node
/**
 * 导出教材为控制台可导入的 JSON 文件
 * ------------------------------------------------------------
 * 为什么需要这个：
 * 换到新环境后，命令行 CLI **连不上**（环境在小程序账号下，CLI 是腾讯云账号）。
 * 建集合要在控制台点，导数据也得在控制台点。
 * 所以把数据导出成 CloudBase「导入数据」能直接吃的格式，用户手动上传。
 *
 * 用法：
 *   node tools/export-db.js            # 导出到 dist/db-import/
 *   node tools/export-db.js --open     # 顺便打开所在文件夹
 *
 * 产出（每行一条 JSON，符合 CloudBase JSON 导入格式）：
 *   dist/db-import/books.json     56 本（49 目录骨架 + 7 本自编正文）
 *
 * ⚠️ 关键：转换逻辑**复用** init-cloud.js / upload-content.js 的同一份规则，
 * 不复制粘贴 —— 复制就会出现「导进去的字段名和云函数读的不一致」，
 * 表现是书能列出来但点开全是空白。
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'dist', 'db-import');

const { BOOKS } = require(path.join(ROOT, 'database', 'book-catalog.js'));

/* ---------------- 49 本目录教材（骨架） ---------------- */
const STAGE_NAME = {
  primary: '小学', junior: '初中', senior: '高中',
  college: '大学', exam: '考证', work: '职场'
};
const STAGE_HOT = {
  primary: 80, junior: 95, senior: 100,
  college: 96, exam: 88, work: 70
};

function pickCover(title) {
  const G = [
    ['#7b8cff', '#a78bfa'], ['#38d6e0', '#4aa8e8'],
    ['#34d6a8', '#5ad1c4'], ['#ffa26b', '#ff7ab0'],
    ['#ffd166', '#ffa96b'], ['#b06ab3', '#8b7bf7'],
    ['#4facfe', '#00d4f0'], ['#a8e063', '#4fbf7a']
  ];
  const s = title || '';
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return G[h % G.length];
}

function toDoc(b, i) {
  const [coverFrom, coverTo] = pickCover(b.title);
  const pointCount = b.units.reduce((a, u) => a + u.points.length, 0);
  const now = Date.now();
  return {
    _id: 'cat_' + i,
    title: b.title,
    subject: b.subject,
    stage: b.stage,
    stageName: STAGE_NAME[b.stage] || '综合',
    grade: b.grade,
    edition: b.edition,
    // ⚠ 用户明确要求：不要写出版社、不要写「官方」，就叫「作者自编」
    publisher: '',
    intro: b.units.length + ' 个单元 · ' + pointCount + ' 个核心知识点，AI 已预置知识骨架',
    cover: '',
    coverFrom,
    coverTo,
    official: true,
    status: 'published',
    tags: b.tags || [],
    author: '作者自编',
    hot: (STAGE_HOT[b.stage] || 80) - i,
    pointCount,
    units: b.units.map((u, ui) => ({ index: ui + 1, name: u.name, points: u.points })),
    questionCount: 0,
    dailyPlan: [],
    catalogReady: true,
    createdAt: now,
    updatedAt: now
  };
}

/* ---------------- 7 本自编教材（完整正文） ---------------- */
function loadAiBooks() {
  const PKG = path.join(ROOT, 'miniprogram', 'data', 'ai-books');
  const out = [];
  fs.readdirSync(PKG)
    .filter((f) => f.endsWith('.js'))
    .forEach((f) => {
      let list;
      try {
        list = require(path.join(PKG, f));
      } catch (e) {
        console.warn('  ! ' + f + ' 解析失败：' + e.message);
        return;
      }
      (Array.isArray(list) ? list : []).forEach((b) => out.push(b));
    });
  return out;
}

function safeId(s) {
  return String(s == null ? '' : s).replace(/[^\w-]/g, '_').slice(0, 120) || '_';
}

/** 与 upload-content.js的 toDoc() 保持一致 —— 字段名错一个就会点开空白 */
function toAiDoc(b) {
  const [coverFrom, coverTo] = pickCover(b.title);
  let pointCount = 0;
  const units = (b.units || []).map((u, ui) => {
    const sections = (u.points || []).map((p, pi) => {
      pointCount++;
      return {
        // cardId 必须与 miniprogram/utils/local-books.js 的 cardIdOf() 完全一致
        _id: 'local-' + b.id + '~u' + ui + 'p' + pi,
        name: p.title,
        content: p.content || '',
        tip: p.tip || '',
        analogy: p.analogy || '',
        funFact: p.funFact || '',
        errorDiff: p.errorDiff || '',
        errorRight: p.errorRight || '',
        aids: p.aids || {},
        keywords: p.keywords || [],
        cards: 1,
        done: 0
      };
    });
    return {
      index: ui + 1,
      name: u.title,
      sections,
      totalCards: sections.length,
      doneCards: 0,
      percent: 0
    };
  });

  const now = Date.now();
  return {
    _id: 'loc_' + safeId(b.id),
    bookKey: b.id,
    title: b.title,
    author: b.edition || '作者自编',
    edition: b.edition || '',
    publisher: '',
    intro: b.intro || '',
    subject: b.subject || '',
    stage: b.stage || '',
    stageName: b.stageName || STAGE_NAME[b.stage] || '综合',
    grade: b.grade || '',
    cover: '',
    coverFrom,
    coverTo,
    official: true,
    status: 'published',
    tags: b.tags || [],
    hot: 90,
    pointCount,
    units,
    hasFullContent: true,
    localOnly: false,
    sourceBookId: b.id,
    questionCount: 0,
    dailyPlan: [],
    contentVersion: 'c1-' + Object.keys(b.units || {}).length,
    createdAt: now,
    updatedAt: now
  };
}

/* ---------------- 导出 ---------------- */
console.log('\n========================================');
console.log(' 教材数据导出（供控制台导入）');
console.log('========================================\n');

const docs = [];

// 49 本目录
BOOKS.forEach((b, i) => docs.push(toDoc(b, i)));
console.log(`目录教材：${BOOKS.length} 本`);

// 7 本自编
const ai = loadAiBooks();
ai.forEach((b) => docs.push(toAiDoc(b)));
console.log(`自编教材：${ai.length} 本`);

// 去重（_id 冲突检查）
const seen = new Map();
const dup = [];
docs.forEach((d) => {
  if (seen.has(d._id)) dup.push(`${d._id}（${d.title}）`);
  seen.set(d._id, true);
});
if (dup.length) {
  console.log(`\n⚠️  _id 重复 ${dup.length} 处，导入会失败：`);
  dup.forEach((d) => console.log('     ' + d));
  process.exit(1);
}

/**
 * ⚠️ subject 白名单校验（2026-10-06 加）
 * ------------------------------------------------------------------
 * 为什么必须校验：
 *   subject 是书库筛选的唯一依据。数据里一旦出现白名单外的值，
 *   前端筛选栏里就**没有对应选项**，那本书永远筛不出来，
 *   而且不报任何错——书看起来"丢了"。
 *
 *   实际踩到过两处：
 *     · 小学道德与法治 写成 subject:'道法'
 *     · 《细胞生物学》写成 subject:'生物学'（书名是生物学，学科不是）
 *
 * 规则：**学科用规范名，书名可以带学科修饰词**。
 * 新增学科时，先加进 book-subjects.js 的白名单。
 */
const SUBJECTS_FILE = path.join(__dirname, 'book-subjects.js');
const { SUBJECT_WHITELIST, isValidSubject } = require(SUBJECTS_FILE);

const badSubjects = [];
docs.forEach((d) => {
  const s = (d.subject || '').trim();
  if (!s) {
    badSubjects.push(`${d._id}（${d.title}）→ subject 为空`);
  } else if (!isValidSubject(s)) {
    badSubjects.push(`${d._id}（${d.title}）→ subject='${s}' 不在白名单里`);
  }
});
if (badSubjects.length) {
  console.log(`\n❌ subject 校验未通过（${badSubjects.length} 处），导出会造成"书筛不出来"：`);
  badSubjects.forEach((s) => console.log('     ' + s));
  console.log(`\n   合法学科（${SUBJECT_WHITELIST.length} 个）：${SUBJECT_WHITELIST.join(' / ')}`);
  console.log('\n   改完重跑本脚本。真的需要新学科，先加进 tools/book-subjects.js。');
  process.exit(1);
}

// stage 白名单同理：'general'（综合）等必须有定义，否则"学段"筛选会漏书
const VALID_STAGES = ['primary', 'junior', 'senior', 'college', 'exam', 'work', 'general'];
const badStages = docs.filter((d) => VALID_STAGES.indexOf(d.stage) < 0);
if (badStages.length) {
  console.log(`\n❌ stage 非法（${badStages.length} 处）：`);
  badStages.forEach((d) => console.log(`     ${d._id}（${d.title}）→ stage='${d.stage}'`));
  console.log(`   合法学段：${VALID_STAGES.join(' / ')}`);
  process.exit(1);
}

console.log(`\n校验通过：subject / stage 全部合法`);

fs.mkdirSync(OUT_DIR, { recursive: true });
const outFile = path.join(OUT_DIR, 'books.json');

/**
 * ⚠️ 格式必须是 **JSON Lines**，不是 JSON 数组（2026-10-06 实际踩到）。
 *
 * 云开发控制台「导入」报：
 *   `Error: Pol error. 导入数据格式不正确，请检查是否为 JSON Lines 格式`
 * 因为它要的是**一行一条 JSON 记录**，而不是一个 `[...]` 数组。
 *
 * 而且它会先把整个文件当单行解析 —— 数组形式第一步就挂。
 */
const jsonl = docs.map((d) => JSON.stringify(d)).join('\n') + '\n';
fs.writeFileSync(outFile, jsonl, 'utf8');

const bytes = fs.statSync(outFile).size;
const points = docs.reduce((a, d) => a + (d.pointCount || 0), 0);
const full = docs.filter((d) => d.hasFullContent).length;

console.log(`\n共 ${docs.length} 本（${full} 本含完整正文），${points} 个知识点`);
console.log(`\n导出到：${path.relative(ROOT, outFile)}`);
console.log(`大小　：${(bytes / 1024 / 1024).toFixed(2)} MB`);

// 顺便给一份书名清单，方便用户核对数量
fs.writeFileSync(
  path.join(OUT_DIR, 'BOOKS.txt'),
  docs.map((d, i) => `${String(i + 1).padStart(2, '0')}. ${d.title}`).join('\n'),
  'utf8'
);

console.log('\n接下来（云开发控制台 → 数据库 → books 集合）：');
console.log('  1. 先手动建 12 个集合（见README）');
console.log('  2. 每个集合权限设为「所有用户可读，仅创建者可写」');
console.log('  3. 选中 books 集合 → 导入 → 选 books.json');
console.log('  4. 格式支持选 json（**必须是 JSON Lines：一行一条**，不是数组）');
console.log('  5. 冲突处理模式选 Insert（总是插入新记录）');
console.log('');

if (process.argv.includes('--open')) {
  try {
    execFileSync('explorer', [OUT_DIR], { stdio: 'ignore', windowsHide: true });
  } catch (e) { /* 忽略 */ }
}