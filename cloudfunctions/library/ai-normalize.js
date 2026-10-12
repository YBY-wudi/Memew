/**
 * AI 输出 → 前端展示契约 的规范化层
 * ------------------------------------------------------------
 * 🔴 这层存在的唯一原因：踩过「WXML 照着本地模板写，AI 返回另一套结构」。
 *
 * 背景（2026-10-11）：
 *   修复深度思考问题后，AI 正常返回了真实内容，但**记忆素材卡片一片空白**。
 *   复制结果却有完整数据。原因：
 *     · WXML 写 `wx:for="{{result}}"` + `item.title` / `item.tip`
 *     · AI 实际返回 `{ items:[{ point, analogy, fun, story, mnemonic }] }`
 *   → wx:for 迭代的是 result 对象的 3 个键（items/data/result），
 *     正好渲染出 3 张**内容为空**的卡片。
 *
 *   而本地模板 buildDemoResult 返回 `{title, analogy, fun, tip}`，
 *   字段名**恰好**和 WXML 一致 —— 所以只有 AI 挂掉时才「看起来正常」。
 *
 * 泛化：前端展示层不应该知道 AI 的原始字段名。
 *       提示词改了字段 → 不该导致页面空白。
 *       所以在这里做一次映射，两边各自演进。
 *
 * 设计：
 *   1. normalize(task, data) 返回**前端契约结构**（WXML 按它写）
 *   2. 原始 AI 输出挂在 `_raw` 上，用户点「复制结果」仍能拿到完整 JSON
 *   3. 任何映射失败都**如实保留原始数据**，绝不吞掉（宁可显示原始字段名，
 *      也不要空白 —— 空白会让用户以为 AI 没工作）
 */

/** 取数组：兼容多种可能的容器字段 */
function pickArray(data, keys) {
  if (Array.isArray(data)) return data;
  for (let i = 0; i < keys.length; i++) {
    const v = data && data[keys[i]];
    if (Array.isArray(v)) return v;
  }
  return [];
}

/** 取字符串：兼容多种字段名，第一个非空胜出 */
function pickStr(obj, keys, fallback) {
  for (let i = 0; i < keys.length; i++) {
    const v = obj && obj[keys[i]];
    if (typeof v === 'string' && v.trim()) return v;
    if (typeof v === 'number') return String(v);
  }
  return fallback || '';
}

/** 数组转字符串 */
function joinText(arr, sep) {
  if (!Array.isArray(arr)) return '';
  return arr
    .map(function (x) {
      return typeof x === 'string' ? x : (x && (x.name || x.title || x.text)) || '';
    })
    .filter(Boolean)
    .join(sep || '\n');
}

/**
 * 把「字符串 / 字符串数组 / 对象数组」统一成一段可渲染的文本。
 *
 * 🔴 为什么必须有这个函数：
 *   AI 对同一个字段的返回形态很不稳定 ——
 *   prev 有时是 "掌握了A才能理解B"，有时是 ["掌握了A…", "掌握了C…"]，
 *   有时是 [{text:"…"}]。用 pickStr 只能吃字符串，
 *   数组会被吞成空串，于是页面上又是空白。
 */
function toText(v) {
  if (v == null) return '';
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number') return String(v);
  if (Array.isArray(v)) {
    return v
      .map(function (x) {
        if (typeof x === 'string') return x;
        if (x && typeof x === 'object') return x.text || x.name || x.title || x.desc || '';
        return '';
      })
      .filter(Boolean)
      .join('\n');
  }
  if (typeof v === 'object') return v.text || v.name || v.title || v.desc || '';
  return '';
}

/* ============ 各任务的映射规则 ============ */

/** 碎片速记 */
function normMemo(d) {
  const points = pickArray(d.points || d.keywords, []);
  const tags = pickArray(d.tags || d.keywords, []);

  // 🔴 2026-10-11 实测：AI 只吐了 title/points/tip，
  //   「完整释义/前置基础/后置延伸」三段全是空的。
  //   根因是**提示词里根本没要求这三个字段**——
  //   WXML 绑了 full/prev/next，AI 却被要求输出 title/points/keywords/oneLine/tip，
  //   两边对不上，界面就是三行空标签。
  //   现在提示词已补（prompts.js MEMO），这里再加别名与兜底：
  //   键名再变、或某个字段漏了，都不能显示空白。
  const full =
    toText(d.full || d.oneLine || d.definition || d.explain || d.meaning || d.content) ||
    joinText(points, '；');
  // 🔴 prev/next 可能是字符串，**也可能是字符串数组**。
  //   提示词改版后要求写 1~3 条，用数组更自然，但两种形态都必须能渲染，
  //   否则数组会被pickStr 吞成空串 —— 正好复现这次要修的 bug。
  const prev = toText(d.prev || d.before || d.prerequisite || d.prereq || d.base || d.pre);
  const next = toText(d.next || d.after || d.followup || d.extend || d.application || d.post);

  //明确记录哪些段是空的 —— 不能悄悄显示空白，
  // 用户会以为「AI 就这样」，而真相是提示词/映射没对上。
  const missing = [];
  if (!full) missing.push('full');
  if (!prev) missing.push('prev');
  if (!next) missing.push('next');

  // 🔴 title 兜底不能写死 —— 2026-10-11 用户报「碎片速记的卡片名称全都是一样的」。
  //   根因：兜底值是硬编码的 '碎片卡片'，AI 只要没返 title（或返了泛化词），
  //   所有卡片就撞成同一个名字，在「我的记忆」「索引库」里完全分不清。
  //   现在按用户原文兜底：输入的第一句话就是这张卡在讲什么。
  const rawInput = toText(d._input || d.input || d.sourceText);
  // AI 返的是泛化词时也不采纳 —— 它比原文更没用
  const GENERIC = ['碎片卡片', '速记卡片', '碎片速记', '知识点', '未命名', '未命名知识点', '卡片'];
  const aiTitle = pickStr(d, ['title', 'point', 'name'], '');
  const title = GENERIC.indexOf(String(aiTitle).trim()) >= 0 ? '' : aiTitle;

  return {
    title: title || firstLine(rawInput) || points[0] || '碎片卡片',
    // 索引词一起回传：存进卡片后索引库直接拿来搜，
    // 不必再从长标题里现算中心词（算出来往往不是用户心里那个词）
    index: buildIndexWords({ title: title || firstLine(rawInput), tags, points }),
    points: points,
    full: full,
    prev: prev,
    next: next,
    tip: pickStr(d, ['tip', 'suggestion', 'mnemonic'], ''),
    tags: tags.slice(0, 4),
    _missing: missing
  };
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

/** 知识组网：把 nodes 按 topic 归组成两层树 + 展平关联 */
function normNetwork(d) {
  const nodes = pickArray(d.nodes || d.points, []);
  const topics = pickArray(d.topics, []);
  const chain = pickArray(d.chain, []);

  // 顶层：优先用 AI 给的 topics；没有就把用到的 topic 归纳出来
  let frame = topics.map(function (t) {
    return {
      name: pickStr(t, ['name', 'title'], '主题'),
      level: 1,
      children: []
    };
  });

  // node → topic 归组
  const byTopic = {};
  nodes.forEach(function (n) {
    const topicName = pickStr(n, ['topic', 'parent', 'category'], '未归类');
    if (!byTopic[topicName]) byTopic[topicName] = [];
    byTopic[topicName].push({
      name: pickStr(n, ['name', 'point', 'title'], '知识点'),
      level: 2,
      note: pickStr(n, ['detail', 'content', 'desc'], ''),
      _raw: n
    });
  });

  // AI 没给 topics 时，用归组结果当顶层
  if (!frame.length) {
    frame = Object.keys(byTopic).map(function (k) {
      return { name: k, level: 1, children: byTopic[k] };
    });
  } else {
    frame.forEach(function (f) {
      f.children = byTopic[f.name] || [];
    });
  }

  // 关联展平成 {from,to,type}：link + back 都要算，避免只显示一半
  const links = [];
  const seen = {};
  nodes.forEach(function (n) {
    const from = pickStr(n, ['name', 'point', 'title'], '');
    if (!from) return;
    const push = function (arr, otherKey) {
      pickArray(arr, []).forEach(function (l) {
        const to = pickStr(l, ['to', 'from', 'name', otherKey], '');
        if (!to) return;
        // 🔴 link 和 back 会把同一条关联从两个方向各推一次（A→B 与 B→A），
        //   不去重前端会看到重复条目。保留「无序对」作为唯一键。
        const key = [from, to].sort().join(' ');
        if (seen[key]) return;
        seen[key] = true;
        links.push({
          from: from,
          to: to,
          type: pickStr(l, ['kind', 'type', 'label'], '相关'),
          hint: pickStr(l, ['hint', 'cue'], '')
        });
      });
    };
    push(n.link, 'to');
    push(n.back, 'from');
  });

  return {
    subject: pickStr(d, ['subject'], '综合'),
    framework: frame,
    links: links,
    chain: chain,
    nodes: nodes
  };
}

/** 记忆素材 —— 本次 bug 的主角 */
function normMemoryAid(d) {
  // 🔴 2026-10-11：AI 对同一份数据的两种返回形态都出现过——
  //   ① `[{point,analogy,fun,story,mnemonic}]`（裸数组，实测线上就是这样）
  //   ② `{items:[...]}`（对象包数组）
  //   原来只认 ②，喂 ① 时 items=[] → 映射出空数组 →
  //   前端 `wx:for="{{result}}"` 拿到空 → 卡片只剩标签没有内容。
  //   **两种都必须吃**，否则又是「云端有数据、界面一片空白」。
  const raw = Array.isArray(d) ? d : pickArray(d.items || d.points || d.list, []);
  return raw.map(function (it) {
    return {
      // 🔴 AI 给的是 point 不是 title，原先写 item.title → 空白
      point: pickStr(it, ['point', 'title', 'name'], ''),
      title: pickStr(it, ['point', 'title', 'name'], ''),
      analogy: pickStr(it, ['analogy', 'compare'], ''),
      fun: pickStr(it, ['fun', 'explain', 'comment'], ''),
      story: pickStr(it, ['story', 'trivia', 'history'], ''),
      mnemonic: pickStr(it, ['mnemonic', 'tip', 'method'], ''),
      // 前端旧模板用 tip，这里把口诀兜给它（若有多个展示位都能用）
      tip: pickStr(it, ['mnemonic', 'story', 'tip'], '')
    };
  });
}

/** 易错点 */
function normErrorDrill(d) {
  // 🔴 同 normMemoryAid：AI 既可能回裸数组，也可能回 {items:[...]}，两种都得吃
  const items = Array.isArray(d)
    ? d
    : pickArray(d.items || d.points || d.list, []);
  return items.map(function (it) {
    const qs = pickArray(it.questions, []).map(function (q) {
      return {
        // 🔴 AI 给 stem/answer，旧模板用 q/a
        q: pickStr(q, ['stem', 'q', 'question', 'title'], ''),
        stem: pickStr(q, ['stem', 'q', 'question', 'title'], ''),
        a: pickStr(q, ['answer', 'a', 'correct'], ''),
        options: pickArray(q.options, []),
        type: pickStr(q, ['type'], 'choice'),
        explain: pickStr(q, ['explain', 'analysis', 'reason'], '')
      };
    });
    return {
      point: pickStr(it, ['point', 'title', 'name'], ''),
      title: pickStr(it, ['point', 'title', 'name'], ''),
      right: pickStr(it, ['right', 'correct'], ''),
      wrong: pickStr(it, ['wrong', 'incorrect'], ''),
      diff: pickStr(it, ['diff', 'analysis', 'reason'], ''),
      questions: qs
    };
  });
}

/** 出题 */
function normQuiz(d) {
  // 🔴 同上：既可能回 {questions:[...]}，也可能回裸数组 [{stem,...}]
  const questions = Array.isArray(d)
    ? d
    : pickArray(d.questions || d.items || d.list, []);
  return {
    questions: questions.map(function (q) {
      const options = pickArray(q.options, []);
      const ans = pickStr(q, ['answer', 'a', 'correct'], '');
      // answer 可能是「下标」也可能是「选项文字」
      let answerIndex = -1;
      if (typeof q.answer === 'number') answerIndex = q.answer;
      else if (ans) {
        answerIndex = options.indexOf(ans);
        if (answerIndex < 0) {
          // 形如 "B" 或 "B. xxx"
          const m = String(ans).match(/[A-D]/i);
          if (m) answerIndex = m[0].toUpperCase().charCodeAt(0) - 65;
        }
      }
      return {
        type: pickStr(q, ['type'], 'choice'),
        category: pickStr(q, ['category'], ''),
        // 🔴 AI 给 stem，旧模板用 title
        title: pickStr(q, ['stem', 'title', 'q', 'question'], ''),
        stem: pickStr(q, ['stem', 'title', 'q', 'question'], ''),
        options: options,
        answer: answerIndex,
        answerText: answerIndex < 0 ? ans : '',
        analysis: pickStr(q, ['analysis', 'explain', 'explanation'], ''),
        tip: pickStr(q, ['tip', 'suggestion'], '')
      };
    })
  };
}

/* ============ 整书解析（book_parse → upload 页） ============ */
/**
 * 🔴 这一条和「记忆素材 3 张空卡片」是**完全同一个 bug**：
 *   AI 按提示词返回 `{units:[{title, sections:[{title, points, ...}]}]}`，
 *   而 upload.wxml 从头到尾绑的是 `item.name` / `s.name` / `s.cards`。
 *   于是解析明明成功、summary 也显示出来了，单元结构整块是空的。
 *
 * 不修的话，用户会觉得「AI 什么都没解析出来」，
 * 而真实情况是解析结果一直在，只是没人去取它。
 */
function normBook(d) {
  const units = pickArray(d.units || d.chapters || d.unit, []).map(function (u) {
    const name = pickStr(u, ['name', 'title', 'chapter'], '');
    const sections = pickArray(u.sections || u.subsections || u.points, []).map(function (s) {
      const sName = pickStr(s, ['name', 'title'], '');
      const points = pickArray(s.points || s.keyPoints || s.tags, []).map(function (p) {
        return typeof p === 'string' ? p : pickStr(p, ['name', 'title', 'text'], '');
      }).filter(Boolean);
      // ⚠ cards 和 points 是两回事：
        //   cards 是「这一节有多少张卡片」的数字，points 是知识点数组。
        //   万一 AI 没给cards，用 points 长度兜底 —— 显示 0 会被当成解析失败。
      const cards =
        typeof s.cards === 'number'
          ? s.cards
          : parseInt(s.cardCount != null ? s.cardCount : s.count, 10);
      return {
        name: sName,
        title: sName,
        cards: isNaN(cards) || cards == null ? points.length : cards,
        points: points,
        // 其余字段透传，供书库/单元页使用
        mustScore: pickArray(s.mustScore || s.keyPoints, []),
        outline: pickArray(s.outline, []),
        skeleton: pickArray(s.skeleton, []),
        //🔴 mnemonic 不能把 tip 当兜底！
        //   原来 mnemonic 的候选里有 'tip'，而 tip 是「记忆技巧」——
        //   于是同一个值被写进 mnemonic 和 tip 两处，
        //   用户在「口诀速记」和「类比记忆」看到的是同一段话，
        //   而且 tip 字段就只剩空的了（因为候选被前一个字段先消费）。
        //   口诀就是口诀，技巧就是技巧，两个字段各走各的候选。
        mnemonic: pickStr(s, ['mnemonic', 'memory', 'rhyme', 'chant'], ''),
        analogy: pickStr(s, ['analogy', 'compare'], ''),
        /*
         * 🔴🔴🔴 funFact / tip / content / error三件套以前**在这个映射层被丢掉了**。
         *
         *   这是「类比记忆三个空框」链条上**最靠上游的一环**：
         *     book_parse 提示词 → ✅ 已要求输出 funFact/tip
         *     AI 返回        → ✅ 有值
         *     normBook 映射   → ❌ 只映射了 mnemonic + analogy，
         *                      funFact/tip/content 根本没往下传
         *     upload 落库     → 拿到 undefined → 存成空串
         *     前端 WXML       → 绑 card.funFact/card.tip → 空框
         *
         *   只改提示词或只改落库都无效 —— 断在中间这一层，
         *   而且它**静默丢弃**，不报错、不告警。
         *
         *   ⚠ 字段名多形态（与 normMemoryAid / normErrorDrill 口径一致）：
         *   AI 可能回 fun|explain|comment|story、
         *     tip|method|memoryTrick、
         *     right|errorRight|correct。
         */
        funFact: pickStr(s, ['funFact', 'fun', 'explain', 'comment', 'story', 'trivia'], ''),
        tip: pickStr(s, ['tip', 'method', 'memoryTrick', 'trick', 'technique'], ''),
        content: pickStr(s, ['content', 'body', 'detail', 'text'], ''),
        errorRight: pickStr(s, ['errorRight', 'right', 'correct'], ''),
        errorWrong: pickStr(s, ['errorWrong', 'wrong', 'incorrect'], ''),
        errorDiff: pickStr(s, ['errorDiff', 'diff', 'analysis'], ''),
        errors: pickArray(s.errors || s.errorPoints, []),
        questions: pickArray(s.questions || s.quiz, [])
      };
    });
    return {
      name: name,
      title: name,
      index: u.index != null ? u.index : undefined,
      sections: sections
    };
  });

  const plan = pickArray(d.plan || d.dailyPlan || d.schedule, []).map(function (p) {
    const tasks = pickArray(p.tasks || p.items || p.points, []).map(function (t) {
      return typeof t === 'string' ? t : pickStr(t, ['name', 'title', 'text'], '');
    }).filter(Boolean);
    return {
      day: p.day != null ? p.day : p.index,
      tasks: tasks
    };
  });

  return {
    summary: pickStr(d, ['summary', 'desc', 'description'], ''),
    title: pickStr(d, ['title'], ''),
    units: units,
    plan: plan,
    sourceCount: d.sourceCount,
    sourceImages: d.sourceImages,
    sourceRawText: !!d.sourceRawText
  };
}

/* ============ 入口 ============ */

const RULES = {
  memo: normMemo,
  network: normNetwork,
  memory: normMemoryAid,
  error: normErrorDrill,
  quiz: normQuiz,
  book: normBook
};

/**
 * 把云端 AI 的原始输出转成前端展示契约。
 * @param {string} task 视图任务名（memo/network/memory/error/quiz/book）
 * @param {object|Array} data 云函数返回的 payload —— **可能是数组**
 * @returns {object|Array} 前端可直接渲染的结构（原始数据挂在 _raw）
 */
function normalize(task, data) {
  const rule = RULES[task];
  if (!rule || !data || typeof data !== 'object') return data;
  try {
    const out = rule(data);

    // 🔴🔴 数组与对象的兜底方式完全不同，绝不能用同一个：
    //   `Object.assign({}, [a,b])` 会得到 `{0:a, 1:b}` —— **数组变成普通对象**，
    //   前端 `wx:for="{{result}}"` 就彻底遍历不到元素，于是整片空白。
    //   这正是 2026-10-11「记忆素材只有标签没内容」的最后一环。
    const isArr = Array.isArray(out);
    const srcArr = Array.isArray(data);

    // 空判定
    const empty =
      !out ||
      (isArr && !out.length) ||
      (!isArr && Array.isArray(out.questions) && !out.questions.length) ||
      (!isArr && Array.isArray(out.framework) && !out.framework.length) ||
      // 🔴 book：units 是这条路径的主结构，没有 units 等于什么也没解析出来。
      //   不加这一句，AI 返回 `{summary:"..."}` 时结果页只剩一行字，
      //   用户会以为「解析了个寂寞」却看不到任何原因。
      (!isArr && Array.isArray(out.units) && !out.units.length);

    if (empty) {
      // 映射未命中时回退原始数据，但**必须保持原来的类型**
      if (srcArr) {
        const clone = data.slice();
        clone._normalizeMiss = true;
        return clone;
      }
      return Object.assign({}, data, { _normalizeMiss: true });
    }

    //挂 _raw 供调试/「复制结果」使用；数组也挂（JS 允许），但不能影响迭代
    if (isArr) {
      out._raw = data;
      return out;
    }
    out._raw = data;
    return out;
  } catch (e) {
    if (srcArrSafe(data)) {
      const clone = data.slice();
      clone._normalizeError = String(e.message || e);
      return clone;
    }
    return Object.assign({}, data, {
      _normalizeError: String(e.message || e)
    });
  }
}

/** 判定是否数组的辅助（catch 分支里 data 一定存在） */
function srcArrSafe(v) {
  return Array.isArray(v);
}

module.exports = { normalize, pickArray, pickStr, buildIndexWords };

/**
 * 从速记卡片里抽索引词
 * ------------------------------------------------------------------
 * ⚠️ **唯一实现在 ./index-words.js**，这里只做转发。
 *
 * 🔴 曾经在这里另写一份滑窗实现，结果两边行为漂移：
 *   「光合作用暗反应」在一份里被切成["光合","作用","反应","光合作"]，
 *   另一份给["光合作用暗反应"]；
 *   「Unit 1 Hello!」一份给[]、一份给["Hello"]。
 *   后果是「存进库时算的索引词」和「搜索时算的索引词」对不上，
 *   表现为「明明存了，搜不到」，而且没有任何报错。
 *
 * 两份实现 = 迟早漂移。要改规则就改 index-words.js 一处。
 */
const { extractIndexWords } = require('./index-words.js');

function buildIndexWords(o) {
  return extractIndexWords(o || {});
}
