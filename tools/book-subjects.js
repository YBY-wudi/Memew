/**
 * 学科白名单（唯一权威来源）
 * ------------------------------------------------------------
 * 为什么要有这个文件：
 *
 * `books` 集合的 `subject` 字段是书库筛选的唯一依据。
 * 只要数据里出现白名单外的值，前端筛选栏就没有对应选项，
 * 那本书**永远筛不出来，而且不报任何错**——看起来就像"书丢了"。
 *
 * 2026-10-06 实际踩到两处：
 *   · 小学《道德与法治》写成 subject:'道法'
 *   · 《细胞生物学》写成 subject:'生物学'
 *     （书名带"生物学"修饰词，但学科应该归到「生物」）
 *
 * 铁律：**学科用规范名，书名可以带学科修饰词。**
 * 两者不要混淆。
 *
 * 新增学科的顺序（漏一步就会出现筛不出来的书）：
 *   1) 本文件 SUBJECT_WHITELIST
 *   2) miniprogram/utils/constants.js 的 SUBJECTS
 *   3) cloudfunctions/library/index.js 的 SUBJECT_ORDER（只影响筛选栏顺序，可选）
 *   4) node tools/export-db.js 重新导出 → 控制台重新导入
 */

/**
 * 规范学科名。
 * ⚠️ 「道德与法治」是全称，「道法」是缩写 —— 只能留全称。
 * ⚠️ 「生物」是学科名，「生物学」也是课本名的一部分 —— 学科只能用「生物」。
 */
const SUBJECT_WHITELIST = [
  '语文',
  '数学',
  '英语',
  '科学',
  '道德与法治',
  '物理',
  '化学',
  '生物',
  '政治',
  '历史',
  '地理',
  '语言学',
  '文学',
  '计算机',
  '医学',
  '法学',
  '财会',
  '建筑',
  '教育',
  '公考',
  '考研',
  '专业课',
  '通用能力',
  '生活常识'
];

/** 常见错写 → 规范名。写错时给出明确提示，而不是直接放行。 */
const SUBJECT_ALIAS = {
  道法: '道德与法治',
  思想品德: '道德与法治',
  品德: '道德与法治',
  生物学: '生物',
  科学素养: '科学',
  语文数学: '综合',
  公考考研: '公考',
  思想政治: '政治',
  计算机科学: '计算机',
  信息技术: '计算机'
};

function isValidSubject(s) {
  return SUBJECT_WHITELIST.indexOf(String(s || '').trim()) >= 0;
}

/** 返回规范名；无法识别时返回 '' */
function normalizeSubject(s) {
  const t = String(s || '').trim();
  if (SUBJECT_WHITELIST.indexOf(t) >= 0) return t;
  if (SUBJECT_ALIAS[t]) return SUBJECT_ALIAS[t];
  return '';
}

module.exports = { SUBJECT_WHITELIST, SUBJECT_ALIAS, isValidSubject, normalizeSubject };