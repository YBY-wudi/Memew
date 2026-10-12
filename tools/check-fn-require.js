/**
 * check-fn-require.js —— 检查云函数的 require 路径是否会在云端404
 * ------------------------------------------------------------
 * 为什么需要这个：
 *   云开发上传云函数时，**只打包函数自身目录**
 *   （例如 cloudfunctions/share/ 整个目录）。
 *   `cloudfunctions/_shared/` 是仓库里的开发用副本，云端**不存在**。
 *
 *   所以函数里写 `require('./_shared/common.js')` 时：
 *     · 本地 node 能 require 到 —— 看不出问题
 *     · 微信开发者工具可能也不报错
 *     · **只有真机调用才炸**（Cannot find module），极难排查
 *
 *   share 函数就踩过这个坑（7 个函数都写 './common.js'，只有它写成 './_shared/'）。
 *
 * 检查两件事：
 *   1. require 的相对路径是否指向函数**自身目录**内
 *   2. 被 require 的文件在函数目录里**是否真实存在**（sync-shared 有没有跑）
 *
 * 用法：node tools/check-fn-require.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const FN_DIR = path.join(ROOT, 'cloudfunctions');
const FUNCTIONS = ['login', 'review', 'library', 'medal', 'upload', 'aiService', 'admin', 'share'];

let pass = 0;
const fails = [];
function ok(name) {
  pass++;
  console.log('  ✓ ' + name);
}
function bad(name, why) {
  fails.push(name + ' → ' + why);
  console.log('  ✗ ' + name + ' → ' + why);
}

console.log('\n【1】require 路径不能指向 _shared（云端不存在）');
FUNCTIONS.forEach((fn) => {
  const entry = path.join(FN_DIR, fn, 'index.js');
  if (!fs.existsSync(entry)) {
    bad(fn, 'index.js 不存在');
    return;
  }
  const src = fs.readFileSync(entry, 'utf8');
  const m = src.match(/require\(['"](\.[^'"]*_shared[^'"]*)['"]\)/);
  if (m) {
    bad(fn, "引用了 " + m[1] + '，云端会404 → 改成 ./common.js');
  } else {
    ok(fn + ' 没有引用 _shared');
  }
});

console.log('\n【2】被 require 的公共文件必须已同步到函数目录');
const NEEDED = ['common.js', 'prompts.js', 'memory-engine.js'];
FUNCTIONS.forEach((fn) => {
  const entry = path.join(FN_DIR, fn, 'index.js');
  if (!fs.existsSync(entry)) return;
  const src = fs.readFileSync(entry, 'utf8');

  NEEDED.forEach((dep) => {
    const required = src.indexOf("require('./" + dep + "')") > -1;
    if (!required) return; // 这个函数不需要它
    const target = path.join(FN_DIR, fn, dep);
    if (!fs.existsSync(target)) {
      bad(
        fn + ' → ' + dep,
        '函数目录里没有这个文件 → 跑 node cloudfunctions/sync-shared.js'
      );
    }
  });
  ok(fn + ' 公共依赖齐全');
});

console.log('\n【3】sync-shared 是否最新（内容一致）');
const SHARED = path.join(ROOT, 'cloud-shared');
if (!fs.existsSync(SHARED)) {
  bad('_shared', '目录不存在');
} else {
  FUNCTIONS.forEach((fn) => {
    ['common.js'].forEach((dep) => {
      const src = path.join(SHARED, dep);
      const dst = path.join(FN_DIR, fn, dep);
      if (!fs.existsSync(src) || !fs.existsSync(dst)) return;
      const a = fs.readFileSync(src, 'utf8').trim();
      const b = fs.readFileSync(dst, 'utf8').trim();
      if (a !== b) {
        bad(fn + '/' + dep, '内容与 _shared 不一致 → 跑 sync-shared');
      } else {
        ok(fn + '/' + dep + ' 已同步');
      }
    });
  });
}

console.log('\n【4】8 个函数目录与入口齐全');
FUNCTIONS.forEach((fn) => {
  const dir = path.join(FN_DIR, fn);
  if (!fs.existsSync(dir)) return bad(fn, '目录不存在');
  ['index.js', 'package.json'].forEach((f) => {
    if (!fs.existsSync(path.join(dir, f))) bad(fn, '缺 ' + f);
  });
});
ok('目录与入口检查完成');

console.log('\n【5】cloudbaserc.json 是否注册了全部函数');
const rcPath = path.join(ROOT, 'cloudbaserc.json');
if (!fs.existsSync(rcPath)) {
  bad('cloudbaserc.json', '不存在');
} else {
  const rc = JSON.parse(fs.readFileSync(rcPath, 'utf8'));
  const names = (rc.functions || []).map((f) => f.name);
  FUNCTIONS.forEach((fn) => {
    if (names.indexOf(fn) === -1) {
      bad('cloudbaserc.json', '未注册 ' + fn + ' → 部署时 CLI 会问是否用默认配置并**无限等待 stdin**');
    } else {
      ok('已注册 ' + fn);
    }
  });
}

console.log('\n————————————————');
console.log('通过 ' + pass + ' 项，失败 ' + fails.length + ' 项');
if (fails.length) {
  console.log('\n失败明细：');
  fails.forEach((f) => console.log('  - ' + f));
  process.exit(1);
}
console.log('✅ 云函数依赖检查全部通过');