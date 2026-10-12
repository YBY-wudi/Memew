# 咪猫爱背诵 · 云数据库设计

> 集合命名全部小写下划线。`_openid` 由云开发自动注入，前端不可见，用于数据隔离。

## 一、集合总览

| 集合名 | 用途 | 关键索引 |
|---|---|---|
| `users` | 用户档案与统计 | `_openid`(唯一) |
| `books` | 书籍（官方 + 用户共创） | `official+status`、`subject`、`_openid+status` |
| `user_books` | 用户领书与学习进度 | `_openid+bookId`(唯一) |
| `cards` | 记忆卡片（知识点的最小复习单位） | `_openid+level`、`_openid+nextReviewDate`、`bookId` |
| `questions` | 题库 | `_openid+cardId`、`wrongCount` |
| `answers` | 答题流水 | `_openid+date`、`cardId` |
| `checkins` | 每日打卡 | `_openid+date`(唯一) |
| `user_medals` | 勋章解锁记录 | `_openid+key`(唯一) |
| `quota` | 每日额度消耗 | `_openid+date`(唯一) |
| `networks` | 知识组网树 | `_openid+cardId` |
| `submissions` | 用户提交审核记录 | `_openid`、`bookId` |

---

## 二、集合结构

### 1. `users` —— 用户档案

```json
{
  "_openid": "自动注入",
  "nickname": "小程",
  "avatarUrl": "cloud://xxx/avatars/1.png",
  "target": "考研",
  "role": "user",

  "dailyGoal": 20,
  "voiceMode": "warm",
  "maskRatio": 0.5,
  "animationOn": true,
  "showReviewPopupOnLaunch": true,

  "streak": 0,
  "longestStreak": 0,
  "lastCheckDate": "2026-03-15",
  "totalMinutes": 0,
  "totalAnswered": 0,
  "totalRight": 0,
  "totalWrong": 0,
  "totalReviews": 0,
  "streakRightNoWrong": 0,

  "selfBookUnlocked": false,
  "createdBooks": 0,
  "points": 0,

  "createdAt": 0,
  "updatedAt": 0
}
```

### 2. `books` —— 书籍（官方预制 + 用户共创）

```json
{
  "_openid": "用户共创时有值，官方为空",
  "title": "普通高中教科书·生物学 必修第一册",
  "subject": "生物",
  "edition": "人教版",
  "publisher": "人民教育出版社",
  "intro": "官方预制教材",
  "cover": "",
  "official": true,
  "status": "published",
  "tags": ["人教版", "必修"],
  "author": "平台官方",
  "hot": 0,
  "pointCount": 320,
  "questionCount": 480,
  "rejectReason": "",

  "units": [
    {
      "index": 1,
      "title": "第一单元 走近细胞",
      "sections": [
        {
          "index": 1,
          "title": "第 1 节 细胞的生命历程",
          "points": ["考点一", "考点二"],
          "mustScore": ["必背得分点"],
          "outline": ["背诵提纲"],
          "skeleton": ["骨架节点"],
          "mnemonic": "口诀",
          "analogy": "趣味类比",
          "errors": ["易错点"],
          "questions": [
            { "type": "choice", "stem": "题干", "options": [], "answer": "A", "explain": "解析", "tip": "贴士" }
          ]
        }
      ]
    }
  ],
  "dailyPlan": [
    { "day": 1, "title": "第 1 天", "sections": ["第一单元 第 1 节"], "taskCount": 3 }
  ],

  "createdAt": 0,
  "updatedAt": 0
}
```

> `status` 枚举：`pending` 待审核 / `published` 已上架 / `rejected` 已驳回 / `offline` 已下架。
> 官方书库查询条件：`official: true` **且** `status: "published"`。

### 3. `user_books` —— 用户领书与进度

```json
{
  "_openid": "",
  "bookId": "",
  "progress": 0,
  "doneMap": { "0": true, "1": false },
  "createdAt": 0,
  "updatedAt": 0
}
```

### 4. `cards` —— 记忆卡片（核心）

```json
{
  "_openid": "",
  "title": "光合作用的两大阶段",
  "content": "光反应：水的光解、ATP 与 NADPH 的生成……",
  "subject": "生物",
  "bookId": "",
  "bookTitle": "",
  "unit": "第三单元",
  "section": "第 5 节",

  "level": "A",
  "strength": 45,
  "userMark": "normal",
  "history": { "right": 0, "wrong": 1, "guess": 0, "streakRight": 0, "total": 1 },

  "lastReviewDate": "2026-03-14",
  "nextReviewDate": "2026-03-16",
  "nextReviewTag": "隔天穿插",

  "tags": [],
  "analogy": "",
  "mnemonic": "",
  "fromNetwork": false,
  "source": "ai",

  "createdAt": 0,
  "updatedAt": 0
}
```

**字段约束（由云函数维护，前端只读）**
- `level` ∈ `S | A | B | C`
- `userMark` ∈ `key`（重点）| `normal`（普通）| `skip`（免记）
- `strength` ∈ 0–100
- `nextReviewDate` 格式 `YYYY-MM-DD`

### 5. `questions` —— 题库

```json
{
  "_openid": "",
  "cardId": "",
  "bookId": "",
  "subject": "",
  "type": "choice",
  "category": "理解辨析",
  "stem": "题干",
  "options": ["A 项", "B 项", "C 项", "D 项"],
  "answer": "A",
  "explain": "解析",
  "tip": "记忆小贴士",
  "wrongCount": 0,
  "lastAnswer": true,
  "createdAt": 0
}
```

### 6. `answers` —— 答题流水

```json
{
  "_openid": "",
  "cardId": "",
  "questionId": "",
  "isRight": true,
  "answerType": "correct",
  "cost": 8.5,
  "date": "2026-03-15",
  "createdAt": 0
}
```

> `answerType` ∈ `correct | wrong | guess_right | timeout_right | multi_wrong | first_right`

### 7. `checkins` —— 每日打卡

```json
{ "_openid": "", "date": "2026-03-15", "bookId": "", "doneMap": {}, "createdAt": 0, "updatedAt": 0 }
```

### 8. `user_medals` —— 勋章解锁

```json
{ "_openid": "", "key": "streak_7", "type": "streak", "unlockedAt": 0 }
```

### 9. `quota` —— 每日额度

```json
{ "_openid": "", "date": "2026-03-15", "used": 2, "createdAt": 0 }
```

### 10. `networks` —— 知识组网

```json
{
  "_openid": "",
  "cardId": "",
  "bookId": "",
  "tree": { "name": "根节点", "children": [] },
  "createdAt": 0
}
```

### 11. `submissions` —— 提交审核记录

```json
{ "_openid": "", "bookId": "", "title": "", "subject": "", "status": "pending", "reason": "", "createdAt": 0, "reviewedAt": 0 }
```

---

## 三、权限规则

| 集合 | 权限 | 说明 |
|---|---|---|
| `users` | **仅创建者可读写** | 集合权限设为「自定义安全规则」：`doc._openid == auth.openid` |
| `books` | **仅创建者可写，所有人可读** | 读：`true`；写：`doc._openid == auth.openid` |
| 其余集合 | **仅创建者可读写** | 同 `users` |

⚠️ 小程序端**不直接读数据库**，全部经云函数访问。集合权限仍建议设为「仅创建者可读写」作为双保险。

---

## 四、创建步骤（微信开发者工具）

1. 打开项目 → 点击工具栏 **云开发** → 开通环境，记下**环境 ID**
2. 进入 **数据库** → 逐个新建上表 12 个集合
3. 每个集合右上角 **权限设置** → 选「仅创建者可读写」
4. `users`、`books` 建索引：

**`users`**
- 索引名 `openid`，字段 `_openid`，唯一索引

**`books`**
- 复合索引 `official_status`：字段 `official`（升序）+ `status`（升序）
- 复合索引 `openid_status`：字段 `_openid`（升序）+ `status`（升序）
- 单字段索引 `subject`

**`cards`**
- 复合索引 `openid_level`：`_openid` + `level`
- 复合索引 `openid_next`：`_openid` + `nextReviewDate`
- 单字段索引 `bookId`

**`user_books` / `quota` / `checkins` / `user_medals`**
- 复合索引 `openid_key`：`_openid` + `bookId`（或 `date` / `key`），**唯一索引**

**`questions`**
- 复合索引 `openid_card`：`_openid` + `cardId`
- 单字段索引 `wrongCount`

5. `users` 集合里找到自己的记录（先在小程序里打开一次会自动建档），把 `role` 改为 `"admin"`，即可使用管理端审核。

---

## 五、初始化种子数据（可选）

在云开发控制台 → 数据库 → 集合 `books` → 导入 JSON，可先放入 6 本官方教材作为书库初始内容：

```json
[
  { "title": "普通高中教科书·生物学 必修第一册", "subject": "生物", "edition": "人教版", "official": true, "status": "published", "hot": 100, "tags": ["人教版", "必修"] },
  { "title": "普通高中教科书·生物学 必修第二册", "subject": "生物", "edition": "人教版", "official": true, "status": "published", "hot": 96, "tags": ["人教版", "必修"] },
  { "title": "普通高中教科书·化学 必修第一册", "subject": "化学", "edition": "人教版", "official": true, "status": "published", "hot": 92, "tags": ["人教版", "必修"] },
  { "title": "义务教育教科书·道德与法治 八年级上册", "subject": "政治", "edition": "部编版", "official": true, "status": "published", "hot": 88, "tags": ["部编版", "初中"] },
  { "title": "普通高中教科书·历史 必修中外历史纲要（上）", "subject": "历史", "edition": "统编版", "official": true, "status": "published", "hot": 84, "tags": ["统编版", "高中"] },
  { "title": "考研英语核心词汇 1575", "subject": "考研", "edition": "", "official": true, "status": "published", "hot": 99, "tags": ["考研", "词汇"] }
]
```

`units` / `dailyPlan` 字段可后续用管理脚本批量补齐，或直接在 `admin` 云函数里扩展一个 `seed` action 自动生成。
