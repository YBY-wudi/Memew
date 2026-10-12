/**
 * 前后端记忆算法一致性校验
 * ------------------------------------------------------------
 * 前端 miniprogram/utils/memory-engine.js 用于即时反馈，
 * 云端 cloud-shared/memory-engine.js 是权威判定。
 * 两边规则必须完全一致，否则会出现「前端显示升级、后端回滚」这类诡异问题。
 *
 * 改任一边的算法后，请执行本脚本确认。
 * 用法：node tools/engine-parity.js
 */
const path = require('path');

const front = require(path.join(__dirname, '..', 'miniprogram', 'utils', 'memory-engine.js'));
// ⚠️ 源文件在 cloud-shared/（2026-10-06 从 cloudfunctions/_shared/ 移出，
//    否则开发者工具会把它当云函数上传而失败）
const back = require(path.join(__dirname, '..', 'cloud-shared', 'memory-engine.js'));

let fail = 0;
const chk = (name, a, b) => {
  const sa = JSON.stringify(a);
  const sb = JSON.stringify(b);
  if (sa !== sb) {
    console.log('  MISMATCH ' + name + '\n    front: ' + sa + '\n    back : ' + sb);
    fail++;
  }
};

/* 覆盖全部分支的卡片样本 */
const cases = [
  { id: 'c1', userMark: 'normal', history: { right: 0, wrong: 0, guess: 0, streakRight: 0, total: 0 } },
  { id: 'c2', userMark: 'key', history: { right: 0, wrong: 0, guess: 0, streakRight: 0, total: 0 } },
  { id: 'c3', userMark: 'skip', history: { right: 9, wrong: 0, guess: 0, streakRight: 9, total: 9 } },
  { id: 'c4', userMark: 'normal', history: { right: 1, wrong: 0, guess: 0, streakRight: 1, total: 1 } },
  { id: 'c5', userMark: 'normal', history: { right: 0, wrong: 1, guess: 0, streakRight: 0, total: 1 } },
  { id: 'c6', userMark: 'normal', history: { right: 1, wrong: 2, guess: 0, streakRight: 0, total: 3 } },
  { id: 'c7', userMark: 'normal', history: { right: 5, wrong: 1, guess: 2, streakRight: 3, total: 6 } },
  { id: 'c8', userMark: 'normal', history: { right: 10, wrong: 0, guess: 5, streakRight: 10, total: 10 } }
];

const TYPES = ['correct', 'wrong', 'guess_right', 'timeout_right', 'multi_wrong', 'first_right'];
const MARKS = ['key', 'normal', 'skip'];
const LEVELS = ['S', 'A', 'B', 'C'];

cases.forEach((c) => {
  chk('calcStrength ' + c.id, front.calcStrength(c), back.calcStrength(c));
  chk('judgeLevel ' + c.id, front.judgeLevel(c), back.judgeLevel(c));
});

LEVELS.forEach((lv) => {
  [0, 1, 2, 3, 5, 9].forEach((streak) => {
    [0, 1, 2, 4].forEach((w) => {
      const a = front.nextReview(lv, streak, '2026-01-01', w);
      const b = back.nextReview(lv, streak, w);
      chk('nextReview ' + lv + '/' + streak + '/' + w, [a.date, a.days, a.tag], [b.date, b.days, b.tag]);
    });
  });
});

TYPES.forEach((t) => {
  cases.forEach((c) => {
    const a = front.applyAnswer(c, t);
    const b = back.applyAnswer(c, t);
    chk('applyAnswer ' + t + '/' + c.id,
      [a.level, a.strength, a.nextReviewDate, a.nextReviewTag, a.history],
      [b.level, b.strength, b.nextReviewDate, b.nextReviewTag, b.history]);
  });
});

MARKS.forEach((m) => {
  cases.forEach((c) => {
    const a = front.applyMark(c, m);
    const b = back.applyMark(c, m);
    chk('applyMark ' + m + '/' + c.id, [a.level, a.strength], [b.level, b.strength]);
  });
});

const d = '2026-03-15';
chk('pickTodayQueue', front.pickTodayQueue(cases, d).map((c) => c.id), back.pickTodayQueue(cases, d).map((c) => c.id));
chk('calcMastery',
  front.calcMastery(cases.map((c) => ({ level: front.judgeLevel(c) }))),
  back.calcMastery(cases.map((c) => ({ level: back.judgeLevel(c) }))));

if (fail === 0) {
  console.log('✅ 前后端记忆算法完全一致（' +
    (cases.length * 2 + LEVELS.length * 24 + TYPES.length * cases.length + MARKS.length * cases.length + 2) +
    ' 项校验）');
} else {
  console.log('\n❌ ' + fail + ' 处不一致，请同步修改两个 memory-engine.js');
}
process.exit(fail ? 1 : 0);
