/**
 * action-sync.js —— 校验云函数头部注释里的 action 清单与实际实现是否一致
 * ------------------------------------------------------------
 * 为什么要这个：
 *   云函数文件头都有一段「action: xxx」的注释文档，方便调用方查阅。
 *   但代码改了、注释忘了改，就会出现「照注释调 → 返回未知 action」的静默失败，
 *   而且不报错、只是功能不生效，极难排查。review 云函数就踩过这个坑。
 *
 * 规则：
 *   注释里列出的名字，必须都能在代码里找到 `action === 'xxx'` 或 `case 'xxx'`。
 *   反之代码里存在但注释没列出的，也会报出来（防止漏文档）。
 *
 * 用法：node tools/action-sync.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'cloudfunctions');
const FUNCTIONS = ['login', 'review', 'library', 'medal', 'upload', 'aiService', 'admin'];

/** 读取注释块（文件开头的 /** ... *\/ ） */
function readHeader(code) {
  const m = code.match(/^\/\*\*([\s\S]*?)\*\//);
  return m ? m[1] : '';
}

/**
 * 注释里声明的字段名：形如 "xxx   说明文字"
 *
 * 🔴🔴 两种对齐宽度都要认，且**只取每行的第一个标识符**：
 *   · 两个空格以上分隔 → 多任务并列写法（"allCards  today  stats  ..."），
 *     说明文字在第二个空格之后，必须拦住，否则把说明里的英文词当action 名
 *     （踩过：改成宽松正则后 review 报出 all/wrong/check/save/build/knowledge
 *      —— 全是从「一键记忆错题」这类说明文字里切出来的）。
 *   · 恰好一个空格 → "vision_check 视觉模型自检"、"myBooks   ..."被漏报过，
 *     原来要求两空格把它们全漏了 → 报「代码里有但注释没写」，
 *     而注释其实写了。守门脚本自己太脆，报出来的每条都要先怀疑脚本。
 *
 *   两级处理：优先用严格式抓多任务行，剩下的用宽松式抓单空格行。
 */
/*
 🔴🔴 标识符正则必须**支持驼峰**：`[A-Za-z][A-Za-z0-9_]*`。
     原来写成 `[a-z_][a-z0-9_]*`，遇到 allCards / wrongQuestions / checkIn /
     saveCard / knowledgeNet 这类命名会在大写字母前截断：
       allCards → "all"、checkIn → "check"、saveCard → "save"
     然后拿"all"去代码里找 `action === 'all'` 找不到 → 报「注释写了但代码没有」。
     项目里一半的 action 是驼峰，这个 bug 让 review/upload/admin/library
     全部误报。守门脚本自己错了整整一轮。
     —— 教训同「守卫脚本报了问题先怀疑守卫」，尤其当它一次报出好几处矛盾时。
 */
const ID = '[A-Za-z][A-Za-z0-9_]*';

function parseDeclared(header) {
  const names = new Set();

  /*
   🔴 空格必须写`[ \t]`，**不能用 `\s`**。
      `\s` 包含 \n，于是多任务那一行的尾部 `[ \t]{2,}` 判定前的分隔
      会跨过换行把下一行的 action 名一起吞进来，声明出一堆假 action。
  */
  const strict = new RegExp(
    '^[ \\t]*\\*[ \\t]{2,}(' + ID + '(?:[ \\t]+' + ID + ')*)[ \\t]{2,}',
    'gm'
  );
  const seenLines = new Set();
  let m;
  while ((m = strict.exec(header))) {
    seenLines.add(m.index);
    m[1].split(/[ \t]+/).forEach((t) => {
      if (new RegExp('^' + ID + '$').test(t)) names.add(t);
    });
  }

  // 宽松式：只取行首紧跟的第一个标识符（处理单空格对齐的那批）
  const loose = new RegExp('^[ \\t]*\\*[ \\t]{2,}(' + ID + ')', 'gm');
  while ((m = loose.exec(header))) {
    if (seenLines.has(m.index)) continue;
    names.add(m[1]);
  }

  return names;
}

/** 代码里真正分发的字段 */
function parseImplemented(code) {
  const names = new Set();
  // 🔴 这里同样必须用支持驼峰的 ID，否则 `action === 'allCards'` 被截成 'all'，
  //   跟注释里的'allCards' 对不上 —— 声明侧已修，这边漏了就是「两边永远不一致」。
  let m;
  const re1 = new RegExp("(?:action|task)\\s*===\\s*'(" + ID + ")'", 'g');
  while ((m = re1.exec(code))) names.add(m[1]);
  const re2 = new RegExp("case\\s+'(" + ID + ")'\\s*:", 'g');
  while ((m = re2.exec(code))) names.add(m[1]);
  return names;
}

/**
 * 跑一遍检查，返回结论。
 * 🔴 抽成函数是为了让 test-guard-action-sync.js 能直接 require 复用 ——
 *   原来只能 spawn 子进程跑，而 Windows 上连续 spawn 同一个 node.exe 会 EBUSY
 *   （项目踩过好几次，见test-all.sh 的纪律）。
 *   返回的是「哪个云函数有哪些问题」，不是拼好的字符串 ——
 *   测试断言结构而不是 grep 输出文本（grep 措辞一改就误报）。
 */
function checkAll() {
  const results = {};
  for (const name of FUNCTIONS) {
    const file = path.join(ROOT, name, 'index.js');
    if (!fs.existsSync(file)) {
      results[name] = { missing: true, ghost: [], undocumented: [] };
      continue;
    }
    const code = fs.readFileSync(file, 'utf8');
    const declared = parseDeclared(readHeader(code));
    const implemented = parseImplemented(code);
    results[name] = {
      missing: false,
      declared: [...declared],
      // aiService 的 key 是 task 不是 action，头部注释写的是 "task:"，逻辑相同
      ghost: [...declared].filter((a) => !implemented.has(a)),
      undocumented: [...implemented].filter((a) => !declared.has(a))
    };
  }
  return results;
}

/*直接运行时才打印报告；被require 时只导出函数 */
if (require.main === module) {
  console.log('云函数 action 注释与实现一致性检查\n');

  const results = checkAll();
  let problems = 0;
  for (const name of FUNCTIONS) {
    const r = results[name];
    if (r.missing) {
      console.log(`  ✗ ${name.padEnd(10)} 缺少 index.js`);
      problems++;
      continue;
    }
    if (!r.ghost.length && !r.undocumented.length) {
      console.log(`  ✓ ${name.padEnd(10)} 注释 ${r.declared.length} 项，与实现完全一致`);
    } else {
      problems++;
      if (r.ghost.length) {
        console.log(`  ✗ ${name.padEnd(10)} 注释里写了但代码里没有：${r.ghost.join(', ')}`);
      }
      if (r.undocumented.length) {
        console.log(`  ⚠ ${name.padEnd(10)} 代码里有但注释没写：${r.undocumented.join(', ')}`);
      }
    }
  }

  console.log('');
  if (problems) {
    console.log(`发现 ${problems} 处不一致。`);
    console.log('「注释写了但代码没有」= 照文档调会返回「未知 action」，必须改注释或补实现。');
    console.log('「代码有但注释没写」= 建议补进头部注释，方便查阅。');
    process.exit(1);
  }
  console.log('全部一致。');
}

module.exports = { checkAll, parseDeclared, parseImplemented, FUNCTIONS };
