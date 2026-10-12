# 咪猫爱背诵

**AI 帮你「找关系」，不替你「记关系」。**

把零散的知识点连成一张能背下来的网 —— 一款 AI 辅助记忆微信小程序。

![微信小程序](https://img.shields.io/badge/微信小程序-原生-07C160?logo=wechat\&logoColor=white)

![云开发](https://img.shields.io/badge/CloudBase-云开发-006EFF)

![基础库](https://img.shields.io/badge/基础库-3.5.5-1AAD19)

![License](https://img.shields.io/badge/License-MIT-blue.svg)

![自检](https://img.shields.io/badge/自检-32%20项全通过-brightgreen)

参赛作品 · **2026 微信小程序开发大赛**（主题「与 AI 共生」）

**简体中文** ｜ [English](README.en.md)

---

## 一、它解决什么问题

背书的痛，从来不是「没资料」，而是**资料是散的**。

一页笔记写着「光合作用需要光」，另一页写着「叶绿体是光合作用的场所」，  
第三条写着「光反应发生在类囊体薄膜上」。三条都背下来了 ——  
可考试问「突然遮光后 C3 为什么会增多」，还是答不出来。  
因为它们在你脑子里是**三个孤立的点**，不是一张网。

咪猫爱背诵做的事：**把一本书的知识点连成一张有向关系网**，  
每条连线标注它属于哪种关系（因果 / 对比 / 递进 / 归属 / 易混……），  
并且**双向提示** —— 背「光反应」时提醒你想到「暗反应」，背「暗反应」时反过来提醒你想到「光反应」。

---

## 二、设计理念：AI 的边界在哪里

> 这是整个项目最关键的一条产品决策。

很多「AI 学习工具」的做法是：拍照 → AI 输出一份完美笔记 → 用户看完，忘了。  
用户本来是「应对 AI」，结果却在用 AI 替代自己想。

**本项目刻意把 AI 限制在「找关系」这一步，把「记住关系」完整地留给用户。**

|    | 谁来做    | 做什么                               |
| -- | ------ | --------------------------------- |
| 🔍 | **AI** | 识别「A 与 B 之间存在因果/对比/递进关系」，生成一句提示语  |
| 🧠 | **你**  | 判断这句话对不对，然后自己把它背下来 —— 这一步 AI 无法代劳 |

所以我们**没有**做「AI 一键生成学习笔记」，没有做「AI 帮你总结全文」，  
也没有做「AI 自动帮你复习」。

我们做的是：**把「哪两个知识点之间有值得背的关系」交给 AI，  
把「这条关系到底成不成立、要不要记住」交还给你。**

AI 是脚手架，不是替代品。拆掉脚手架之后留下来的东西，才是你真正记住的。

---

## 三、功能一览

### 知识组网（核心）

- 一本书的知识点自动组成关系网，**10 种关联类型**：因果、并列、对比、递进、归属、用途、方法、条件、举例、易混
- 每种关系有专属颜色、图标与**反向提示语模板** —— 关联是双向的，不只 A→B
- 前端按主题分区渲染，**孤立节点单独列出**（不悄悄混进列表假装已经组好了）
- 生成结果落库复用，同一本书不重复消耗额度

### 7 种记忆模式

掩码 / 关键词 / 首字 / 复述 / 听写 / 连线 / 闪卡 —— 同一个知识点换不同难度反复过，直到真的记住。

### 记忆算法

基于遗忘曲线的双份同步实现：前端 `memory-engine.js` 负责即时反馈，  
云端各云函数内的同名副本做权威判定并回写数据库。等级升降、下次复习时间都由它决定。

### 书库与内容

- **49 本全学段教材目录**：小学 → 高中 → 大学 → 考证 → 职场，289 个单元、1126 个知识点、21 个学科分类
- **7 本自编示范教材**（带完整正文）：细胞生物学、四级词汇、公务员常识、计算机基础、小学数学、高中化学、生活常识
- 用户可上传自己的资料，AI 解析成结构化知识点

### 其他

碎片上传与额度控制、AI 出题与批改、勋章墙与打卡日历、书籍分享、离线语音包与倍速朗读。  
21 个页面全部自定义导航，渐变色视觉体系 + 加载动画。

---

## 四、技术架构

```
┌──────────────── 小程序端（原生）────────────────┐
│  21 个页面 · 自定义 tabBar · 自定义导航栏（自绘返回键）  │
│  utils/memory-engine.js   记忆算法（即时反馈）          │
│  utils/book-catalog.js    49 本教材目录（1126 知识点）  │
│  utils/link-types.js      10 种关联类型（渲染侧）        │
│  data/ai-books/*.js       7 本自编教材（带正文）         │
└──────────────────────┬─────────────────────────┘
                       │ wx.cloud.callFunction
┌──────────────────────▼─────────────────────────┐
│           微信云开发 CloudBase（8 个云函数）           │
│                                                │
│  review ★    复习队列 / 判级升降 / 答题回写 / 打卡 / 知识组网 │
│  aiService   内置大模型：组网 / 技巧 / 易错 / 解析 / 出题 / TTS │
│  library     书库 / 详情 / 进度 / 领取                 │
│  login       登录建档 / 资料 / 学习统计                │
│  medal       勋章墙 / 打卡日历                        │
│  upload      额度控制 / 整本解析 / 投稿审核             │
│  admin       内容审核上架下架（管理员）                 │
│  share       书籍分享链接生成与读取                    │
│                                                │
│  cloud-shared/ ← 公共代码唯一来源，同步进各函数目录        │
└──────────────────────┬─────────────────────────┘
                       │
          云数据库（11 个集合）+ 云存储
```

---

## 五、目录结构

```
memorize-miniprogram/
├── miniprogram/                  # 小程序端
│   ├── app.json                  # 21 个页面 / 自定义 tabBar / navigationStyle: custom
│   ├── pages/                    # 21 个页面
│   │   ├── knowledge-map/        # ★ 知识组网（关系网渲染）
│   │   ├── memory-mode/          # 7 种记忆模式
│   │   ├── library/ book-detail/ # 书库与书籍详情
│   │   └── quiz/ review/ medals/ # 答题 / 复习 / 勋章
│   ├── utils/
│   │   ├── env.js                # ★ 环境 ID（换环境改这里）
│   │   ├── memory-engine.js      # ★ 记忆算法（与云端双份同步）
│   │   ├── book-catalog.js       # 49 本教材目录
│   │   ├── link-types.js         # ★ 10 种关联类型（与云端逐字一致）
│   │   ├── local-books.js        # ★ 离线包注册表（决定哪几本教材进包）
│   │   └── cloud.js              # callFunction 封装
│   ├── data/ai-books/            # 7 本自编教材（带正文）
│   └── styles/                   # 渐变体系 / 导航栏公共样式
├── cloudfunctions/               # 8 个云函数（各自带 common.js / prompts.js 副本）
├── cloud-shared/                 # ★ 公共代码唯一来源（不能放进 cloudfunctions/）
│   ├── common.js                 # ★ 额度 / 勋章 / 常量都在这里
│   ├── prompts.js                # ★ AI 提示词 + 10 种关联类型
│   ├── memory-engine.js          # ★ 记忆算法云端副本
│   └── ai-bridge.js              # cloud.ai() 封装
├── database/                     # 建库脚本 / 种子数据 / 导入工具
├── tools/                        # 自检脚本 + 部署脚本 + 工程化工具
├── docs/screenshots/             # 头标与小程序码
├── cloudbaserc.json              # ★ 云函数部署配置（含 envId）
└── project.config.json           # ★ 小程序 AppID 在这里
```

> ⚠️ `cloud-shared/` **必须**放在 `cloudfunctions/` 之外。  
> 开发者工具会把 `cloudfunctionRoot` 下每个子目录都当成一个云函数去上传 ——  
> 放进去就会被当成一个叫 `_shared` 的云函数，并上传失败。

---

## 六、从零跑起来（照着做）

> 全程约 30 分钟。**不想接后端也能先看效果**：直接导入项目编译即可，  
> 每个页面都写了演示数据兜底，云函数未部署时组网、答题、复习、勋章动画全部可见。

### 6.1 装工具（只需一次）

下载 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)（稳定版），  
用**小程序管理员微信**扫码登录 —— 用其他微信号登录会看不到云开发面板。

> 还需要 Node.js ≥ 18，但**只用于跑工程化脚本**，小程序本身不需要。

### 6.2 导入项目

开发者工具 → **导入项目** → 目录选本项目根目录 → 后端服务选 **「云开发」** → 导入。

> 🔴 **「后端服务选云开发」这步别漏**，这是游客模式和应用模式的区别。  
> 漏了会导致右键菜单里没有「上传并部署」选项。

### 6.3 改配置（换成你自己的）

这是**唯一需要你动手改代码的地方**，共 3 处：

**① 小程序 AppID** —— `project.config.json`

```json
{
  "appid": "wxxxxxxxxxxxxxxxxx",   ← 改成你的 AppID（或用「测试号」）
  "miniprogramRoot": "miniprogram/",
  "cloudfunctionRoot": "cloudfunctions/"
}
```

**② 云环境 ID** —— `miniprogram/utils/env.js`

```js
const ENV_ID = 'cloudbase-xxxxxxxxxxxxxxxxxx';   ← 改成你的环境 ID
const REGION = 'ap-shanghai';
```

**③ 部署配置里的 envId** —— `cloudbaserc.json`

```json
{
  "envId": "cloudbase-xxxxxxxxxxxxxxxxxx",   ← 同上
  "functionRoot": "cloudfunctions"
}
```

> ✅ **别手改**：换环境直接跑一条命令，它会自动改完这三处以及脚本里的默认值：
>
> ```bash
> node tools/switch-env.js <你的环境ID>
> ```

### 6.4 建数据库集合

云开发控制台 → **数据库** → 逐个新建这 **11 个**集合（名字必须完全一致）：

```
users        books        user_books    cards        questions
answers      checkins     user_medals   quota        networks
submissions
```

权限设置（很关键，配错会导致「书库看不到教材」）：

| 集合                                                                                                           | 权限               |
| ------------------------------------------------------------------------------------------------------------ | ---------------- |
| `books`                                                                                                      | **所有人可读，仅创建者可写** |
| `users` `cards` `questions` `answers` `checkins` `user_medals` `quota` `networks` `user_books` `submissions` | **仅创建者可读写**      |

> 教材是脚本导入的、没有 `_openid`，所以 `books` 必须所有人可读。  
> 详细的字段结构与索引建议见 **[database/README.md](database/README.md)**。

### 6.5 部署云函数

```bash
npx tcb login                          # 首次需登录
node cloudfunctions/sync-shared.js     # 先同步公共代码（必做）
bash tools/deploy.sh                   # 一键部署全部 8 个云函数
```

> 🔴 两件事别漏：
>
> 1. **必须先跑 `sync-shared.js`**，否则各云函数里的 `common.js` / `prompts.js` 副本是旧的。
> 2. **`--force` 必须带上**（`deploy.sh` 已默认处理）。不加的话同名函数会被**静默跳过**，  
>    表现为「部署成功但线上代码没变」。

不想用命令行的话，也可以在开发者工具里对 `cloudfunctions/` 下每个目录  
右键 → **「上传并部署：云端安装依赖」**。必须选「云端安装依赖」，  
选「本地安装依赖」会因云端没有 `node_modules` 而运行失败。

### 6.6 开通 AI 能力

云开发控制台 → **AI 能力** → 开通 **大模型调用**（免密钥）。

> 语音合成 TTS 与内容安全审核是**内置免开通**能力，控制台里没有这一项，别去找。  
> 不开也能跑，AI 相关功能会走本地兜底数据。

### 6.7 导入教材目录

```bash
node database/init-cloud.js
```

会导入 49 本教材、289 个单元、1126 个知识点。  
也可以手动：控制台 → `books` 集合 → 导入 → 选 `database/seed-books.json`。

### 6.8 给自己开管理员权限

用微信打开一次小程序（会自动建档）→ 控制台 → `users` 集合 →  
找到自己的记录 → 把 `role` 改成 `"admin"`。之后才能用 `admin` 云函数审核上架。

---

## 七、配置参考（想改数值看这里）

后端可调的东西集中在 **`cloud-shared/common.js`**，改完记得  
`node cloudfunctions/sync-shared.js` 再重新部署。

### 额度 `QUOTA`

```js
const QUOTA = {
  initialDailyParse: 100,   // 初始每日额度（上线建议改回 3）
  unlockSelfBookStreak: 3,  // 连续打卡几天解锁整本解析
  streakBonus: { 3: 5, 7: 10, 15: 20, 30: 50 },
  costPerBook: 5,           // 整本解析消耗
  costPerFragment: 1,       // 碎片文本解析消耗
  costPerImage: 0.1,        // 单张图片解析消耗
  maxImagesPerParse: 20,
  minImageCost: 0.5,        // 图片解析起步价
  maxDailyBonus: 50
};
```

> 🔴 **测试期免额度开关** `FREE_MODE = true` 就在这个文件里。  
> **上线前必须改成 `false`** —— 忘了改等于生产环境无限量白送 AI，云开发大模型是按量计费的。  
> 同时把 `initialDailyParse` 改回 `3`，然后重新部署 `upload` + `aiService` 两个云函数。

### 勋章 `MEDAL` / `MEDAL_DEFS`

同文件内，门槛与解锁条件都在这里，改完同上需同步 + 重新部署 `medal`。

### 记忆算法

⚠️ **两份必须同步修改**：

- 前端 `miniprogram/utils/memory-engine.js`
- 云端 `cloud-shared/memory-engine.js`

改完跑 `node tools/engine-parity.js` 校验一致性，否则会「前端显示升级、后端回滚」。

### AI 提示词

全部在 **`cloud-shared/prompts.js`**。10 种关联类型 `LINK_TYPES` 也在这里，  
⚠️ 它与前端 `miniprogram/utils/link-types.js` **必须逐字一致**  
（由 `tools/test-guard-link-types.js` 守住）。

---

## 八、真机自检（提交审核前必做）

微信开发者工具 → **预览** → 手机扫码，**逐项实际操作一次**，不要只看。

| #  | 检查项     | 通过标准                                      |
| -- | ------- | ----------------------------------------- |
| 1  | 启动登录    | 不白屏；Console 搜 `[memor]` 无登录失败             |
| 2  | **书库**  | 能看到 49 本教材且能进详情 ← **过了 = 集合权限改对了**        |
| 3  | 图片导入    | 选 2 张图，额度扣 0.2，生成的卡片内容与图片相关               |
| 4  | 聊天图片转发  | 微信聊天里长按图片 → 转发给本小程序 → 自动进入解析              |
| 5  | 复习出题    | 出现题目 → 选答案 → 立即显示对错 + 解析，掌握度环有变化          |
| 6  | 记忆页     | 环形进度正确，手动评级后卡片入库                          |
| 7  | 知识组网    | 节点能展开、关系线显示、点节点看到关联知识点                    |
| 8  | 勋章      | 已解锁/未解锁分组正确，打卡入口可用                        |
| 9  | AI 创作   | 选模板 → 生成结果有内容，不是空白                        |
| 10 | 语音朗读    | 任意卡片点朗读，**能听到声音**                         |
| 11 | 设置与隐私   | 隐私政策页能打开且内容完整                             |
| 12 | **返回键** | 书库/上传/复习/记忆/组网/勋章/碎片/AI 创作/设置/隐私 逐页测，都能返回 |

> 第 12 项最容易漏。本项目所有页面都是自定义导航（`navigationStyle: custom`），  
> 返回键是**自己画的**，漏一个就是审核被挑出来的把柄。

---

## 九、上传发布到微信

1. 开发者工具 → **上传** → 版本号 `1.0.0`，备注写清功能
2. 公众平台 → **版本管理** → 提交审核
3. 服务类目选 **教育 → 学习工具**
4. 等 1–3 个工作日 → 通过后点「发布」

> 提交前再确认一遍：**功能说明里要写「拍照识别 + 记忆复习」**，审核员真的会点进去看。  
> 另外注意 —— **备案和发布是两件事**：备案是小程序能存在的许可，发布是版本上线。

---

## 十、故障排查

| 现象                                         | 原因 / 怎么查                                                    |
| ------------------------------------------ | ----------------------------------------------------------- |
| 右键没有「上传并部署」                                | 导入时后端服务没选「云开发」，重导一次                                         |
| 部署报「未开通云开发」                                | 登录的微信不是小程序管理员                                               |
| 部署成功但首页还是演示数据                              | Console 看报错；常见是集合名拼错或 `review` 没部署成功                        |
| `ERR_CLOUDBASE_DATABASE_PERMISSION_DENIED` | 集合权限没设对，或数据是手动导入的（手动导入没有 `_openid`）                         |
| 书库看不到教材                                    | `books` 集合权限不是「所有人可读」                                       |
| AI 一直转圈                                    | AI 能力未开通，或额度耗尽                                              |
| 语音没声音                                      | 跑 `node tools/test-guard-tts-api.js` 查接口名，再看 `aiService` 日志 |
| 白屏                                         | Console 看语法错误、路径和文件名                                        |

```bash
node tools/ready.js                                        # 云端状态体检
tcb fn log login --env-id <你的环境ID>                      # 看云函数日志
bash tools/test-all.sh                                     # 跑全部自检
```

### 自检脚本

```bash
bash tools/test-all.sh     # 唯一可靠的汇总入口，当前 40 项全通过
```

> 🔴 **汇总必须用 shell，不能用 node 同进程跑**。各脚本会覆写 `global.wx` 且从不还原，  
> 同进程会互相污染 —— 代码一行没改测试却红了，排查方向被完全带偏。

---


## 十一、配套文档（按需查，不用通读）

前面第六到十节是完整的上手流程。以下是**遇到具体问题时**才需要翻的手册：

| 文档 | 什么时候看它 |
|---|---|
| [BACKEND_CONFIG.cn.md](BACKEND_CONFIG.cn.md) | 想改环境 ID、云函数清单、额度数值，或换到自己的云环境 |
| [DEPLOY_CHECKLIST.cn.md](DEPLOY_CHECKLIST.cn.md) | 部署前后逐项打勾，漏项了照它查 |
| [AGENT.md](AGENT.md) | 你在用 AI 智能体改这个项目 —— 约定、不变量、反复踩的坑都在这 |

> 🔴 **真机自检刻意不放在这个包里。** 微信小程序有一批问题只在真机上暴露
> （自定义导航返回键被压缩点不动、胶囊区放可点元素收不到点击、空列表页闪屏）。
> 它守的不变量已经写成规则记在 [AGENT.md](AGENT.md) 里，AI 和开发者读那份就够了。

---

## 十二、发布到 GitHub（可选）

这个仓库本身已经是干净的可公开状态（不含密钥、不含 `node_modules`）。

```bash
git init
git add .
git commit -m "feat: 咪猫爱背诵 v1.0"
git branch -M main
git remote add origin https://github.com/<用户名>/<仓库名>.git
git push -u origin main
```

> 网页上建仓库时，**「Add a README / .gitignore / license」三个勾都不要勾** ——
> 本地已经有了，勾了会造成冲突并被拒绝推送。

想让别人能一键下载，再发一个 Release：仓库页 → **Releases** → **Create a new release**
→ tag 填 `v1.0.0` → 把 zip 拖进「Attach binaries」。

---

## 十三、给 AI 看的文件 🤖

> **如果你想让 AI（Cursor / CodeBuddy / Claude / Copilot 等）帮你改这个项目，
> 让它先读这两个文件，能省掉大量重新摸索的时间：**
>
> - 中文：**[AGENT.md](AGENT.md)**
> - English：**[AGENT.en.md](AGENT.en.md)**
>
> 里面是给 AI 的高密度速览：关键路径、8 条不可违反的硬约束、数据结构、
> 云函数 action 清单、命令速查、以及「加教材 / 加学科 / 加关联类型」各自要动哪些文件。
>
> 另外两份规范文档也可以一并喂给它：
> - **[database/README.md](database/README.md)** —— 11 个集合的字段结构与权限
> - **[tools/EXPAND-RULES.md](tools/EXPAND-RULES.md)** —— 自编教材扩写的字段规范

---

## 十三、声明

- 本项目为**参赛 / 学习**用途开源，可自由学习与二次开发。
- 仓库内**不含任何密钥**。云环境 ID、AppID 均为项目公开标识，不含敏感凭据。
- 内置教材目录仅含**书目与知识点标题**（教学大纲级信息），不含受版权保护的教材正文；
  `data/ai-books/` 下的 7 本为**自编示范内容**，可自由使用。
- 直接运行时请使用**你自己的**小程序 AppID 与云开发环境。

## License

[MIT](LICENSE)

<div align="center">
<sub>2026 微信小程序开发大赛 · 主题「与 AI 共生」</sub>
</div>
