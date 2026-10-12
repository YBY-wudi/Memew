/**
 * aiService —— AI 能力统一入口（云开发内置大模型）
 * ------------------------------------------------------------
 * 对应需求文档第七章「AI 接口要求」、第八章「5 套提示词」。
 *
 * task:
 *   network      提示词1  AI 知识组网 + 碎片化梳理
 *   memory_aid   提示词2  趣味类比 + 典故 + 记忆技巧
 *   error_drill  提示词3  易错点对比纠错出题
 *   book_parse   提示词4  整本书结构化解析 & 每日背诵计划
 *   quiz         提示词5  智能出题通用
 *   memo         碎片速记（附加）
 *   grade        默写批改（附加）
 *   memory_tips  碎片增强·找背诵技巧
 *   expand       碎片增强·知识扩展
 *   organize     碎片增强·成体系
 *   deepen       知识点加深（在人工底稿上补易错点/口诀/类比）
 *   tts          语音合成（双音色）
 *   vision_check 视觉模型自检（查哪个图片识别模型可用，不扣额度）
 *
 * ⚠️ 本注释需与下方 switch(task) 保持一致。
 *    注意：这里的关键字是 task，不是 action（其余云函数才用 action）。
 *    控制台「云端测试」时照这里的名字填，填错会返回「缺少 task」或「未知 task」。
 *
 * 开关：AI_SERVICE_DISABLED 环境变量设为 'true' 时走本地兜底，便于未开通大模型时预览。
 */
const {
  ok,
  fail,
  col,
  OPENID,
  ensureUser,
  todayUsed,
  calcQuota,
  safeJSON,
  secCheck,
  consumeQuota,
  QUOTA
} = require('./common.js');
const P = require('./prompts.js');
const AI = require('./ai-bridge.js');
// 🔴 AI 输出 → 前端展示契约的映射层。
//   WXML 是按「前端契约」写的，AI 返回的是「提示词结构」，
//   两套字段名不一样时页面会渲染成空白（2026-10-11 记忆素材空白就是这个原因）。
const NORM = require('./ai-normalize.js');

const cloud = require('wx-server-sdk');
// ⚠️ timeout 必须放宽。默认 15 秒对 AI 任务是硬伤：
//   读图解析要几十秒，流式生成更久。不设的话会稳定超时，
//   而且报错是「请求超时」而不是「模型不可用」，极易误判。
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV, timeout: AI.AI_TIMEOUT });

/* ============ 模型配置（后端可改） ============ */
const MODEL = {
  // 云开发内置大模型（混元），在云开发控制台开通后即可用，无需自备 key
  //
  // ⚠ 模型名必须和「云开发控制台 → AI → 大模型 → 模型列表」里的**模型 ID** 完全一致，
  //   对不上就是静默失败或报model not found。
  //   之前写的是 'hunyuan-pro'，控制台里根本没有这个 ID
  //   （2026-10 列表里是 hy3 / hy4-preview / hunyuan-role-latest / hy-role / hy-m1.2-pro 等），
  //   等于所有 AI 功能都调不通。
  //
  //   换模型只改这一处。改完必须重新部署本函数。
  //   环境变量 AI_MODEL 可以覆盖，方便灰度切模型而不改代码。
  name: process.env.AI_MODEL || 'hy3',
  temperature: 0.6,
  maxTokens: 4096
};

const VOICE = {
  pro: { name: '专业播音', types: [1010, 1011, 1013] },
  warm: { name: '温柔讲解', types: [1013, 1010, 1011] }
};

/**
 * AI 调用的额度策略
 * ------------------------------------------------------------------
 * ⚠ 这里曾经**完全没有额度控制**：askJSON 直接调大模型，
 *   不检查额度、不扣额度 → 用户可以无限免费刷 AI。
 *   云开发大模型按量计费，这意味着成本敞口。
 *
 * 两种任务分开定价：
 *   · chat  = AI 生成文本/结构化内容（贵，一次调用一次模型）
 *   · voice = 语音合成（便宜，但每段都调）
 * 「零额度」的那 6 类记忆辅助是本地规则生成的，不走这里，天然免费。
 */
const AI_COST = {
  chat: 0.5,
  voice: 0.1
};

/**
 * 需要做**额度预检**的 task
 * ------------------------------------------------------------------
 * ⚠️ 这里只决定"要不要检查额度"，不决定"扣多少"。
 * 真正扣费统一在 charge()，单价 AI_COST。
 *
 * 原来这个数组是内联在 main() 里的字面量，写成字符串数组后
 * 每次都要手写一遍，改名/加功能容易漏。现在提成常量。
 * 注意：不含 tts（走voice 单独计价），也不含被DISABLED 拦下的情况。
 */
const NEED_QUOTA_TASKS = ['network', 'memory_aid', 'error_drill', 'quiz', 'memo', 'grade'];

const DISABLED = process.env.AI_SERVICE_DISABLED === 'true';

/* ============ 文本清洗 ============ */
function clean(str) {
  if (!str) return '';
  let s = String(str);
  // 去掉 ```json 包裹
  s = s.replace(/```json\s*/gi, '').replace(/```/g, '');
  // 去掉前后废话
  const first = s.indexOf('{');
  const last = s.lastIndexOf('}');
  if (first > -1 && last > -1 && last > first) s = s.slice(first, last + 1);
  return s.trim();
}

/** 调用大模型 */
async function chat(prompt) {
  // ⚠ 这里原来用的是 `cloud.extendModule.aiModule.chatCompletion`。
  //   **那个方法在 wx-server-sdk 里不存在** —— extendModule 是小程序端 API。
  //   症状：自检页「AI 记忆技巧」报「内容为空」，
  //   而用户会去怀疑「模型没开」或「额度不够」，全是错方向。
  //   现在统一走 ai-bridge（内部即 cloud.ai()），和视觉调用共用一条路径。
  const { text } = await AI.generateText(cloud, {
    model: MODEL.name,
    temperature: MODEL.temperature,
    max_tokens: MODEL.maxTokens,
    messages: [
      { role: 'system', content: '你是一个严谨、博学、输出结构化的教育 AI 助手。' },
      { role: 'user', content: prompt }
    ]
  });
  return clean(text || '');
}

/**
 * 把云开发 AI 的原始报错翻译成「怎么修」
 *
 * 为什么需要这个：CloudBase 抛出来的错误码对普通用户是黑盒
 * （`-502005` / `model not found` / `unauthorized`），
 * 但这几种错误的原因和修法完全不同。分不清就会反复重试浪费时间。
 */
function diagnoseAiError(err, modelName) {
  const raw = String((err && (err.message || err.errMsg)) || err || '');
  const code = (err && err.errCode) || '';

  // 1. 模型没开通 —— 控制台开关是关的
  if (/not\s*open|未开通|not enabled|not activated|switch|开关/i.test(raw) || code === 140004) {
    return (
      '大模型能力未开通。请到「云开发控制台 → AI → 大模型」里，' +
      '把要用的模型（当前 ' + modelName + '）右侧的状态开关打开，再重试。'
    );
  }
  // 2. 模型名不对
  if (/model\s*not\s*found|invalid\s*model|模型.*不存在|UnknownModel/i.test(raw)) {
    return (
      '模型「' + modelName + '」在控制台里不存在。请打开' +
      '「云开发控制台 → AI → 大模型 → 模型列表」照抄一个真实的模型 ID，' +
      '然后改 cloudfunctions/aiService/index.js 的 MODEL.name 并重新部署。'
    );
  }
  // 3. 额度/资源包耗尽
  if (/quota|额度|余额|resource|资源包|billing|计费/i.test(raw)) {
    return (
      '大模型调用额度不足。请到「云开发控制台」检查套餐余量' +
      '（个人版每月 40000 资源点，超出会调用失败）。'
    );
  }
  // 4. 没登录 / 身份不对
  if (/unauthorized|permission|权限|登录|401/i.test(raw)) {
    return '云函数身份没有调用大模型的权限。请确认已用 admin 云函数给当前用户完成初始化（登录页能正常进入即可）。';
  }
  // 5. 其它：把原文带上，别吞掉线索
  return 'AI 调用失败：' + (raw || '未知错误');
}

/** 调模型并解析 JSON，失败重试一次 */
/**
 * 记一次 AI 调用并扣额度
 * ------------------------------------------------------------------
 * 为什么扣在「调用之前」而不是之后：
 *   调用后才扣的话，用户可以并发发 10 个请求把这 10 次都打出去，
 *   而只有第一个请求会扣到额度 —— 额度形同虚设。
 *
 * 为什么不扣成功才计费：AI 调用已经产生云端成本了，
 * 不管解析成功还是失败，模型的开销都发生了。
 * 失败重试尤其要注意 —— askJSON 内部最多重试 2 次，
 * 这里每次进askJSON 都扣一次，和真实成本对齐。
 */
async function charge(openid, kind) {
  const cost = AI_COST[kind];
  if (!cost) return null;
  const user = await ensureUser(openid);
  const quota = await consumeQuota(openid, cost, user);
  return quota;
}

async function askJSON(prompt) {
  const openid = OPENID();

  // ⚠ 先扣额度再调模型。原因见 charge() 的注释。
  //   额度不足时抛 QUOTA_EXHAUSTED，外层会翻译成可读提示，
  //   而且**不会**白白消耗一次模型调用。
  try {
    await charge(openid, 'chat');
  } catch (err) {
    if (err.code === 'QUOTA_EXHAUSTED') throw err;
    // 额度系统本身出问题时不该阻断AI 功能，降级放行并记账
    console.error('[aiService] 扣额度失败，本次放行:', err.message);
  }

  for (let i = 0; i < 2; i++) {
    try {
      const text = await chat(prompt);
      // AI 产出先过内容安全审核再返回。
      // 教材类内容几乎不会命中，但这一步是审核友好度的关键：
      // 平台会检查「是否有内容安全机制」，光有声明不够，
      // 得真的有调用痕迹。
      const sec = await secCheck(text, OPENID());
      if (!sec.ok) {
        // 审核不通过时**不重试** —— 重试同样内容还是会命中。
        // 直接抛错，让页面提示用户，避免把违规内容反复送到用户面前。
        throw new Error(sec.reason || '内容未通过安全审核');
      }
      const data = safeJSON(text, null);
      if (data) return data;
      console.warn('[aiService] JSON 解析失败，第', i + 1, '次:', text.slice(0, 200));
    } catch (err) {
      // 把「模型没开通 / 模型名不对」这两种最常见的问题翻译成能直接照做的提示，
      // 否则用户只能看到一句云开发原始报错，无从下手。
      const msg = diagnoseAiError(err, MODEL.name);
      console.error('[aiService] chat 失败:', msg);
      if (i === 1) throw new Error(msg);
    }
  }
  return null;
}

/* ============ 本地兜底（AI 未开通 / 调用失败时保证界面可用） ============ */
function fallbackNetwork(fragments) {
  const list = (fragments || []).filter(Boolean);
  return {
    subject: '综合',
    framework: { title: '知识总框架', summary: `共梳理 ${list.length} 个碎片知识点` },
    nodes: list.slice(0, 20).map((f) => ({
      name: String(f).slice(0, 20),
      detail: String(f),
      level: 'B',
      relation: '并列',
      parent: '知识总框架',
      pre: '',
      next: '',
      condition: ''
    })),
    chain: list.map((f) => `${f} → 归入对应知识体系分支`),
    _fallback: true
  };
}
function fallbackQuiz(points, count) {
  const list = (points || []).filter(Boolean);
  return {
    questions: (list.length ? list : ['示例知识点']).slice(0, 10).map((p, i) => ({
      type: 'choice',
      category: ['基础记忆', '理解辨析', '考点应用'][i % 3],
      stem: `关于「${p}」，下列说法正确的是？`,
      options: ['选项A', '选项B', '选项C', '选项D'],
      answer: 'A',
      explain: `${p} 的核心考点在主干定义。`,
      tip: '抓关键词：定义中的限定词往往是得分点。'
    })),
    _fallback: true
  };
}
/* ============ 碎片记忆三件套的本地兜底 ============ */
/** 未开通大模型时也能看到完整界面，不至于白屏 */
function fallbackMemoryTips(text) {
  const head = (text || '').slice(0, 40).replace(/\n/g, ' ');
  return {
    diagnosis:
      '这段内容以并列条目为主，没有强因果关系。难点不在"理解"，而在"逐条不漏"。' +
      '条目型内容最适合用"编号锚定法"——给每条一个固定编号，之后复习只记编号再回忆内容。',
    methods: [
      {
        name: '编号锚定法',
        how: '给每一条编上号（1、2、3…），合上材料后先默写"有几个、第几条讲什么"，再填内容。编号是提取线索，比逐字回忆省力得多。',
        fit: '条目多、顺序不重要的内容'
      },
      {
        name: '首字串联法',
        how: '取每条的第一个字，连成一句荒诞的话或画面，把这条链子记牢，整串内容就能顺着背出来。',
        fit: '条目有共同前缀，或想一句话记住全貌'
      },
      {
        name: '间隔重复',
        how: '今天背完，1 天后、2 天后、4 天后、7 天后各复习一次。每次只看编号先想内容，想不出再看原文。',
        fit: '所有内容，尤其考前'
      }
    ],
    mnemonics: [],
    restructure: {
      type: '编号列表 + 首字链',
      content: '把原文重排为带编号的清单，并在每条前加 2-3 字的核心标签，便于快速定位。'
    },
    schedule: [
      { day: 1, what: '完整背一遍，边背边写编号' },
      { day: 2, what: '只看编号回忆内容' },
      { day: 4, what: '打乱顺序默写' },
      { day: 7, what: '完整复述，标记仍不熟的条目' }
    ],
    pitfall: '最容易漏的是相邻两条的顺序，以及条目末尾的限定条件。',
    _fallback: true
  };
}

function fallbackExpand() {
  return {
    related: [
      { name: '前置基础概念', brief: '理解本内容必须先知道的基础。', why: '没有它，定义记不住' },
      { name: '平行对比概念', brief: '与本内容同层级、易混的概念。', why: '对比记忆比单独记忆快' },
      { name: '上层原理', brief: '统摄本内容的底层规律。', why: '记住原理可以推出多个具体结论' }
    ],
    confusions: [
      {
        pair: '概念A vs 概念B',
        right: '正确表述（强调关键限定词）',
        wrong: '易混表述（少了限定词，最常见的错法）',
        diff: '核心差异在于适用范围'
      }
    ],
    chain: {
      before: ['前置知识1', '前置知识2'],
      after: ['后继知识1', '后继知识2'],
      principle: '底层原理：把零散结论串成一条线',
      narrative: '从前置知识出发，导出本内容的核心结论，再延伸到后继应用。'
    },
    questions: [
      { ask: '这个概念的准确定义是什么？', answer: '先说定义，再说限定条件' },
      { ask: '它和最易混的那个概念有什么区别？', answer: '从范围、条件、举例三方面对比' }
    ],
    trivia: ['该概念最早提出于…（需自行核实）'],
    _fallback: true
  };
}

function fallbackOrganize() {
  return {
    subject: '综合',
    subjectReason: '内容较短且未明确学科，先归入综合，之后可手动调整。',
    modules: [
      {
        name: '核心概念',
        points: [{ name: '示例知识点', level: 'S', mergedFrom: '原始第 1、2 条合并' }]
      },
      {
        name: '易混辨析',
        points: [{ name: '示例易混点', level: 'A', mergedFrom: '原始第 3 条' }]
      }
    ],
    order: {
      sequence: ['先背核心概念（S 级）', '再补易混辨析（A 级）', '最后扫拓展（C 级）'],
      reason: '概念是骨架，辨析是分数，拓展是加分项'
    },
    gaps: ['建议补充：与本内容同层级的其他重要概念'],
    _fallback: true
  };
}

/*
 * ⚠ 这里原来有个 `fallbackBook(title)`，已**删除**。
 *
 * 它返回一份写死的假数据：2 单元 4 小节、类比是「像搭积木，先有地基再有墙面」、
 * 口诀是「定要素，抓限定」—— 与用户传的是哪本书**完全无关**。
 *
 * 危害不是"数据不准"，而是**用户毫无察觉**：
 *   界面照样弹「解析完成」，书上写着用户自己起的名字，
 *   内容却是同一份模板。用户会以为 AI 读懂了照片。
 *   这正是「我看了其它书籍都是同一个模板」的直接原因。
 *
 * 教材正文结构**没有任何本地兜底可言**——编不出来就不该编。
 * 现在 AI 失败一律 `fail()` 明说，用户能选择重试或换材料。
 *
 * 保留的 fallbackNetwork / fallbackQuiz 不同：
 *   它们是**纯规则**（抽关键词、排模板题），不含编造的知识内容，
 *   且结果里带 `_fallback: true`，前端能提示用户「这是本地快速结果」。
 */

/* ============ 各任务实现 ============ */
async function runNetwork(payload) {
  const fragments = payload.fragments || [];
  if (!fragments.length) return fail('没有可梳理的内容');
  const prompt = '请把以下碎片知识点梳理成完整知识体系：\n' + fragments.join('\n') + '\n\n' + P.NETWORK;
  const data = await askJSON(prompt);
  // 🔴 兜底必须带 _fallback 标记，前端才能如实提示「这是本地示例」
  return ok(data || Object.assign({ _fallback: true }, fallbackNetwork(fragments)));
}

async function runMemoryAid(payload) {
  const points = payload.points || [];
  if (!points.length) return fail('没有可生成的内容');
  const prompt = '针对以下知识点生成记忆辅助内容：\n' + points.join('\n') + '\n\n' + P.MEMORY_AID;
  const data = await askJSON(prompt);
  if (!data) return fail('AI 生成失败，请稍后重试');
  return ok(data);
}

async function runErrorDrill(payload) {
  const points = payload.points || [];
  if (!points.length) return fail('没有可生成的内容');
  const prompt = '针对以下知识点做易错点对比与纠错出题：\n' + points.join('\n') + '\n\n' + P.ERROR_DRILL;
  const data = await askJSON(prompt);
  if (!data) return fail('AI 生成失败，请稍后重试');
  return ok(data);
}

async function runQuiz(payload) {
  const points = payload.points || [];
  if (!points.length) return fail('没有可出题的内容');
  const types = payload.types || ['choice', 'judge', 'blank'];
  const count = payload.count || types.length * 3;
  const prompt =
    '根据以下知识点生成 ' + count + ' 道题，题型包含 ' + types.join('、') + '：\n' +
    points.join('\n') + '\n\n' + P.QUIZ;
  const data = await askJSON(prompt);
  // 🔴 兜底必须带 _fallback 标记，前端才能如实提示「这是本地示例」
  return ok(data || Object.assign({ _fallback: true }, fallbackQuiz(points, count)));
}

async function runBookParse(payload) {
  const title = payload.title || '未命名书籍';
  const subject = payload.subject || '';
  // 多图支持：前端传 fileIDs 数组；兼容旧的单 fileID
  const fileIDs = Array.isArray(payload.fileIDs) && payload.fileIDs.length
    ? payload.fileIDs
    : payload.fileID
      ? [payload.fileID]
      : [];

  // ⚠ 判定顺序：先看rawText，再看 fileIDs。
  //   原来只有 `if (!fileIDs.length) return fail(...)`，
  //   于是「粘贴文字、不选文件」这条最省成本的路径会被自己拦住——
  //   而这条路径恰恰是唯一**完全不调用视觉模型**的路径。
  const rawTextInput = String(payload.rawText || payload.text || '').trim();

  if (!fileIDs.length && !rawTextInput) {
    return fail('没有收到任何内容，请粘贴教材文字，或选择文件/照片', 400);
  }

  /* ---- 第一步：把素材转成文字 ----
   * 三条路径：
   *   ① 纯文本直传（rawText）—— 用户自己粘贴/导出的文字，**零识别成本**
   *   ② 图片 → 视觉模型 OCR
   *   ③ 文本类文件（txt/md）→ 直接解码
   *
   * 🔴 2026-10-11：原来只有 ②③，且 decodeBuffer 对 pdf/doc 做 UTF-8 解码 ——
   *   那是二进制格式，解出来必然是乱码，用户会看到一本「乱码教材」。
   *   现在：二进制文档**如实告知不支持**并给出可执行替代方案，绝不硬解。
   */
  const images = [];
  const texts = [];

  // ① 纯文本直传：省掉 AI 识别这一步
  const rawText = rawTextInput;
  if (rawText) {
    texts.push('【用户直接提供的文字】\n' + rawText.slice(0, 20000));
  }

  for (let i = 0; i < fileIDs.length; i++) {
    const fid = fileIDs[i];
    try {
      if (isImageFile(fid)) {
        const fileRes = await cloud.downloadFile({ fileURL: fid });
        // ⚠ 超大图直接跳过而不是硬塞：base64 之后体积会膨胀约 1/3，
        //   超过 5MB 模型侧会拒整次请求，一张坏图会拖垮全部识别。
        if (fileRes.fileBuffer.length <= VISION_MAX_BYTES) {
          images.push({
            label: '第' + (i + 1) + '张',
            base64: fileRes.fileBuffer.toString('base64')
          });
        } else {
          texts.push('【第' + (i + 1) + '份材料】\n（图片过大未纳入识别，请换一张更清晰的）');
        }
      } else {
        const ext = fileExt(fid);
        const fileRes = await cloud.downloadFile({ fileURL: fid });
        const t = decodeTextFile(fileRes.fileBuffer, ext);
        if (t.ok) {
          texts.push('【第' + (i + 1) + '份材料：' + (ext || '文本') + '】\n' + t.text);
        } else {
          // ⚠ 不支持的格式必须**明说**，不能塞乱码进去让AI 编内容
          texts.push('【第' + (i + 1) + '份材料：' + (ext || '未知') + '】\n（' + t.reason + '）');
        }
      }
    } catch (err) {
      console.warn('[aiService] 第' + (i + 1) + '份材料读取失败:', err.message);
      texts.push('【第' + (i + 1) + '份材料】\n（读取失败）');
    }
  }

  let sourceText = texts.join('\n\n').slice(0, 12000);
  if (images.length) {
    const ocr = await visionText(images);
    if (ocr) {
      sourceText =
        (sourceText ? sourceText + '\n\n' : '') + '【图片识别出的原文】\n' + ocr.slice(0, 8000);
    }
  }

  /* ---- 第二步：素材为空就直接报错，绝不瞎编 ----
   * ⚠⚠ 原来这里是 `isImageSet && !sourceText ? '请依据书名推断典型章节结构' : ...`
   *   —— 读不出文字就**让 AI 凭书名编一本**，
   *   结果就是用户看到的「每本书内容都是同一个模板」。
   *   **编造出来的教材比报错有害得多**：用户会以为解析成功了。
   *   所以现在素材为空一律返回可执行的错误。
   */
  const usable = sourceText.replace(/[\s（(【]*(未?识别|读取失败|无文字|图片过大未纳入识别)[\s）)】]*/g, '').trim();
  if (usable.length < 10) {
    return fail(
      '没能从这' + (images.length ? '张图片' : '个文件') + '里读到可用文字。' +
        '最快的办法：直接复制教材文字，粘贴到「粘贴文字」输入框上传' +
        '（这样完全不需要 AI 识别）。' +
        '若要拍书页：① 拍书页正面、清晰不反光 ② 一次不超过 ' + VISION_MAX + ' 张' +
        '（可分批传）③ 文件不是扫描件空页',
      422
    );
  }

  const prompt =
    '请对下面这本' + (subject ? subject + ' ' : '') + '教材/笔记做完整结构化拆解：\n' +
    '<<<\n' + sourceText + '\n>>>\n\n' +
    P.BOOK_PARSE +
    (fileIDs.length > 1
      ? '\n\n【重要】本次共 ' + fileIDs.length + ' 份材料，请合并所有内容，' +
        '去重后统一编排单元结构，不要只处理其中一份。'
      : '') +
    '\n\n【必须遵守】只能依据上面 <<<>>> 里的真实文字来编排。' +
    '原文没提到的知识点不要编。原文信息不足以支撑多个单元时，就少切几个单元。';

  const data = await askJSON(prompt);

  /* ---- 第三步：AI 失败要明说，不能拿模板糊弄用户 ----
   * ⚠ 原来 `data || fallbackBook(title)` 会返回一份写死的假数据
   *   （2 单元 4 小节、含"像搭积木"这类通用类比），
   *   界面显示「解析完成」，用户完全看不出这是假的。
   *   现在 AI 失败/返回空 → 直接报错，并让用户知道可以重试。
   */
  if (!data || !Array.isArray(data.units) || !data.units.length) {
    return fail(
      'AI 没能把这份材料整理成结构（原文已读到，但结构化失败）。' +
        '可以点「重新解析」再试一次，或换个清晰的照片。',
      502
    );
  }

  // 标记来源，方便前端展示
  // ⚠ 纯文字路径也必须算1 份，否则前端「0 份材料已解析」——
  //   数字为 0 会让用户以为白跑了。
  data.sourceCount = fileIDs.length + (rawText ? 1 : 0);
  data.sourceImages = images.length;
  // 标记是否走了零识别成本路径，前端可据此说明「本次未使用图片识别」
  data.sourceRawText = !!rawText && !images.length;
  return ok(data);
}

async function runMemo(payload) {
  const text = payload.text || '';
  if (!text) return fail('内容为空');
  const data = await askJSON('请把以下内容整理成速记卡片：\n' + text.slice(0, 3000) + '\n\n' + P.MEMO);
  if (!data) return fail('AI 生成失败，请稍后重试');
  // 🔴 把用户原文带进结果：AI 没返 title 时，靠它兜底。
  //   没有这个，normalize 的兜底只能是写死的 '碎片卡片'，
  //   于是每张卡的名称都一样（2026-10-11 用户报的问题）。
  const out = Array.isArray(data)
    ? Object.assign(data.slice(), { _input: text })
    : Object.assign({}, data, { _input: text });
  return ok(out);
}

async function runGrade(payload) {
  const standard = payload.standard || '';
  const userText = payload.userText || '';
  if (!standard) return fail('缺少标准答案');
  if (!userText) return fail('还没有提交内容');
  const data = await askJSON(
    '标准答案：' + standard + '\n用户默写：' + userText + '\n\n' + P.GRADE
  );
  if (!data) return fail('批改失败，请稍后重试');
  return ok(data);
}

/* ============ 碎片记忆三件套 ============ */

/** 带兜底的 JSON 调用：AI 失败或未开通时返回本地数据，保证界面可用 */
async function askJSONOr(prompt, fallback) {
  try {
    const data = await askJSON(prompt);
    return data || fallback;
  } catch (err) {
    console.warn('[aiService] 调用失败，使用本地兜底:', err.message);
    return fallback;
  }
}

/** 检索记忆技巧 */
async function runMemoryTips(payload) {
  const text = (payload.text || '').trim();
  if (!text) return fail('内容为空');
  if (text.length < 4) return fail('内容太短，至少写 4 个字');
  const data = await askJSONOr(
    '我要背下面这段内容：\n<<<\n' + text.slice(0, 4000) + '\n>>>\n\n' + P.MEMORY_TIPS,
    fallbackMemoryTips(text)
  );
  if (!data) return fail('AI 分析失败，请稍后重试');
  return ok(data);
}

/** 知识扩展：把碎片接入知识网络 */
async function runExpand(payload) {
  const text = (payload.text || '').trim();
  if (!text) return fail('内容为空');
  const data = await askJSONOr(
    '请扩展下面这段零散知识：\n<<<\n' + text.slice(0, 4000) + '\n>>>\n\n' + P.EXPAND,
    fallbackExpand()
  );
  if (!data) return fail('AI 扩展失败，请稍后重试');
  return ok(data);
}

/** 组织成体系 */
async function runOrganize(payload) {
  const raw = payload.text || payload.items || '';
  const text = (Array.isArray(raw) ? raw.join('\n') : String(raw)).trim();
  if (!text) return fail('内容为空');
  const data = await askJSONOr(
    '请把下面这些零散内容整理成体系：\n<<<\n' + text.slice(0, 5000) + '\n>>>\n\n' + P.ORGANIZE,
    fallbackOrganize()
  );
  if (!data) return fail('AI 整理失败，请稍后重试');
  return ok(data);
}

/**
 * 知识点加深
 * ------------------------------------------------------------
 * 用在「补充内容」页：用户在 AI 识别的底稿上又手写了一段，
 * 这里在**合并后的内容**上继续补易错点 / 口诀 / 类比，
 * 不会覆盖用户写的字。
 *
 * 类比与口诀沿用 prompts.js 里的 ANALOGY_RULE 硬性质量要求，
 * 保证「X 对应 Y + 失效点 + 押韵」这三件事都落到输出里。
 */
async function runDeepen(payload) {
  const text = String(payload.text || '').trim();
  const title = String(payload.title || '').trim();
  if (!text) return fail('内容为空，没法加深');

  const prompt =
    '用户已经整理了一段知识点（可能包含他自己写的补充）。' +
    '请在这段内容的基础上加深，不要重复已有内容，重点补三类：\n' +
    '1. extra：补充他没写到的关键要点、易忽略的限定条件、考试常挖的坑；\n' +
    '2. mnemonic：一句 7-14 字的押韵口诀，每个字都要对应真实信息，不许为押韵编造；\n' +
    '3. analogy：生活化类比，' + P.ANALOGY_RULE_TEXT + '\n' +
    '4. errors：常错表述 + 正确表述对照；\n' +
    '5. keywords：3-6 个遮挡模式要遮住的核心词。\n' +
    (title ? '\n知识点标题：' + title + '\n' : '') +
    '\n已有内容：\n<<<\n' + text.slice(0, 1500) + '\n>>>' +
    P.JSON_RULE +
    '\n\n【JSON 结构】\n' +
    '{"extra":"补充要点","mnemonic":"押韵口诀","analogy":"类比（X对应Y+失效点）",' +
    '"errors":"易错对照","keywords":["核心词"]}';

  const data = await askJSONOr(prompt, {
    extra: '',
    mnemonic: '',
    analogy: '',
    errors: '',
    keywords: []
  });
  if (!data) return fail('AI 加深失败，请稍后重试');
  return ok(data);
}

/* ============ 文件文本提取 ============ */

/**
 * 把图片转成文字
 * ------------------------------------------------------------------
 * ⚠⚠⚠ **这里原来用的是 `cloud.openapi.ocrBiz.ocr`，有三个致命问题**：
 *
 *1. **漏了 `await`** —— `ocrBiz.ocr()` 返回 Promise，
 *    原代码同步读 `res.text_buffers` 必然是 `undefined` → 永远返回空串。
 *    教材照片的文字**从来没被读到过**。
 * 2. **接口本身不对** —— `ocrBiz` 是「**营业执照**识别」专用接口，
 *    输入必须是标准营业执照图片。用它读课本照片，属于工具用错。
 * 3. **失败只 warn 不上报** —— 空串一路传到`runBookParse`，
 *    变成「未能提取到图片文字，请推断典型章节结构」，
 *    AI 只能靠书名瞎编 → 用户看到的就是「每本书内容都一样」。
 *
 * ✅ 现在改成**多模态视觉模型直接读图**：
 *    把图片转成 base64，塞进 messages 的 content 数组，
 *    让视觉模型（`glm-5v-turbo`）把教材页上的文字原样抄出来。
 *    这条路不依赖任何「需要开通的 OCR 能力」，
 *    只要控制台里`glm-5v-turbo` 的开关是开的就能用。
 *
 * ⚠ 视觉模型名与文本模型名是**两回事**：
 *   `hy3` 是纯文本模型，传图片给它会被**静默忽略**（不报错、返回空）。
 *   所以这里必须用视觉模型，不能复用 `MODEL.name`。
 *
 * 🔴🔴 **候选链而不是写死一个模型名**（2026-10-06 实测）：
 *   用户在**微信云开发**控制台的「AI → 生文模型」列表里**根本找不到
 *   `glm-5v-turbo`** —— 那个列表是 hy3 / hy-m2-* / deepseek-* / glm-5.2 / kimi-k3 这类，
 *   多模态入口在「第三方模型」或需要资源点套餐才出现。
 *
 *   而**不同入口开通的可用模型完全不一样**
 *   （微信云开发 / 腾讯云主站 / 个人版 / 体验版 / 资源点套餐 —— 各有一套清单），
 *   靠文档猜必然猜错（文档写的就是 glm-5v-turbo，用户界面里就是没有）。
 *
 *   所以：**按顺序挨个试，谁通用谁**。
 *   第一个成功的会被记进日志，下次直接快路径命中（`VISION_OK`）。
 *   环境变量 `AI_VISION_MODEL` 可指定单个模型跳过探测。
 *
 * ⚠⚠ **下线时间（控制台公告，2026-10-06 用户截图确认）**：
 *   · `glm-5v-turbo`      → **2026-10-30 0点下线**
 *   · `glm-5` / `glm-5-turbo` / `glm-5.1` → **2026-10-9 0 点下线**
 *
 *   所以候选链里`glm-5v-turbo` 排在**很后面**（还有 24 天可用，
 *   足够覆盖大赛），长期主力是 `kimi-k2.6`
 *   —— 它和 glm-5v-turbo 是官方文档里唯二明确支持图片输入的通用模型。
 *   **下线后不需要改代码**，自动降级到下一个；只要候选链里还有一个能用的就行。
 *
 * ⚠⚠ **候选顺序的依据（2026-10-06 用户企业云环境截图 + 官方 multimodal 文档）**：
 *   用户账户 100053452626 已购企业云服务，环境里「输入类型=图片」筛选下
 *   实际存在的型号与官方文档**对不上**，所以按「价格 + 是否明确支持图片」排：
 *
 *   · `kimi-k2.6`       6.5k/27k  官方确认支持图片+视频，无下线公告 → 主力
 *   · `kimi-k2.8-preview` 同价位  支持图片+视频，新型号→ 备份
 *   · `kimi-k3`         20k/100k旗舰多模态，贵 3 倍，OCR 属于杀鸡用牛刀 → 兜底
 *   · `glm-5.3-flash`     800/2.8k**最便宜**，官方未列入多模态表，先探
 *   · `deepseek/deepseek-flash` 纯文本，**故意不列入**（传图被忽略，
 *     混进候选链只会得到「能对话但读不对图」的假阳性）
 *
 *   结论：**价格不是首要因素，可用性才是**。最便宜的排第三，
 *   是因为若它真支持，OCR 成本能降到 k2.6 的 1/8；
 *   但绝不能排第一 —— 万一不支持，会白白多一轮失败探测。
 */
const VISION_CANDIDATES = (
  process.env.AI_VISION_MODEL
    ? [process.env.AI_VISION_MODEL]
    : [
        // ── 第一梯队：官方文档明确支持图片输入 ──
        // ★ 长期主力。价格 6.5k/27k（每百万 tokens），官方 multimodal 页
        //   明确列出支持图片+视频，且**未公布下线时间**。
        'kimi-k2.6',
        // ★ 同价位更新型号，支持图片+视频。作为 k2.6 的备份。
        'kimi-k2.8-preview',
        // ○ 旗舰原生多模态，1M 上下文。**贵约 3 倍**（20k/100k），
        //   OCR 属于常规任务，用旗舰是杀鸡用牛刀，放第三位兜底即可。
        'kimi-k3',

        // ── 第二梯队：用户环境列表里有，但官方未列入多模态表 ──
        // ○ **截图里最便宜**（输入 800 / 输出 2.8k），先探它能不能看图。
        //   万一支持，性价比碾压其他所有模型（比 k2.6 便宜 8 倍）。
        //   排在后面是因为「不确定」—— 自检会挨个试，探到了自动上移。
        'glm-5.3-flash',
        'glm-5.3',
        'glm-5.2',

        // ── 第三梯队：确定或即将不可用，只做兜底 ──
        // ○ 2026-10-30 0 点下线（控制台公告确认），大赛前可用，之后自动跳过
        'glm-5v-turbo',
        // ○ 官方仅支持 Base64（我们正是用Base64），但属编码专用模型，
        //   教材 OCR 不是它的主场
        'kimi-k2.7-code',
        'hy-vision'
      ]
).filter(Boolean);

/** 上一次成功用到的视觉模型，跳过前面的失败探测（进程内缓存即可） */
let VISION_OK = '';

/** 视觉模型单次最多读几张（多了 token爆炸且容易超时） */
const VISION_MAX = 4;
/** 单张图 base64 上限（文档建议 ≤5MB，这里留余量） */
const VISION_MAX_BYTES = 4 * 1024 * 1024;

async function visionText(images) {
  const blocks = [{ type: 'text', text: OCR_PROMPT }];
  let used = 0;
  for (const it of images) {
    if (used >= VISION_MAX) break;
    if (!it.base64) continue;
    blocks.push({
      type: 'image_url',
      image_url: { url: 'data:image/jpeg;base64,' + it.base64 }
    });
    used++;
  }
  if (!used) return '';

  // 已经探测到能用的模型就直接用它，不再挨个试
  const order = VISION_OK ? [VISION_OK] : VISION_CANDIDATES;
  const tried = [];
  for (let i = 0; i < order.length; i++) {
    const name = order[i];
    try {
      const { text } = await AI.generateText(cloud, {
        model: name,
        messages: [{ role: 'user', content: blocks }]
      });
      const out = clean(text || '');
      if (out) {
        VISION_OK = name;
        console.log('[aiService] 视觉模型可用:' + name);
        return out;
      }
      // 返回空也算失败：纯文本模型传图会静默返回空，这是最坑的一种
      tried.push(name + '(空返回)');
    } catch (e) {
      tried.push(name + '(' + String(e.message || e).slice(0, 60) + ')');
    }
  }

  // ⚠ 全部失败必须把**试过什么、分别为什么**打出来，
  //   否则只能看到一句「识别失败」，用户和排查者都不知道该去开哪个模型。
  console.error(
    '[aiService] 视觉模型全部不可用。已尝试：' + tried.join(' / ') +
      '。请在控制台「AI」里开通其中之一，或设环境变量 AI_VISION_MODEL 指定。'
  );
  return '';
}

const OCR_PROMPT =
  '请把图片里教材/笔记页面上的文字**原样**抄录出来。要求：\n' +
  '1. 只抄图片上真实存在的文字，不要解释、不要补充、不要总结\n' +
  '2. 保留标题层级、编号、公式、表格的结构\n' +
  '3. 看不清的字用□ 占位，不要猜\n' +
  '4. 如果图片里确实没有任何文字，只回一句「无文字」\n' +
  '直接输出文字本身，不要任何开场白。';

/** 判断是不是图片（云存储 fileID 看扩展名） */
function isImageFile(fileID) {
  return /\.(png|jpg|jpeg|gif|webp|bmp)(\?|$)/i.test(String(fileID || ''));
}

/** 取扩展名（小写，不含点）。云存储 fileID 里可能带 query，要先剥掉 */
function fileExt(fileID) {
  const s = String(fileID || '').split('?')[0];
  const m = s.match(/\.([a-z0-9]+)$/i);
  return m ? m[1].toLowerCase() : '';
}

/**
 * 可以**纯解码**的文本文档扩展名
 * 🔴 不含 pdf/doc/docx —— 它们是二进制容器（可能是压缩流），
 *   按 UTF-8 解码只会得到乱码。宁可明确拒绝，也不能把乱码喂给 AI。
 */
const PLAIN_TEXT_EXT = ['txt', 'md', 'markdown', 'json', 'csv', 'log', 'text', 'srt'];

/**
 * 解码文本文件。
 * @returns {{ok:boolean, text?:string, reason?:string}}
 */
function decodeTextFile(buffer, ext) {
  if (!buffer || !buffer.length) {
    return { ok: false, reason: '文件是空的' };
  }

  if (ext && PLAIN_TEXT_EXT.indexOf(ext) < 0) {
    const names = {
      pdf: 'PDF 是排版格式，直接解码得不到文字',
      doc: 'Word 旧格式（.doc）暂不支持',
      docx: 'Word 格式暂不支持',
      xls: 'Excel 格式暂不支持',
      xlsx: 'Excel 格式暂不支持',
      ppt: 'PPT 格式暂不支持',
      pptx: 'PPT 格式暂不支持'
    };
    const why = names[ext] || '这是二进制格式，直接解码得不到文字';
    return {
      ok: false,
      reason: why + '。请改用：① 复制文字粘贴到输入框 ② 或用手机拍书页（走图片识别）'
    };
  }

  // 剥掉 UTF-8 BOM，否则开头会多一个﻿ 让首句解析异常
  let buf = buffer;
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    buf = buf.slice(3);
  }

  let text = buf.toString('utf8');

  // 🔴 乱码检测：UTF-8 解码失败时会大量出现 U+FFFD（�）。
  //   中文教材里出现这个字符就说明原文件其实是 GBK 编码。
  const bad = (text.match(/�/g) || []).length;
  if (bad > 3 && bad / text.length > 0.005) {
    // 尝试按 GBK 重新解码（Node 内置，不需装依赖）
    try {
      const gbk = new TextDecoder('gbk', { fatal: false });
      const alt = gbk.decode(buf);
      const altBad = (alt.match(/�/g) || []).length;
      if (altBad < bad) text = alt;
    } catch (e) {
      /* Node 不带 GBK 就维持 UTF-8 结果 */
    }
  }

  text = text.replace(/\r\n/g, '\n').trim();
  if (!text) return { ok: false, reason: '文件里没有可读的文字' };

  // 纯空白/符号的内容对 AI 没用（提示词要求至少 10 字）
  if (text.replace(/[\s\p{P}\p{S}]/gu, '').length < 10) {
    return { ok: false, reason: '文件里几乎没有成句的文字（可能是扫描件或空模板）' };
  }

  return { ok: true, text: text.slice(0, 20000) };
}

/** 兼容旧调用（保留以防别处仍在用） */
function decodeBuffer(buffer) {
  const r = decodeTextFile(buffer, '');
  return r.ok ? r.text : '';
}


/* ============ 视觉模型自检 ============ */

/**
 * 挨个试候选视觉模型，看哪个真的能用
 * ------------------------------------------------------------------
 * 为什么需要这个：
 *   **不同入口开通的模型清单完全不一样** ——
 *   微信云开发控制台 / 腾讯云主站 / 个人版 / 体验版 / 资源点套餐，各有一套。
 *   官方文档写的 `glm-5v-turbo`，在用户的微信云开发列表里就找不到。
 *   靠文档猜必然猜错，只能实测。
 *
 * ⚠⚠⚠ **这里原来用1×1 空白 PNG 探测，等于什么都没验**
 *
 *   旧测法：传一张 1×1 全透明 PNG，问「只回答两个字：可以」，
 *   只要有返回文字就算「可用」。
 *
 *   为什么无效：**纯文本模型传这张图也会照常返回文字** ——
 *   它根本不关心图片内容，有 prompt 就能答。
 *   于是「真视觉模型」和「纯文本模型」在结果里长得一模一样。
 *   自检只会告诉你「接口通」，而恰恰害死人的就是这个误判：
 *   用户看到 ✓ 就以为开通了，结果上传照片依然读不出文字。
 *
 *   新测法：**给一张内容可验证的图**（246×86，手写点阵画的数字 7319），
 *   要求模型把数字读出来。
 *     · 读出 7319        → 真的能看图 ✅
 *     · 答非所问/说没有图→ 这是纯文本模型，它在假装看图 ❌
 *     · 报不支持/未开通  → 环境层面就没这个能力
 *
 *   探针图由 tools/make-probe-png.js 生成（零依赖手写 PNG 编码器），
 *   生成时会反向解码自校验，确保图里确实是 7319。
 *
 * 不消耗额度：这是诊断入口，**故意不调 charge()**，
 * 免得用户为了排查先烧额度。
 */
const PROBE_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAPYAAABWCAAAAADZZTT6AAAAr0lEQVR42u3YwQ6AIAgAUP//p+va' +
  'Vmua6EY8ziA8To52lIyGjY2NjY2dmt2G4/LIRO3jUJ15vRNgY2NjY2NjY+dljzeIrli3nnseNj' +
  'Y2NjY2NvY/2OuwsRxsbGxsbGxs7ArsmdH3rmz0dImNjY2NjY2NnY8dg93x6fzeFxsbGxsbGxu7' +
  'Anv9yS96ydjY2NjY2NjYFdi9p7y9ta/52NjY2NjY2Njp2BUCGxsbGxs7ZZzjmuCHnk2liAAAA' +
  'ABJRU5ErkJggg==';

/** ⚠️ 改这张图必须同步改这里，并重跑 node tools/make-probe-png.js */
const PROBE_ANSWER = '7319';

async function runVisionCheck() {
  const results = [];
  const order = VISION_CANDIDATES;
  for (let i = 0; i < order.length; i++) {
    const name = order[i];
    const row = { model: name, ok: false, note: '' };
    try {
      const { text: rawText } = await AI.generateText(cloud, {
        model: name,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text:
                  '看这张图，里面手写了一串数字。' +
                  '请只回答那串数字本身，不要回答别的东西。'
              },
              {
                type: 'image_url',
                image_url: { url: 'data:image/png;base64,' + PROBE_PNG }
              }
            ]
          }
        ]
      });
      const text = rawText ? String(rawText).replace(/\s+/g, '') : '';

      // ⚠️ 判定标准是「读对数字」，不是「有返回文字」。
      //    纯文本模型会因为 prompt 里没给数字而瞎编一个，
      //    但极难正好蒙对 7319 —— 所以这个判据足够严格。
      if (!text) {
        row.note = '返回空 —— 很可能不支持图片输入';
      } else if (text.indexOf(PROBE_ANSWER) > -1) {
        row.ok = true;
        row.note = '✓ 真能看图，正确读出了 ' + PROBE_ANSWER;
        VISION_OK = name;
      } else {
        row.note =
          '能对话但读不对图（返回「' + text.slice(0, 20) + '」）—— ' +
          '这是纯文本模型，图片被忽略了，不能用于教材识别';
      }
    } catch (e) {
      const raw = String((e && (e.message || e.errMsg)) || e || '');
      if (/wx-server-sdk|cloud\.ai\(\)|拿不到 AI 能力/i.test(raw)) {
        // ⚠ 这是**代码/依赖问题**，不是模型问题。
        //   必须第一时间停下并说清楚 —— 否则会像这次一样，
        //   9 个模型报同一个 undefined 错，看着像「全都没开」，
        //   用户就被误导去控制台反复开模型了。
        row.note = '❗ ' + raw.slice(0, 90);
        row.fatal = true;
        results.push(row);
        break;
      }
      if (/not\s*support\s*image|does not support/i.test(raw)) {
        row.note = '该模型不支持图片输入';
      } else if (/not\s*open|未开通|not enabled|not activated|switch/i.test(raw)) {
        row.note = '控制台开关未打开';
      } else if (/not\s*found|does not exist|无可用|不存在/i.test(raw)) {
        row.note = '当前环境没有这个模型';
      } else if (/unauthorized|not authorized|权限/i.test(raw)) {
        row.note = '没有权限（体验版环境可能不支持）';
      } else {
        row.note = raw.slice(0, 80) || '未知错误';
      }
    }
    results.push(row);

    // 找到一个能真正读图的就够了 —— 剩下的模型不必再试，
    // 否则每点一次自检都要串行等 9 次模型调用，失败时还可能触发超时。
    if (row.ok) break;
  }

  // 没跑到的候选模型明确标出来，别让用户以为是「测了但失败」。
  if (results.length < order.length) {
    const skipped = order.slice(results.length);
    for (let k = 0; k < skipped.length; k++) {
      results.push({
        model: skipped[k],
        ok: false,
        skipped: true,
        note: '未测试（前面已找到可用模型 ' + VISION_OK + '，提前结束）'
      });
    }
  }

  const usable = results.filter((r) => r.ok).map((r) => r.model);
  const chatty = results.filter((r) => !r.ok && /纯文本模型/.test(r.note));
  const fatal = results.find((r) => r.fatal);

  return ok({
    results,
    usable,
    current: VISION_OK || null,
    // ⚠ 优先级：代码错误 > 全部不可用 > 可用。
    //   代码错了就该说「去改代码」，说「去控制台开模型」会把人带偏。
    hint: fatal
      ? '❗ 这不是模型问题，是云函数代码/依赖的问题：\n' + fatal.note +
        '\n\n**先去控制台开模型没用**，问题不在开关。'
      : usable.length
        ? '✅ 可用模型：' + usable.join('、') +
          '。图片识别会自动用列表里的第一个。' +
          '建议在控制台把 ' + usable[0] + ' 的开关保持打开。'
        : '❌ 当前环境没有可用的视觉模型，**上传照片解析会明确报错，不会编造内容**。\n' +
          '开通办法：云开发控制台 → AI → 生文模型 → 把筛选条件切到「输入类型 = 图片」，' +
          '优先打开 kimi-k2.6（官方确认支持图片，6.5k/27k 每百万 tokens）。\n' +
          (chatty.length
            ? '注意：' + chatty.map((r) => r.model).join('、') +
              ' 能对话但读不了图，别被「有返回」误导。\n'
            : '') +
          '如果图片筛选下根本没有模型，去「第三方模型」页确认套餐是否包含多模态能力。'
  });
}

/* ============ TTS 双音色 ============ */

/*
 * 音色表 —— 对应微信云开发内置 TTS 的 voiceType
 *
 * ⚠⚠ 这里原来用的是 `cloud.extendModule.aiModule.textToSpeech`，
 *   **那个方法不存在**，调用必然 TypeError。
 *   用户在控制台 AI 页面也找不到「语音合成」开关 —— 因为压根没有这个开关。
 *
 *   正确接口是 `cloud.openapi.tts.textToSpeech`，属于微信云开发**内置能力**：
 *   不需要在 AI 能力面板开通、不是按量计费的大模型项，
 *   跟着环境走，开通环境就能用。
 *
 *   ⚠ 原来表里有 speed 字段（1.0 / 0.9）想控制语速，
 *     但内置 TTS 的参数里没有 speed，而且写了会被忽略 →
 *     前端以为语速不同、实际听感一样。
 *     真正的倍速靠前端 `InnerAudioContext.playbackRate`（6 档固定值），
 *     见 utils/voice-pack.js。
 *
 *   voiceType 取值来自微信开放接口：
 *     1010 标准女声 / 1011 标准男声 / 1013 甜美女声
 *     1020 情感女声 / 1021 情感男声
 *   实际可用范围以环境为准，所以下面每档都做了兜底链：
 *   主选失败自动降级到下一个，绝不因为一个音色不可用就整个没声音。
 */
const TTS_VOICES = VOICE;

async function runTTS(payload) {
  const text = String(payload.text || '').slice(0, 1200);
  const mode = VOICE[payload.mode] ? payload.mode : 'warm';
  if (!text) return ok({ audioUrl: '' });

  const voice = TTS_VOICES[mode];

  // ⚠ TTS 也要扣额度。连续朗读一本书会一次调几十段，
  //   不扣就是成本敞口。单价按 0.1/段，定价依据见 AI_COST 的注释。
  //   前端 tts-player.js 做了本地缓存（TTL 7 天），
  //   所以同一段文字重听不会重复扣 —— 这里是**第一次合成**才扣。
  try {
    await charge(OPENID(), 'voice');
  } catch (err) {
    if (err.code === 'QUOTA_EXHAUSTED') {
      return fail(err.message, 403);
    }
    console.error('[aiService] TTS 扣额度失败，本次放行:', err.message);
  }

  // 依次尝试各音色：第一个成功就返回，全失败才报错
  let lastErr = null;
  for (const voiceType of voice.types) {
    try {
      const res = await cloud.openapi.tts.textToSpeech({
        lang: 'zh_CN',
        voiceType,
        text
      });

      // 返回可能是 base64、也可能是可播放地址，两种都处理
      let audioUrl = '';
      if (typeof res === 'string' && res.length > 100) {
        // 纯 base64（腾讯云老接口把音频直接塞在msg 里）
        const buf = Buffer.from(res, 'base64');
        const p = 'tts/' + Date.now() + '_' + voiceType + '.mp3';
        const up = await cloud.uploadFile({ cloudPath: p, fileContent: buf });
        audioUrl = up.fileID;
      } else if (res && res.base64) {
        const buf = Buffer.from(res.base64, 'base64');
        const p = 'tts/' + Date.now() + '_' + voiceType + '.mp3';
        const up = await cloud.uploadFile({ cloudPath: p, fileContent: buf });
        audioUrl = up.fileID;
      } else if (res && (res.audioUrl || res.fileID || res.filename || res.url)) {
        audioUrl = res.audioUrl || res.fileID || res.filename || res.url;
      }

      if (audioUrl) {
        return ok({ audioUrl, mode, modeName: voice.name, voiceType });
      }
      lastErr = new Error('返回里没有音频地址，字段：' + Object.keys(res || {}).join(','));
    } catch (e) {
      lastErr = e;
      console.warn('[aiService] TTS voiceType=' + voiceType + ' 失败:', e.message);
    }
  }

  console.error('[aiService] TTS 全部音色失败:', lastErr && lastErr.message);
  // 不抛错：返回空地址让前端跳过这段（tts-player 支持缺段继续播）
  //
  // ⚠️ 必须把 errCode 带回去。原因实测（2026-10-06）：
  // 全档音色失败时，返回里只有一句「TTS 暂不可用」，
  // 前端只能弹「语音生成失败」，**用户完全无法判断是自己没权限还是服务坏了**。
  // 真实报错长这样：
  //   errCode: -501001 resource system error
  //   errMsg: tts.textToSpeech:fail invalid wx openapi access_token
  // 有 errCode 才能在前端区分「权限问题（去控制台开通）」和「服务临时故障（稍后重试）」。
  const ttsErrCode = (lastErr && (lastErr.errCode || lastErr.code)) || '';
  const ttsErrMsg = String((lastErr && lastErr.message) || '');
  return ok({
    audioUrl: '',
    mode,
    modeName: voice.name,
    error: 'TTS 暂不可用',
    errCode: ttsErrCode ? String(ttsErrCode) : '',
    // 原始报错已截断，避免把整段堆栈丢给前端
    errMsg: ttsErrMsg.slice(0, 200)
  });
}

/* ============ 主入口 ============ */
/** 任务分发（从 main 里抽出来，便于统一做后处理） */
async function dispatch(task, payload) {
  switch (task) {
    case 'network':
      return await runNetwork(payload);
    case 'memory_aid':
      return await runMemoryAid(payload);
    case 'error_drill':
      return await runErrorDrill(payload);
    case 'book_parse':
      return await runBookParse(payload);
    case 'quiz':
      return await runQuiz(payload);
    case 'memo':
      return await runMemo(payload);
    case 'grade':
      return await runGrade(payload);
    case 'memory_tips':
      return await runMemoryTips(payload);
    case 'expand':
      return await runExpand(payload);
    case 'organize':
      return await runOrganize(payload);
    case 'deepen':
      return await runDeepen(payload);
    case 'tts':
      return await runTTS(payload);
    case 'vision_check':
      return await runVisionCheck(payload);
    default:
      return fail('未知 task: ' + task);
  }
}

/**
 * 把结果映射到前端契约。
 * ⚠ `ok()` 的返回是 `{code:0, message:'ok', data: payload, ...payload}`，
 *   所以规范化要作用在 data 上，再把映射结果摊平回去，
 *   保持前端 `res.questions` / `res.items` 这类访问方式不变。
 */
function mapResult(task, res) {
  if (!res || res.code !== 0 || !res.data) return res;

  // 前端 task 名与云端 task 名不完全一致，建立映射
  const TASK_TO_VIEW = {
    memory_aid: 'memory',
    error_drill: 'error',
    book_parse: 'book'
  };
  const viewTask = TASK_TO_VIEW[task] || task;

  const mapped = NORM.normalize(viewTask, res.data);
  if (mapped === res.data) return res;

  // 🔴 mapped 可能是**数组**（记忆素材、易错点、出题都是数组）。
  //   `Object.assign({}, res, mapped, {data})` 会把数组摊成 {0:..,1:..} 挂在 res 上，
  //   顶层不再是数组 → 前端拿到的 res 没有 result[i] 可遍历 → 整片空白。
  //   这正是 2026-10-11「记忆素材只有标签、没内容」的最后一环。
  // 正确做法：保留 res 顶层，只把 data 换掉；前端 callFunction 已平铺 payload，
  //   而 callFunction 对数组 payload 走的是「按元素合并」路径，
  //   所以这里必须保证 res 顶层仍是数组。
  if (Array.isArray(mapped)) {
    const arr = mapped.slice();
    arr._raw = mapped._raw || res.data;
    return arr;
  }
  return Object.assign({}, res, mapped, { data: mapped });
}

exports.main = async (event) => {
  // 兼容 HTTP 访问服务触发：那种情况下参数在 event.body（JSON 字符串）里，
  // 且没有 openid。保留这个分支便于用 curl 直接联调，不必依赖小程序端。
  if (!event.task && event.body) {
    let b = event.body;
    if (typeof b === 'string') {
      try {
        b = JSON.parse(b);
      } catch (e) {
        b = null;
      }
    }
    if (b && (b.task || b.action)) event = b;
  }

  const task = event.task;
  const payload = event.payload || {};
  if (!task) return fail('缺少 task');

  const openid = OPENID();

  try {
    /**
     * ⚠️ 额度只在这里扣一次，统一走 `consumeQuota()`。
     *
     * 原来这段手工写库有两个真实问题（2026-10-06 修）：
     *   1. **重复扣费**：这里 `used + 1`，而 `askJSON()` 里的
     *      `charge('chat')` 又扣 0.5 —— 一次碎片能力实际扣 1.5，
     *      但界面上写的是"消耗 1"。额度掉得比显示快得多。
     *   2. **绕过总开关**：手工写库不受 `FREE_MODE` 影响，
     *      测试期免额度对碎片类能力（这6 个）完全无效。
     *
     * 现在这里**只做额度预检，不写库**，
     * 实际扣费统一由 charge() → consumeQuota() 完成。
     *
     * ⚠️ 为什么预检不能省：
     *   charge() 在**扣额度失败**时会降级放行（额度系统自身故障
     *   不该阻断 AI），但**额度真的用完了必须拦住**，不能放行。
     *   这两件事必须分开：预检负责"用完了→拦住"，
     *   charge 负责"记账 + 记账失败时放行"。
     */
    if (openid && NEED_QUOTA_TASKS.indexOf(task) > -1) {
      const user = await ensureUser(openid);
      const used = await todayUsed(openid);
      const q = calcQuota(user, used);
      if (q.remaining <= 0) {
        return fail(
          q.selfBookUnlocked
            ? '今日 AI 额度已用完，明天再来'
            : '今日 AI 额度已用完，连续打卡 ' + QUOTA.unlockSelfBookStreak + ' 天可解锁更多额度',
          'QUOTA_EXHAUSTED'
        );
      }
    }

    if (DISABLED) {
      console.log('[aiService] AI 已关闭，走本地兜底');
      return ok({ _fallback: true, disabled: true });
    }

    // 🔴 统一出口做规范化：AI 的提示词结构 → 前端展示契约。
    //   必须在这里集中做（而不是各个 run* 里各写一遍）——
    //   否则新增 task 时很容易漏掉，症状就是「页面空白但不报错」。
    const res = await dispatch(task, payload);
    return mapResult(task, res);
  } catch (err) {
    /*
     * ⚠⚠ 关键任务**绝不能拿本地兜底冒充成功**。
     *   原来这里有 `if (task === 'book_parse') return ok(fallbackBook(...))`，
     *   返回一份写死的「2 单元 4 小节」假数据，界面照样弹「解析完成」。
     *   用户看到的是一本编出来的书，而且**完全无法察觉**——
     *   这就是「其它书内容都是同一个模板」的直接来源。
     *
     *   AI 失败就如实报错。`fallbackNetwork` / `fallbackQuiz` 是**纯本地规则**
     *   （抽关键词、出模板题），不含编造的知识内容，所以仍可保留；
     *   但 book_parse 编排的是**教材正文结构**，绝无本地兜底可言。
     *
     *   🔴 2026-10-11：这两个兜底**必须打上 _fallback 标记**。
     *   不带标记时前端无法分辨「真 AI 结果」和「本地模板」。
     */
    if (task === 'network') {
      return ok(Object.assign({ _fallback: true }, fallbackNetwork(payload.fragments)));
    }
    if (task === 'quiz') {
      return ok(Object.assign({ _fallback: true }, fallbackQuiz(payload.points, payload.count)));
    }

    /*
     * 🔴🔴 失败时必须**带着真实原因**返回，不能只回一句「服务异常」。
     *
     *   `utils/cloud.js` 的兜底是 `new Error(r.message || '服务异常')`，
     *   而 `common.fail(message, code)` 在 message 为空串时会兜底成「服务异常」。
     *   于是一条 `new Error()`（无 message，Node 里很常见）
     *   就变成了用户看到「服务异常 排查建议：…」——
     *   既丢掉了排查线索，又用开发者语言吓用户。
     *
     *   现在按三类分开报，前端也据此给人话：
     *     · 额度 → 明确说额度用完（用户自己能解决）
     *     · 超时 → 说稍后重试
     *     · 其它 → 带上 err.message / err.code，没有就给一句诚实的兜底
     *   ⚠ 真实细节同时 console.error，不丢线索。
     */
    console.error('[aiService]', task, err);
    const raw = String((err && err.message) || '').trim();
    const code = String((err && err.code) || '').trim();
    const isQuota = code === 'QUOTA_EXHAUSTED' || /额度|quota/i.test(raw);
    const isTimeout = /timeout|ETIMEDOUT|超时/i.test(raw);
    return fail(
      isQuota
        ? '今日 AI 额度已用完，明天再来'
        : isTimeout
        ? 'AI 生成超时了，稍后重试'
        : raw || 'AI 服务暂时没能响应，请稍后重试',
      code || (isQuota ? 'QUOTA_EXHAUSTED' : 'AI_ERROR')
    );
  }
};
