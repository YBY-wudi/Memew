/**
 * 包体守卫
 * ================================================================
 * 微信小程序主包上限 2MB。我们现在是 1.5MB，其中教材内容已经 576KB。
 * 教材是唯一会持续增长的部分（每扩一本书就是几十 KB），
 * 涨到 2MB 开发者工具会直接报「主包大小超限」，发不出去。
 *
 * 所以要有一道自动检查：超了 80% 就警告，超了 95% 就报警。
 * 扩展教材前先跑一次，别等工具报错了才回头砍。
 *
 * 长期解法：教材挪到分包（subpackage），主包只留壳。
 * 参见本文件末尾的说明。
 *
 * 运行：node tools/check-size.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../miniprogram');

/** 主包上限（微信官方硬限制） */
const LIMIT_MB = 2;
/** 警告线 */
const WARN_RATIO = 0.8;

/** 不参与体积统计的东西（开发者工具本身会排除） */
const IGNORE = [/\.DS_Store$/, /node_modules/];

/** 常见静态资源后缀 —— 这些能被开发者工具压缩或排除 */
const COMPRESSIBLE = /\.(png|jpe?g|gif|webp|svg|mp3|wav)$/i;

function walk(dir, out) {
  fs.readdirSync(dir).forEach((name) => {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) {
      if (IGNORE.some((re) => re.test(name))) return;
      walk(full, out);
    } else {
      if (IGNORE.some((re) => re.test(full))) return;
      out.push({ path: full, size: st.size, rel: path.relative(ROOT, full) });
    }
  });
  return out;
}

const allFiles = walk(ROOT, []).sort((a, b) => b.size - a.size);

/* ============================================================================
 * ⚠⚠ 关键：目录遍历 ≠ 真实包体
 *
 * 微信开发者工具打包时，**只收被 require 到的文件**。
 * 一个 .js 文件躺在 miniprogram/data/ai-books/ 里但没人 require 它，
 * 它就不会进包、不占 2MB 额度。
 *
 * 这个区别很重要：2026-10-06 因为包体压力把 7 本教材精简到 2 本，
 * 但本脚本原来按目录算，统计仍显示 765KB 教材 / 1.57MB 总计，
 * **完全看不出精简的效果**，会让人以为没生效而把文件删掉
 *（删掉之后就真的找不回来了）。
 *
 * 所以下面分两组统计：
 *   实际进包 = 目录里所有文件（保守上限，假设开发者工具把非JS 也收进去）
 *   有效进包 = 排除「未被 require 的教材文件」
 * 两者都报出来，差值就是精简省下的空间。
 * ============================================================================ */

/** 哪些教材文件真的进了包（= local-books.js 的注册表里有的） */
function bundledBookFiles() {
  const set = new Set();
  try {
    const local = require('../miniprogram/utils/local-books.js');
    const booksDir = path.join(ROOT, 'data/ai-books');
    // 注册表里的书，逐个找它来自哪个文件
    local.allIds().forEach((id) => {
      const raw = local.getRaw(id);
      if (!raw) return;
      fs.readdirSync(booksDir).forEach((f) => {
        if (!f.endsWith('.js')) return;
        try {
          const list = require(path.join(booksDir, f));
          if (list.some((b) => b.id === id)) set.add(path.join(booksDir, f));
        } catch (e) {
          /* 单个文件解析失败不影响其它 */
        }
      });
    });
  } catch (e) {
    console.error('[warn] 无法判定哪些教材进了包：', e.message);
  }
  return set;
}

const bundledBooks = bundledBookFiles();
/* rel 在 Windows 上是反斜杠，要归一化成 /，否则下面的 includes 永远不命中 */
const relPosix = (f) => f.rel.split(path.sep).join('/');
const isBookFile = (f) => relPosix(f).includes('data/ai-books/') && f.path.endsWith('.js');

const files = allFiles; // 目录口径（保守）
const effective = allFiles.filter((f) => !isBookFile(f) || bundledBooks.has(f.path));

const total = allFiles.reduce((s, f) => s + f.size, 0);
const effTotal = effective.reduce((s, f) => s + f.size, 0);
const staticSize = effective.filter((f) => COMPRESSIBLE.test(f.path)).reduce((s, f) => s + f.size, 0);
const jsSize = effective.filter((f) => f.path.endsWith('.js')).reduce((s, f) => s + f.size, 0);

const mb = (b) => (b / 1024 / 1024).toFixed(2) + ' MB';
const kb = (b) => (b / 1024).toFixed(0) + ' KB';

console.log('=== 包体统计 ===');
const effRatio = (effTotal / (LIMIT_MB * 1024 * 1024)) * 100;
console.log('  实际进包' + mb(effTotal).padStart(9) + ' / ' + LIMIT_MB + ' MB');
console.log('  占用    ' + effRatio.toFixed(1) + '%' + (effRatio >= WARN_RATIO * 100 ? ' ⚠ 超过 ' + WARN_RATIO * 100 + '% 警戒线' : ''));
console.log('  JS      ' + kb(jsSize));
console.log('  静态资源' + kb(staticSize) + '（图片等，开发者工具会再压）');
if (effTotal !== total) {
  console.log('');
  console.log('  ℹ 另有未进包的教材文件（躺在目录里但没被 require，不占额度）：');
  allFiles.filter(isBookFile).filter((f) => !bundledBooks.has(f.path))
    .forEach((f) => console.log('     ' + kb(f.size).padStart(7) + '  ' + f.rel));
  console.log('     目录口径总计 ' + mb(total) + '，其中 ' + kb(total - effTotal) + ' 是未进包的');
}
console.log('');

console.log('  最大的 8 个文件（按进包口径）：');
effective.slice(0, 8).forEach((f, i) => {
  console.log('   ' + (i + 1) + '. ' + kb(f.size).padStart(7) + '  ' + f.rel);
});
console.log('');

/* 教材单独统计 —— 唯一会持续增长的部分 */
const booksDir = path.join(ROOT, 'data/ai-books');
if (fs.existsSync(booksDir)) {
  const books = fs.readdirSync(booksDir)
    .filter((f) => f.endsWith('.js'))
    .map((f) => ({
      name: f,
      size: fs.statSync(path.join(booksDir, f)).size,
      inBundle: bundledBooks.has(path.join(booksDir, f))
    }));
  const booksTotal = books.reduce((s, b) => s + b.size, 0);
  const inBooks = books.filter((b) => b.inBundle);
  const inTotal = inBooks.reduce((s, b) => s + b.size, 0);

  console.log('=== 教材（data/ai-books，唯一会持续增长）===');
  inBooks.forEach((b) => console.log('   ' + kb(b.size).padStart(7) + '  ✓ ' + b.name));
  const offBooks = books.filter((b) => !b.inBundle);
  if (offBooks.length) {
    offBooks.forEach((b) => console.log('   ' + kb(b.size).padStart(7) + '  ✗ ' + b.name));
  }
  console.log('   进包 ' + inBooks.length + ' 本 / ' + kb(inTotal) +
    (offBooks.length ? '　　未进包 ' + offBooks.length + ' 本 / ' + kb(booksTotal - inTotal) : ''));

  // 还能再扩多少 —— 按「进包教材」算，因为未进包的不占额度
  const headroom = LIMIT_MB * 1024 * 1024 - effTotal;
  console.log('   剩余额度 ' + kb(headroom) + '，够再扩约 ' +
    (inTotal ? (headroom / inTotal).toFixed(1) : '∞') + ' 倍进包教材');
  if (offBooks.length) {
    console.log('   ℹ 想把打勾那几本加回来：取消 local-books.js 里的注释即可，不用删文件');
  }
  console.log('');
}

/* 判定用「有效进包」，不是目录口径 —— 否则精简完还一直报超限 */
const ratio = effTotal / (LIMIT_MB * 1024 * 1024);
const looseRatio = total / (LIMIT_MB * 1024 * 1024);
if (ratio >= 0.95 || looseRatio >= 0.95) {
  console.log('\x1b[31m❌ 包体已超 95%，必须处理后再提交\x1b[0m');
  console.log('   处理顺序：');
  console.log('   1. 把 data/ai-books 挪进分包（推荐，见下）');
  console.log('   2. 压缩静态资源');
  console.log('   3. 精简非核心页面的 wxml/wxss');
  process.exit(1);
} else if (ratio >= WARN_RATIO) {
  console.log('\x1b[33m⚠ 包体超过 80%，再加内容前先想清楚\x1b[0m');
  console.log('   教材每扩一本涨几十 KB，再扩 3-4 本就会顶到 2MB。');
  console.log('   建议现在就把教材挪进分包。');
} else {
  console.log('\x1b[32m✅ 包体健康\x1b[0m');
}

/*
长期解法：教材挪进分包
------------------------------------------------------------
分包（subPackage）有独立的 2MB 额度，教材 576KB 挪过去后主包
能立刻回到 900KB 左右。

大致做法：
1. app.json 加
     "subPackages": [{ "root": "data", "name": "books" }]
2. data/ai-books 目录整体搬进去（保持相对 require 可用）
3. 因为是「按数据目录」而不是「按页面」分包，
   小程序要求分包内必须有页面才能独立加载，
   所以更稳的做法是把 5 本书各做成一个小程序页面：
   卡片页/书籍页，内容从 data 里读。
   改造成本较高，建议等顶到红线时再做。
*/
