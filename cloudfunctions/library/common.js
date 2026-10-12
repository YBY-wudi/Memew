/**
 * 云函数公共库
 * ------------------------------------------------------------
 * 统一返回结构 + 数据库封装 + 勋章规则 + 额度规则。
 * ⚠️ 这里是「后端可改内容」的集中处：额度数值、勋章门槛、连续打卡奖励。
 */

/* ============ 统一返回结构 ============ */
/**
 * 同时兼容两种读法：
 *  1) cloud.callFunction 封装读 result.data
 *  2) 页面直连 wx.cloud.callFunction 读 result.xxx
 */
function ok(data, extra) {
  const payload = data || {};
  // ⚠ **不要**简化成 Object.assign({}, payload)。
  //   code/message 是本协议的固定字段，必须由这里提供。
  //   Object.assign(payload 的展开在前) 意味着 payload 里若有名为 code 的字段
  //   （比如某云函数返回 { code: 'A1', name: '诊断' }），
  //   会把协议用的 code:0 覆盖掉 → 前端 `r.code === 0` 判定失败 →
  //   明明成功却被当成失败，且不报任何错。
  //   实测项目里目前没有云函数在 payload 内部放 code，但这是很容易踩到的坑，
  //   所以在这里显式拦住，而不是靠"大家都记得"。
  if (payload.code !== undefined && payload.code !== 0) {
    console.error(
      '[ok] payload 里带了 code=' + JSON.stringify(payload.code) +
      '，与协议字段冲突，已忽略该值。请把业务字段改个名字（如 statusCode）。'
    );
  }
  // ⚠ 同样要守 `data`：前端 20+ 处读 `res.data.xxx`，
  //   这个字段被业务 payload 占用的话，那些读法会拿到错的东西。
  //   **不静默丢弃** —— 覆盖掉会让调用方以为字段被正常返回了。
  if (payload.data !== undefined && payload.data !== payload) {
    console.error(
      '[ok] payload 里带了 data=' + JSON.stringify(payload.data).slice(0, 100) +
      '，与协议字段冲突。请把业务字段改个名（如 detail）。'
    );
  }
  return Object.assign(
    { code: 0, message: 'ok', data: payload },
    payload,
    extra || {},
    // ⚠ 最后强制写回协议字段。
    //   放在 extra 之后是刻意的：extra 是调用方显式传的，本意就是补充或覆盖；
    //   但 code/message/data 是**协议字段**，前端靠它们判定成败与取数，
    //   一旦被覆盖就是静默的假失败。所以这几个字段谁都不许改。
    { code: 0, message: 'ok', data: payload }
  );
}
function fail(message, code) {
  return { code: code || -1, message: message || '服务异常', data: null };
}

/* ============ 数据库 ============ */
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const cmd = db.command;

/** 集合快捷访问 */
function col(name) {
  return db.collection(name);
}

/** 取 openid */
function OPENID() {
  try {
    return cloud.getWXContext().OPENID;
  } catch (e) {
    return '';
  }
}

/** 按 openid 找用户，不存在则创建 */
async function ensureUser(openid) {
  if (!openid) return null;
  const users = col('users');
  const res = await users.where({ _openid: openid }).limit(1).get();
  if (res.data && res.data.length) return res.data[0];

  const now = Date.now();
  const doc = {
    _openid: openid,
    nickname: '',
    avatarUrl: '',
    target: '',
    dailyGoal: 20,
    voiceMode: 'warm',
    maskRatio: 0.5,
    animationOn: true,
    showReviewPopupOnLaunch: true,
    role: 'user', // user | admin
    // 统计
    streak: 0,
    longestStreak: 0,
    lastCheckDate: '',
    totalMinutes: 0,
    totalAnswered: 0,
    totalRight: 0,
    totalWrong: 0,
    totalReviews: 0,
    // 权限
    selfBookUnlocked: false,
    createdBooks: 0,
    points: 0,
    createdAt: now,
    updatedAt: now
  };
  const add = await users.add({ data: doc });
  return Object.assign({ _id: add._id }, doc);
}

/** 更新用户并返回最新档案 */
async function patchUser(openid, patch) {
  const user = await ensureUser(openid);
  if (!user) return null;
  await col('users')
    .doc(user._id)
    .update({ data: Object.assign({}, patch, { updatedAt: Date.now() }) });
  return Object.assign({}, user, patch, { updatedAt: Date.now() });
}

/* ============ 连续打卡 ============ */
/** 计算打卡后的连续天数 */
function calcStreak(lastDate, currentStreak) {
  const t = today();
  if (!lastDate) return 1;
  const gap = diffDays(lastDate, t);
  if (gap === 0) return currentStreak || 1; // 今天已打过
  if (gap === 1) return (currentStreak || 0) + 1;
  return 1; // 断签，重新开始
}
function diffDays(a, b) {
  const da = new Date(a + 'T00:00:00');
  const db2 = new Date(b + 'T00:00:00');
  return Math.round((db2 - da) / 86400000);
}
function todayStr() {
  const d = new Date();
  return (
    d.getFullYear() +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getDate()).padStart(2, '0')
  );
}

/* ============ 额度规则（可改） ============ */
/**
 * ⚠️ 这是额度的**云端权威值**。
 * 前端 `miniprogram/utils/constants.js` 里有一份同名常量用于「云端未返回时兜底展示」，
 * 两处必须一起改，否则界面显示的数字和实际扣的对不上。
 *
 * 🔴 当前是**测试期大方配置**（2026-10-06 用户要求：先测 AI 效果）：
 * 初始 100 额度，够跑约 200 次 AI 对话（chat 0.5/次）或 20 次整本解析。
 * 上线前必须调回 3，并把 streakBonus / maxDailyBonus 一并按商业化方案重算。
 */
const QUOTA = {
  initialDailyParse: 100, // 初始每日额度（测试期大方；上线改回 3）
  unlockSelfBookStreak: 3, // 连续打卡几天解锁整本解析
  streakBonus: { 3: 5, 7: 10, 15: 20, 30: 50 }, // 连续打卡额外奖励（每日额度）
  costPerBook: 5, // 整本解析消耗
  costPerFragment: 1, // 碎片文本解析消耗
  costPerImage: 0.1, // 单张图片解析消耗（便宜，鼓励多图拍知识点）
  maxImagesPerParse: 20, // 单次最多解析几张图
  minImageCost: 0.5, // 图片解析起步价（防止 0.1*1 张白嫖）
  maxDailyBonus: 50
};

/**
 * 计算一次解析的消耗
 * @param {string} type 'book' | 'fragment' | 'image'
 * @param {number} count 图片张数（仅 image 类型有效）
 */
function calcCost(type, count) {
  if (type === 'book') return QUOTA.costPerBook;
  if (type === 'fragment') return QUOTA.costPerFragment;
  // 图片：每张 0.1，但有起步价；小数保留 1 位，避免浮点误差
  const n = Math.max(1, Math.min(QUOTA.maxImagesPerParse, Number(count) || 1));
  return Math.round(Math.max(QUOTA.minImageCost, n * QUOTA.costPerImage) * 10) / 10;
}

/** 解锁「整本解析」后额外放开的额度（不走打卡累加） */
const SELF_BOOK_BONUS = 20;

/**
 * 🔴 测试期免额度开关
 * ------------------------------------------------------------------
 * 🔴 当前 = **true（测试期免额度，随便测 AI 效果）**
 * ⚠️⚠️ **上线前必须改回 false。** 忘了改 = 生产环境无限量白送 AI，
 * 云开发大模型按量计费，这等于把账户敞开给所有人刷。
 *
 * 为什么用开关而不是把额度调大：
 *   · 调大额度（哪怕 9999）总有用完的一天，用完了还得再改一次
 *   · 开关关掉后 `consumeQuota` 直接返回、不写库、不报错，
 *     **所有 AI 功能无限可用**，一次到位
 *   · 开关开启时额度照常走商业化逻辑，随时一键切回
 *
 * 两种模式对上层完全透明 —— 页面、提示文案、AI 调用逻辑都不用改。
 *
 * ⚠️ 写法是 `=== '1'` 而不是 `!== '0'`：**默认必须是关闭（正常计费）**。
 *   万一忘了改环境变量，生产环境至少还是正常计费，
 *   而不是默认敞开。反过来写（默认免额度）风险大得多。
 *   要临时开：部署时加环境变量 `QUOTA_FREE_MODE=1`。
 *
 * 📌 上线检查清单：
 *   1. 把这里改成 false
 *   2. 把 QUOTA.initialDailyParse 改回 3
 *   3. node tools/quota-test.js 确认第 8 项显示「正常计费模式」
 *   4. node cloudfunctions/sync-shared.js
 *   5. 重新部署 upload + aiService 两个云函数（只有它们改过）
 */
const FREE_MODE = true;

/** 免额度时的"无穷大"显示值。用大数而不是 Infinity，避免 JSON 序列化变null。 */
const FREE_DISPLAY = 999999;

/**
 * 计算今日可用额度
 *
 * ⚠️ 三点容易改错，务必注意：
 *   1. streakBonus 各档是「累加」的，不是取最高档。
 *      例：连续 7 天 = 初始 + 5(满3天) + 10(满7天)，而不是初始 + 10。
 *   2. selfBookUnlocked 与 streak 是「互斥」分支：
 *      一旦解锁整本权限就走「初始 + SELF_BOOK_BONUS」，不再叠加打卡奖励。
 *   3. 封顶 = 初始 + maxDailyBonus + SELF_BOOK_BONUS，
 *      所以调大 initialDailyParse 会同步抬高封顶，别以为封顶还是 73。
 *
 * 改这里之前先跑 `node tools/quota-test.js`，有测试兜底。
 */
function calcQuota(user, used) {
  // 测试期免额度：直接返回"用不完"，后面所有逻辑照常走
  if (FREE_MODE) {
    return {
      remaining: FREE_DISPLAY,
      total: FREE_DISPLAY,
      used: 0,
      freeMode: true,
      selfBookUnlocked: !!(user && user.selfBookUnlocked),
      unlockNeed: QUOTA.unlockSelfBookStreak,
      costPerBook: QUOTA.costPerBook,
      costPerFragment: QUOTA.costPerFragment,
      costPerImage: QUOTA.costPerImage,
      minImageCost: QUOTA.minImageCost,
      maxImagesPerParse: QUOTA.maxImagesPerParse
    };
  }

  const usedToday = used || 0;
  let total = QUOTA.initialDailyParse;

  if (user && user.selfBookUnlocked) {
    total = QUOTA.initialDailyParse + SELF_BOOK_BONUS;
  } else if (user && user.streak) {
    Object.keys(QUOTA.streakBonus).forEach((k) => {
      const days = Number(k);
      if (user.streak >= days) total += QUOTA.streakBonus[k];
    });
  }
  total = Math.min(total, QUOTA.initialDailyParse + QUOTA.maxDailyBonus + SELF_BOOK_BONUS);

  return {
    remaining: Math.max(0, Math.round((total - usedToday) * 10) / 10),
    total,
    used: usedToday,
    freeMode: false,
    selfBookUnlocked: !!(user && user.selfBookUnlocked),
    unlockNeed: QUOTA.unlockSelfBookStreak,
    costPerBook: QUOTA.costPerBook,
    costPerFragment: QUOTA.costPerFragment,
    costPerImage: QUOTA.costPerImage,
    minImageCost: QUOTA.minImageCost,
    maxImagesPerParse: QUOTA.maxImagesPerParse
  };
}

/** 今日已用额度 */
async function todayUsed(openid) {
  const t = todayStr();
  const res = await col('quota')
    .where({ _openid: openid, date: t })
    .limit(1)
    .get();
  return res.data && res.data.length ? res.data[0].used || 0 : 0;
}

/**
 * 扣减额度（越权直接抛错）。支持小数计费。
 *
 * ⚠️ 免额度模式下**直接返回、不查库、不写库、不抛错**。
 * 上层（aiService 的 charge、upload 的解析入口）拿到的仍是合法 quota 对象，
 * 所以它们一行都不用改 —— 开关对业务代码完全透明。
 */
async function consumeQuota(openid, cost, user) {
  if (FREE_MODE) return calcQuota(user, 0);

  const used = await todayUsed(openid);
  const q = calcQuota(user, used);
  if (q.remaining < cost) {
    const e = new Error(
      q.selfBookUnlocked ? '今日额度已用完，明天再来' : '额度不足，去打卡解锁更多额度吧'
    );
    e.code = 'QUOTA_EXHAUSTED';
    throw e;
  }
  // 统一保留 1 位小数，避免 0.1 累加出 0.30000000000000004 这类浮点误差
  const next = Math.round((used + cost) * 10) / 10;
  const t = todayStr();
  const exist = await col('quota').where({ _openid: openid, date: t }).limit(1).get();
  if (exist.data && exist.data.length) {
    await col('quota').doc(exist.data[0]._id).update({ data: { used: next } });
  } else {
    await col('quota').add({ data: { _openid: openid, date: t, used: next, createdAt: Date.now() } });
  }
  return calcQuota(user, next);
}

/* ============ 勋章规则（可改） ============ */
const MEDAL = {
  streakStages: [1, 3, 7, 15, 30],
  accuracyThreshold: 90, // 零错题勋章：正确率门槛
  zeroWrongStreak: 10, // 零错题勋章：连续无错题次数
  creatorBooks: 1, // 创作者勋章：上架书籍数
  networkCards: 20, // 组网大师：组网知识点数
  points: { right: 2, finish: 10, checkIn: 5 }
};

const MEDAL_DEFS = [
  { key: 'streak_1', type: 'streak', name: '启程之证', desc: '首次连续打卡 1 天', icon: '🌱', need: 1, field: 'streak' },
  { key: 'streak_3', type: 'streak', name: '三日坚持', desc: '连续打卡 3 天', icon: '🔥', need: 3, field: 'streak' },
  { key: 'streak_7', type: 'streak', name: '一周不辍', desc: '连续打卡 7 天', icon: '⛰', need: 7, field: 'streak' },
  { key: 'streak_15', type: 'streak', name: '半月之恒', desc: '连续打卡 15 天', icon: '🏔', need: 15, field: 'streak' },
  { key: 'streak_30', type: 'streak', name: '30 天连续记忆坚持勋章', desc: '连续打卡 30 天', icon: '👑', need: 30, field: 'streak' },
  {
    key: 'book_master',
    type: 'book_master',
    name: '精通勋章',
    desc: '一本书全部知识点达到 B 级以上',
    icon: '📘',
    need: 1,
    field: 'masterBooks'
  },
  {
    key: 'network_master',
    type: 'network',
    name: '知识组网大师勋章',
    desc: '累计组网知识点达 20 个',
    icon: '🕸',
    need: MEDAL.networkCards,
    field: 'networkCards'
  },
  {
    key: 'zero_wrong',
    type: 'zero_wrong',
    name: '零错题精通勋章',
    desc: '连续 10 次练习零错误且正确率达 90%',
    icon: '💎',
    need: MEDAL.zeroWrongStreak,
    field: 'zeroWrong'
  },
  {
    key: 'creator',
    type: 'creator',
    name: '内容创作者勋章',
    desc: '有 1 本自制书籍通过审核上架',
    icon: '🎖',
    need: MEDAL.creatorBooks,
    field: 'createdBooks'
  }
];

/** 勋章墙：计算每个勋章的解锁状态与进度 */
function buildMedalWall(user, extra, ownedKeys) {
  const u = user || {};
  const e = extra || {};
  const owned = ownedKeys || {};
  return MEDAL_DEFS.map((def) => {
    const value = e[def.field] != null ? e[def.field] : u[def.field] || 0;
    const got = !!owned[def.key];
    return {
      key: def.key,
      type: def.type,
      name: def.name,
      desc: def.desc,
      icon: def.icon,
      need: def.need,
      value: Math.min(value, def.need),
      progress: Math.min(100, Math.round((value / def.need) * 100)),
      unlocked: got,
      unlockedAt: owned[def.key] || ''
    };
  });
}

/** 检查是否有新解锁的勋章，有则写入 user_medals */
async function checkMedals(openid, user, extra) {
  const ownedRes = await col('user_medals').where({ _openid: openid }).get();
  const ownedMap = {};
  (ownedRes.data || []).forEach((m) => {
    ownedMap[m.key] = m.unlockedAt;
  });

  const e = Object.assign(
    {
      streak: user.streak || 0,
      createdBooks: user.createdBooks || 0,
      networkCards: 0,
      zeroWrong: 0,
      masterBooks: 0
    },
    extra || {}
  );

  const newMedals = [];
  const ops = [];
  MEDAL_DEFS.forEach((def) => {
    if (ownedMap[def.key]) return;
    const value = e[def.field] || 0;
    if (value >= def.need) {
      const at = Date.now();
      newMedals.push({
        key: def.key,
        type: def.type,
        name: def.name,
        desc: def.desc,
        icon: def.icon,
        unlockedAt: at
      });
      ownedMap[def.key] = at;
      ops.push(
        col('user_medals').add({
          data: { _openid: openid, key: def.key, type: def.type, unlockedAt: at }
        })
      );
    }
  });
  if (ops.length) await Promise.all(ops);
  return newMedals;
}

/* ============ 杂项 ============ */
function safeJSON(str, fallback) {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch (e) {
    return fallback;
  }
}

/* ============ 内容安全审核 ============ */
/**
 * 提交内容前做安全审核
 *
 * 为什么必须有这个：
 *   小程序审核会检查「是否具备内容安全机制」。
 *   本产品有用户上传（碎片速记、图片解析）和 AI 生成两条入口，
 *   如果生成/上传的内容直接入库并展示给其他用户（分享功能），
 *   属于「UGC 无审核」，这是审核被驳回的高频原因。
 *
 * 云开发的 msgSecCheck 会按内容类型自动匹配对应的审核策略。
 * 单次最多 2000 字符，超长要分片，所以这里自动切分。
 *
 * ⚠ 审核服务本身要钱（按次计费），但个人版套餐里有赠送额度，
 *   教材类内容本来也几乎不会命中违规词，成本可接受。
 *
 * @param {string} text 待审核文本
 * @param {string} openid 用户 openid
 * @returns {Promise<{ok:boolean, reason:string, risky:Array}>}
 *   ok=false 时reason 说明拦截原因，risky 是命中的具体片段
 */
async function secCheck(text, openid) {
  const s = String(text || '').trim();
  // 空内容不需要审核（也不是风险）
  if (!s) return { ok: true, reason: '', risky: [] };

  const CHUNK = 2000; // 接口单次上限
  const chunks = [];
  for (let i = 0; i < s.length; i += CHUNK) chunks.push(s.slice(i, i + CHUNK));

  const risky = [];
  for (let i = 0; i < chunks.length; i++) {
    try {
      const res = await cloud.openapi.security.msgSecCheck({
        content: chunks[i],
        version: 2,
        scene: 2, // 2 = 资料场景
        openid: openid || ''
      });
      // suggest：pass 通过 / review 疑似 / risky 不通过
      const r = (res && res.result) || {};
      const suggest = r.suggest || 'pass';
      if (suggest !== 'pass') {
        risky.push({ chunk: i, suggest, label: r.label || 0 });
      }
    } catch (err) {
      // ⚠ 审核接口调用失败时的策略：**放行但记录**，不阻断用户。
      //   理由：审核服务偶发超时很常见，如果因此让用户不能保存内容，
      //   体验更差；而且真正的违规内容还有 UGC 举报入口兜底。
      //   但要留日志，便于事后排查。
      console.error('[secCheck] 审核接口异常，本次放行:', err.message);
      return { ok: true, reason: '', risky: [], degraded: true };
    }
  }

  if (risky.length) {
    const hasRisky = risky.some((r) => r.suggest === 'risky');
    return {
      ok: false,
      reason: hasRisky
        ? '内容包含违规信息，无法保存'
        : '内容疑似违规，已拦截。如有误判请换个说法',
      risky
    };
  }
  return { ok: true, reason: '', risky: [] };
}

module.exports = {
  secCheck,
  ok,
  fail,
  db,
  cmd,
  col,
  OPENID,
  ensureUser,
  patchUser,
  calcStreak,
  todayStr,
  QUOTA,
  FREE_MODE,
  FREE_DISPLAY,
  calcQuota,
  calcCost,
  todayUsed,
  consumeQuota,
  MEDAL,
  MEDAL_DEFS,
  buildMedalWall,
  checkMedals,
  safeJSON
};
