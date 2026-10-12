/**
 * login —— 用户登录与档案
 * action:
 *   wxlogin          获取 openid，首次自动建档，返回 { openid, user, stats }
 *   profile          拉取档案（含统计），登录态静默刷新用
 *   update           更新资料 { patch: { nickname, avatarUrl, target, ... } }
 */
const { ok, fail, col, OPENID, ensureUser, patchUser, todayStr, calcStreak } = require('./common.js');

/** 汇总用户统计（首页 / 个人中心 / 我的记忆 共用） */
async function buildStats(openid, user) {
  const [cardsRes, answerRes] = await Promise.all([
    col('cards').where({ _openid: openid }).limit(1000).get(),
    col('answers').where({ _openid: openid }).limit(1000).get()
  ]);

  const cards = cardsRes.data || [];
  const dist = { S: 0, A: 0, B: 0, C: 0 };
  let wrongCards = 0;
  cards.forEach((c) => {
    if (dist[c.level] != null) dist[c.level] += 1;
    if ((c.history && c.history.wrong > 0) || c.level === 'S') wrongCards += 1;
  });

  const total = cards.length || 1;
  const today = todayStr();
  const dueToday = cards.filter((c) => {
    if (!c.level) return false;
    if (c.level === 'C') return false;
    if (!c.nextReviewDate) return true;
    return c.nextReviewDate <= today;
  }).length;

  const answers = answerRes.data || [];
  const totalAnswered = user.totalAnswered || 0;
  const totalRight = user.totalRight || 0;
  const accuracy = totalAnswered ? Math.round((totalRight / totalAnswered) * 100) : 0;

  return {
    streak: user.streak || 0,
    longestStreak: user.longestStreak || 0,
    totalCards: cards.length,
    dist,
    wrongCards,
    mastery: Math.round(((dist.B * 0.6 + dist.C) / total) * 100),
    dueToday,
    accuracy,
    totalAnswered,
    totalWrong: user.totalWrong || 0,
    totalReviews: user.totalReviews || 0,
    totalMinutes: user.totalMinutes || 0,
    points: user.points || 0,
    selfBookUnlocked: !!user.selfBookUnlocked,
    createdBooks: user.createdBooks || 0,
    todayAnswered: answers.filter((a) => a.date === today).length
  };
}

exports.main = async (event) => {
  const action = event.action || 'wxlogin';
  const openid = OPENID();
  if (!openid) return fail('未获取到用户身份');

  try {
    /* ---------- 登录 ---------- */
    if (action === 'wxlogin') {
      let user = await ensureUser(openid);

      // 跨天自动续打卡：昨天打过就顺延今天
      if (user && user.lastCheckDate) {
        const gap = Math.round(
          (new Date(todayStr() + 'T00:00:00') - new Date(user.lastCheckDate + 'T00:00:00')) / 86400000
        );
        if (gap > 1 && user.streak > 0) {
          user = await patchUser(openid, { streak: 0 });
        }
      }

      const stats = await buildStats(openid, user);
      return ok({ openid, user, stats });
    }

    /* ---------- 拉档案 ---------- */
    if (action === 'profile') {
      const user = await ensureUser(openid);
      if (!user) return fail('用户不存在');
      const stats = await buildStats(openid, user);
      return ok({ openid, user, stats });
    }

    /* ---------- 更新资料 ---------- */
    if (action === 'update') {
      const patch = event.patch || {};
      const allow = [
        'nickname',
        'avatarUrl',
        'target',
        'dailyGoal',
        'voiceMode',
        'maskRatio',
        'animationOn',
        'showReviewPopupOnLaunch'
      ];
      const clean = {};
      allow.forEach((k) => {
        if (patch[k] !== undefined) clean[k] = patch[k];
      });
      if (!Object.keys(clean).length) return fail('没有可更新的字段');

      const user = await patchUser(openid, clean);
      const stats = await buildStats(openid, user);
      return ok({ user, stats });
    }

    return fail('未知 action: ' + action);
  } catch (err) {
    console.error('[login]', action, err);
    return fail(err.message || '服务异常');
  }
};

exports.buildStats = buildStats;
