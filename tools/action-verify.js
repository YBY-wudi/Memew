/**
 * action-verify.js —— 校验「页面上写的调用参数」与「云函数真实支持的 action」是否一致
 * ------------------------------------------------------------
 * 为什么需要这个：
 *   页面/文档里写错 action 名，云函数会静默返回「未知 action」——
 *   不抛异常、只是功能不生效，排查起来极其费时。
 *   之前给用户写部署文档时就踩过：把 login 的 action 写成 stats（那其实是返回字段名）、
 *   把 library 写成 list（实际 official）、把 aiService 写成 action（实际 task）。
 *
 * 本工具把 pages/cloudcheck 里的 CASES 与云函数源码双向核对。
 *
 * 用法：node tools/action-verify.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CASES_FILE = path.join(ROOT, 'miniprogram/pages/cloudcheck/cloudcheck.js');

/** 从云函数源码里提取它支持的关键字 */
function supportedKeys(fnName) {
  const file = path.join(ROOT, 'cloudfunctions', fnName, 'index.js');
  if (!fs.existsSync(file)) return null;
  const code = fs.readFileSync(file, 'utf8');
  const keys = new Set();
  let m;
  // aiService 用 task，其余用 action，两个都收
  const re1 = /(?:action|task)\s*===\s*'([a-zA-Z_][\w]*)'/g;
  while ((m = re1.exec(code))) keys.add(m[1]);
  const re2 = /case\s+'([a-zA-Z_][\w]*)'\s*:/g;
  while ((m = re2.exec(code))) keys.add(m[1]);
  return keys;
}

/** 从自检页里提取 CASES 里的函数名与入参键 */
function extractCases() {
  const code = fs.readFileSync(CASES_FILE, 'utf8');
  const cases = [];
  // 匹配每个 name: 'xxx' 块，抓 payload 里的键值
  const re = /name:\s*'([a-zA-Z]+)'[\s\S]*?payload:\s*\{([^}]*)\}/g;
  let m;
  while ((m = re.exec(code))) {
    const fn = m[1];
    const payloadBody = m[2];
    // 找 action / task 的值
    const km = payloadBody.match(/(action|task)\s*:\s*'([a-zA-Z_][\w]*)'/);
    if (!km) continue;
    cases.push({ fn, paramKey: km[1], paramValue: km[2] });
  }
  return cases;
}

console.log('校验自检页调用参数 vs 云函数实际支持\n');

const cases = extractCases();
if (!cases.length) {
  console.log('✗ 没从 cloudcheck.js 里解析出任何用例，检查文件是否被改动');
  process.exit(1);
}

let bad = 0;
for (const c of cases) {
  const keys = supportedKeys(c.fn);
  if (keys === null) {
    console.log(`  ✗ ${c.fn.padEnd(11)} 云函数目录不存在`);
    bad++;
    continue;
  }
  const okKey = keys.has(c.paramValue);
  const paramOk = c.fn === 'aiService' ? c.paramKey === 'task' : c.paramKey === 'action';
  if (okKey && paramOk) {
    console.log(`  ✓ ${c.fn.padEnd(11)} ${c.paramKey}="${c.paramValue}"`);
  } else {
    bad++;
    if (!okKey) {
      console.log(`  ✗ ${c.fn.padEnd(11)} 不支持 "${c.paramValue}"`);
      console.log(`      支持的有: ${[...keys].sort().join(', ')}`);
    } else {
      console.log(`  ✗ ${c.fn.padEnd(11)} 参数名应为 ${c.fn === 'aiService' ? 'task' : 'action'}，实际是 ${c.paramKey}`);
    }
  }
}

console.log('');
if (bad) {
  console.log(`${bad} 处不一致 —— 自检页会误报，务必改正。`);
  process.exit(1);
}
console.log(`全部 ${cases.length} 个用例参数正确。`);
