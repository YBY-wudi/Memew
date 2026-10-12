/**
 * 打包 GitHub 展示仓库
 * ------------------------------------------------------------
 * 用法：node tools/build-github-package.js [输出目录]
 * 默认输出 D:/memorize/github
 *
 * 自动发现：不写死文件清单，只写「排除规则」。
 * 新增文件自动进包，新增敏感类型要往 EXCLUDE 里加。
 *
 * ⚠️ 与「永远不要把文件清单写死」是同一条规则：
 *    这里只写排除项，不写包含项。
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.resolve(process.argv[2] || 'D:/memorize/github');

// ---- 排除规则（只排除，不枚举包含）----
const EXCLUDE_DIRS = [
  '.git',
  'node_modules',
  'miniprogram_npm',
  '.tmp',
  'dist',          // 构建产物
  'publish',       // 公众号发布稿（含备案标注截图，可能带个人信息）
  '.workbuddy'
];

const EXCLUDE_FILES = [
  '.cloudbase-key.local.json',   // 🔴 明文 API Key
  'project.private.config.json', // 个人 AppID 覆盖
  '.DS_Store',
  'Thumbs.db'
];

// ---- 🔴 顶层文档：只留「成品 + 操作手册」，其余 md 一律不进公开仓库 ----
//
// 这里刻意用「保留清单」而不是「排除清单」：
//   排除清单的失效方式是「新写的内部笔记被悄悄发出去」，代价不可接受；
//   保留清单的失效方式是「新写的公开文档没被发出去」，只是少发一份、立刻能发现。
//
// 两类：
//   ① 给人看  README.md / README.en.md
//   ② 给 AI 看 AGENT.md / AGENT.en.md
//
// 🔴🔴 保留清单（2026-10-12 按用户要求收紧）：
//   用户原话：「像那些 DEBUG_GUIDE.md 等不需要，只要 readme 和智能体看的文档，
//   正常是英文，额外做一份 cn 标注的中文文档」。
//
// 因此只留两类：
//   ① 给人看   README.en.md（主）/ README.md（中文标注版）
//   ② 给 AI 看 AGENT.en.md（主）/ AGENT.md（中文标注版）
//   ③ 改代码必看 BACKEND_CONFIG.md（环境 ID / 云函数清单 / 改哪里）
//   ④ 部署步骤 DEPLOY_CHECKLIST.md（没有它读者拿到代码不知道怎么跑起来）
//
// 去掉的是**面向真机操作/发布运营**的文档：
//   · DEBUG_GUIDE         排障手册 —— 交给 AI 和开发者自查
//   · REAL_DEVICE_CHECK   真机自检清单 —— 人工操作清单，AI 用不上
//   · UPLOAD_RELEASE_GUIDE 上传发布指南 —— 含备案状态等一次性运营信息
//
// ⚠️ 这三份**不是删掉就没了**：README 的文档索引表里也同步去掉了对应行，
//    否则会留下死链（已由 test-guard-github-package.js 断言索引与实际文件一致）。
//
// ⚠️ 命名约定（2026-10-12 起强制）：
//   · 主版一律英文，文件名用 `Xxx.en.md`
//   · 中文版文件名用 `Xxx.cn.md`，且必须在开头第一行留语言互链
//   · 裸名 `Xxx.md` **不再保留** —— 「默认是中文还是英文」说不清，
//     读者只能靠猜。`KEEP_ROOT_DOCS` 里不再出现裸名就是这条约定的执行。
//
// ⚠️ 「保留清单」本身要钉死：新增白名单项要连同文档一起进包，
//    只加代码不加文档 = 白名单形同虚设（守卫测试见 test-guard-github-package.js）。
// 子目录里的 md（database/README.md、tools/EXPAND-RULES.md）不受此限制。
const KEEP_ROOT_DOCS = [
  'README.en.md',
  'README.md',
  'AGENT.en.md',
  'AGENT.md',
  'BACKEND_CONFIG.en.md',
  'BACKEND_CONFIG.cn.md',
  'DEPLOY_CHECKLIST.en.md',
  'DEPLOY_CHECKLIST.cn.md'
];

// 后缀也算：任何 *.local.json 都不进包
const EXCLUDE_SUFFIX = ['.local.json'];

let copied = 0;
let skipped = 0;
const skippedList = [];
let bytes = 0;

function shouldSkip(name, isDir, isRoot) {
  if (isDir && EXCLUDE_DIRS.indexOf(name) > -1) return true;
  if (!isDir) {
    // 顶层 md 只保留「两类四份」；子目录的 md 不受限
    if (isRoot && /\.md$/i.test(name) && KEEP_ROOT_DOCS.indexOf(name) === -1) return true;
    if (EXCLUDE_FILES.indexOf(name) > -1) return true;
    for (let i = 0; i < EXCLUDE_SUFFIX.length; i++) {
      const s = EXCLUDE_SUFFIX[i];
      if (name.length > s.length && name.slice(-s.length) === s) return true;
    }
  }
  return false;
}

function walk(src, dst) {
  const isRoot = src === ROOT;
  const items = fs.readdirSync(src);
  items.forEach((name) => {
    const s = path.join(src, name);
    const d = path.join(dst, name);
    let isDir = false;
    try {
      isDir = fs.statSync(s).isDirectory();
    } catch (e) {
      return;
    }
    if (shouldSkip(name, isDir, isRoot)) {
      skipped++;
      if (skippedList.length < 20) skippedList.push(path.relative(ROOT, s));
      return;
    }
    if (isDir) {
      fs.mkdirSync(d, { recursive: true });
      walk(s, d);
    } else {
      fs.mkdirSync(path.dirname(d), { recursive: true });
      fs.copyFileSync(s, d);
      bytes += fs.statSync(d).size;
      copied++;
    }
  });
}

console.log('源目录 : ' + ROOT);
console.log('输出目录: ' + OUT);
console.log('');

if (fs.existsSync(OUT)) {
  // 只清内容，不清目录本身；_release 里放的是发给 GitHub Release 的 zip 附件
  const keep = ['.git', '_release'];
  /*
   * 🔴 清理失败**不许让整包崩掉**。
   *   之前某个旧文件被占用/无权限时 rmSync 直接抛异常，
   *   结果「复制文件」已经打完了、看起来像成功，
   *   实际进程以 stack trace 收场 —— 报告和实际状态对不上，
   *   下次会误判成「打包坏了」。改成收集 + 收尾提示。
   */
  const failed = [];
  fs.readdirSync(OUT).forEach((n) => {
    if (keep.indexOf(n) > -1) return;
    try {
      fs.rmSync(path.join(OUT, n), { recursive: true, force: true });
    } catch (e) {
      failed.push(n + '（' + (e.code || e.message) + '）');
    }
  });
  if (failed.length) {
    console.warn('⚠ 旧输出清理失败 ' + failed.length + ' 项（已跳过，继续打包）：');
    failed.forEach((f) => console.warn('    - ' + f));
    console.warn('  这些残留文件会被本次复制覆盖；若仍存在请手动删除 ' + OUT);
    console.log('');
  }
}
fs.mkdirSync(OUT, { recursive: true });

walk(ROOT, OUT);

console.log('复制文件: ' + copied + ' 个，' + (bytes / 1024 / 1024).toFixed(2) + ' MB');
console.log('跳过    : ' + skipped + ' 项');
skippedList.forEach((p) => console.log('  - ' + p));

// ---- 安全兜底：包内再扫一次敏感词 ----
const DANGER = /(apiKey\s*[:=]\s*["'][A-Za-z0-9_\-]{20,}|secretKey\s*[:=]\s*["'][^"']{8,}|AppSecret\s*[:=]\s*["'][^"']{8,})/;
const hits = [];
function scan(dir) {
  fs.readdirSync(dir).forEach((n) => {
    if (n === '.git') return;
    const p = path.join(dir, n);
    if (fs.statSync(p).isDirectory()) { scan(p); return; }
    if (!/\.(js|json|md|wxml|wxss)$/i.test(n)) return;
    if (n === 'build-github-package.js') return;
    let txt = '';
    try { txt = fs.readFileSync(p, 'utf8'); } catch (e) { return; }
    if (DANGER.test(txt)) hits.push(path.relative(OUT, p));
  });
}
scan(OUT);

console.log('');
if (hits.length) {
  console.log('🔴🔴 安全扫描发现疑似硬编码密钥，禁止上传：');
  hits.forEach((h) => console.log('  🔴 ' + h));
  process.exit(1);
}
console.log('✅ 安全扫描通过：包内无硬编码密钥');
