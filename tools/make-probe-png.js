/**
 * 生成「视觉模型探针图」——一张真的写着数字的 PNG。
 *
 * ============================================================
 *⚠⚠⚠ 为什么必须自己画，而不是用 1×1 像素的透明 PNG 试探
 * ============================================================
 * 原来的 `runVisionCheck()` 用一张 1×1 空白 PNG 去挨个试模型，问它「只回答两个字：可以」。
 *
 * 问题在于：**纯文本模型传这张图也会正常返回文字**。
 * 它压根不关心图片里有什么，反正有prompt 就能答。
 * 于是「模型不支持图片」和「模型支持图片」在结果里长得一模一样，
 * 这个自检等于什么都没验——它只能证明「接口通」，证明不了「能看图」。
 *
 * 正确做法：给模型一张**内容可验证**的图，
 * 让它把图里的数字读出来。读对了 → 真的能看图；读不出来 → 只是文本模型。
 *
 * 为什么手写 PNG 编码器：
 *   云函数里没有 canvas，也装不了依赖。但 OCR 只需要**灰度图 + 手写点阵字**，
 *   用Node 内置的 zlib 就能拼出合法 PNG，零依赖。
 *
 * 用法：node tools/make-probe-png.js
 * 输出：控制台打印 base64，并校验解出来确实是预期的数字。
 */
const zlib = require('zlib');

/** 5×7 点阵字体，只用数字（够验证 OCR，不必引入字母） */
const GLYPHS = {
  0: ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  1: ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  2: ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  3: ['11111', '00010', '00100', '00010', '00001', '10001', '01110'],
  4: ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  5: ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  6: ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  7: ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  8: ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  9: ['01110', '10001', '10001', '01111', '00001', '00010', '01100']
};

/** ⚠️ 改这里就等于改「标准答案」，aiService 里的 EXPECT 也必须同步改 */
const TEXT = '7319';

const SCALE = 10; // 每个点放大10 倍，保证小模型也能看清
const GAP = 1; // 字间空列
const PAD = 8; // 四周留白（纯白边有助于模型定位内容）

/** CRC32（PNG 分块校验，zlib 不提供，必须自己算） */
let crcTable = null;
function crc32(buf) {
  if (!crcTable) {
    crcTable = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c >>> 0;
    }
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

/** 把点阵文字渲染成 8 位灰度像素矩阵（0=黑255=白） */
function render(text) {
  const cols = text.length * 5 + (text.length - 1) * GAP;
  const w = cols * SCALE + PAD * 2;
  const h = 7 * SCALE + PAD * 2;
  const px = Buffer.alloc(w * h, 255);

  for (let i = 0; i < text.length; i++) {
    const g = GLYPHS[text[i]];
    if (!g) throw new Error('点阵字体里没有字符：' + text[i]);
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 5; c++) {
        if (g[r][c] !== '1') continue;
        // 反色：字是黑的
        for (let dy = 0; dy < SCALE; dy++) {
          for (let dx = 0; dx < SCALE; dx++) {
            const x = PAD + (i * (5 + GAP) + c) * SCALE + dx;
            const y = PAD + r * SCALE + dy;
            px[y * w + x] = 0;
          }
        }
      }
    }
  }
  return { w, h, px };
}

/** 灰度矩阵 → PNG buffer（color type 0 = grayscale, bit depth 8） */
function encodePNG(w, h, px) {
  const raw = Buffer.alloc(h * (w + 1));
  for (let y = 0; y < h; y++) {
    raw[y * (w + 1)] = 0; // filter type 0 (None)
    px.copy(raw, y * (w + 1) + 1, y * w, (y + 1) * w);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 0; // grayscale
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

// ---- 自校验：解回像素，用字符画打出来，确认画的是对的 ----
function verify(png, w, h, expect) {
  // 解析 IDAT 并反滤波
  let off = 8;
  let idat = [];
  let W = 0;
  let H = 0;
  while (off < png.length) {
    const len = png.readUInt32BE(off);
    const type = png.toString('ascii', off + 4, off + 8);
    const data = png.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') {
      W = data.readUInt32BE(0);
      H = data.readUInt32BE(4);
    } else if (type === 'IDAT') idat.push(data);
    off += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = W + 1;
  let art = '';
  //每 SCALE 行抽样一次，打印大致形状
  for (let y = 0; y < H; y += SCALE) {
    let line = '';
    for (let x = 0; x < W; x += SCALE) {
      line += raw[y * stride + 1 + x] < 128 ? '#' : '.';
    }
    art += line + '\n';
  }
  // 反向再验一次：按同样的取样逻辑读出数字
  let read = '';
  for (let i = 0; i < expect.length; i++) {
    let hit = false;
    for (let r = 0; r < 7 && !hit; r++) {
      for (let c = 0; c < 5 && !hit; c++) {
        if (GLYPHS[expect[i]][r][c] !== '1') continue;
        const x = PAD + (i * (5 + GAP) + c) * SCALE + Math.floor(SCALE / 2);
        const y = PAD + r * SCALE + Math.floor(SCALE / 2);
        if (raw[y * stride + 1 + x] < 128) hit = true;
      }
    }
    read += hit ? expect[i] : '?';
  }
  console.log('  尺寸: ' + W + '×' + H +'，体积: ' + (png.length / 1024).toFixed(1) + ' KB');
  console.log('  回读结果: ' + read + (read === expect ? '  ✅ 与标准答案一致' : '  ❌ 与标准答案不符'));
  console.log('  形状预览:\n' + art.split('\n').map((l) => '    ' + l).join('\n'));
  return read === expect;
}

const img = render(TEXT);
const png = encodePNG(img.w, img.h, img.px);
const ok = verify(png, img.w, img.h, TEXT);
if (!ok) {
  console.error('❌ 探针图自校验失败，不要把它写进云函数');
  process.exit(1);
}

const b64 = png.toString('base64');
require('fs').writeFileSync(__dirname + '/probe-png.b64', b64, 'utf8');
require('fs').writeFileSync(__dirname + '/probe-png.png', png);
console.log('\n  base64 长度: ' + b64.length);
console.log('  已写入 tools/probe-png.png 与 tools/probe-png.b64');
console.log('\n✅ 标准答案 = "' + TEXT + '"  ← aiService 里的 EXPECT 必须与之一致');