/**
 * 数据库一键初始化脚本
 * ------------------------------------------------------------
 * 用法：
 *   1. 在项目根目录执行：npm i @cloudbase/node-sdk
 *   2. 填好下面的 ENV_ID 与 SECRET_ID / SECRET_KEY（在云开发控制台 → 设置 → 访问密钥）
 *   3. node database/init.js
 *
 * 脚本会：
 *   - 创建全部 12 个集合（已存在则跳过）
 *   - 写入 6 本官方教材种子数据
 *   - 输出索引与权限的手动配置清单（索引需在控制台点选，无法脚本化）
 *
 * ⚠️ 请勿把密钥提交到代码仓库。
 */

const ENV_ID = process.env.MEMOR_ENV || '在这里填你的环境ID';
const SECRET_ID = process.env.MEMOR_SECRET_ID || '';
const SECRET_KEY = process.env.MEMOR_SECRET_KEY || '';

const tcb = require('@cloudbase/node-sdk');
const app = tcb.init({ env: ENV_ID, secretId: SECRET_ID, secretKey: SECRET_KEY });
const db = app.database();

const COLLECTIONS = [
  'users',
  'books',
  'user_books',
  'cards',
  'questions',
  'answers',
  'checkins',
  'user_medals',
  'quota',
  'networks',
  'submissions'
];

const SEED_BOOKS = [
  { title: '普通高中教科书·生物学 必修第一册', subject: '生物', edition: '人教版', publisher: '人民教育出版社', official: true, status: 'published', hot: 100, tags: ['人教版', '必修'], author: '平台官方' },
  { title: '普通高中教科书·生物学 必修第二册', subject: '生物', edition: '人教版', publisher: '人民教育出版社', official: true, status: 'published', hot: 96, tags: ['人教版', '必修'], author: '平台官方' },
  { title: '普通高中教科书·化学 必修第一册', subject: '化学', edition: '人教版', publisher: '人民教育出版社', official: true, status: 'published', hot: 92, tags: ['人教版', '必修'], author: '平台官方' },
  { title: '义务教育教科书·道德与法治 八年级上册', subject: '政治', edition: '部编版', publisher: '人民教育出版社', official: true, status: 'published', hot: 88, tags: ['部编版', '初中'], author: '平台官方' },
  { title: '普通高中教科书·历史 必修中外历史纲要（上）', subject: '历史', edition: '统编版', publisher: '人民教育出版社', official: true, status: 'published', hot: 84, tags: ['统编版', '高中'], author: '平台官方' },
  { title: '考研英语核心词汇 1575', subject: '考研', edition: '', publisher: '', official: true, status: 'published', hot: 99, tags: ['考研', '词汇'], author: '平台官方' }
];

(async () => {
  if (!SECRET_ID || !SECRET_KEY || ENV_ID.indexOf('这里') > -1) {
    console.error('请先配置 ENV_ID / SECRET_ID / SECRET_KEY');
    process.exit(1);
  }

  // 1. 建集合
  for (const name of COLLECTIONS) {
    try {
      await db.createCollection(name);
      console.log('  ✅ 创建集合', name);
    } catch (err) {
      console.log('  ➖ 集合已存在', name, '（跳过）');
    }
  }

  // 2. 种子书籍
  const exist = await db.collection('books').where({ official: true }).count();
  if (exist.total === 0) {
    const now = Date.now();
    const docs = SEED_BOOKS.map((b) => Object.assign({ units: [], dailyPlan: [], pointCount: 0, questionCount: 0, cover: '', intro: '', createdAt: now, updatedAt: now }, b));
    await db.collection('books').add(docs);
    console.log('  ✅ 写入官方教材种子数据', docs.length, '本');
  } else {
    console.log('  ➖ 官方教材已存在', exist.total, '本（跳过）');
  }

  console.log('\n完成。接下来请在云开发控制台手动配置：');
  console.log('  1) 所有集合权限 → 「仅创建者可读写」');
  console.log('  2) 按 database/README.md 第四节建立索引');
  console.log('  3) 打开小程序生成自己的 users 记录，把 role 改为 admin');
})().catch((err) => {
  console.error('初始化失败：', err.message);
  process.exit(1);
});
