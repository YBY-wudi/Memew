/**
 * 云函数调用风格检查
 * ===================================================================
 * ⚠ 本脚本**不**检查签名对错 —— cloud.js 已经同时兼容
 *   ('library', {...}) 和 ({ name, data }) 两种写法（见该函数注释），
 *   所以两种都是合法的。
 *
 * 它真正的作用是**统计新旧写法的分布**，防止新代码继续扩散对象写法。
 * 原因：对象写法虽然在 cloud.js 拆包后能工作，但语义混乱 ——
 *   cloud.callFunction({ name: 'x', data: {...} })   第一个参数不是「函数名」
 *   读代码的人会以为是 wx.cloud 的签名，而它其实是本项目的二次封装。
 *
 * 用法：node tools/check-call-signature.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SCAN_DIRS = [
  'miniprogram/pages',
  'miniprogram/utils',
  'miniprogram/components'
];

let problems = [];
let checked = 0;
let okCount = 0;
let newStyle = 0;
let oldStyle = 0;
let varStyle = 0;

/** 收集所有 .js 文件 */
function walk(dir, out) {
  if (!fs.existsSync(dir)) return out;
  fs.readdirSync(dir).forEach((f) => {
    const p = path.join(dir, f);
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      if (f === 'node_modules' || f.indexOf('.') === 0) return;
      walk(p, out);
    } else if (f.endsWith('.js')) {
      out.push(p);
    }
  });
  return out;
}

const files = [];
SCAN_DIRS.forEach((d) => walk(path.join(ROOT, d), files));

files.forEach((f) => {
  const src = fs.readFileSync(f, 'utf8');
  const lines = src.split(/\r?\n/);

  lines.forEach((line, i) => {
    // 只看明显是调用的行
    if (line.indexOf('callFunction(') === -1) return;
    // 跳过定义行和注释
    const trimmed = line.trim();
    if (trimmed.indexOf('//') === 0) return;
    if (trimmed.indexOf('function callFunction') > -1) return;

    checked++;

    const rel = path.relative(ROOT, f);

    // 提取参数部分
    const m = trimmed.match(/callFunction\(([\s\S]*)/);
    if (!m) return;
    let args = m[1];

    // 单行调用：找配对的右括号
    // 简单处理：从第一个 ( 开始数括号
    const start = trimmed.indexOf('callFunction(') + 'callFunction('.length;
    let depth = 1;
    let end = start;
    while (end < trimmed.length && depth > 0) {
      const ch = trimmed[end];
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      if (depth > 0) end++;
    }
    // 多行调用要拼后续行
    if (depth > 0) {
      let acc = trimmed;
      for (let j = i + 1; j < lines.length && depth > 0; j++) {
        acc += '\n' + lines[j];
        for (let k = 0; k < lines[j].length; k++) {
          const ch = lines[j][k];
          if (ch === '(') depth++;
          else if (ch === ')') depth--;
        }
      }
      args = acc.substring(acc.indexOf('callFunction(') + 'callFunction('.length);
      // 截到第一个顶层逗号之前
      let d2 = 0;
      for (let k = 0; k < args.length; k++) {
        const ch = args[k];
        if (ch === '(' || ch === '{' || ch === '[') d2++;
        else if (ch === ')' || ch === '}' || ch === ']') d2--;
        else if (ch === ',' && d2 === 0) {
          args = args.substring(0, k);
          break;
        }
      }
    }

    const a = args.trim();

    // 合法：第一个参数是字符串字面量
    if (/^['"]/.test(a)) {
      okCount++;
      newStyle++;
      return;
    }

    // 合法：第一个参数是对象。
    //   cloud.js 现在**同时兼容两种写法**（见该函数顶部注释），
    //   所以 { name, data } 本身是合法的 ——
    //   但前提是 opts 没有被误当业务参数传进来。
    //   原来的 bug 是：{name,data} 作为**第一个**参数、
    //   而函数签名是 (name, data, opts)，
    //   于是 data=undefined、opts 落到 data 的位置。
    //   现在 cloud.js 开头会拆包修好，所以这里只做提示性检查。
    if (/^\{/.test(a)) {
      okCount++;
      oldStyle++;
      return;
    }

    if (/^[a-zA-Z_$]/.test(a)) {
      varStyle++;
      // 变量传参：交给人工判断，只提示
      problems.push(
        `${rel}:${i + 1}  第一个参数是变量（${a.substring(0, 40)}），需人工确认它传的是函数名字符串`
      );
      return;
    }
  });
});

console.log('扫描文件:', files.length, '个');
console.log('callFunction 调用点:', checked, '处');
console.log('');
console.log('写法分布：');
console.log('  新写法 callFunction("名字", {...})   :', newStyle, '处  ← 推荐');
console.log('  旧写法 callFunction({ name, data })  :', oldStyle, '处  (cloud.js 已兼容)');
console.log('  需人工确认（第一个参数是变量）      :', varStyle, '处');
console.log('');
if (varStyle) {
  console.log('⚠ 以下调用第一个参数是变量，需人工确认传的是函数名字符串：');
  problems.forEach((p) => console.log('  ' + p));
}
if (oldStyle > newStyle) {
  console.log('ℹ 旧写法占多数。它们目前能工作，但新代码请统一用新写法。');
}
if (!problems.length) {
  console.log('✅ 没有需要人工确认的调用点');
}