/**
 * admin —— 管理端：内容审核上架 / 下架 + 数据总览
 * ------------------------------------------------------------
 * 对应需求文档第七章「管理员审核后台、内容上架管理系统」。
 *
 * 权限：仅 users.role === 'admin' 可调用。
 * 开通方式：数据库 users 集合里把自己的记录 role 改成 'admin'。
 *
 * action:
 *   pendingList  待审核列表
 *   approve      审核通过并上架
 *   reject       审核驳回
 *   unpublish    下架
 *   overview     运营数据总览
 *   setRole      设置用户角色
 */
const { ok, fail, col, cmd, OPENID, ensureUser, patchUser, checkMedals } = require('./common.js');

/** 管理员校验 */
async function requireAdmin(openid) {
  const user = await ensureUser(openid);
  if (!user || user.role !== 'admin') {
    const e = new Error('无管理员权限');
    e.code = 'FORBIDDEN';
    throw e;
  }
  return user;
}

exports.main = async (event) => {
  const action = event.action || 'pendingList';
  const openid = OPENID();
  if (!openid) return fail('未获取到用户身份');

  try {
    await requireAdmin(openid);

    /* ---------- 待审核列表 ---------- */
    if (action === 'pendingList') {
      const res = await col('books')
        .where({ status: 'pending' })
        .orderBy('createdAt', 'asc')
        .limit(50)
        .get()
        .catch(() => ({ data: [] }));

      return ok({
        books: (res.data || []).map((b) => ({
          id: b._id,
          title: b.title,
          subject: b.subject,
          intro: b.intro || '',
          unitCount: (b.units || []).length,
          openid: b._openid,
          createdAt: b.createdAt
        })),
        total: (res.data || []).length
      });
    }

    /* ---------- 审核通过 ---------- */
    if (action === 'approve') {
      const { bookId } = event;
      if (!bookId) return fail('缺少 bookId');
      const res = await col('books').doc(bookId).get().catch(() => ({ data: null }));
      if (!res || !res.data) return fail('书籍不存在');

      const book = res.data;
      await col('books')
        .doc(bookId)
        .update({ data: { status: 'published', official: false, updatedAt: Date.now() } });

      // 更新提交记录
      await col('submissions')
        .where({ bookId })
        .update({ data: { status: 'approved', reviewedAt: Date.now() } })
        .catch(() => {});

      // 贡献者加创作者数量 + 创作者勋章
      const owner = await ensureUser(book._openid);
      if (owner) {
        const published = await col('books')
          .where({ _openid: book._openid, status: 'published' })
          .count();
        const count = published.total || 0;
        const newUser = await patchUser(book._openid, {
          createdBooks: count,
          points: (owner.points || 0) + 100
        });
        await checkMedals(book._openid, newUser, { createdBooks: count });
      }

      return ok({ bookId, status: 'published' });
    }

    /* ---------- 审核驳回 ---------- */
    if (action === 'reject') {
      const { bookId, reason } = event;
      if (!bookId) return fail('缺少 bookId');
      await col('books')
        .doc(bookId)
        .update({
          data: { status: 'rejected', rejectReason: reason || '内容不符合上架标准', updatedAt: Date.now() }
        });
      await col('submissions')
        .where({ bookId })
        .update({ data: { status: 'rejected', reason: reason || '', reviewedAt: Date.now() } })
        .catch(() => {});
      return ok({ bookId, status: 'rejected' });
    }

    /* ---------- 下架 ---------- */
    if (action === 'unpublish') {
      const { bookId } = event;
      if (!bookId) return fail('缺少 bookId');
      await col('books').doc(bookId).update({ data: { status: 'offline', updatedAt: Date.now() } });
      return ok({ bookId, status: 'offline' });
    }

    /* ---------- 运营总览 ---------- */
    if (action === 'overview') {
      const [users, books, pending, cards, answers] = await Promise.all([
        col('users').count(),
        col('books').where({ status: 'published' }).count(),
        col('books').where({ status: 'pending' }).count(),
        col('cards').count(),
        col('answers').count()
      ]);
      return ok({
        users: users.total || 0,
        books: books.total || 0,
        pending: pending.total || 0,
        cards: cards.total || 0,
        answers: answers.total || 0
      });
    }

    /* ---------- 设置角色 ---------- */
    if (action === 'setRole') {
      const { targetOpenid, role } = event;
      if (!targetOpenid) return fail('缺少 targetOpenid');
      const user = await patchUser(targetOpenid, { role: role === 'admin' ? 'admin' : 'user' });
      return ok({ user });
    }

    return fail('未知 action: ' + action);
  } catch (err) {
    console.error('[admin]', action, err);
    if (err.code === 'FORBIDDEN') return fail(err.message, 403);
    return fail(err.message || '服务异常');
  }
};
