/**
 * 云端记忆引擎（权威判定）
 * ------------------------------------------------------------
 * ⚠️ 本文件必须与 miniprogram/utils/memory-engine.js 保持完全一致的规则。
 *    前端本地先算一遍（即时反馈），这里的计算结果才是最终权威，会回写数据库。
 *    改任何一边，请同步改另一边。
 *
 * 对应需求文档第二章「智能分层复习系统」。
 */

/* ============ 记忆等级 ============ */
const LEVELS = {
  S: { key: 'S', name: '高频必复习', weight: 0 },
  A: { key: 'A', name: '巩固复习', weight: 1 },
  B: { key: 'B', name: '正常留存', weight: 2 },
  C: { key: 'C', name: '已掌握免复习', weight: 3 }
};

/* ============ 艾宾浩斯标准间隔（天） ============ */
const EBBINGHAUS = [1, 2, 4, 7, 15, 30, 60];

/* ============ 答题行为枚举 ============ */
const ANSWER_TYPE = {
  CORRECT: 'correct',
  WRONG: 'wrong',
  GUESS_RIGHT: 'guess_right',
  TIMEOUT_RIGHT: 'timeout_right',
  MULTI_WRONG: 'multi_wrong',
  FIRST_RIGHT: 'first_right'
};

const RIGHT_TYPES = [
  ANSWER_TYPE.CORRECT,
  ANSWER_TYPE.TIMEOUT_RIGHT,
  ANSWER_TYPE.GUESS_RIGHT,
  ANSWER_TYPE.FIRST_RIGHT
];

function emptyHistory() {
  return { right: 0, wrong: 0, guess: 0, streakRight: 0, total: 0 };
}

/** 计算记忆强度（行为 65% + 用户标记 35%） */
function calcStrength(card) {
  const userMark = card.userMark || 'normal';
  const hist = Object.assign(emptyHistory(), card.history || {});

  let markScore = 50;
  if (userMark === 'key') markScore = 72;
  if (userMark === 'skip') markScore = 18;

  const total = hist.right + hist.wrong;
  let behaviorScore;
  if (total === 0) {
    behaviorScore = 45;
  } else {
    const acc = hist.right / total;
    behaviorScore = Math.round(acc * 80);
    if (hist.guess > 0) behaviorScore -= Math.min(18, hist.guess * 6);
    behaviorScore += Math.min(15, hist.streakRight * 5);
    behaviorScore -= Math.min(25, hist.wrong * 8);
    behaviorScore = Math.max(0, Math.min(100, behaviorScore));
  }

  return Math.max(0, Math.min(100, Math.round(behaviorScore * 0.65 + markScore * 0.35)));
}

/** 判定记忆等级 */
function judgeLevel(card) {
  const userMark = card.userMark || 'normal';
  const hist = Object.assign(emptyHistory(), card.history || {});

  if (userMark === 'skip') return 'C';
  if (hist.streakRight >= 3) return 'C';
  if (hist.wrong >= 2) return 'S';
  if (userMark === 'key') return 'S';
  if (hist.wrong >= 1) return 'A';
  if (hist.right + hist.wrong === 0) return 'A';
  return 'B';
}

/** 下一次复习时间 */
function nextReview(level, correctStreak, wrongCount) {
  let days = 1;
  let tag = '每日必复习';

  if (level === 'S') {
    days = 0;
    tag = '今日晚间二轮';
  } else if (level === 'A') {
    days = wrongCount >= 2 ? 1 : 2;
    tag = '隔天穿插';
  } else if (level === 'B') {
    const idx = Math.min(correctStreak || 0, EBBINGHAUS.length - 1);
    days = EBBINGHAUS[idx];
    tag = days + '天后';
  } else {
    days = 7;
    tag = '每周抽检';
  }

  const d = new Date();
  const base = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  base.setDate(base.getDate() + days);
  return { date: fmtDate(base), days, tag };
}

/** 记录一次作答，返回需要写回数据库的字段 */
function applyAnswer(card, answerType) {
  const hist = Object.assign(emptyHistory(), card.history || {});
  const isRight = RIGHT_TYPES.indexOf(answerType) > -1;

  hist.total += 1;
  if (isRight) {
    hist.right += 1;
    hist.streakRight += 1;
  } else {
    hist.wrong += 1;
    hist.streakRight = 0;
  }
  if (answerType === ANSWER_TYPE.GUESS_RIGHT) hist.guess += 1;

  const next = Object.assign({}, card, {
    history: hist,
    lastReviewDate: fmtDate(new Date())
  });
  next.level = judgeLevel(next);
  next.strength = calcStrength(next);
  const nr = nextReview(next.level, hist.streakRight, hist.wrong);
  next.nextReviewDate = nr.date;
  next.nextReviewTag = nr.tag;
  return next;
}

/** 手动标记 */
function applyMark(card, userMark) {
  const next = Object.assign({}, card, { userMark });
  next.level = judgeLevel(next);
  next.strength = calcStrength(next);
  const nr = nextReview(next.level, (next.history || {}).streakRight, (next.history || {}).wrong);
  next.nextReviewDate = nr.date;
  next.nextReviewTag = nr.tag;
  return next;
}

/* ============ 日期工具 ============ */
function fmtDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}
function today() {
  return fmtDate(new Date());
}
function diffDays(a, b) {
  const da = new Date(a + 'T00:00:00');
  const db = new Date(b + 'T00:00:00');
  return Math.round((db - da) / 86400000);
}
function hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

/** 今日应复习队列（S>A>B>C） */
function pickTodayQueue(cards, date) {
  const d = date || today();
  const due = cards.filter((c) => {
    if (!c || !c.level) return false;
    if (c.level === 'C') return hashCode(c._id + d) % 7 === 0;
    if (!c.nextReviewDate) return true;
    return diffDays(c.nextReviewDate, d) >= 0;
  });

  return due.sort((a, b) => {
    const lv = (LEVELS[a.level] || { weight: 9 }).weight - (LEVELS[b.level] || { weight: 9 }).weight;
    if (lv !== 0) return lv;
    return (a.strength || 0) - (b.strength || 0);
  });
}

/** 掌握度 */
function calcMastery(cards) {
  const list = cards || [];
  const total = list.length || 1;
  const dist = { S: 0, A: 0, B: 0, C: 0 };
  list.forEach((c) => {
    if (dist[c.level] != null) dist[c.level] += 1;
  });
  return {
    total: list.length,
    dist,
    rate: Math.round(((dist.B * 0.6 + dist.C) / total) * 100)
  };
}

module.exports = {
  LEVELS,
  EBBINGHAUS,
  ANSWER_TYPE,
  RIGHT_TYPES,
  emptyHistory,
  calcStrength,
  judgeLevel,
  nextReview,
  applyAnswer,
  applyMark,
  pickTodayQueue,
  calcMastery,
  fmtDate,
  today,
  diffDays,
  hashCode
};
