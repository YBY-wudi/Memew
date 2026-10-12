/**
 * 一键创建全部数据库集合 + 导入全学段教材目录
 * ------------------------------------------------------------------
 * 用法：
 *   node database/init-cloud.js
 *
 * 幂等：集合已存在会跳过，教材按 _id 去重。
 * 前置：已在云开发控制台完成「云开发 CLI 授权」（tcb login）。
 */
const cloud = require('wx-server-sdk');
const { BOOKS } = require('./book-catalog.js');

const ENV_ID = process.env.ENV_ID || 'cloudbase-d5gioeybt3ae71f68';
cloud.init({ env: ENV_ID });

/** 12 个集合：名称 + 说明 + 建议索引 */
const COLLECTIONS = [
  { name: 'users', desc: '用户档案' },
  { name: 'books', desc: '书籍（含官方教材目录）' },
  { name: 'user_books', desc: '用户领用的书与进度' },
  { name: 'cards', desc: '记忆卡片' },
  { name: 'questions', desc: '题目' },
  { name: 'answers', desc: '答题记录' },
  { name: 'checkins', desc: '打卡记录' },
  { name: 'user_medals', desc: '用户勋章' },
  { name: 'quota', desc: '每日额度' },
  { name: 'networks', desc: 'AI 知识网络' },
  // ⚠️ 漏过：分享功能上线时加的集合，之前只补进了 ready.js 的校验清单，
  // 没补进本文件 —— 于是新环境建集合时会少建这一个，
  // 表现是「其他都对，只有分享功能报集合不存在」。
  { name: 'shares', desc: '书籍分享链接' },
  { name: 'submissions', desc: '用户投稿' }
];

const STAGE_NAME = {
  primary: '小学',
  junior: '初中',
  senior: '高中',
  college: '大学',
  exam: '考证',
  work: '职场'
};

const STAGE_HOT = {
  primary: 80,
  junior: 95,
  senior: 100,
  college: 96,
  exam: 88,
  work: 70
};

function pickCover(title) {
  const G = [
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
  return G[h % G.length];
}

function toDoc(b, i) {
  const [coverFrom, coverTo] = pickCover(b.title);
  const pointCount = b.units.reduce((a, u) => a + u.points.length, 0);
  return {
    _id: 'cat_' + i,
    title: b.title,
    subject: b.subject,
    stage: b.stage,
    stageName: STAGE_NAME[b.stage] || '综合',
    grade: b.grade,
    edition: b.edition,
    publisher: b.publisher,
    intro: b.units.length + ' 个单元 · ' + pointCount + ' 个核心知识点，AI 已预置知识骨架',
    cover: '',
    coverFrom,
    coverTo,
    official: true,
    status: 'published',
    tags: b.tags || [],
    author: '平台官方',
    hot: (STAGE_HOT[b.stage] || 80) - i,
    pointCount,
    units: b.units.map((u, ui) => ({ index: ui + 1, name: u.name, points: u.points })),
    questionCount: 0,
    dailyPlan: [],
    catalogReady: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
}

async function main() {
  const db = cloud.database();
  console.log('环境：' + ENV_ID);
  console.log('');

  /* ---------- 1. 检查现有集合 ---------- */
  let existing = [];
  try {
    const r = await db.collection('books').limit(1).get();
    existing = r.data ? ['books'] : [];
  } catch (e) {
    existing = [];
  }
  console.log('已存在的集合：' + (existing.join(', ') || '（无）'));
  console.log('');
  console.log('⚠️  CloudBase CLI 无法通过 SDK 创建集合。');
  console.log('   请先在控制台手动创建以下 12 个集合：');
  COLLECTIONS.forEach((c) => console.log('     · ' + c.name + '  — ' + c.desc));
  console.log('');
  console.log('   每个集合权限设为「所有用户可读，仅创建者可写」。');
  console.log('   建好后重新运行本脚本，即可自动导入教材。');
  console.log('');

  /* ---------- 2. 导入教材（集合存在才执行） ---------- */
  const docs = BOOKS.map(toDoc);
  let added = 0;
  let skipped = 0;
  let failed = 0;

  for (const d of docs) {
    try {
      const hit = await db.collection('books').doc(d._id).get();
      if (hit.data && hit.data.length) {
        skipped++;
        continue;
      }
    } catch (e) {
      // doc 不存在，继续走新增
    }
    try {
      await db.collection('books').add({ data: d });
      added++;
      console.log('  + ' + d.title);
    } catch (err) {
      failed++;
      console.error('  ! ' + d.title + ' → ' + err.message);
    }
  }

  console.log('');
  console.log('教材导入：新增 ' + added + '，跳过 ' + skipped + '，失败 ' + failed);
  console.log('合计 ' + docs.length + ' 本教材（' +
    docs.reduce((a, d) => a + d.pointCount, 0) + ' 个知识点）。');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('执行失败：', err.message);
    process.exit(1);
  });
