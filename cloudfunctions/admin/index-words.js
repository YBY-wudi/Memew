/**
 * 索引词提取（云端版）
 * ===================================================================
 * 与小程序端 `miniprogram/utils/knowledge-index.js` 保持同一套规则。
 *
 * ⚠️ 为什么要有一份云端副本（而不是直接 require 小程序端那份）：
 *   云函数打包只含自身目录，引不到 miniprogram/ 下的文件。
 *   而 saveCard 必须在**落库时**就把索引词算好存进去：
 *   索引库搜索依赖 `index` 字段，存的时候就定好，
 *   比事后从长标题里现算中心词准得多
 *   （「细胞膜的流动镶嵌模型」现算可能得到「模型」，
 *     而用户心里想的是「细胞膜」）。
 *
 * 🔴 规则不要随便改：改了这里也要同步改小程序端那份，
 *    否则「存进去时算的索引词」和「搜索时算的索引词」对不上，
 *    表现为「明明存了，搜不到」——且没有任何报错。
 *    跑 `node tools/test-guard-index-words.js` 守住两边一致。
 */

/* ========== 停用词 ========== */
const STOPWORDS = new Set([
  '的', '了', '和', '与', '及', '或', '在', '是', '有', '为', '对', '从', '到',
  '被', '把', '由', '中', '上', '下', '内', '外', '前', '后', '时', '也', '就',
  '都', '而', '并', '等', '之', '其', '此', '该', '一个', '一种', '一些',
  '什么', '怎么', '如何', '为什么', '以及', '关于', '对于', '通过', '进行',
  '主要', '基本', '一般', '通常', '可以', '能够', '需要', '包括', '组成',
  '构成', '属于', '称为', '叫做', '是指', '即'
]);

/* 英文词性标记：教材写单词常带 "abandon vt."，提取时要剥掉 */
const PART_OF_SPEECH =
  /^(vt|vi|v|n|a|ad|adj|adv|prep|pron|conj|art|num|int|aux|abbr)\.?$/i;

/* 这些后缀/前缀的词多半是术语里的核心名词 */
const NOUN_HINT =
  /(细胞|分子|原子|离子|酶|蛋白|结构|功能|特征|类型|形式|过程|阶段|时期|系统|机制|原理|定律|法则|公式|定理|概念|定义|分类|组成|特点|作用|影响|意义|条件|方法|步骤|要素|指标|参数|单位|标准|原则|模式|层次|环节|因素|机制|反应|变化|运动|静止|平衡|能量|物质|信息)/;

/*
  没有区分度的词 —— 搜到了也没用，比搜不到更糟。
  实测踩坑：英语教材标题全是「Unit 1 Hello!」，
  提取器把开头英文当索引 → 所有 Unit 的索引都成了「unit」，
  搜「unit」返回 50 条长得一样的标题。
*/
const MEANINGLESS = new Set([
  'unit', 'units', 'lesson', 'part', 'chapter', 'section', 'module',
  'unit1', 'unit2', 'unit3', 'unit4', 'unit5', 'unit6',
  'unit7', 'unit8', 'unit9', 'unit10',
  '?', '？', '!', '！', '.', '。', '-', '—', '…', '·', '/', '\\',
  'a', 'b', 'c', 'n', 'v'
]);

function isMeaningful(w) {
  const s = String(w || '').trim().toLowerCase();
  if (!s) return false;
  if (MEANINGLESS.has(s)) return false;
  // 纯数字 / 纯标点一律不要（搜「1」会返回半个索引库）
  if (/^[\d\s.,;:!?、。，；：！？\-—…·/\\]+$/.test(s)) return false;
  const stripped = s.replace(/^(unit|lesson|part|chapter|section|module)\s*\d*\s*$/, '');
  return !!stripped;
}

/** 剥掉「Unit 1」「Lesson Two」这类编排前缀 */
function stripUnitPrefix(title) {
  return String(title || '')
    .replace(/^(unit|lesson|part|chapter|section|module)\s*[\d一二三四五六七八九十]+\s*[:.、]?\s*/i, '')
    .trim();
}

/** 提取中心词（中文取主要名词） */
function extractCenter(title) {
  const t = String(title || '').trim();
  if (!t) return [];

  // ① 带 NOUN_HINT 后缀/前缀的词优先
  const hinted = [];
  const chunks = t.split(/[，。、；：,.;:!?？!\s（）()「」《》\-—…]+/).filter(Boolean);
  chunks.forEach((ch) => {
    // 逐字滑窗找带名词特征的片段（中文没有词边界，只能扫）
    for (let len = 2; len <= 8; len++) {
      for (let i = 0; i + len <= ch.length; i++) {
        const seg = ch.slice(i, i + len);
        if (NOUN_HINT.test(seg)) {
          // 🔴 含停用字的片段不是术语（「细胞膜的流」「细胞膜的」这种滑窗副产物）。
          //   留着会让搜索结果里出现一堆半截词 —— 搜到了也没用，比搜不到更糟。
          //   ⚠ 要查**每一个**字符，不能只查中间：
          //   只查前 n-1 位时「细胞膜的」会漏过去（的 在末位），
          //   于是索引里混进大量以「的」结尾的半截词。
          let bad = false;
          for (let k = 0; k < seg.length; k++) {
            if (STOPWORDS.has(seg[k])) { bad = true; break; }
          }
          if (!bad && isMeaningful(seg)) hinted.push(seg);
        }
      }
    }
  });
  if (hinted.length) {
    // 去重 + 去掉被更长词包含的短词（「细胞」vs「细胞膜」留长的）
    return uniq(hinted).filter(
      (w) => !uniq(hinted).some((o) => o !== w && o.indexOf(w) >= 0)
    );
  }

  // ② 按分隔符切，取第一个非停用词块
  const first = chunks.filter((x) => x && !STOPWORDS.has(x));
  if (first.length) {
    const w = first[0];
    return isMeaningful(w) ? [w.length > 10 ? w.slice(0, 10) : w] : [];
  }
  return [];
}

function uniq(arr) {
  const seen = {};
  return arr.filter((x) => {
    const k = x.toLowerCase();
    if (seen[k]) return false;
    seen[k] = true;
    return true;
  });
}

/**
 * 从卡片里提取索引词
 * @param {object} card { index?, title?, content?, tags? }
 * @returns {string[]} 最多 6 个
 */
function extractIndexWords(card) {
  const c = card || {};
  const out = [];

  //① 显式指定最准
  if (c.index) {
    String(c.index)
      .split(/[,，、\s]+/)
      .map((s) => s.trim())
      .filter(isMeaningful)
      .forEach((w) => out.push(w));
  }

  // ② 标签（用户自己打的分类词，通常就是术语）
  (c.tags || []).forEach((t) => {
    const s = String(t || '').trim();
    if (s && isMeaningful(s) && STOPWORDS.has(s) === false) out.push(s);
  });

  // ③ 标题 → 中心词
  const title = stripUnitPrefix(c.title || '') || String(c.title || '').trim();
  if (title) {
    // 英文标题：整个词作索引
    const en = title.match(/^[A-Za-z][A-Za-z\s\-']*/);
    if (en) {
      const word = en[0]
        .split(/\s+/)
        .filter((w) => w && !PART_OF_SPEECH.test(w))
        .map((w) => w.replace(/^the\s+/i, '').replace(/[^A-Za-z\-']/g, ''))
        .filter(Boolean)
        .sort((a, b) => b.length - a.length)[0];
      if (word && isMeaningful(word)) out.push(word);
    } else {
      extractCenter(title).forEach((w) => out.push(w));
    }
  }

  // ④ 内容首句兜底（AI 摘要开头往往就是术语）
  if (out.length < 2) {
    const first = String(c.content || '')
      .split(/[\n。！？!?]/)[0]
      .trim();
    if (first) extractCenter(first).forEach((w) => out.push(w));
  }

  const seen = {};
  return out
    .filter((w) => {
      const k = w.toLowerCase();
      if (seen[k] || !isMeaningful(w)) return false;
      seen[k] = true;
      return true;
    })
    .slice(0, 6);
}

/** 取第一行并截断（卡片标题不能是一整段话） */
function firstLine(s, max) {
  const line = String(s || '')
    .split(/\n+/)
    .map((x) => x.trim())
    .filter(Boolean)[0];
  if (!line) return '';
  const m = max || 24;
  return line.length > m ? line.slice(0, m) + '…' : line;
}

module.exports = {
  extractIndexWords,
  extractCenter,
  stripUnitPrefix,
  isMeaningful,
  firstLine,
  STOPWORDS,
  MEANINGLESS,
  NOUN_HINT,
  PART_OF_SPEECH
};