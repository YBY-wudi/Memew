/**
 * AI 模型调用适配层
 * ------------------------------------------------------------
 * ⚠️ 这层存在的唯一原因：踩过「云函数里根本没有 cloud.extend.AI」这个坑。
 *
 * 背景：`wx.cloud.extend.AI` 是**小程序端**写法。
 * 云函数端（wx-server-sdk）要用 `cloud.ai()`，且要求 SDK ≥ 4.0.1。
 * 项目原来写的是 `cloud.extend.AI.createModel('cloudbase')`，
 * 在云函数里 `cloud.extend` 是 undefined → 抛
 *   "Cannot read properties of undefined (reading 'AI')"
 * 9 个候选模型全部报同一个错，看起来像「模型全都没开」，
 * 实际是代码根本没调到 AI 接口。
 *
 * 这层做三件事：
 *  1. 兼容两种 API（cloud.ai() 优先，回退 extend.AI）
 *  2. SDK 不支持时抛出**可读**的错误，而不是 undefined 那种
 *  3. 统一 timeout —— AI 请求默认 15 秒会超时，必须放宽
 */

/* 视觉模型调用是「读图 + 生成长文」，比纯对话慢得多 */
const AI_TIMEOUT = 60000;

/**
 * 🔴 是否默认关闭「深度思考」（thinking / reasoning）
 * ------------------------------------------------------------------
 * 这是 2026-10-11 排查「AI 生成结果全是模板」时找到的**真正根因**。
 *
 * 现象：云函数不报错、不超时，模型调用返回 200，
 *       但 content 是空字符串 → 上层判为失败 → 前端塞本地模板。
 *       看起来完全像「AI 没开通」，其实 AI 一直在正常工作。
 *
 * 原因（实测抓到的原始响应）：
 *   finish_reason: "length"
 *   content: ""                                  ← 正式答案为空
 *   reasoning_content: "17 * 23 = ... = 391"     ← 答案其实算对了
 *
 * 官方文档确认（cloudbase.net/ai/model/deep-thinking、
 * tencentcloud.com/document/product/1300/80637）：
 *   · hy3 / hy4-preview / deepseek-v4-* / kimi-k2.6 / glm-5.3 等
 *     **默认 thinking = enabled**
 *   · 开启后思考过程写在 reasoning_content，正式答案才写进 content
 *   · max_tokens 是「思考 + 答案」的总预算 ——
 *     思考吃光预算时 content 就是空的，且 finish_reason 只是 length，不抛错
 *
 * 我们做的是「教育内容结构化生成」（JSON 输出），不是数学证明，
 * 不需要长思维链；开着反而烧 token、拖慢速度、还把答案挤没。
 * → 默认关闭。确实需要推理的任务可在 input 里显式传 thinking 覆盖。
 */
const DISABLE_THINKING = true;

/**
 * 拿到底层 AI 实例。
 * @param {object} cloud wx-server-sdk 实例（已 init）
 * @returns {{ai: object, via: string}} via 用于日志排查走了哪条路
 * @throws 拿不到时抛带诊断信息的错误
 */
function getAI(cloud) {
  // 正路：云函数端 API，要求 wx-server-sdk >= 4.0.1
  if (cloud && typeof cloud.ai === 'function') {
    return { ai: cloud.ai(), via: 'cloud.ai()' };
  }
  // 回退：小程序端写法。只在个别环境成立，留着不亏。
  if (cloud && cloud.extend && cloud.extend.AI) {
    return { ai: cloud.extend.AI, via: 'cloud.extend.AI' };
  }

  const version = (cloud && cloud.SDK_VERSION) || '未知';
  throw new Error(
    '当前 wx-server-sdk 拿不到 AI 能力（版本 ' + version + '）。' +
    '云函数端必须用 cloud.ai()，且需要 wx-server-sdk ≥ 4.0.1。' +
    '请把 cloudfunctions/*/package.json 里的 wx-server-sdk 升到 ~4.0.2 后重新部署。'
  );
}

/**
 * 调一次文本生成（内部已处理超时、深度思考与 SDK 缺失）。
 * @param {object} cloud wx-server-sdk 实例
 * @param {object} input { model, messages, temperature?, thinking?, ... }
 * @returns {Promise<{text: string, raw: object, thought?: string}>}
 */
async function generateText(cloud, input) {
  const { ai } = getAI(cloud);
  // createModel('cloudbase') = 走 CloudBase 统一接入层，
  // 具体用哪个模型由 input.model 指定。
  const model = ai.createModel('cloudbase');

  // 默认关闭深度思考（调用方显式传了 thinking 就尊重调用方）
  const req = input || {};
  if (DISABLE_THINKING && !req.thinking) {
    req.thinking = { type: 'disabled' };
  }

  const res = await model.generateText(req, { timeout: AI_TIMEOUT });

  // ⚠ 小程序端返回原始响应（res.choices[0].message.content），
  //   云函数端返回封装结构（res.text）。两种都兼容，
  //   否则换 SDK 版本时会再次出现「内容为空」这种假成功。
  let text = res && res.text ? String(res.text) : '';
  let thought = '';
  if (!text && res && res.choices && res.choices[0]) {
    const c = res.choices[0];
    const msg = c.message || c;
    text = (msg && (msg.content || msg.text)) || '';
    thought = (msg && msg.reasoning_content) || '';
  }
  // 云函数封装结构里也可能带 reasoning_content（在 messages 最后一条）
  if (!thought && res && Array.isArray(res.messages) && res.messages.length) {
    const last = res.messages[res.messages.length - 1];
    thought = (last && last.reasoning_content) || '';
  }

  // 🛟 最后一道保险：万一模型仍返回了「只有思考、没有答案」，
  //   把思考内容兜出来而不是把空串交上去。
  //   宁可给出带思考痕迹的内容，也不要让上层误判成「AI 没开通」。
  if (!text && thought) {
    console.warn('[ai-bridge] content 为空但存在 reasoning_content，已兜底返回思考内容');
    text = thought;
  }

  return { text: text, raw: res, thought: thought };
}

/**
 * 懒加载的模型实例（省掉每次调用重复 createModel）。
 * @param {object} cloud
 * @returns {object} 可直接 .generateText(input) 的模型
 */
function model(cloud) {
  const { ai } = getAI(cloud);
  return ai.createModel('cloudbase');
}

module.exports = { getAI, generateText, model, AI_TIMEOUT, DISABLE_THINKING };
