/**
 * 工程完整性自检脚本
 * ------------------------------------------------------------
 * 检查项：
 *   1. app.json 注册的页面四件套是否齐全
 *   2. 磁盘上的页面目录是否都已在 app.json 注册
 *   3. 各 json 的 usingComponents 指向的组件文件是否存在
 *   4. WXML 的事件绑定是否在对应 JS 中已定义
 *   5. 代码里的 url 跳转目标页面是否存在
 *   6. WXML 中是否误用小程序不支持的表达式（Math./String./Array. 等）
 *
 * 用法：node tools/audit.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'miniprogram');
const issues = [];
const warns = [];

const read = (p) => fs.readFileSync(p, 'utf8');
const exists = (p) => fs.existsSync(p);

/* ---------- 1 & 2：页面注册 ---------- */
const appJson = JSON.parse(read(path.join(ROOT, 'app.json')));
const declared = new Set(appJson.pages);

appJson.pages.forEach((p) => {
  ['js', 'wxml', 'wxss', 'json'].forEach((ext) => {
    const f = path.join(ROOT, p + '.' + ext);
    if (!exists(f)) issues.push('页面文件缺失: ' + p + '.' + ext);
  });
});

if (exists(path.join(ROOT, 'pages'))) {
  fs.readdirSync(path.join(ROOT, 'pages')).forEach((d) => {
    const p = 'pages/' + d + '/' + d;
    if (!declared.has(p)) issues.push('页面未在 app.json 注册: ' + p);
  });
}

/* ---------- 3：组件引用 ---------- */
function checkUsingComponents(dir, label) {
  const jf = path.join(dir, 'index.json');
  if (!exists(jf)) return;
  let j;
  try {
    j = JSON.parse(read(jf));
  } catch (e) {
    issues.push(label + '/index.json 解析失败');
    return;
  }
  const uc = j.usingComponents || {};
  Object.keys(uc).forEach((name) => {
    let p = uc[name];
    if (p.startsWith('/')) p = ROOT + p;
    else p = path.resolve(dir, p);
    ['js', 'wxml', 'wxss', 'json'].forEach((ext) => {
      if (!exists(p + '.' + ext)) {
        issues.push('组件缺失: ' + label + ' -> ' + name + ' (' + p + '.' + ext + ')');
      }
    });
  });
}

['pages', 'components'].forEach((grp) => {
  const base = path.join(ROOT, grp);
  if (!exists(base)) return;
  fs.readdirSync(base).forEach((d) => {
    checkUsingComponents(path.join(base, d), grp + '/' + d);
  });
});
checkUsingComponents(path.join(ROOT, 'custom-tab-bar'), 'custom-tab-bar');

/* ---------- 4：事件绑定 ---------- */
['pages', 'components'].forEach((grp) => {
  const base = path.join(ROOT, grp);
  if (!exists(base)) return;
  fs.readdirSync(base).forEach((d) => {
    const stem = grp === 'components' ? 'index' : d;
    const wxml = path.join(base, d, stem + '.wxml');
    const js = path.join(base, d, stem + '.js');
    if (!exists(wxml) || !exists(js)) return;
    const w = read(wxml);
    const j = read(js);
    const re = /(?:bind|catch)(?::)?[a-zA-Z]+\s*=\s*"([^"{]+)"/g;
    const handlers = [];
    let m;
    while ((m = re.exec(w))) handlers.push(m[1].trim());
    Array.from(new Set(handlers)).forEach((h) => {
      if (!h) return;
      const esc = h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (!new RegExp('(^|[\\s,{])' + esc + '\\s*[(:]').test(j)) {
        issues.push('事件未在 JS 中定义: ' + grp + '/' + d + ' -> ' + h + '()');
      }
    });
  });
});

/* ---------- 5：跳转路径 ---------- */
(function scanUrls() {
  const urls = [];
  (function walk(d) {
    if (!exists(d)) return;
    fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
      const p = path.join(d, e.name);
      if (e.isDirectory()) return walk(p);
      if (!e.name.endsWith('.js')) return;
      const t = read(p);
      const re = /url\s*:\s*['"`]([^'"`]+)['"`]/g;
      let m;
      while ((m = re.exec(t))) urls.push(m[1]);
    });
  })(ROOT);

  urls.forEach((u) => {
    const m = u.match(/^\/?(pages\/[\w-]+\/[\w-]+)/);
    if (m && !declared.has(m[1])) issues.push('跳转目标页面不存在: ' + u);
  });
})();

/* ---------- 6：WXML 不支持的表达式 ---------- */
(function scanWxmlExpr() {
  (function walk(d) {
    if (!exists(d)) return;
    fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
      const p = path.join(d, e.name);
      if (e.isDirectory()) return walk(p);
      if (!e.name.endsWith('.wxml')) return;
      // ⚠ 必须先剥掉注释再扫，否则假警报：
      //   页面模板顶部常有「约定说明」注释（本项目的 reader.wxml 就写着
      //   「WXML 里不能写 Math.xxx / String.fromCharCode / JSON.xxx」），
      //   那是给人看的说明，不是模板代码。以前会把这类注释当成违规，
      //   警告越攒越多，最后没人看警告了 —— 狼来了。
      const t = read(p)
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/<!--[^]*$/, '');

      // 小程序 WXML 表达式不支持 JS 全局对象
      const bad = ['Math.', 'JSON.', 'Object.', 'Array.', 'String.fromCharCode', 'Number(', 'parseInt(', 'parseFloat('];
      bad.forEach((k) => {
        if (t.indexOf(k) > -1) {
          warns.push('WXML 中出现受限表达式 ' + k + ' -> ' + path.relative(ROOT, p));
        }
      });
      // 原生 SVG 标签小程序不渲染
      if (/<svg[\s>]/i.test(t)) {
        issues.push('WXML 使用了原生 svg 标签（小程序不支持）-> ' + path.relative(ROOT, p));
      }
    });
  })(ROOT);
})();

/* ---------- 输出 ---------- */
console.log('页面数：' + appJson.pages.length + '，组件数：' +
  (exists(path.join(ROOT, 'components')) ? fs.readdirSync(path.join(ROOT, 'components')).length : 0));

if (issues.length) {
  console.log('\n❌ 发现 ' + issues.length + ' 个问题：');
  Array.from(new Set(issues)).forEach((i) => console.log('   ' + i));
} else {
  console.log('\n✅ 页面 / 组件 / 事件 / 路径 / 表达式 全部通过');
}

if (warns.length) {
  console.log('\n⚠️  提醒 ' + warns.length + ' 条：');
  Array.from(new Set(warns)).forEach((w) => console.log('   ' + w));
}

process.exit(issues.length ? 1 : 0);
