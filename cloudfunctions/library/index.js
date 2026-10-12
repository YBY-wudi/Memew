/**
 * library —— 云端教材书库
 * ------------------------------------------------------------
 * 对应需求文档第三章「云端正版教材书库体系」。
 *
 * action:
 *   official  官方书库列表（分页 / 学科筛选 / 关键词 / 排序）
 *   myBooks   我的书籍（官方已领取 + 自制已上架/待审核）
 *   detail    书籍详情（含单元结构与今日背诵计划）
 *   progress  上报学习进度
 *   claim     领取官方书籍（生成学习库 + 每日计划）
 *   filters   返回全量筛选项（学科/分类标签，供前端筛选栏渲染）
 */
const { ok, fail, col, cmd, db, OPENID } = require('./common.js');

/**
 * 学科 / 学段「不过滤」的哨兵值
 * ------------------------------------------------------------------
 * ⚠️ 2026-10-06 排查了一整天的空书库，根因就是这个。
 *
 * 前端（miniprogram/pages/library/library.js）传的是**英文 key**：
 *     subject: 'all'  /  'chinese'
 *     stage:   'all'  /  'primary'
 *
 * 而云函数原来只把中文的 '全部' 当成「不过滤」：
 *     if (event.subject && event.subject !== '全部') where.subject = event.subject;
 *
 * 于是 'all' 被当成一个真实的学科值塞进 where：
 *     where = { official:true, status:'published', subject:'all', stage:'all' }
 * 数据库里 56 本书没有一本 subject==='all' → **返回 0 条，且不报错**。
 * 表现就是：控制台明明有书，小程序书库一片空白，也不弹任何错误。
 *
 * 所以任何「空结果」都必须先确认是「真的没数据」还是「条件写错了」，
 * 绝不能靠"数据库里明明有书"反推。
 */
const NONE_KEYS = ['', 'all', 'ALL', '全部', '不限', 'none', 'null', 'undefined'];

/** 归一化筛选值：命中哨兵 → 返回空串（表示不过滤） */
function normFilter(v) {
  const s = v == null ? '' : String(v).trim();
  return NONE_KEYS.indexOf(s) >= 0 ? '' : s;
}

/**
 * 学科 key → 中文值
 * ------------------------------------------------------------------
 * 数据库里 subject 存的是中文（'语文'/'数学'…），前端筛选 chip 用的是英文 key。
 * 不做这层映射，点「语文」会拼出 subject:'chinese' → 同样 0 条。
 * 新增学科时这里和 miniprogram/utils/constants.js 的 SUBJECTS 都要补。
 */
const SUBJECT_KEY_MAP = {
  chinese: '语文',
  math: '数学',
  english: '英语',
  physics: '物理',
  chemistry: '化学',
  biology: '生物',
  politics: '政治',
  history: '历史',
  geography: '地理',
  major: '专业课',
  exam: '公考'
};

/** 学科值归一化：英文 key 翻中文，中文原样返回 */
function normSubject(v) {
  const s = normFilter(v);
  if (!s) return '';
  return SUBJECT_KEY_MAP[s] || s;
}

/** 学段值归一化 */
const STAGE_KEY_MAP = {
  primary: 'primary',
  junior: 'junior',
  senior: 'senior',
  college: 'college',
  exam: 'exam',
  work: 'work'
};
function normStage(v) {
  const s = normFilter(v);
  if (!s) return '';
  return STAGE_KEY_MAP[s] || s;
}

/** 排序映射：值 -1 = 降序，1 = 升序 */
const SORTS = {
  default: -1,
  hot: -1,
  new: -1,
  progress: -1
};

/** 各排序对应的字段 */
const SORT_FIELD = {
  default: 'hot',
  hot: 'hot',
  new: 'createdAt',
  progress: 'progress'
};

/**
 * 排序字段推导
 * ------------------------------------------------------------------
 * ⚠️ 原来这行推导是坏的：
 *     const sortField = SORTS[x].official !== undefined ? 'official'
 *                     : SORTS[x].hot     !== undefined ? 'hot'
 *                     : null;
 *   `new`（{createdAt:-1}）和 `progress`（{progress:-1}）两个条件都不成立，
 *   sortField 变成 null → `orderBy(null, ...)` →
 *   云开发报 `errCode:-401003 api parameter type error /
 *             parameter.name should be string instead of object`。
 *   表现就是**书库一打开就弹这个黑框**。
 *
 * 现在改成查表，字段永远不会是 null。
 */
function resolveSort(sortBy) {
  const key = Object.prototype.hasOwnProperty.call(SORT_FIELD, sortBy) ? sortBy : 'default';
  return { key, field: SORT_FIELD[key], order: SORTS[key] === 1 ? 'asc' : 'desc' };
}

/** 学科中文名 → 展示顺序（用于 filters 接口排序） */
const SUBJECT_ORDER = [
  '语文', '数学', '英语', '科学', '道德与法治', '道法', '物理', '化学', '生物', '生物学',
  '政治', '历史', '地理', '公考', '考研', '专业课', '语言学', '文学', '计算机',
  '医学', '法学', '财会', '建筑', '教育', '通用能力', '生活常识'
];

const STAGES = [
  { key: 'primary', name: '小学' },
  { key: 'junior', name: '初中' },
  { key: 'senior', name: '高中' },
  { key: 'college', name: '大学' },
  { key: 'exam', name: '考证' },
  { key: 'work', name: '职场' },
  { key: 'general', name: '综合' }
];

exports.main = async (event) => {
  const action = event.action || 'official';
  const openid = OPENID();
  if (!openid) return fail('未获取到用户身份');

  try {
    /* ---------- 官方书库 ---------- */
    if (action === 'official') {
      const page = event.page || 1;
      const pageSize = event.pageSize || 12;
      const where = { official: true, status: 'published' };

      // ⚠️ 必须走归一化，不能直接用 event.subject / event.stage。
      //    前端传 'all'（英文 key），数据库里没有这个值，
      //    直接塞进 where 会静默查出 0 条 —— 见文件头 NONE_KEYS 的说明。
      const subject = normSubject(event.subject);
      const stage = normStage(event.stage);
      const keyword = normFilter(event.keyword);

      if (subject) where.subject = subject;
      if (stage) where.stage = stage;
      if (keyword) where.title = db.RegExp({ regexp: escapeReg(keyword), options: 'i' });

      const sort = resolveSort(event.sortBy);

      // ⚠️ 这里原来写的是 .catch(() => ({ data: [] }))
      // 2026-10-06 踩坑：数据库权限没设 / 索引缺失 / 字段名不对，
      // 都会走到 catch，于是**任何失败都被伪装成「书库是空的」**。
      // 表现：小程序书库一片空白，控制台里 56 本书明明在。
      // 现在：查询失败直接把真实错误抛给前端。
      //
      // ⚠️ sortBy='progress' 特殊处理：
      //   books 集合里**没有** progress 字段（进度存在 user_books 里），
      //   orderBy('progress') 会因为缺索引直接报错。
      //   所以 progress 改成：不按 progress 排序 → 取一页 →
      //   合并该用户已领书籍的进度 → 内存里排序。
      const needProgress = sort.key === 'progress';

      let query = col('books').where(where);
      if (needProgress) {
        query = query.limit(Math.max(pageSize * page, 60));
      } else {
        query = query.orderBy(sort.field, sort.order).skip((page - 1) * pageSize).limit(pageSize);
      }

      const res = await query.get().catch((dbErr) => {
        console.error('[library] official 查询失败', dbErr);
        throw dbErr;
      });

      let list = res.data || [];

      if (needProgress) {
        list = await sortByProgress(list, openid);
        const start = (page - 1) * pageSize;
        list = list.slice(start, start + pageSize);
      }

      // ⚠️ 关键：查到了 0 条时，必须把"生效的筛选条件"回传。
      //    否则前端只看到空列表，无法判断是「真的没有」还是「条件写错了」——
      //    这次空书库排查了半天，就是因为日志里只有一个 books: []。
      //    只要带上 applied，就能一眼看出 subject:'all' 这种荒谬条件。
      //
      //    注意：这里**不返回 filters**。filters 要从全量文档统计，
      //    而 list 只是当前这一页（默认 12 条），拿它统计会得到残缺的筛选项。
      //    前端单独调 action:'filters' 拿全量筛选项。
      return ok({
        books: list.map((b) => toBookBrief(b, openid)),
        hasMore: list.length === pageSize,
        page,
        applied: {
          subject: subject || null,
          stage: stage || null,
          keyword: keyword || null,
          sortBy: sort.key,
          sortField: sort.field
        },
        total: await countBooks(where)
      });
    }

    /* ---------- 筛选项（从库里实际存在的值反推） ---------- */
    if (action === 'filters') {
      const where = { official: true, status: 'published' };
      const subject = normSubject(event.subject);
      const stage = normStage(event.stage);
      if (subject) where.subject = subject;
      if (stage) where.stage = stage;

      // 只取两个字段，limit 给足 200 —— 教材总量远小于这个数
      const res = await col('books')
        .where(where)
        .field({ subject: true, stage: true })
        .limit(200)
        .get();

      return ok(buildFilters(res.data || [], subject));
    }

    /* ---------- 我的书籍 ---------- */
    if (action === 'myBooks') {
      // ⚠️ 这里原来每条查询都挂 .catch(() => ({ data: [] }))，
      //    等于把「集合不存在 / 权限不足 / 索引缺失」全部显示成「你还没领书」。
      //    现在统一让错误抛到外层 catch，前端能看到真实原因。
      const [claimed, mine] = await Promise.all([
        col('user_books').where({ _openid: openid }).limit(200).get(),
        col('books').where({ _openid: openid }).limit(200).get()
      ]);

      const claimedIds = (claimed.data || []).map((c) => c.bookId);
      let officialBooks = [];
      if (claimedIds.length) {
        const r = await col('books')
          .where({ _id: cmd.in(claimedIds) })
          .limit(200)
          .get();
        officialBooks = (r.data || []).map((b) =>
          toBookBrief(
            Object.assign({}, b, { progress: progressOf(claimed.data, b._id) }),
            openid
          )
        );
      }

      const myBooks = (mine.data || []).map((b) => toBookBrief(b, openid));
      return ok({
        books: officialBooks.concat(myBooks),
        officialCount: officialBooks.length,
        myCount: myBooks.length
      });
    }

    /* ---------- 书籍详情 ---------- */
    if (action === 'detail') {
      const { bookId } = event;
      if (!bookId) return fail('缺少 bookId');
      const res = await col('books').doc(bookId).get().catch(() => ({ data: null }));
      if (!res || !res.data) return fail('书籍不存在');
      if (!res.data.official && res.data._openid !== openid) return fail('无权查看');

      const claimed = await col('user_books')
        .where({ _openid: openid, bookId })
        .limit(1)
        .get()
        .catch(() => ({ data: [] }));
      const ub = claimed.data && claimed.data[0];

      return ok({
        book: Object.assign(toBookBrief(res.data, openid), {
          units: res.data.units || [],
          dailyPlan: res.data.dailyPlan || [],
          intro: res.data.intro || '',
          tags: res.data.tags || [],
          progress: progressOf(claimed.data, bookId),
          claimed: !!ub,
          doneMap: (ub && ub.doneMap) || {}
        })
      });
    }

    /* ---------- 上报进度 ---------- */
    if (action === 'progress') {
      const { bookId, progress } = event;
      if (!bookId) return fail('缺少 bookId');
      const find = await col('user_books')
        .where({ _openid: openid, bookId })
        .limit(1)
        .get()
        .catch(() => ({ data: [] }));
      if (find.data && find.data.length) {
        await col('user_books')
          .doc(find.data[0]._id)
          .update({ data: { progress: progress || 0, updatedAt: Date.now() } });
      } else {
        await col('user_books').add({
          data: {
            _openid: openid,
            bookId,
            progress: progress || 0,
            doneMap: {},
            createdAt: Date.now(),
            updatedAt: Date.now()
          }
        });
      }
      return ok({ progress: progress || 0 });
    }

    /* ---------- 领取官方书籍 ---------- */
    if (action === 'claim') {
      const { bookId } = event;
      if (!bookId) return fail('缺少 bookId');
      const exist = await col('user_books')
        .where({ _openid: openid, bookId })
        .limit(1)
        .get();
      if (exist.data && exist.data.length) return ok({ claimed: true, duplicated: true });

      const book = await col('books').doc(bookId).get().catch(() => ({ data: null }));
      if (!book || !book.data) return fail('书籍不存在');

      await col('user_books').add({
        data: {
          _openid: openid,
          bookId,
          progress: 0,
          doneMap: {},
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      });
      return ok({ claimed: true, dailyPlan: book.data.dailyPlan || [] });
    }

    return fail('未知 action: ' + action);
  } catch (err) {
    console.error('[library]', action, err);
    return fail(err.message || '服务异常');
  }
};

/* ============ 辅助 ============ */

function escapeReg(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 统计匹配条数（用于告诉前端「总共多少本」，便于分辨「筛选后为空」）
 * count 失败不该影响主查询，所以单独兜底。
 */
async function countBooks(where) {
  try {
    const r = await col('books').where(where).count();
    return r.total || 0;
  } catch (e) {
    console.error('[library] count 失败', e.message);
    return -1;
  }
}

/**
 * 从全量文档里统计出实际存在的筛选项
 * ------------------------------------------------------------------
 * 为什么不写死 SUBJECTS 列表？
 *   因为数据库里的 subject 值比前端常量多（道法/科学/生活常识/生物学…），
 *   写死会导致「有这本书但筛选栏里没有对应选项，用户永远筛不出来」。
 *   让筛选栏跟着数据走，加书不用改代码。
 *
 * @param {Array} docs   已按条件查出的文档（official + filters 时是全量）
 * @param {string} curSubject 当前选中的学科，用于标记
 */
function buildFilters(docs, curSubject) {
  const subjCount = {};
  const stageCount = {};
  (docs || []).forEach((d) => {
    const s = d.subject || '';
    if (s) subjCount[s] = (subjCount[s] || 0) + 1;
    const g = d.stage || '';
    if (g) stageCount[g] = (stageCount[g] || 0) + 1;
  });

  // 学科按 SUBJECT_ORDER 排，未知学科排最后（按拼音不靠谱，直接按数量）
  const subjects = Object.keys(subjCount)
    .sort((a, b) => {
      const ia = SUBJECT_ORDER.indexOf(a);
      const ib = SUBJECT_ORDER.indexOf(b);
      const ra = ia < 0 ? 999 : ia;
      const rb = ib < 0 ? 999 : ib;
      if (ra !== rb) return ra - rb;
      return subjCount[b] - subjCount[a];
    })
    .map((name) => ({
      key: name,
      value: name,
      name,
      count: subjCount[name],
      on: curSubject === name
    }));

  const stageName = {};
  STAGES.forEach((s) => {
    stageName[s.key] = s.name;
  });
  const stages = Object.keys(stageCount)
    .sort((a, b) => {
      const ia = STAGES.findIndex((s) => s.key === a);
      const ib = STAGES.findIndex((s) => s.key === b);
      const ra = ia < 0 ? 999 : ia;
      const rb = ib < 0 ? 999 : ib;
      return ra - rb;
    })
    .map((key) => ({
      key,
      value: key,
      name: stageName[key] || key,
      count: stageCount[key]
    }));

  return {
    subjects,
    stages,
    total: (docs || []).length,
    // 有书但当前学科筛不出任何书 → 说明 SUBJECT_KEY_MAP 或数据里的 subject 写错了
    hint: curSubject && !(docs || []).length ? `库里没有 subject='${curSubject}' 的书` : ''
  };
}

/**
 * 「我的进度」排序
 * ------------------------------------------------------------------
 * books 集合没有 progress 字段（它在 user_books 里），
 * 所以 orderBy('progress') 会直接报错（缺索引 / 字段不存在）。
 * 改成：拉一批 → 查该用户已领书籍的进度 → 合并 → 内存排序。
 * 教材量级（几百本）完全撑得住，比为此建字段+索引简单得多。
 */
async function sortByProgress(books, openid) {
  let map = {};
  try {
    const r = await col('user_books').where({ _openid: openid }).limit(500).get();
    (r.data || []).forEach((u) => {
      map[u.bookId] = u.progress || 0;
    });
  } catch (e) {
    // 进度查不到就全部当 0 排，不能因为排序失败而整个列表打不开
    console.error('[library] progress 排序取进度失败，降级为按 0 排', e.message);
  }
  return books
    .map((b) => Object.assign({}, b, { progress: map[b._id] || 0 }))
    .sort((a, b) => b.progress - a.progress || (b.hot || 0) - (a.hot || 0));
}

function progressOf(userBooks, bookId) {
  if (!userBooks || !userBooks.length) return 0;
  const hit = userBooks.find((b) => b.bookId === bookId);
  return hit ? hit.progress || 0 : 0;
}

/**
 * 书籍精简结构（列表页用，省流量）
 *
 * 🔴🔴 `isMine` 必须**在这里算**，不能指望前端。
 *   前端 `library.wxml` 有 `wx:if="{{item.isMine}}"` 显示「我的」标签，
 *   但这个字段从来没被返回过 → 标签永远不显示，
 *   于是「我的书籍」里的自编书和公共书在列表上长得一模一样，
 *   用户分不清哪本是自己上传的（用户报过「有三本同样的书分不清」）。
 *
 * ⚠️ 判定口径**不能只写 `official === false`**：
 *   那样任何人的非官方书对所有人都算「我的」，会泄露别人的私有书归属。
 *   唯一可靠的口径是 `_openid === 当前登录用户`。
 *   ⚠️ openid 可能取不到（本地调试 / 上下文异常），
 *   此时**宁可返回 false** —— 把别人的书标成「我的」比不显示标签严重得多。
 */
function toBookBrief(b, openid) {
  return {
    // 🔴 _id 必须一起返回。
    //   列表页 WXML 用 `wx:key="_id"` 和 `data-id="{{item._id}}"` 定位卡片，
    //   而这里原本只给了 `bookId` / `id`（同值别名）。
    //   缺 _id 的后果是**点任何一本书都跳到「书籍不存在」**：
    //   data-id 变成 undefined → 详情页拿不到 bookId → 云函数查不到文档。
    //   修法选在云端而不是改 WXML，因为 _id 是「这条文档的主键」，
    //   前端多处（wx:key / data-id / 后续查询）都默认它存在。
    _id: b._id,
    id: b._id,
    bookId: b._id,
    title: b.title || '',
    cover: b.cover || '',
    subject: b.subject || '',
    stage: b.stage || '',
    stageName: b.stageName || '',
    grade: b.grade || '',
    edition: b.edition || '',
    publisher: b.publisher || '',
    official: !!b.official,
    status: b.status || 'published',
    // 🔴 见函数头注释：只能靠 _openid 比对，且 openid 取不到时必须为 false
    isMine: !!(openid && b._openid && b._openid === openid),
    tags: b.tags || [],
    unitCount: (b.units || []).length,
    // 🔴 知识点数要兼容**两种结构**（线上 59 本实测）：
    //   ① 完整正文（7 本自编，upload-content.js 传的）
    //      units[].sections[] = { _id, name, content }
    //   ② 只有骨架（books 集合里的 official 教材）
    //      units[].points[]  = ["大青树下的小学", ...]  ← 纯字符串数组
    //
    //   原来只数 sections → 49 本骨架书全部算成 0
    //   → 书库页显示「0 单元 0 知识点」
    //   → 用户以为教材库里是空的。
    //
    //   优先用 pointCount（导入时算好的），没有再数。
    sectionCount:
      b.pointCount ||
      (b.units || []).reduce(
        (n, u) => n + ((u.sections || u.points || []).length),
        0
      ),
    pointCount: b.pointCount || 0,
    questionCount: b.questionCount || 0,
    hot: b.hot || 0,
    progress: b.progress || 0,
    // 署名口径：自编书统一署平台名，用户上传的署「用户共创」。
    // 不要写「官方」——我们是个人/团队自编，不是官方出版方，
    // 用「官方」在应用商店审核和版权上是风险点（已踩过）。
    author: b.author || (b.official ? '咪猫爱背诵 AI 编著' : '用户共创'),
    createdAt: b.createdAt || 0
  };
}

// 调试用导出：部署完可以在云函数控制台直接调用验证筛选逻辑
// wx-server-sdk 的 exports 只能挂 main，多余的字段部署时会被忽略，
// 所以这里只是给本地 node 语法检查和单测用。
exports.STAGES = STAGES;
exports.SUBJECT_ORDER = SUBJECT_ORDER;
exports.SUBJECT_KEY_MAP = SUBJECT_KEY_MAP;
exports.NONE_KEYS = NONE_KEYS;
exports.normFilter = normFilter;
// 🔴 toBookBrief 的 isMine 判定是「安全相关」的（错标就把别人的私有书
//   标成你的），只靠端到端测试覆盖不够 —— 边界（无 openid / 无 _openid）
//   在端到端里构造不出来，所以导出给单测直调。
exports.toBookBrief = toBookBrief;
exports.normSubject = normSubject;
exports.normStage = normStage;
exports.resolveSort = resolveSort;
exports.buildFilters = buildFilters;
