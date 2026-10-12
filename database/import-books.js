/**
 * 导入全学段教材目录到云数据库 books 集合
 * ------------------------------------------------------------------
 * 用法：
 *   1. 先在云开发控制台建好 books 集合（权限选「仅创建者可读写」）
 *   2. node database/import-books.js
 *
 * 幂等：按 title 判断是否已存在，存在则跳过。
 * 可重复执行。
 */
const { BOOKS } = require('./book-catalog.js');
const cloud = require('wx-server-sdk');

const ENV_ID = process.env.ENV_ID || 'cloudbase-d5gioeybt3ae71f68';
cloud.init({ env: ENV_ID });

const db = cloud.database();
const cmd = db.command;

/** 学段中文名（前端展示用） */
const STAGE_NAME = {
  primary: '小学',
  junior: '初中',
  senior: '高中',
  college: '大学',
  exam: '考证',
  work: '职场'
};

/** 学段对应的热度基准，越靠前越热门 */
const STAGE_HOT = {
  primary: 80,
  junior: 95,
  senior: 100,
  college: 96,
  exam: 88,
  work: 70
};

function pickCover(title) {
  const COVER_GRADS = [
    ['#7b8cff', '#a78bfa'],
    ['#38d6e0', '#4aa8e8'],
    ['#34d6a8', '#5ad1c4'],
    ['#ffa26b', '#ff7ab0'],
    ['#ffd166', '#ffa96b'],
    ['#b06ab3', '#8b7bf7'],
    ['#4facfe', '#00d4f0'],
    ['#a8e063', '#4fbf7a']
  ];
  const s = title || '';
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return COVER_GRADS[h % COVER_GRADS.length];
}

/** 把目录库的一条记录转成 books 集合的文档 */
function toDoc(b, i) {
  const [coverFrom, coverTo] = pickCover(b.title);
  const pointCount = b.units.reduce((a, u) => a + u.points.length, 0);
  return {
    // 用标题做稳定 _id，重复导入不会产生重复数据
    _id: 'cat_' + i,
    title: b.title,
    subject: b.subject,
    stage: b.stage,
    stageName: STAGE_NAME[b.stage] || '综合',
    grade: b.grade,
    edition: b.edition,
    publisher: b.publisher,
    intro:
      b.units.length +
      ' 个单元 · ' +
      pointCount +
      ' 个核心知识点，AI 已预置知识骨架，打开即可开始背诵',
    cover: '',
    coverFrom,
    coverTo,
    official: true,
    status: 'published',
    tags: b.tags || [],
    author: '平台官方',
    hot: (STAGE_HOT[b.stage] || 80) - i,
    pointCount,
    // 目录大纲：AI 组网与出题的骨架
    units: b.units.map((u, ui) => ({
      index: ui + 1,
      name: u.name,
      points: u.points
    })),
    // 尚未生成，由前端触发 AI 解析后回填
    questionCount: 0,
    dailyPlan: [],
    catalogReady: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
}

async function main() {
  const docs = BOOKS.map(toDoc);

  const existing = await db.collection('books').where({ catalogReady: true }).get();
  const existingIds = new Set((existing.data || []).map((d) => d._id));

  let added = 0;
  let skipped = 0;

  for (const d of docs) {
    if (existingIds.has(d._id)) {
      skipped++;
      continue;
    }
    try {
      await db.collection('books').add({ data: d });
      added++;
      console.log('  + ' + d.title);
    } catch (err) {
      console.error('  ! ' + d.title + ' → ' + err.message);
    }
  }

  console.log('');
  console.log('完成：新增 ' + added + ' 本，跳过 ' + skipped + ' 本（已存在）');
  console.log('合计 ' + docs.length + ' 本教材已在书库中可被检索。');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('导入失败：', err.message);
    console.error('请检查：');
    console.error('  1. ENV_ID 是否正确（当前 ' + ENV_ID + '）');
    console.error('  2. books 集合是否已创建');
    console.error('  3. 是否已在云开发控制台登录授权');
    process.exit(1);
  });
