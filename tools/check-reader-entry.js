#!/usr/bin/env node
/**
 * 连续朗读页入口 · 自检脚本
 * ===================================================================
 * 校验「给pages/reader/reader 挂入口」这件事有没有踩坑。四项：
 *
 *   1. wxml 里每个 bindtap/catchtap 的 handler 名，都能在对应 .js 的
 *      Page 对象里找到同名方法（差集必须为空）
 *   2. 新增的每个 class 都在对应 wxss（或全局样式）里有定义（缺失数为 0）
 *   3. 跳转路径 pages/reader/reader 拼写正确，且传的参数名与
 *      reader.js的 onLoad(options) 里实际读取的参数名完全一致
 *   4. 改动过的 json 是合法 JSON
 *
 * 用法：node tools/check-reader-entry.js
 * 退出码 0 = 全过；1 = 有 FAIL
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const MP = path.join(ROOT, 'miniprogram');

const read = (p) => fs.readFileSync(path.join(MP, p), 'utf8');

let failCount = 0;
const say = (s) => console.log(s);
const ok = (s) => console.log('  PASS  ' + s);
const bad = (s) => {
  console.log('  FAIL  ' + s);
  failCount++;
};
const head = (s) => console.log('\n' + s);

/* ------------------------------------------------------------------ */
/* 我这次新增的 class（逐个点名，避免靠正则猜）                            */
/* ------------------------------------------------------------------ */
const NEW_CLASSES = {
  'pages/book-detail/book-detail.wxml': [
    // 连续朗读入口卡
    'bdr', 'bdr-glow', 'bdr-ico', 'bdr-tri', 'bdr-meta', 'bdr-t', 'bdr-s', 'bdr-arrow',
    // 状态修饰
    'off'
  ],
  'pages/index-lib/index-lib.wxml': [
    // 入口 chip + 勾选工具条
    'src-pick', 'il-pickbar', 'ilp-all', 'ilp-tip', 'ilp-none',
    // 卡片两栏 + 勾选框
    'res-row', 'res-main', 'res-check', 'rc-box', 'rc-tick',
    // 状态
    'on', 'dis',
    // 提示
    'res-warn',
    // 底部朗读条
    'il-dock', 'ild-count', 'ild-n', 'ild-t', 'ild-go', 'il-dock-pad'
  ]
};

/* 复用的全局类（在 app.wxss / styles 里，不要求页面 wxss 有） */
const GLOBAL_CLASSES = new Set([
  'page', 'page-body', 'row', 'row-between', 'col', 'flex-1',
  't-h2', 'card-lg', 'sec', 'sec-head', 'sec-bar', 'sec-more',
  'chip', 'btn', 'btn-primary', 'btn-soft', 'btn-ghost',
  'tap-scale', 'tap-lift',
  'nav-bar', 'nav-back', 'nav-title', 'bk-line',
  'g-violet', 'g-cyan', 'g-mint', 'g-sunset', 'g-lemon', 'g-grape', 'g-ocean', 'g-matcha',
  'g-violet-bg', 'g-cyan-bg', 'g-mint-bg', 'g-sunset-bg', 'g-lemon-bg',
  'g-grape-bg', 'g-ocean-bg', 'g-matcha-bg'
]);

/* 我改过的页面 */
const PAGES = ['pages/book-detail/book-detail', 'pages/index-lib/index-lib'];

head('【0】环境');
say('  node ' + process.version);
say('  根目录 ' + ROOT);

/* ------------------------------------------------------------------ */
/* 1. wxml 事件 handler 与 Page 方法对齐                                    */
/* ------------------------------------------------------------------ */
head('【1】事件 handler 与 Page 方法对齐');

/** 从 Page({...}) 里粗提方法名：形如 `  name(args) {` 或 `  name: function` */
function pageMethods(js) {
  const names = new Set();
  const body = js.slice(js.indexOf('Page('));
  const re = /^\s{2}([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{/gm;
  let m;
  while ((m = re.exec(body))) names.add(m[1]);
  // Page 里也可能有 `onLoad() {}` 写在同一缩进层，用第二遍宽松匹配兜底
  const re2 = /([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{\s*\n/g;
  while ((m = re2.exec(body))) names.add(m[1]);
  return names;
}

let handlerTotal = 0;
for (const p of PAGES) {
  const wxml = read(p + '.wxml');
  const js = read(p + '.js');
  const methods = pageMethods(js);

  const handlers = new Set();
  const re = /(?:bind|catch)(?:tap|input|confirm|change|longpress|blur|focus)\s*=\s*"([^"]+)"/g;
  let m;
  while ((m = re.exec(wxml))) m[1].split(',').forEach((h) => handlers.add(h.trim()));
  handlerTotal += handlers.size;

  const missing = [...handlers].filter((h) => !methods.has(h)).sort();
  say('  ' + p + '：绑定 ' + handlers.size + ' 个事件，Page 方法 ' + methods.size + ' 个');
  if (missing.length) bad('wxml 里有、js 里没有的 handler：' + missing.join(', '));
  else ok('事件绑定全部有同名方法（差集 0）');
}

/* ------------------------------------------------------------------ */
/* 2. 新增 class 在 wxss 里有定义                                */
/* ------------------------------------------------------------------ */
head('【2】新增 class 样式定义');

/** 收集一个 wxss（或 app.wxss + styles/*.wxss）里定义过的选择器名 */
function definedClasses(css) {
  const set = new Set();
  const re = /\.([A-Za-z_][\w-]*)/g;
  let m;
  while ((m = re.exec(css))) set.add(m[1]);
  return set;
}

const globalCss =
  read('app.wxss') +
  ['tokens', 'gradients', 'animations', 'nav'].map((f) => read('styles/' + f + '.wxss')).join('\n');
const globalDefined = definedClasses(globalCss);

for (const p of PAGES) {
  const pageDefined = definedClasses(read(p + '.wxss'));
  const list = NEW_CLASSES[p + '.wxml'] || [];
  const missing = list.filter((c) => !pageDefined.has(c) && !globalDefined.has(c));
  say('  ' + p + '：新增 class ' + list.length + ' 个');
  if (missing.length) bad('wxss 里没定义：' + missing.join(', '));
  else ok('新增 class 全部有定义（缺失 0）');

  const notGlobal = list.filter((c) => !GLOBAL_CLASSES.has(c));
  say('    其中页面私有 ' + notGlobal.length + ' 个 / 复用全局 ' + (list.length - notGlobal.length) + ' 个');
}

/* 反向：新写的 class 是否真被 wxml 用到（写错名字就白写） */
head('【2b】反向核对：wxss 里新增的类是否真被用到');
for (const p of PAGES) {
  const wxml = read(p + '.wxml');
  // 注意：状态类（off / on / dis）写在 class="{{a ? 'on' : ''}}" 的
  // 动态插值里，所以这里用**原始**class 串做包含判断，不能先剥掉 {{}}，
  // 否则这些类会被误报成「没用到」。
  const orphans = (NEW_CLASSES[p + '.wxml'] || []).filter(
    (c) => !new RegExp('(^|[\\s"\'?])' + c.replace(/[-]/g, '\\-') + '($|[\\s"\'?:])').test(wxml)
  );
  if (orphans.length) bad('wxml 里没用到：' + orphans.join(', '));
  else ok('新增 class 都被 wxml 引用了（孤儿 0）');
}

/* ------------------------------------------------------------------ */
/* 3. 跳转路径与参数名核对                */
/* ------------------------------------------------------------------ */
head('【3】跳转路径与 reader.js 参数名对齐');

const readerJs = read('pages/reader/reader.js');

/** reader.js onLoad 里实际读了哪些 option：形如 options.foo */
function readerOptionNames(js) {
  const start = js.indexOf('onLoad(');
  if (start < 0) return null;
  // onLoad 到下一个顶层方法前
  const end = js.indexOf('\n  onUnload', start);
  const seg = js.slice(start, end > 0 ? end : js.length);
  const names = new Set();
  let m;
  // 只认三种写法：options.foo / options['foo'] / options && options.foo
  // （不写宽松正则，否则 options && 里的 && 会被当成属性名读进来）
  const patterns = [
    /options\s*\.\s*([A-Za-z_$][\w$]*)/g,
    /options\s*\[\s*['"]([A-Za-z_$][\w$]*)['"]\s*\]/g,
    /options\s*&&\s*options\s*\.\s*([A-Za-z_$][\w$]*)/g
  ];
  patterns.forEach((re) => {
    while ((m = re.exec(seg))) names.add(m[1]);
  });
  return names;
}

/** 所有跳 reader 页的地方，抽出用的参数名 */
function readerNavParams(src) {
  const out = [];
  // 连? 一起捕获，否则 '?bookId=' 的 bookId 前面没有 ? 可匹配，参数名会漏
  const re = /\/pages\/reader\/reader\?([^'"`\s]+)/g;
  let m;
  while ((m = re.exec(src))) {
    const params = [];
    // 捕获组是从 ? 之后开始的，所以第一个参数前面没有 ?，
    // 正则必须允许「行首」这个位置，否则第一个参数名会漏掉
    const re2 = /(?:^|[?&])([A-Za-z_$][\w$]*)=/g;
    let m2;
    while ((m2 = re2.exec(m[1]))) params.push(m2[1]);
    out.push({ raw: m[1], params });
  }
  return out;
}

const navTargets = [];
for (const p of PAGES) {
  read(p + '.js').split('\n').forEach((line, i) => {
    if (line.indexOf('pages/reader/reader') >= 0) {
      say('  ' + p + '.js:' + (i + 1) + '  ' + line.trim());
    }
  });
  readerNavParams(read(p + '.js')).forEach((t) => navTargets.push({ page: p, ...t }));
}

const usedParams = new Set();
navTargets.forEach((t) => t.params.forEach((x) => usedParams.add(x)));

say('');
say('  reader.js onLoad 实际读取的参数名：' + JSON.stringify([...readerOptionNames(readerJs)].sort()));
say('  我在入口侧传的参数名：           ' + JSON.stringify([...usedParams].sort()));

if (!navTargets.length) bad('没找到任何跳 reader 页的调用');
else ok('跳转路径 pages/reader/reader 出现 ' + navTargets.length + ' 处');

navTargets.forEach((t) => {
  if (!t.params.length) bad(t.page + '：跳 reader 页但没解析出任何参数名 → ?' + t.raw);
});

// 参数名逐个对齐
const readerOpts = readerOptionNames(readerJs);
const mismatch = [];
[...usedParams].sort().forEach((k) => {
  if (readerOpts.has(k)) ok('参数名 "' + k + '" 与 reader.js onLoad 读取一致');
  else mismatch.push(k);
});
if (mismatch.length) {
  mismatch.forEach((k) =>
    bad('参数名 "' + k + '" 在 reader.js 的 onLoad 里**没有**被读取 —— 传过去 reader 页收不到')
  );
}

/* ------------------------------------------------------------------ */
/* 4. json 合法性                              */
/* ------------------------------------------------------------------ */
head('【4】json 合法性');

const jsons = PAGES.map((p) => p + '.json').concat(['app.json']);
jsons.forEach((j) => {
  try {
    JSON.parse(read(j));
    ok(j + ' 合法');
  } catch (e) {
    bad(j + ' 不是合法 JSON：' + e.message);
  }
});

/* ------------------------------------------------------------------ */
head('结果');
if (failCount) {
  console.log('  ' + failCount + ' 项 FAIL\n');
  process.exit(1);
}
console.log('  全部通过\n');