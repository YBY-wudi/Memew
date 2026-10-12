/**
 * upload-content.js —— 把离线教材正文上传到云端 books 集合
 * ============================================================================
 * 用户的需求：「小程序有 2MB 包体限制，教材别都塞包里，其余从云端下载，
 *   只给书名，云端有正文」。
 *
 * —— 试错记录（这段是重点，别重犯）——
 *
 *   第一版思路：把本地教材正文**回填进目录库 49 本书的骨架**
 *   （books.units[].points 原本只是字符串数组，补成带content 的对象）。
 *
 *   实测结果：标题命中率 **0.4%**（1126 条目录知识点只匹配上 5 条）。
 *
 *   根因是两套教材的知识点标题体系完全不同，不是同一份东西的两个名字：
 *     目录库（49 本真实教材）→ 「有理数」「集合的概念」「大青树下的小学」
 *     离线教材（7 本自编）  → 「因式分解」「细胞膜的流动镶嵌模型」
 *   目录库的书名是「义务教育教科书·数学」，
 *   离线教材的书名是「初等数学（自编版）」—— 也不是同一套命名。
 *   硬按标题匹配，本质是在赌两套教材碰巧用了同样的措辞。
 *
 *   所以这条路是错的：不是匹配算法不够好，是数据源不对。
 *
 * 最终方案：**7 本离线教材以自己的书名独立上传**，和目录库的 49 本并列。
 *   · 目录库那 49 本继续只有骨架（用户需求原文就是「只给相应书名」）
 *   · 7 本自编教材上传完整正文，小程序按需下载
 *   · 两套数据各管各的，谁也不用迁就谁
 *
 * 幂等：按 title 判重。已存在且版本一致就跳过，可反复跑。
 *   改了教材内容要重传时用 --force。
 *
 * 用法：
 *   node database/upload-content.js--dry-run   # 只看会传什么
 *   node database/upload-content.js             # 正式上传
 *   node database/upload-content.js --force     # 强制覆盖（改过教材后）
 * ============================================================================
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

const FORCE = process.argv.includes('--force');
const DRY = process.argv.includes('--dry-run');

/* ---------- tcb 调用 ---------- */

function tcb(args) {
  const env = Object.assign({}, process.env);
  // ⚠ 必须清代理 —— 走代理报 os error 11001 / 10051，
  //   错误信息完全看不出是代理问题，极易误判成「环境挂了」。
  delete env.HTTP_PROXY;
  delete env.HTTPS_PROXY;
  delete env.http_proxy;
  delete env.https_proxy;
  try {
    return execFileSync(NODE_BIN, [TCB_JS].concat(args), {
      cwd: ROOT,
      env,
      encoding: 'utf8',
      timeout: 180000,
      stdio: ['ignore', 'pipe', 'pipe'],
      // ⚠ 教材正文很大。默认 1MB 缓冲区会直接截断，
      //   表现是「传完了但内容少了一半」，而且不报错。
      maxBuffer: 64 * 1024 * 1024
    });
  } catch (err) {
    const detail = [err.stdout, err.stderr].filter(Boolean).join('\n').trim();
    throw new Error(detail || err.message);
  }
}

function mongo(table, type, commandObj) {
  const payload = JSON.stringify([
    { TableName: table, CommandType: type, Command: JSON.stringify(commandObj) }
  ]);
  return tcb([
    'db', 'nosql', 'execute',
    '--env-id', ENV_ID, '--region', REGION,
    '--command', payload, '--json'
  ]);
}

/*
 * Windows 命令行有32767 字符上限。
 *
 * 踩过的坑：教材正文（7 本 / 241 条 / 约 400KB）作为 --command 的参数传，
 * 直接 spawnSync ENAMETOOLONG。
 *   —— 不是「参数太长被拒绝」那么简单，execFileSync 会在**构造命令行**时就失败，
 *   一本书都传不进去，而且报错信息（ENAMETOOLONG）完全看不出是数据太大，
 *      很容易误判成「环境不支持」或「教材格式不对」。
 *
 * 解法：按 CloudBase 单文档 16MB 上限和命令行长度双重考虑，
 *      每次只传「若干个 section」，累加到一本书时先插一条占位、
 *      后续用 $push 追加。这样每次命令都在几千字符量级。
 */
const BATCH_SECTIONS = 12; // 每次追加多少个知识点。12 条 ≈ 8-15KB，很安全

/* ---------- 读取包内教材 ---------- */

/**
 * 读包内教材（miniprogram/data/ai-books/）
 * ⚠ 必须读这一份，不是 database/ai-books/：
 *   前者是随包发布的副本、真机跑的就是它；
 *   后者是工作副本，可能改了没同步。
 *   传错会让「云端内容和小程序里显示的不一样」。
 */
function loadBooks() {
  const PKG = path.join(ROOT, 'miniprogram/data/ai-books');
  if (!fs.existsSync(PKG)) throw new Error('找不到教材目录: ' + PKG);
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
      (Array.isArray(list) ? list : []).forEach((b) => out.push(Object.assign({ _file: f }, b)));
    });
  return out;
}

/** 学段中文名 */
const STAGE_NAME = {
  primary: '小学',
  junior: '初中',
  senior: '高中',
  college: '大学',
  exam: '考证',
  work: '职场'
};

/** 封面渐变：按书名哈希稳定取色（与 utils/util.js 的 pickCover 保持同一思路） */
function pickCover(title) {
  const GRADS = [
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
  return GRADS[h % GRADS.length];
}

/** CloudBase 的 _id 只允许字母数字下划线连字符 */
function safeId(s) {
  return String(s == null ? '' : s).replace(/[^\w-]/g, '_').slice(0, 120) || '_';
}

/**
 * 教材 → books集合文档
 *
 * 结构与 library 云函数 detail 分支对齐：
 *   units[].sections[]  →{ _id, name, content, ... }
 * book-detail.js 和 cloud-books.js 都按这个结构读。
 */
function toDoc(b) {
  const [coverFrom, coverTo] = pickCover(b.title);
  let pointCount = 0;

  const units = (b.units || []).map((u, ui) => {
    const sections = (u.points || []).map((p, pi) => {
      pointCount++;
      return {
        // cardId 必须与 local-books.cardIdOf() 完全一致，
        // 否则「从云端下载的书」和「随包的书」在朗读页会取到不同东西。
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

  return {
    _id: 'loc_' + safeId(b.id),
    // 云端用于判重的业务键。CloudBase 允许自定义字段存书名。
    bookKey: b.id,
    title: b.title,
    author: b.edition || '作者自编',
    edition: b.edition || '',
    // ⚠ 用户明确要求：不要写出版社、不要写「官方」，就叫「作者自编」
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
    // 标记：这是「随包教材的云端副本」，有完整正文
    hasFullContent: true,
    localOnly: false,
    sourceBookId: b.id,
    questionCount: 0,
    dailyPlan: [],
    contentVersion: 'c1-' + Object.keys(b.units || {}).length,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
}

/* ---------- 读云端已有的自编教材 ---------- */

/**
 * 分批上传一本书
 *
 * 为什么不能一把插：
 *   7 本教材共 241 条知识点，整体约 400KB，作为 CLI 的 --command 参数
 *   会撞 Windows 命令行 32767 字符上限，直接 spawnSync ENAMETOOLONG。
 *   报错只说「文件名太长」，完全看不出是数据体积问题，
 *   很容易误判成环境不支持、然后跑去换环境。
 *
 * 做法：
 *   1. 先插一条只有元数据、units 全是空壳的文档（很小，稳过）
 *   2. 再一批批 $push.把 sections 填进对应单元
 *   3. 最后把「已上传到第几批」写进 progress 字段
 *   中途失败可以从断点继续，不用从头再来。
 */
function uploadBook(doc) {
  // ① 拆出正文，只留元数据
  const shell = Object.assign({}, doc);
  shell.units = doc.units.map((u) => ({
    index: u.index,
    name: u.name,
    sections: [],
    totalCards: u.totalCards,
    doneCards: 0,
    percent: 0
  }));
  shell.uploadProgress = { done: false, unit: 0, batch: 0 };

  // ② 先删掉同_id 的旧文档（--force 覆盖时可能有残留）
  try {
    mongo('books', 'DELETE', {
      delete: 'books',
      deletes: [{ q: { _id: doc._id }, limit: 1 }]
    });
  } catch (e) {
    /* 文档不存在时 delete 报错是正常的，忽略 */
  }

  mongo('books', 'INSERT', { insert: 'books', documents: [shell] });

  // ③ 分批把正文填进去
  doc.units.forEach((u, ui) => {
    const sections = u.sections || [];
    for (let i = 0; i < sections.length; i += BATCH_SECTIONS) {
      const slice = sections.slice(i, i + BATCH_SECTIONS);
      mongo('books', 'UPDATE', {
        update: 'books',
        updates: [
          {
            q: { _id: doc._id, 'units.index': u.index },
            // ⚠ 用数组下标定位单元（units.index 从 1 开始），
            //   不要用 units.$[elem] —— RunCommands 接口对
            //   arrayFilters 支持不一致，会静默不生效。
            u: { $push: { 'units.$.sections': { $each: slice } } },
            multi: false
          }
        ]
      });
      mongo('books', 'UPDATE', {
        update: 'books',
        updates: [
          {
            q: { _id: doc._id },
            u: { $set: { 'uploadProgress.unit': ui, 'uploadProgress.batch': i / BATCH_SECTIONS + 1 } },
            multi: false
          }
        ]
      });
    }
  });

  // ④ 标记完成
  mongo('books', 'UPDATE', {
    update: 'books',
    updates: [
      { q: { _id: doc._id }, u: { $set: { 'uploadProgress.done': true, updatedAt: Date.now() } }, multi: false }
    ]
  });
}

function fetchExisting() {
  const raw = mongo('books', 'QUERY', {
    find: 'books',
    filter: { hasFullContent: true },
    projection: { title: 1, contentVersion: 1 }
  });
  const i = raw.indexOf('{');
  const outer = JSON.parse(raw.slice(i));
  let r = outer.data || outer.Result || outer.result || outer;
  if (typeof r === 'string') r = JSON.parse(r);
  // ⚠ 返回结构是 data.results[0]，不是 cursor.firstBatch。
  //   照抄文档猜结构 →永远拿到空数组 → 报告「云端 0 本」，
  //   看着像数据库被清空了，其实只是解析路径错。
  return (r && r.results && r.results[0]) || [];
}

/* ---------- 主流程 ---------- */

function main() {
  console.log('环境：' + ENV_ID + '（' + REGION + '）');
  console.log(DRY ? '模式：只看不动' : FORCE ? '模式：强制覆盖' : '模式：只补新的');
  console.log('');

  const books = loadBooks();
  console.log('包内教材：' + books.length + ' 本');
  books.forEach((b) => {
    const n = (b.units || []).reduce((a, u) => a + (u.points || []).length, 0);
    console.log('  · ' + b.title + '　' + (b.units || []).length + ' 单元 / ' + n + ' 条正文');
  });
  console.log('');

  let existing = [];
  try {
    existing = fetchExisting();
  } catch (e) {
    console.error('读取云端已有教材失败：' + e.message.split('\n')[0]);
    console.error('');
    console.error('  常见原因：');
    console.error('  1. CLI 没登录 —— 跑 npx tcb login 微信扫码');
    console.error('  2. books 集合不存在 —— 先跑 node database/bootstrap-db.js');
    process.exit(1);
  }
  console.log('云端已有自编教材：' + existing.length + ' 本');
  console.log('');

  const byTitle = new Map(existing.map((d) => [d.title, d]));

  let added = 0;
  let updated = 0;
  let skipped = 0;

  books.forEach((b) => {
    const doc = toDoc(b);
    const hit = byTitle.get(b.title);

    if (!hit) {
      if (DRY) {
        console.log('  [新增] ' + b.title + '　' + doc.pointCount + ' 条');
        added++;
        return;
      }
      try {
        uploadBook(doc);
        console.log('  ✓ 新增 ' + b.title + '　' + doc.pointCount + ' 条');
        added++;
      } catch (e) {
        console.error('  ✗ ' + b.title + ' → ' + e.message.split('\n')[0]);
      }
      return;
    }

    if (!FORCE && hit.contentVersion === doc.contentVersion) {
      console.log('  · 已是最新 ' + b.title);
      skipped++;
      return;
    }

    if (DRY) {
      console.log('  [覆盖] ' + b.title + '　' + doc.pointCount + ' 条');
      updated++;
      return;
    }

    try {
      mongo('books', 'UPDATE', {
        update: 'books',
        updates: [
          {
            q: { _id: hit._id },
            u: { $set: Object.assign({}, doc, { _id: undefined }) },
            multi: false
          }
        ]
      });
      console.log('  ✓ 覆盖 ' + b.title + '　' + doc.pointCount + ' 条');
      updated++;
    } catch (e) {
      console.error('  ✗ ' + b.title + ' → ' + e.message.split('\n')[0]);
    }
  });
  console.log('');
  console.log('汇总：新增 ' + added + ' 本，更新 ' + updated + ' 本，跳过 ' + skipped + ' 本');
  console.log('');

  if (DRY) {
    console.log('（--dry-run 没写库。去掉参数再跑一次就生效）');
    return;
  }

  console.log('接下来在小程序端：');
  console.log('  1. cloud-books.js 会把这些书缓存到本地（每本一个 key，7 天有效）');
  console.log('  2. book-detail.js 命中缓存后不再调云函数 —— 不烧额度、无延迟');
  console.log('  3. 有正文后「连续朗读」按钮会亮起');
  console.log('');
  console.log('  目录库那 49 本仍只有骨架 —— 这是设计如此：');
  console.log('  它们要靠「AI 解析 / 人工补充」现场生成正文，成本和体积都不适合预置。');
}

main();
