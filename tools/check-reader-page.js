/**
 * 连续朗读页静态校验
 * ------------------------------------------------------------
 * 这个页面的坑几乎都出在「模板和逻辑对不上」上：
 *   · WXML 少绑一个事件 → 按钮点了没反应，且不报错
 *   · WXML 用错 data 字段 → 插值空白，同样不报错
 *   · wx:for 别名改了一处漏一处 → 渲染空白，不报错
 *   · class 没在 wxss 里定义 → 样式静默失效
 * 所以单独写一个脚本把这几类问题一次性扫掉。
 *
 * 用法：node tools/check-reader-page.js
 * 退出码：0 全部通过 / 1 有问题
 *
 * ⚠ 脚本本身被注入过 6 类假故障逐项验证过（坏事件名 / 缺 class /
 *   wxml 里写 Math / 多画一条 bk-line / 别名不配套 / 引用不存在的
 *   data 字段），6 类都能抓到。改这个脚本时请保持这个性质。
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'miniprogram');
const DIR = path.join(ROOT, 'pages', 'reader');
const read = (p) => fs.readFileSync(p, 'utf8');
const exists = (p) => fs.existsSync(p);

/*
 * ⚠ 变量名不能叫 JSON —— const JSON = ... 会遮蔽全局 JSON 对象，
 *   后面 JSON.parse 直接报 "JSON.parse is not a function"。
 *   这个坑在本项目里踩过。
 */
const WXML = path.join(DIR, 'reader.wxml');
const WXSS = path.join(DIR, 'reader.wxss');
const PAGE_JSON = path.join(DIR, 'reader.json');
const JS_FILE = path.join(DIR, 'reader.js');
const APP_JSON = path.join(ROOT, 'app.json');

const problems = [];
let fail = 0;
const bad = (m) => {
  problems.push(m);
  fail++;
};

/* ---------- 0. 四个文件都在？ ---------- */
[
  ['wxml', WXML],
  ['wxss', WXSS],
  ['json', PAGE_JSON],
  ['js', JS_FILE]
].forEach(([n, p]) => {
  if (!exists(p)) bad(`缺少文件 reader.${n}`);
});
if (fail) {
  console.log('❌ reader 页面文件不完整，先补齐再校验');
  process.exit(1);
}

const wxml = read(WXML);
const wxss = read(WXSS);
const js = read(JS_FILE);

/* ---------- 抹掉 WXML 注释 ---------- */
/*
 * 必须先抹掉：页面头部那段「不能写 Math.xxx」的说明注释里就有这些词，
 * 不剥离就会把它们当成真用法，报一堆假错。
 * 注释里的 <view> 也会让标签配对错乱。
 */
function stripComments(s) {
  return s.replace(/<!--[\s\S]*?-->/g, (m) => ' '.repeat(m.length));
}
const wxmlSrc = stripComments(wxml);

/* ============================================================
 * 0.5 reader.js 的 data 字段（第 2、6 项都要用，先抽出来）
 * ============================================================ */
const dataKeys = (function () {
  const block = (js.match(/data:\s*\{([\s\S]*?)\n {2}\},\n/) || [])[1] || '';
  const set = new Set();
  const re = /^\s{4}([A-Za-z_$][\w$]*)\s*:/gm;
  let m;
  while ((m = re.exec(block))) set.add(m[1]);
  return set;
})();

/*
 * data 初始块之外的字段（onLoad 里算出来的 statusBarHeight /
 * navBarHeight 等）也要算进来，否则模板插值到 navBarHeight
 * 会被误报「字段不存在」。
 * 做法：扫全文所有 setData({...}) 的顶层键。
 *   不用「只匹配 onLoad 的正则」—— 函数体缩进层级会随代码风格变化，
 *   写死 \n\s{4} 实测一个都没抓到（报onLoad 补设 0 个）。
 */
const setDataKeys = (function () {
  const set = new Set();
  const re = /setData\(\s*\{([\s\S]*?)\}\s*\)/g;
  let m;
  while ((m = re.exec(js))) {
    const k = /(?:^|\n)\s{6}([A-Za-z_$][\w$]*)\s*:/g;
    let kk;
    while ((kk = k.exec(m[1]))) set.add(kk[1]);
  }
  return set;
})();

/** 模板里能直接用的名字 = data 字段 ∪ setData 补设字段 */
const DATA_FIELDS = new Set([...dataKeys, ...setDataKeys]);

/* ============================================================
 * 1. 事件绑定：WXML 里每个 handler 必须在 reader.js 里存在
 * ============================================================ */
const methods = (function () {
  const set = new Set();
  const re = /^\s{2}([A-Za-z_$][\w$]*)\s*\(/gm;
  let m;
  while ((m = re.exec(js))) set.add(m[1]);
  return set;
})();

const boundEvents = new Set();
/*
 * 只扫事件属性。⚠ 不能扫所有形如 name="xxx" 的属性——
 *   placeholder / hover-class / data-xxx 里也有值，
 *   混进来会报一堆假差异。
 */
const EVT_RE =
  /\b(?:bind|catch)(?::|-)?(?:tap|input|change|confirm|blur|focus|longpress|touchstart|touchmove|touchend|scroll|scrolltolower|animationiteration|transitionend)\s*=\s*"([^"{]+)"/g;
let em;
while ((em = EVT_RE.exec(wxmlSrc))) {
  em[1]
    .split(/\s+/)
    .filter(Boolean)
    .forEach((h) => boundEvents.add(h));
}
const evtDiff = [...boundEvents].filter((h) => !methods.has(h));

console.log('1) 事件绑定');
console.log(
  `   WXML 绑定事件 ${boundEvents.size} 个: ${[...boundEvents].sort().join(', ')}`
);
console.log(`   reader.js 可用方法 ${methods.size} 个`);
if (evtDiff.length) {
  console.log(`   ❌ 差集 ${evtDiff.length} 个（模板绑了但逻辑里没有 → 点了没反应）:`);
  evtDiff.forEach((d) => console.log(`      - ${d}`));
  bad(`${evtDiff.length} 个事件绑定在 reader.js 里找不到同名方法`);
} else {
  console.log('   ✅ 差集为空');
}

/* ============================================================
 * 2. wx:for 别名与引用是否配套
 * ============================================================ */
/*
 * 微信默认别名是 item / index，可用 wx:for-item / wx:for-index 改。
 * 错配有三种，每种都是注入假故障实测漏过一次才补上的：
 *   A. 声明了别名，块内还在用默认 item/index
 *   B. 块内引用了「别处声明、但本块作用域外」的别名
 *   C. 别名声明成 g、引用点却还写着 it —— 此时 it 在全文已无人声明，
 *      它既不是可见别名也不是 data 字段，引用处渲染为空白
 *
 * 做法：按标签配对还原每块的作用域（外层块 + 本块），
 * 块内插值里每个标识符都必须是「可见别名」或「data 字段」，否则报错。
 *
 * 实现要点：
 *   · 先抹掉注释，否则注释里的 <view> 会被当成真标签，栈就乱了
 *   · 属性里的 '>'（如 {{a > b}}）不能当标签结束，用引号感知的模式匹配
 *   · 自闭合标签不进栈
 *   · 嵌套子块自己声明的别名对本块文本合法（子块在自己的作用域里用）
 */
const TAG = /<(\/)?([a-zA-Z][\w-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/)?>/g;

/** 插值里允许出现的非标识符字面量 */
const EXPR_LITERALS = new Set(['true', 'false', 'null', 'undefined']);

/**
 * 插值表达式的**根标识符**（作用域解析的起点）。
 *{{picked[it.id]}} → picked；{{g.items.length}} → g
 *
 * ⚠ 只取根标识符，不要把属性名（items / length / title）也当引用——
 *   属性是挂在别名上的，不参与作用域解析。
 *   之前用 /\.(\w+)/ 把属性名一起抓进来，
 *   导致 g.title / it.id 里的 title/id 被误报成「悬空引用」（9 处假错）。
 */
function exprIdents(text) {
  const out = new Set();
  const re = /\{\{([^{}]+)\}\}/g;
  let m;
  while ((m = re.exec(text))) {
    const expr = m[1];
    // 含字符串字面量的表达式交给别的检查，这里不拆（避免拆出半个词）
    if (expr.indexOf("'") > -1 || expr.indexOf('"') > -1) continue;
    const head = expr.match(/^\s*([A-Za-z_$][\w$]*)/);
    if (head) out.add(head[1]);
  }
  return out;
}

function checkForAlias() {
  const issues = [];
  const stack = [];
  let m;
  while ((m = TAG.exec(wxmlSrc))) {
    const [, closing, tag, attrs, selfClose] = m;
    if (closing) {
      const frame = stack.pop();
      if (!frame || !frame.isFor) continue;
      const inner = wxmlSrc.slice(frame.start + frame.len, m.index);

      // 可见别名 = 外层块 + 本块 + 微信默认值
      const visible = new Set(['item', 'index']);
      stack.forEach((f) => {
        if (f.isFor) {
          visible.add(f.aliasItem);
          visible.add(f.aliasIndex);
        }
      });
      visible.add(frame.aliasItem);
      visible.add(frame.aliasIndex);

      // 嵌套子块自己声明的别名，对本块文本而言合法
      const innerDeclared = new Set();
      const ide = /\swx:for-(?:item|index)\s*=\s*"([^"]*)"/g;
      let idm;
      while ((idm = ide.exec(inner))) innerDeclared.add(idm[1]);

      const idents = exprIdents(inner);
      idents.forEach((id) => {
        if (EXPR_LITERALS.has(id)) return;
        if (visible.has(id) || innerDeclared.has(id)) return;
        if (DATA_FIELDS.has(id)) return;
        issues.push(
          `<${tag} wx:for-item="${frame.aliasItem}"> 块内的 {{${id}}}` +
            ` 既不是可见别名（${[...visible].join('/')}）也不是 data 字段，渲染会是空白`
        );
      });

      if (frame.aliasItem !== 'item' && idents.has('item')) {
        issues.push(`<${tag} wx:for-item="${frame.aliasItem}"> 块内仍引用默认别名 item`);
      }
      if (frame.aliasIndex !== 'index' && idents.has('index')) {
        issues.push(`<${tag} wx:for-index="${frame.aliasIndex}"> 块内仍引用默认别名 index`);
      }
      continue;
    }
    if (selfClose) continue;
    const alias = {};
    let isFor = false;
    const are = /\s(wx:for|wx:for-item|wx:for-index)\s*=\s*"([^"]*)"/g;
    let a;
    while ((a = are.exec(attrs))) {
      isFor = true;
      if (a[1] === 'wx:for-item') alias.item = a[2];
      if (a[1] === 'wx:for-index') alias.index = a[2];
    }
    stack.push({
      tag,
      isFor,
      start: m.index,
      len: m[0].length,
      aliasItem: alias.item || 'item',
      aliasIndex: alias.index || 'index'
    });
  }
  if (stack.length) issues.push(`有 ${stack.length} 个标签没有闭合（含 wx:for 块）`);
  return issues;
}

const aliasIssues = checkForAlias();
const forTags = (wxmlSrc.match(/\swx:for\s*=/g) || []).length;
const forAliasDecls = (wxmlSrc.match(/\swx:for-(?:item|index)\s*=/g) || []).length;
console.log('\n2) wx:for 别名');
console.log(`   wx:for 块 ${forTags} 个，wx:for-item/index 声明 ${forAliasDecls} 个`);
if (aliasIssues.length) {
  console.log(`   ❌ ${aliasIssues.length} 处别名/引用不配套:`);
  aliasIssues.forEach((i) => console.log(`      - ${i}`));
  bad(`${aliasIssues.length} 处 wx:for 别名与引用不配套`);
} else {
  console.log('   ✅ 别名声明与引用全部配套，无悬空别名');
}

/* ============================================================
 * 3. class 覆盖：WXML 里每个静态类在本页 wxss 或全局样式里都有定义
 * ============================================================ */
const globalClasses = (function () {
  let text = exists(path.join(ROOT, 'app.wxss')) ? read(path.join(ROOT, 'app.wxss')) : '';
  const sd = path.join(ROOT, 'styles');
  if (exists(sd)) {
    for (const f of fs.readdirSync(sd)) {
      if (f.endsWith('.wxss')) text += '\n' + read(path.join(sd, f));
    }
  }
  const set = new Set();
  const re = /\.([a-zA-Z][\w-]*)/g;
  let m;
  while ((m = re.exec(text))) set.add(m[1]);
  return set;
})();
const localClasses = (function () {
  const set = new Set();
  const re = /\.([a-zA-Z][\w-]*)/g;
  let m;
  while ((m = re.exec(wxss))) set.add(m[1]);
  return set;
})();

const usedClasses = (function () {
  const set = new Set();
  /*
   * (?<![\w-]) 保证前面不是单词字符——否则 hover-class="none"
   * 里的 class="none" 会被误当成一个类，报「.none 未定义」。
   */
  const re = /(?<![\w-])class\s*=\s*"([^"]*)"/g;
  let m;
  while ((m = re.exec(wxml))) {
    // 整段插值替换成空格，避免把表达式内部的 . == ? : 拆成类名
    m[1]
      .replace(/\{\{[^}]*\}\}/g, ' ')
      .split(/\s+/)
      .forEach((c) => c && set.add(c));
  }
  return set;
})();

const missingClasses = [...usedClasses].filter(
  (c) => !localClasses.has(c) && !globalClasses.has(c)
);

console.log('\n3) class 覆盖');
console.log(
  `   WXML 用到 ${usedClasses.size} 个类，本地 wxss 定义 ${localClasses.size} 个，全局提供 ${globalClasses.size} 个`
);
if (missingClasses.length) {
  console.log(`   ❌ 缺失 ${missingClasses.length} 个:`);
  missingClasses.forEach((c) => console.log(`      - .${c}`));
  bad(`${missingClasses.length} 个 class 没有对应样式定义`);
} else {
  console.log('   ✅ 缺失 0 个');
}

/* ============================================================
 * 4. 返回键自绘：nav-back + 恰好一条 .bk-line
 * ============================================================ */
const bkLines = (wxmlSrc.match(/class="[^"]*\bbk-line\b[^"]*"/g) || []).length;
const hasNavBack = /class="[^"]*\bnav-back\b[^"]*"/.test(wxmlSrc);
console.log('\n4) 自绘返回键');
if (hasNavBack && bkLines === 1) {
  console.log('   ✅ 有 .nav-back，且 .bk-line 恰好 1 条');
} else {
  console.log(
    `   ❌ nav-back=${hasNavBack}，bk-line=${bkLines} 条（必须恰好 1 条，多一条就多一条线）`
  );
  bad('自绘返回键结构不对（需要 nav-back + 恰好一条 bk-line）');
}

/* ============================================================
 * 5. WXML 不支持的 JS 写法（Math./JSON./svg 等）
 * ============================================================ */
const FORBIDDEN = [
  [/\bMath\./, 'Math.xxx'],
  [/\bJSON\./, 'JSON.xxx'],
  [/\bString\.fromCharCode/, 'String.fromCharCode'],
  [/\bparseInt\(|\bparseFloat\(|\bNumber\(/, 'Number/parseInt'],
  [/\bnew\s+Date\(/, 'new Date()'],
  [/<svg[\s>]/i, '<svg> 标签'],
  [/\*\*[^*]+\*\*/, 'markdown 加粗记号']
];
const forbiddenHit = [];
FORBIDDEN.forEach(([re, label]) => {
  if (re.test(wxmlSrc)) forbiddenHit.push(label);
});
console.log('\n5) WXML 表达式合法性');
if (forbiddenHit.length) {
  forbiddenHit.forEach((f) => console.log(`   ❌ 用到了 ${f}`));
  bad(`WXML 里出现不支持的写法：${forbiddenHit.join(', ')}`);
} else {
  console.log('   ✅ 无 Math./JSON./svg/markdown 等不支持的写法');
}

/* ============================================================
 * 6. data 字段对账：模板插值到的顶层字段必须存在于 reader.js
 * ============================================================ */
const RESERVED = new Set(['item', 'index', 'g', 'r', 'it']);
const usedTop = new Set();
const exprRe = /\{\{([^{}]+)\}\}/g;
let xm;
while ((xm = exprRe.exec(wxmlSrc))) {
  const idm = xm[1].match(/^\s*([A-Za-z_$][\w$]*)/);
  if (idm) usedTop.add(idm[1]);
}
const fieldMissing = [...usedTop].filter(
  (k) => !RESERVED.has(k) && !DATA_FIELDS.has(k)
);

console.log('\n6) data 字段对账');
console.log(
  `   data 初始字段 ${dataKeys.size} 个，setData 补设 ${setDataKeys.size} 个，模板引用顶层字段 ${usedTop.size} 个`
);
if (fieldMissing.length) {
  console.log('   ❌ 模板引用了 data 里不存在的字段:');
  fieldMissing.forEach((f) => console.log(`      - {{${f}}}`));
  bad(`模板引用了不存在的 data 字段：${fieldMissing.join(', ')}`);
} else {
  console.log('   ✅ 全部字段都能在 reader.js 里找到');
}

/* ============================================================
 * 7. JSON 合法性 + 路由注册
 * ============================================================ */
console.log('\n7) 配置与路由');
let readerJson = null;
try {
  readerJson = JSON.parse(read(PAGE_JSON));
  console.log('   ✅ reader.json 是合法 JSON');
} catch (e) {
  bad(`reader.json 不是合法 JSON：${e.message}`);
}

let appJson = null;
try {
  appJson = JSON.parse(read(APP_JSON));
  console.log('   ✅ app.json 是合法 JSON');
} catch (e) {
  bad(`app.json 不是合法 JSON：${e.message}`);
}

if (readerJson) {
  const uc = readerJson.usingComponents;
  if (uc && typeof uc === 'object' && Object.keys(uc).length === 0) {
    console.log('   ✅ usingComponents 为空对象');
  } else {
    bad('reader.json 的 usingComponents 应为空对象 {}');
  }
  if (/连续朗读/.test(readerJson.navigationBarTitleText || '')) {
    console.log('   ✅ 页面标题为「连续朗读」');
  } else {
    bad('reader.json 的 navigationBarTitleText 应为「连续朗读」');
  }
}

const PAGE = 'pages/reader/reader';
if (appJson && Array.isArray(appJson.pages)) {
  if (appJson.pages.indexOf(PAGE) > -1) {
    console.log(`   ✅ app.json 已注册 ${PAGE}（共 ${appJson.pages.length} 个页面）`);
  } else {
    bad(`app.json 的 pages 里没有 ${PAGE}`);
  }
  // 顺手确认没有别的页面目录漏注册
  const pdir = path.join(ROOT, 'pages');
  const dirs = fs
    .readdirSync(pdir)
    .filter((d) => exists(path.join(pdir, d, d + '.js')))
    .map((d) => 'pages/' + d + '/' + d);
  const unregistered = dirs.filter((p) => appJson.pages.indexOf(p) === -1);
  if (unregistered.length) {
    console.log(`   ⚠️  还有未注册的页面: ${unregistered.join(', ')}`);
    bad(`还有页面没注册到 app.json：${unregistered.join(', ')}`);
  } else {
    console.log('   ✅ 没有其他漏注册的页面');
  }
}

/* ============================================================
 * 汇总
 * ============================================================ */
console.log('');
if (problems.length) {
  console.log(`❌ 发现 ${problems.length} 类问题：`);
  problems.forEach((p) => console.log(`   · ${p}`));
  process.exit(1);
} else {
  console.log('✅ reader 页面静态校验全部通过');
  console.log(
    `   事件绑定 ${boundEvents.size} 个（差集 0）· wx:for ${forTags} 块（别名全配套）· 缺失 class 0 个`
  );
}