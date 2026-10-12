/**
 * bundle-fn.js —— 把每个云函数压成一个可直接粘贴的单文件
 * ------------------------------------------------------------
 * 为什么需要这个：
 *   云开发控制台的「网页编辑器」只能一个文件一个文件地粘贴。
 *   我们的函数依赖 _shared 下的 3 个公共文件（common / prompts / memory-engine），
 *   7 个函数 × 4 个文件 = 28 次粘贴，极易漏、极易错。
 *
 * 做法：
 *   把每个公共模块用 IIFE 包成一个局部对象变量，
 *   再把 index.js 里的 require('./xxx.js') 换成那个变量。
 *   由于原代码是 `const { ok, fail } = require('./common.js')` 这种解构形式，
 *   换成 `const { ok, fail } = __mod_common` 后语法依然成立，无需改动业务代码。
 *
 * 用法：
 *   node tools/bundle-fn.js          生成 dist/ 目录（单文件 + zip）
 *   node tools/bundle-fn.js --check  只校验，不写文件
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.join(__dirname, '..');
const FN_DIR = path.join(ROOT, 'cloudfunctions');
// ⚠️ 源文件在项目根的 cloud-shared/，不在 cloudfunctions/ 下。
// 原因：开发者工具会把 cloudfunctionRoot 下每个子目录都当成云函数上传，
// _shared 会被当成一个函数而失败（2026-10-06 实际踩到）。
const SHARED = path.join(ROOT, 'cloud-shared');
const DIST = path.join(ROOT, 'dist', 'cloudfunctions');

// ⚠️ 必须与 cloudbaserc.json 的 functions[] 一致。
// 之前漏了 share —— 结果分享功能的函数没有打包产物，只能手动部署。
const FUNCTIONS = ['login', 'review', 'library', 'medal', 'upload', 'aiService', 'admin', 'share'];

/** 模块名 → IIFE 变量名（camelCase，避免和业务变量撞名） */
function varName(file) {
  const base = path.basename(file, '.js');
  return '__mod_' + base.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

/** 读取 _shared 下的公共模块，转成 IIFE 表达式 */
function buildModule(file) {
  const raw = fs.readFileSync(path.join(SHARED, file), 'utf8');
  if (!/module\.exports\s*=/.test(raw)) {
    throw new Error(`${file} 里找不到 module.exports，无法内联`);
  }
  // module.exports = { ... }  →  return { ... }
  const body = raw.replace(/module\.exports\s*=/, 'return');
  return [
    `/* ===== 内联自 cloud-shared/${file} ===== */`,
    `const ${varName(file)} = (function () {`,
    body,
    `})();`,
    ''
  ].join('\n');
}

function bundle(name) {
  const dir = path.join(FN_DIR, name);
  const indexPath = path.join(dir, 'index.js');
  if (!fs.existsSync(indexPath)) throw new Error(`缺少 ${indexPath}`);

  let code = fs.readFileSync(indexPath, 'utf8');

  // 找出它依赖了哪些 ./xxx.js（只允许同目录已同步的公共文件）
  const deps = [...new Set([...code.matchAll(/require\('\.\/([\w-]+)\.js'\)/g)].map((m) => m[1]))];

  const prelude = [];
  for (const dep of deps) {
    if (!fs.existsSync(path.join(SHARED, `${dep}.js`))) {
      throw new Error(`${name}/index.js 依赖 ./${dep}.js，但 cloud-shared 下没有同名文件`);
    }
    prelude.push(buildModule(`${dep}.js`));
    code = code.replace(new RegExp(`require\\('\\./${dep}\\.js'\\)`, 'g'), varName(dep));
  }

  const banner = [
    '/**',
    ` * ${name} —— 咪猫爱背诵 云函数（单文件版）`,
    ' * ' + '-'.repeat(52),
    ` * 由 tools/bundle-fn.js 自动生成，源文件：cloudfunctions/${name}/index.js`,
    ' * ⚠️ 请勿直接改这个文件，改源文件后重新执行 node tools/bundle-fn.js',
    ' *',
    ` * 内联公共模块：${deps.length ? deps.join('、') : '无'}`,
    ' * 外部依赖：wx-server-sdk（由 package.json 声明，需在云端安装依赖）',
    ' */',
    ''
  ].join('\n');

  return {
    name,
    deps,
    code: banner + (prelude.length ? prelude.join('\n') : '') + code,
    pkg: JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'))
  };
}

/* ---------- 极简 zip 打包（store，不压缩，够用且无依赖） ---------- */
function crc32(buf) {
  let c;
  const table = crc32.table || (crc32.table = (() => {
    const t = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c;
    }
    return t;
  })());
  let crc = -1;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  return (crc ^ -1) >>> 0;
}

function makeZip(entries) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const e of entries) {
    const nameBuf = Buffer.from(e.name, 'utf8');
    const data = Buffer.from(e.data, 'utf8');
    const crc = crc32(data);

    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0);
    lh.writeUInt16LE(20, 4);
    lh.writeUInt16LE(0x0800, 6); // 文件名 UTF-8
    lh.writeUInt16LE(0, 8);      // store
    lh.writeUInt16LE(0, 10);
    lh.writeUInt16LE(0, 12);
    lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(data.length, 18);
    lh.writeUInt32LE(data.length, 22);
    lh.writeUInt16LE(nameBuf.length, 26);
    lh.writeUInt16LE(0, 28);
    locals.push(lh, nameBuf, data);

    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0);
    ch.writeUInt16LE(20, 4);
    ch.writeUInt16LE(20, 6);
    ch.writeUInt16LE(0x0800, 8);
    ch.writeUInt16LE(0, 10);
    ch.writeUInt16LE(0, 12);
    ch.writeUInt16LE(0, 14);
    ch.writeUInt32LE(crc, 16);
    ch.writeUInt32LE(data.length, 20);
    ch.writeUInt32LE(data.length, 24);
    ch.writeUInt16LE(nameBuf.length, 28);
    ch.writeUInt32LE(0, 30); // extra
    ch.writeUInt32LE(0, 34); // comment
    ch.writeUInt16LE(0, 36);
    ch.writeUInt32LE(0, 38);
    ch.writeUInt32LE(offset, 42);
    centrals.push(ch, nameBuf);

    offset += lh.length + nameBuf.length + data.length;
  }
  const centralBuf = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);
  return Buffer.concat([Buffer.concat(locals), centralBuf, eocd]);
}

/* ---------- 主流程 ---------- */
function main() {
  const checkOnly = process.argv.includes('--check');
  const results = [];

  for (const name of FUNCTIONS) {
    let b;
    try {
      b = bundle(name);
    } catch (err) {
      console.error(`  ✗ ${name}: ${err.message}`);
      process.exitCode = 1;
      continue;
    }
    results.push(b);
    console.log(
      `  ✓ ${name.padEnd(10)} 内联 ${String(b.deps.length).padStart(2)} 个模块 · ` +
      `${String(b.code.split('\n').length).padStart(4)} 行 · ${(Buffer.byteLength(b.code) / 1024).toFixed(1)} KB`
    );
  }

  if (checkOnly || !results.length) {
    console.log(checkOnly ? '\n[check] 校验完成，未写文件。' : '\n没有可打包的函数。');
    return;
  }

  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });

  console.log('\n输出到 dist/cloudfunctions/：');
  for (const b of results) {
    // 1) 单文件，直接粘进网页编辑器
    const jsPath = path.join(DIST, `${b.name}.js`);
    fs.writeFileSync(jsPath, b.code, 'utf8');

    // 2) zip，走控制台「上传 zip」入口
    const pkgText = JSON.stringify(b.pkg, null, 2) + '\n';
    const readme =
      `${b.name} 云函数（咪猫爱背诵）\n` +
      `${'='.repeat(46)}\n\n` +
      `本压缩包已把公共模块内联进 index.js，只有 3 个文件。\n\n` +
      `【部署要点】\n` +
      `  1. 函数类型：必须选「普通云函数」，不要选「HTTP 云函数」\n` +
      `     （代码是 exports.main = async (event) => {...} 签名，\n` +
      `      靠 cloud.getWXContext().OPENID 取用户身份，\n` +
      `      HTTP 云函数拿不到 getWXContext()，会导致「未获取到用户身份」）\n` +
      `  2. 函数名称：${b.name}（创建后不可修改，必须一字不差）\n` +
      `  3. 运行环境：Nodejs20.19\n` +
      `  4. 内存：${b.name === 'aiService' ? '1024' : '512'} MB\n` +
      `  5. 超时：${b.name === 'aiService' ? '60' : '20'} 秒\n` +
      `  6.「自动安装依赖」：保持开启（会按 package.json 装 wx-server-sdk）\n` +
      `  7. 监听端口：留空（切到普通云函数后该项消失）\n` +
      `  8. 环境变量：留空\n\n` +
      `【云端测试参数】\n` +
      `  ${b.name === 'aiService' ? 'task' : 'action'} 传对应的值，见 DEPLOY_CONSOLE.md\n\n` +
      `【验证】\n` +
      `  小程序 → 我的 → 云函数自检 → 一键测试全部\n`;
    const zipPath = path.join(DIST, `${b.name}.zip`);
    fs.writeFileSync(zipPath, makeZip([
      { name: 'index.js', data: b.code },
      { name: 'package.json', data: pkgText },
      { name: 'README.txt', data: readme }
    ]));

    console.log(`  · ${b.name}.js   ${(Buffer.byteLength(b.code) / 1024).toFixed(1)} KB  （粘贴用）`);
    console.log(`  · ${b.name}.zip  ${(fs.statSync(zipPath).size / 1024).toFixed(1)} KB  （上传用）`);
  }

  // 汇总一份清单，方便对照
  const manifest = results.map((b) => ({
    name: b.name,
    inlined: b.deps,
    lines: b.code.split('\n').length,
    runtime: 'Nodejs20.19',
    memoryMB: b.name === 'aiService' ? 1024 : 512,
    timeoutSec: b.name === 'aiService' ? 60 : 20
  }));
  fs.writeFileSync(path.join(DIST, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  console.log('\n  · manifest.json（参数速查表）');
  console.log('\n完成。部署步骤见 DEPLOY_CONSOLE.md');
}

main();
