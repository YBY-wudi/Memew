/**
 * medal —— 勋章墙 / 打卡日历
 * ------------------------------------------------------------
 * 对应需求文档第四章「打卡、勋章、成就、权限解锁体系」。
 *
 * action:
 *   wall      勋章墙（解锁状态 + 进度 + 连续打卡 + 30 天日历）
 *   checkIn   手动打卡（首页打卡按钮）
 *   configs   勋章配置（前端展示用）
 */
const {
  ok,
  fail,
  col,
  cmd,
  OPENID,
  ensureUser,
  patchUser,
  todayStr,
  calcStreak,
  MEDAL,
  MEDAL_DEFS,
  buildMedalWall,
  checkMedals
} = require('./common.js');

/** 组网知识点数 */
async function countNetwork(openid) {
  const res = await col('cards').where({ _openid: openid, fromNetwork: true }).count();
  return res.total || 0;
}

/** 精通书籍数 */
async function countMasterBooks(openid) {
  const res = await col('cards').where({ _openid: openid }).limit(1000).get();
  const byBook = {};
  (res.data || []).forEach((c) => {
    if (!c.bookId) return;
    if (!byBook[c.bookId]) byBook[c.bookId] = { t: 0, ok: 0 };
    byBook[c.bookId].t += 1;
    if (c.level === 'B' || c.level === 'C') byBook[c.bookId].ok += 1;
  });
  return Object.keys(byBook).filter((k) => byBook[k].ok === byBook[k].t).length;
}

exports.main = async (event) => {
  const action = event.action || 'wall';
  const openid = OPENID();
  if (!openid) return fail('未获取到用户身份');

  try {
    const user = await ensureUser(openid);
    if (!user) return fail('用户不存在');

    /* ---------- 勋章墙 ---------- */
    if (action === 'wall') {
      const [ownedRes, checkRes] = await Promise.all([
        col('user_medals').where({ _openid: openid }).get().catch(() => ({ data: [] })),
        col('checkins')
          .where({ _openid: openid })
          .orderBy('date', 'desc')
          .limit(60)
          .get()
          .catch(() => ({ data: [] }))
      ]);

      const ownedMap = {};
      (ownedRes.data || []).forEach((m) => {
        ownedMap[m.key] = m.unlockedAt;
      });

      // 实时校正连续打卡（跨天未打卡时归零）
      let streak = user.streak || 0;
      if (user.lastCheckDate && streak > 0) {
        const gap = Math.round(
          (new Date(todayStr() + 'T00:00:00') - new Date(user.lastCheckDate + 'T00:00:00')) / 86400000
        );
        if (gap > 1) streak = 0;
      }

      const extra = {
        streak,
        createdBooks: user.createdBooks || 0,
        networkCards: await countNetwork(openid),
        masterBooks: await countMasterBooks(openid),
        zeroWrong: user.streakRightNoWrong || 0
      };

      const medals = buildMedalWall(user, extra, ownedMap);
      const checkDays = (checkRes.data || []).map((c) => c.date);

      return ok({
        medals,
        got: medals.filter((m) => m.unlocked).length,
        total: medals.length,
        streak,
        checkDays,
        selfBookUnlocked: !!user.selfBookUnlocked
      });
    }

    /* ---------- 手动打卡 ---------- */
    if (action === 'checkIn') {
      const t = todayStr();
      const streak = calcStreak(user.lastCheckDate, user.streak);
      const already = user.lastCheckDate === t;

      const exist = await col('checkins').where({ _openid: openid, date: t }).limit(1).get();

      if (exist.data && exist.data.length) {
        await col('checkins').doc(exist.data[0]._id).update({ data: { updatedAt: Date.now() } });
      } else {
        await col('checkins').add({
          data: { _openid: openid, date: t, doneMap: {}, createdAt: Date.now() }
        });
      }

      const patch = {
        streak,
        longestStreak: Math.max(user.longestStreak || 0, streak),
        lastCheckDate: t
      };
      if (streak >= 3 && !user.selfBookUnlocked) patch.selfBookUnlocked = true;

      const newUser = await patchUser(openid, patch);
      const newMedals = await checkMedals(openid, newUser, {
        streak: newUser.streak,
        networkCards: await countNetwork(openid),
        masterBooks: await countMasterBooks(openid),
        createdBooks: newUser.createdBooks || 0
      });

      return ok({
        streak: newUser.streak,
        already,
        selfBookUnlocked: !!newUser.selfBookUnlocked,
        newMedals
      });
    }

    /* ---------- 勋章配置 ---------- */
    if (action === 'configs') {
      return ok({ defs: MEDAL_DEFS, rules: MEDAL });
    }

    return fail('未知 action: ' + action);
  } catch (err) {
    console.error('[medal]', action, err);
    return fail(err.message || '服务异常');
  }
};
