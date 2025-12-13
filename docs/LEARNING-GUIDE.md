# XKTRUCK 项目学习指南

> 快速理解项目核心概念，无需深入技术细节

本文档帮助你理解项目中的关键概念，以便更好地维护和使用系统。

---

## 📚 目录

1. [项目架构概览](#项目架构概览)
2. [静态资源存储](#静态资源存储)
3. [AI 与向量搜索](#ai-与向量搜索)
4. [数据库基础](#数据库基础)
5. [SEO 基础知识](#seo-基础知识)
6. [常用操作速查](#常用操作速查)

---

## 项目架构概览

### 整体架构

```
用户访问网站 → Cloudflare Pages（前端）
     ↓
用户发起请求 → Cloudflare Workers（API）
     ↓
数据存储/查询 → Supabase（数据库）
     ↓
AI 对话/邮件 → DeepSeek / Resend（外部服务）
```

### 项目结构

| 目录 | 作用 |
|------|------|
| `xk-truck-frontend/` | 网站前端，用 Astro 框架 |
| `xk-truck-worker/` | API 后端，运行在 Cloudflare Workers |
| `docs/` | 项目文档 |

---

## 完整代码目录结构

### 前端项目 (xk-truck-frontend)

```
xk-truck-frontend/
├── .env.example              # 环境变量示例文件
├── astro.config.mjs          # Astro 框架配置（构建、插件等）
├── package.json              # 项目依赖和脚本
├── tsconfig.json             # TypeScript 配置（提供类型检查和智能提示）
│
├── public/                   # 静态资源（直接复制到输出目录）
│   ├── favicon.svg          # 网站图标
│   ├── robots.txt           # 搜索引擎爬虫规则
│   └── images/              # 图片资源
│
└── src/                      # 源代码目录
    │
    ├── components/           # 可复用组件
    │   ├── ChatWidget.astro # AI 聊天窗口组件（含前端交互逻辑）
    │   ├── Header.astro     # 网站顶部导航栏
    │   └── Footer.astro     # 网站底部信息栏
    │
    ├── layouts/              # 页面布局模板
    │   ├── Layout.astro     # 主站通用布局（包含 SEO meta 标签）
    │   └── AdminLayout.astro # 管理后台布局
    │
    ├── pages/                # 页面文件（文件路径 = URL 路径）
    │   ├── index.astro      # 首页 (/)
    │   ├── about.astro      # 关于我们 (/about)
    │   ├── contact.astro    # 联系我们 (/contact)
    │   │
    │   ├── products/        # 产品相关页面
    │   │   ├── index.astro  # 产品列表页 (/products)
    │   │   └── [id].astro   # 产品详情页 (/products/:id)，动态路由
    │   │
    │   ├── blog/            # 博客相关页面
    │   │   ├── index.astro  # 博客列表页 (/blog)
    │   │   └── [...slug].astro # 博客详情页 (/blog/*)，动态路由
    │   │
    │   └── admin/           # 管理后台页面
    │       ├── index.astro       # 后台首页/登录 (/admin)
    │       ├── dashboard.astro   # 数据仪表盘 (/admin/dashboard)
    │       ├── inquiries.astro   # 询盘管理 (/admin/inquiries)
    │       ├── products.astro    # 产品管理 (/admin/products)
    │       ├── conversations.astro # 对话记录 (/admin/conversations)
    │       ├── settings.astro    # 系统设置 (/admin/settings)
    │       └── whatsapp.astro    # WhatsApp 管理 (/admin/whatsapp)
    │
    ├── content/              # 内容集合（Markdown 文章）
    │   ├── config.ts        # ⭐ 内容集合 schema 定义（TypeScript）
    │   │                    #    定义博客文章的数据结构验证
    │   └── blog/            # 博客文章（Markdown 格式）
    │       ├── european-truck-parts-sourcing-china.md
    │       ├── how-to-choose-truck-headlamps.md
    │       └── truck-mirror-maintenance-tips.md
    │
    ├── lib/                  # 工具库
    │   └── supabase.ts      # ⭐ Supabase 客户端（TypeScript）
    │                        #    前端数据库操作 + 类型定义（Product、Brand 等）
    │
    └── styles/               # 样式文件
        └── global.css       # 全局样式（TailwindCSS 导入）
```

### 后端项目 (xk-truck-worker)

```
xk-truck-worker/
├── package.json              # 项目依赖
├── wrangler.toml             # Cloudflare Workers 部署配置
├── README.md                 # 后端说明文档
│
├── sql/                      # 数据库 SQL 脚本
│   ├── create_tables.sql    # 基础表结构（产品、品牌、询盘等）
│   ├── knowledge-base.sql   # 知识库表和全文搜索索引
│   └── whatsapp-tables.sql  # WhatsApp 相关表
│
└── src/                      # 源代码目录
    │
    ├── index.js              # ⭐ API 入口文件（路由分发）
    │                         #    所有请求从这里进入，根据 URL 分发到对应 handler
    │
    ├── handlers/             # 请求处理器（业务逻辑）
    │   ├── chat.js          # AI 对话处理
    │   │                    #   - /api/chat: 普通对话
    │   │                    #   - /api/chat/stream: 流式对话
    │   │
    │   ├── inquiry.js       # 询盘表单处理
    │   │                    #   - /api/inquiry: 提交询盘
    │   │                    #   - 自动发送邮件通知
    │   │
    │   ├── admin.js         # 管理后台 API
    │   │                    #   - /api/admin/inquiries: 询盘列表
    │   │                    #   - /api/admin/stats: 统计数据
    │   │
    │   ├── settings.js      # 系统设置 API
    │   │                    #   - /api/settings: 获取/更新设置
    │   │                    #   - AI 开关、提示词配置等
    │   │
    │   ├── knowledge-learn.js # 知识库学习
    │   │                    #   - 从对话中提取知识
    │   │                    #   - 知识审核和入库
    │   │
    │   └── whatsapp.js      # WhatsApp 集成
    │                        #   - Webhook 接收消息
    │                        #   - 自动回复处理
    │
    └── lib/                  # 工具库（封装外部服务调用）
        ├── supabase.js      # Supabase 数据库操作
        │                    #   - 查询/插入/更新数据
        │                    #   - 全文搜索
        │
        ├── deepseek.js      # DeepSeek AI 调用
        │                    #   - Chat API（对话生成）
        │                    #   - 流式响应处理
        │
        ├── embedding.js     # 文本向量化
        │                    #   - 调用 DeepSeek Embedding API
        │                    #   - 将文本转为 1024 维向量
        │
        ├── vectorize.js     # Cloudflare Vectorize 操作
        │                    #   - 向量插入
        │                    #   - 相似度搜索
        │
        └── email.js         # Resend 邮件发送
                             #   - 询盘通知邮件
                             #   - 对话通知邮件
```

### 文档目录 (docs)

```
docs/
├── README.md                 # 项目总体介绍
├── DEPLOYMENT.md             # 部署和运维指南
├── AI-PROMPTS.md             # AI 提示词配置说明
└── LEARNING-GUIDE.md         # 本学习指南
```

---

## 静态资源存储

### 为什么需要两个存储位置？

项目的静态资源分别存储在两个地方，各有用途：

| 存储位置 | 存储内容 | 特点 | 原因 |
|---------|---------|------|------|
| **Cloudflare R2** | 产品图片、品牌 Logo | 数量多、体积大 | 动态更新，通过脚本上传 |
| **Cloudflare Pages** | 网站图标、OG 图片 | 数量少、固定 | 随代码一起部署 |

### Cloudflare R2 对象存储

**什么是 R2？**

R2 是 Cloudflare 的对象存储服务，类似 AWS S3，但**出站流量完全免费**。

**项目配置：**
- **存储桶名称**：`xktruck-images`
- **访问域名**：`images.xk-truck.cn`（计划配置）
- **免费额度**：10GB 存储 / 月（目前约 175MB，远低于限制）

**存储结构：**
```
xktruck-images/
├── products/              # 产品图片（从 xklamp.com 同步）
│   ├── volvo-fh4-led-headlamp-abc123.jpg
│   ├── scania-r-series-mirror-def456.jpg
│   └── ...
├── brands/                # 品牌 Logo
│   ├── volvo.svg
│   ├── scania.svg
│   └── ...
└── categories/            # 分类图片
    ├── headlamps.jpg
    └── ...
```

**如何上传图片到 R2？**

通过产品同步脚本自动上传：

```bash
cd xk-truck-frontend
npm run sync:products
```

脚本会：
1. 从 xklamp.com 爬取产品数据
2. 下载产品图片
3. 上传到 R2 存储桶
4. 将图片 URL 保存到 Supabase 数据库

**访问图片：**
```
https://images.xk-truck.cn/products/volvo-headlamp.jpg
```

### Cloudflare Pages 静态资源

**什么是 Pages？**

Cloudflare Pages 是静态网站托管服务，类似 Netlify 或 Vercel。

**存储位置：**
```
xk-truck-frontend/public/
├── favicon.svg           # 网站图标（浏览器标签页显示）
├── robots.txt            # 搜索引擎爬虫规则
└── images/
    ├── og-image.svg      # 社交分享预览图（待替换为 .jpg）
    ├── logo.png          # 网站 Logo
    └── apple-touch-icon.png  # iPhone 添加到主屏幕的图标
```

**部署方式：**

推送代码到 GitHub 后，Cloudflare Pages 自动构建和部署：

```bash
git add -A
git commit -m "update images"
git push
```

**访问方式：**
```
https://xk-truck.cn/favicon.svg
https://xk-truck.cn/images/logo.png
```

### 两种存储的对比

| 对比项 | Cloudflare R2 | Cloudflare Pages |
|--------|---------------|------------------|
| **用途** | 动态内容（产品图片） | 静态内容（网站资源） |
| **更新方式** | 脚本上传 | 代码部署 |
| **数量** | 数百张（可扩展） | 几张（固定） |
| **访问域名** | `images.xk-truck.cn` | `xk-truck.cn` |
| **费用** | 10GB 免费 | 无限流量免费 |

### 配置 R2 的步骤

如果需要重新配置 R2，按以下步骤操作：

1. **创建存储桶**
   - 登录 Cloudflare Dashboard → R2 Object Storage
   - 创建存储桶：`xktruck-images`

2. **配置公开访问**
   - 进入存储桶设置 → Public access
   - 绑定自定义域名：`images.xk-truck.cn`

3. **创建 API Token**
   - R2 → Manage R2 API Tokens
   - 权限：Object Read & Write
   - 保存 Access Key ID 和 Secret Access Key

4. **配置环境变量**
   ```bash
   # 在 .env 文件中添加
   R2_ACCOUNT_ID=4f2c0fb4069b0066d6158069fd309fb3
   R2_ACCESS_KEY_ID=your_access_key
   R2_SECRET_ACCESS_KEY=your_secret_key
   R2_BUCKET_NAME=xktruck-images
   R2_PUBLIC_DOMAIN=images.xk-truck.cn
   ```

详细配置指南见：`xk-truck-frontend/scripts/R2-SETUP.md`

### 常见问题

**Q: 为什么不把所有图片都放在 Pages？**

A: Pages 适合小文件，产品图片数量多（数百张），会让代码仓库变得很大，构建和部署变慢。

**Q: R2 收费吗？**

A: 免费额度 10GB 存储 + 无限出站流量，对于中小型网站完全够用。

**Q: 如何删除 R2 中的图片？**

A: 登录 Cloudflare Dashboard → R2 → 选择存储桶 → 手动删除，或使用 API 批量删除。

---

## AI 与向量搜索

### 什么是向量搜索？

**传统搜索的问题：**

传统搜索靠关键词匹配，只能找到完全相同的词：
- 搜索"大灯"找不到"headlamp"
- 搜索"VOLVO"找不到"沃尔沃"
- 搜索"价格"找不到"how much"

**向量搜索的原理：**

向量搜索靠**语义理解**，把文字转成数字（向量），意思相近的文字数字也相近。

**举例说明：**

想象每个词都是空间中的一个点，意思相近的词距离很近：

```
"VOLVO headlamp" → [0.12, -0.45, 0.78, ...]  (1024个数字)
"沃尔沃大灯"     → [0.11, -0.44, 0.79, ...]  ← 距离很近！
"truck mirror"   → [0.67, 0.23, -0.12, ...]  ← 距离很远
```

**为什么是 1024 个数字？**

这是 DeepSeek Embedding 模型的输出维度，每个维度代表文本的一个"特征"：
- 第 1 维可能代表"是否与汽车相关"
- 第 2 维可能代表"是否与照明相关"
- 第 3 维可能代表"语言类型"
- ... 共 1024 个维度

**相似度计算：**

使用余弦相似度（Cosine Similarity）计算两个向量的相似程度：

```
相似度 = cos(θ) = A·B / (|A| × |B|)

结果范围：-1 到 1
- 1.0  = 完全相同
- 0.8  = 非常相似（项目中的阈值）
- 0.5  = 有些相关
- 0.0  = 完全无关
- -1.0 = 完全相反
```

**实际例子：**

```
用户问："VOLVO FH4 的大灯多少钱？"
  ↓ 转成向量
[0.15, -0.42, 0.81, ...]
  ↓ 在知识库中搜索相似向量
  
知识库中的条目：
1. "VOLVO FH4 headlamp price" → 相似度 0.92 ✅ 很相关
2. "SCANIA headlamp price"    → 相似度 0.75 ✅ 相关
3. "VOLVO mirror installation" → 相似度 0.45 ❌ 不太相关
4. "Payment methods"           → 相似度 0.12 ❌ 无关

返回前 3 条（相似度 > 0.7）
```

### RAG 是什么？

RAG = Retrieval-Augmented Generation（检索增强生成）

简单说就是：**先搜知识库，再让 AI 回答**

**为什么需要 RAG？**

```
❌ 没有 RAG（AI 直接回答）
用户："VOLVO FH4 大灯多少钱？"
  ↓
AI："根据我的知识，VOLVO 大灯大约 $100-$300..."
  ↑ 问题：AI 可能瞎编，价格不准确

✅ 有 RAG（先搜索，再回答）
用户："VOLVO FH4 大灯多少钱？"
  ↓
1. 搜索知识库
   找到："VOLVO FH4 LED headlamp: $180, Halogen: $120"
  ↓
2. 把知识告诉 AI
   "根据以下信息回答：VOLVO FH4 LED headlamp: $180..."
  ↓
3. AI 基于真实信息回答
   "我们的 VOLVO FH4 大灯有两种：LED 款 $180，卤素款 $120"
  ↑ 准确！基于真实数据
```

**RAG 的三个步骤：**

```
┌─────────────────────────────────────────────────────────┐
│ 1. Retrieval（检索）                                     │
│    用户问题 → 向量搜索 → 找到相关知识                    │
│                                                          │
│    "VOLVO 大灯价格？"                                     │
│         ↓ 转成向量                                       │
│    [0.15, -0.42, ...]                                   │
│         ↓ 搜索                                           │
│    找到 3 条相关知识                                      │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 2. Augmented（增强）                                     │
│    把知识加入提示词                                       │
│                                                          │
│    系统提示：你是 XKTRUCK 客服...                         │
│    知识库：                                               │
│      - VOLVO FH4 LED headlamp: $180                     │
│      - VOLVO FH4 Halogen headlamp: $120                 │
│      - All headlamps include 1-year warranty            │
│    用户问题：VOLVO 大灯多少钱？                           │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 3. Generation（生成）                                    │
│    AI 基于知识生成回答                                    │
│                                                          │
│    "我们的 VOLVO FH4 大灯有两种选择：                     │
│     - LED 款：$180                                       │
│     - 卤素款：$120                                       │
│     所有大灯都包含 1 年质保。"                            │
└─────────────────────────────────────────────────────────┘
```

**RAG vs 传统 AI 对比：**

| 对比项 | 传统 AI | RAG |
|--------|---------|-----|
| **数据来源** | 训练数据（可能过时） | 实时知识库（最新） |
| **准确性** | 可能瞎编 | 基于真实数据 |
| **可控性** | 难以控制 | 可以更新知识库 |
| **成本** | 需要重新训练 | 只需更新知识库 |
| **适用场景** | 通用问题 | 专业领域（产品、价格等） |

**项目中的 RAG 实现：**

```javascript
// 1. 检索（Retrieval）
const knowledgeContext = await queryKnowledgeBase(env, "VOLVO headlamp price", 3);
// 返回：[
//   { content: "VOLVO FH4 LED: $180", score: 0.92 },
//   { content: "VOLVO FH4 Halogen: $120", score: 0.88 },
//   { content: "All headlamps: 1-year warranty", score: 0.75 }
// ]

// 2. 增强（Augmented）
const prompt = `
系统提示：你是 XKTRUCK 客服...

知识库内容：
${knowledgeContext.map(k => k.content).join('\n')}

对话历史：
${history.map(h => `${h.role}: ${h.message}`).join('\n')}

用户问题：
${userMessage}
`;

// 3. 生成（Generation）
const aiReply = await callDeepSeekAPI(prompt);
// AI 基于知识库生成准确回答
```

这样 AI 的回答更准确，不会瞎编，而且可以随时更新知识库！

### 项目中的 AI 完整流程

```
1. 用户提问："VOLVO 大灯多少钱？"
   ↓
   
2. 提取英文关键词（多语言支持）
   "VOLVO 大灯" → "VOLVO headlamp price"
   ↓
   
3. 向量搜索（Vectorize）
   将关键词转成向量 → 在知识库中搜索相似内容
   ↓ 找到 2 条相关知识（相似度 > 0.7）
   
4. 如果向量搜索失败或结果太少
   ↓ 回退到全文搜索（Supabase）
   使用 PostgreSQL 的全文搜索功能
   ↓
   
5. 构建 AI 提示词
   系统提示词 + 知识库内容 + 对话历史 + 用户问题
   ↓
   
6. 调用 DeepSeek AI 生成回答
   AI 基于提供的知识库内容回答，不会瞎编
   ↓
   
7. 返回回答给用户
   ↓
   
8. 【可选】自动学习
   如果这次没用到知识库（新问题），保存问答对
```

**详细说明每一步：**

**步骤 2：提取关键词**
```javascript
// 用户输入中文，AI 提取英文关键词
用户："沃尔沃 FH4 的大灯多少钱？"
  ↓ extractSearchKeywords()
关键词："VOLVO FH4 headlamp price"

// 为什么要提取英文？
// 因为知识库主要是英文，英文搜索效果更好
```

**步骤 3：向量搜索**
```javascript
// 1. 将关键词转成向量
"VOLVO FH4 headlamp price" 
  ↓ DeepSeek Embedding API
[0.15, -0.42, 0.81, ..., 0.23]  // 1024 个数字

// 2. 在 Vectorize 中搜索
Vectorize.query(vector, topK=3)
  ↓ 返回最相似的 3 条
[
  { content: "Q: VOLVO headlamp price?\nA: ...", score: 0.92 },
  { content: "Q: FH4 parts pricing?\nA: ...", score: 0.85 },
  { content: "Q: Headlamp installation?\nA: ...", score: 0.73 }
]

// 3. 过滤低分结果
只保留 score >= 0.7 的结果
```

**步骤 4：全文搜索兜底**
```sql
-- 如果向量搜索失败，使用 PostgreSQL 全文搜索
SELECT content, metadata 
FROM knowledge_base
WHERE to_tsvector('english', content) 
      @@ to_tsquery('english', 'VOLVO & headlamp & price')
LIMIT 3;
```

**步骤 5：构建提示词**
```javascript
// 组合所有信息给 AI
const prompt = `
系统提示词：
你是 XKTRUCK 的客服，专业、友好...

知识库内容：
Q: VOLVO headlamp price?
A: Our VOLVO headlamps range from $50-$200...

Q: FH4 parts pricing?
A: FH4 parts pricing depends on...

对话历史：
User: 你们有 VOLVO 配件吗？
Assistant: 是的，我们有全系列 VOLVO 配件...

当前问题：
User: VOLVO 大灯多少钱？
`;

// AI 基于这些信息生成回答
```

**步骤 8：自动学习**
```javascript
// 如果这次回答没用到知识库（说明是新问题）
if (knowledgeContext.length === 0) {
  // 保存问答对到知识库
  saveToKnowledgeBase(
    question: "VOLVO 大灯多少钱？",
    answer: "我们的 VOLVO 大灯价格在 $50-$200...",
    metadata: { source: 'auto_learn', sessionId: '...' }
  );
  
  // 下次有人问类似问题，就能直接找到答案了
}
```

### 知识库管理

知识库数据存在两个地方：
- **Supabase**：存原始文本（可以编辑）
- **Vectorize**：存向量索引（用于搜索）

添加知识时两边都要存，搜索时优先用 Vectorize。

### 知识库学习机制详解

**核心概念：对话记录 ≠ 知识库**

```
对话记录（conversations 表）
  ↓ 所有对话都会保存
  ↓ 用于显示对话历史、管理后台查看
  ↓ 但不会用于回答新问题
  ↓
【可选】自动学习或人工审核
  ↓ 筛选高质量问答对
  ↓ 审核通过
  ↓
知识库（knowledge_base 表）
  ↓ 只有高质量的问答对
  ↓ 用于 AI 回答新问题
  ↓ 存储在 Supabase + Vectorize
```

**为什么要分开？**

1. **质量控制**：不是所有对话都适合作为知识
   - 有些问题太具体（"我的订单 #12345 在哪？"）
   - 有些回答不完整或有错误
   - 有些是闲聊（"你好"、"谢谢"）

2. **性能优化**：对话记录可能有几万条，知识库只需几百条精华

3. **可维护性**：知识库可以人工编辑、更新、删除

**自动学习的工作原理：**

```javascript
// 场景 1：用户问了新问题
用户："VOLVO FH16 的后视镜支持加热吗？"
  ↓ 向量搜索知识库
  ↓ 没找到相关知识（knowledgeContext.length === 0）
  ↓ AI 基于通用知识回答
AI："是的，我们的 VOLVO FH16 后视镜支持加热功能..."
  ↓ 
  ↓ 自动学习触发（如果开启）
  ↓
保存到知识库：
{
  question: "VOLVO FH16 的后视镜支持加热吗？",
  answer: "是的，我们的 VOLVO FH16 后视镜支持加热功能...",
  metadata: {
    source: "auto_learn",
    sessionId: "abc123",
    learned_at: "2025-12-13T10:30:00Z"
  }
}
  ↓ 同时转成向量存入 Vectorize
  ↓
下次有人问类似问题，就能直接找到这个答案了！

// 场景 2：用户问了已知问题
用户："VOLVO 大灯多少钱？"
  ↓ 向量搜索知识库
  ↓ 找到相关知识（knowledgeContext.length > 0）
  ↓ AI 基于知识库回答
AI："我们的 VOLVO 大灯价格在 $50-$200..."
  ↓
  ↓ 不触发自动学习（已有知识）
  ↓
只保存对话记录，不加入知识库
```

**自动学习的优缺点：**

**优点：**
- ✅ 知识库自动扩充，越用越聪明
- ✅ 无需人工干预，节省时间
- ✅ 能快速覆盖常见问题

**缺点：**
- ❌ 可能学到错误答案（AI 偶尔会出错）
- ❌ 可能学到不通用的问题（"我的订单在哪？"）
- ❌ 需要定期清理低质量知识

**建议配置：**

```javascript
// 初期：关闭自动学习，人工审核
{
  "ai_enabled": true,
  "auto_learn_enabled": false  // 关闭
}
// 好处：保证知识库质量
// 操作：定期在管理后台审核对话，手动添加优质问答

// 稳定期：开启自动学习，定期检查
{
  "ai_enabled": true,
  "auto_learn_enabled": true  // 开启
}
// 好处：快速扩充知识库
// 操作：每周检查新增知识，删除不合适的
```

**人工审核流程：**

```
1. 管理员登录后台
   ↓
2. 查看待审核对话
   GET /api/knowledge/pending
   ↓ 返回最近的 AI 对话
   
3. 逐条审核
   - 查看用户问题
   - 查看 AI 回答
   - 判断是否适合加入知识库
   ↓
   
4. 批准或拒绝
   POST /api/knowledge/review
   {
     "conversationId": "uuid",
     "approved": true,  // 或 false
     "question": "用户问题（可编辑）",
     "answer": "AI回答（可编辑）"
   }
   ↓
   
5. 批准后自动加入知识库
   - 保存到 Supabase
   - 转成向量存入 Vectorize
   - 标记对话为"已审核"
```

**手动添加知识：**

```bash
# 直接添加知识条目（不需要对话）
curl -X POST https://your-worker.workers.dev/api/knowledge/add \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What is your MOQ?",
    "answer": "Our minimum order quantity is 5-10 pieces for most items.",
    "metadata": {
      "category": "faq",
      "source": "manual"
    }
  }'
```

**数据表说明：**

| 数据表 | 作用 | 是否是知识库 |
|--------|------|-------------|
| `conversations` | 网站 AI 客服对话记录 | ❌ 否，只是记录 |
| `whatsapp_conversations` | WhatsApp 对话会话 | ❌ 否，只是记录 |
| `whatsapp_messages` | WhatsApp 消息记录 | ❌ 否，只是记录 |
| `knowledge_base` | AI 知识库 | ✅ 是，经过审核的知识 |

**自动学习机制：**

当 AI 回复时**没有使用知识库**（说明是新问题），系统可以自动将问答对加入知识库：

```javascript
// 在系统设置中开启
{
  "ai_enabled": true,
  "auto_learn_enabled": true  // 开启自动学习
}
```

**触发条件：**
1. AI 设置中开启了自动学习
2. 回复时没有使用知识库（新问题）
3. 自动将问答对保存到 `knowledge_base`

**人工审核：**

管理员也可以手动审核对话：
1. 查看待审核对话：`GET /api/knowledge/pending`
2. 决定是否入库：`POST /api/knowledge/review`

**统一实现：**

网站 AI 客服和 WhatsApp 使用相同的知识库查询和学习机制：
- 都使用向量搜索（Vectorize）+ 全文搜索（Supabase）
- 都支持自动学习（可开关）
- 都使用 RAG（检索增强生成）技术

### 完整流程图总结

```
┌─────────────────────────────────────────────────────────────────┐
│                     用户提问                                      │
│              "VOLVO FH4 大灯多少钱？"                             │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│ 步骤 1：提取关键词（多语言支持）                                  │
│                                                                  │
│  中文："VOLVO FH4 大灯多少钱？"                                   │
│    ↓ extractSearchKeywords()                                    │
│  英文："VOLVO FH4 headlamp price"                                │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│ 步骤 2：向量搜索（Vectorize）                                     │
│                                                                  │
│  关键词 → Embedding API → 向量 [0.15, -0.42, ...]               │
│    ↓                                                             │
│  在 Vectorize 中搜索相似向量                                      │
│    ↓                                                             │
│  返回 Top 3（相似度 > 0.7）                                       │
│    - "VOLVO FH4 LED: $180" (0.92)                               │
│    - "VOLVO FH4 Halogen: $120" (0.88)                           │
│    - "Warranty: 1 year" (0.75)                                  │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
                    找到了吗？
                    ↙     ↘
                  是       否
                  ↓        ↓
         ┌────────┘        └────────┐
         ↓                          ↓
┌──────────────────┐    ┌──────────────────────┐
│ 使用向量搜索结果  │    │ 步骤 3：全文搜索兜底  │
└────────┬─────────┘    │                      │
         │              │ PostgreSQL 全文搜索   │
         │              │ textSearch('VOLVO')  │
         │              └──────────┬───────────┘
         │                         ↓
         └─────────────┬───────────┘
                       ↓
┌─────────────────────────────────────────────────────────────────┐
│ 步骤 4：构建 RAG 提示词                                           │
│                                                                  │
│  系统提示：你是 XKTRUCK 客服，专业、友好...                       │
│  知识库：                                                         │
│    - VOLVO FH4 LED headlamp: $180                               │
│    - VOLVO FH4 Halogen headlamp: $120                           │
│    - All headlamps include 1-year warranty                      │
│  对话历史：                                                       │
│    User: 你们有 VOLVO 配件吗？                                    │
│    AI: 是的，我们有全系列 VOLVO 配件...                           │
│  当前问题：VOLVO FH4 大灯多少钱？                                 │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│ 步骤 5：调用 DeepSeek AI 生成回答                                │
│                                                                  │
│  AI 基于知识库内容生成准确回答：                                  │
│  "我们的 VOLVO FH4 大灯有两种选择：                               │
│   - LED 款：$180                                                 │
│   - 卤素款：$120                                                 │
│   所有大灯都包含 1 年质保。需要了解更多详情吗？"                   │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│ 步骤 6：返回回答给用户                                            │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│ 步骤 7：保存对话记录                                              │
│                                                                  │
│  保存到 conversations 表：                                        │
│    - session_id: "abc123"                                       │
│    - role: "user" / "assistant"                                 │
│    - message: 问题和回答                                          │
│    - is_ai: true                                                │
│    - metadata: { knowledgeUsed: true }                          │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
                  使用了知识库吗？
                    ↙     ↘
                  是       否
                  ↓        ↓
         ┌────────┘        └────────┐
         ↓                          ↓
┌──────────────────┐    ┌──────────────────────────────────────┐
│ 不触发自动学习    │    │ 步骤 8：自动学习（如果开启）          │
│                  │    │                                      │
│ 已有知识，       │    │ 这是新问题，保存到知识库：            │
│ 无需学习         │    │   1. 保存到 Supabase                 │
└──────────────────┘    │      knowledge_base 表               │
                        │   2. 转成向量存入 Vectorize           │
                        │   3. 下次就能搜到了！                 │
                        └──────────────────────────────────────┘
```

**关键数据流：**

```
用户输入（任何语言）
  ↓ 提取英文关键词
英文关键词
  ↓ Embedding API
1024 维向量
  ↓ Vectorize 搜索
相似知识（Top 3）
  ↓ 构建提示词
完整上下文
  ↓ DeepSeek AI
准确回答
  ↓ 保存记录
对话历史
  ↓ 自动学习（可选）
知识库扩充
```

**数据存储：**

```
┌──────────────────┐
│ Supabase 数据库   │
├──────────────────┤
│ conversations    │ ← 所有对话记录
│ knowledge_base   │ ← 审核通过的知识
│ products         │ ← 产品信息
│ inquiries        │ ← 询盘记录
└──────────────────┘

┌──────────────────┐
│ Vectorize 向量库  │
├──────────────────┤
│ 知识向量索引      │ ← 用于快速搜索
│ (1024 维)        │
└──────────────────┘

两者同步：
- 添加知识时，同时存入 Supabase 和 Vectorize
- 搜索时，优先用 Vectorize（快），失败时用 Supabase（兜底）
```

### 常见问题解答

**Q1: 为什么要用向量搜索，不直接用关键词搜索？**

A: 关键词搜索只能找到完全匹配的词，向量搜索能理解语义：
- 关键词："大灯" 找不到 "headlamp"
- 向量：能理解它们是同一个意思

**Q2: 1024 维向量是什么意思？**

A: 就像用 1024 个数字来描述一段文字的"特征"：
- 第 1 个数字可能代表"是否与汽车相关"
- 第 2 个数字可能代表"是否与照明相关"
- ... 共 1024 个特征
- 这些数字是 AI 模型自动学习出来的

**Q3: 相似度 0.7 是什么意思？**

A: 相似度范围是 -1 到 1：
- 1.0 = 完全相同
- 0.9 = 几乎相同
- 0.7 = 比较相关（项目阈值）
- 0.5 = 有些相关
- 0.0 = 完全无关

**Q4: 为什么要提取英文关键词？**

A: 因为知识库主要是英文，英文搜索效果更好：
- 用户输入："沃尔沃大灯多少钱？"
- 提取关键词："VOLVO headlamp price"
- 在英文知识库中搜索

**Q5: 自动学习会不会学到错误答案？**

A: 有可能，所以建议：
- 初期关闭自动学习，人工审核
- 稳定后开启，定期检查
- 发现错误及时删除

**Q6: 知识库会不会越来越大，影响性能？**

A: 不会，因为：
- 向量搜索很快（毫秒级）
- 只返回最相关的 3-5 条
- Vectorize 专门为大规模向量搜索优化

**Q7: 如果向量搜索失败怎么办？**

A: 有两层保护：
1. 向量搜索失败 → 回退到全文搜索
2. 全文搜索也失败 → AI 基于通用知识回答

**Q8: 对话记录和知识库有什么区别？**

A: 
- 对话记录：所有对话都保存，用于查看历史
- 知识库：只有高质量问答，用于回答新问题

**Q9: 为什么 WhatsApp 和网站 AI 客服要用同一个知识库？**

A: 
- 统一管理，只需维护一份知识
- 保证回答一致性
- 两个渠道互相学习，共同进步

**Q10: 如何判断知识库质量？**

A: 看这些指标：
- 知识库命中率（多少问题能找到答案）
- 用户满意度（是否解决了问题）
- 自动学习的知识质量（定期人工检查）

---

## 数据库基础

### 主要数据表

| 表名 | 作用 |
|------|------|
| `products` | 产品信息 |
| `brands` | 品牌信息 |
| `categories` | 产品分类 |
| `inquiries` | 客户询盘 |
| `knowledge_base` | AI 知识库 |
| `chat_sessions` | 对话记录 |

### 表之间的关系

```
brands（品牌）
  ↓ 一对多
products（产品）← 多对一 → categories（分类）
```

一个品牌有多个产品，一个产品属于一个品牌和一个分类。

### 全文搜索

Supabase 用 PostgreSQL，支持全文搜索：

```sql
-- 搜索包含 "headlamp" 的产品
SELECT * FROM products 
WHERE to_tsvector('english', name || ' ' || description) 
      @@ to_tsquery('english', 'headlamp');
```

---

## SEO 基础知识

### 什么是 SEO？

SEO = Search Engine Optimization（搜索引擎优化）

目标：让 Google 等搜索引擎更容易找到和理解你的网站。

### 关键要素

1. **Meta 标签**：告诉搜索引擎页面内容
   ```html
   <title>VOLVO Truck Headlamp | XKTRUCK</title>
   <meta name="description" content="High quality VOLVO truck headlamp..." />
   ```

2. **结构化数据**：用 Schema.org 格式描述内容
   ```json
   {
     "@type": "Product",
     "name": "VOLVO Headlamp",
     "brand": "VOLVO"
   }
   ```

3. **Sitemap**：网站地图，帮助搜索引擎发现所有页面

4. **robots.txt**：告诉爬虫哪些页面可以抓取

### 项目中的 SEO

- 每个页面都有动态生成的 title 和 description
- 产品页面有 Schema.org 产品标记
- 自动生成 sitemap.xml

---

## 常用操作速查

### Wrangler 命令

```bash
# 部署 Worker 代码
cd xk-truck-worker
wrangler deploy

# 设置密钥
wrangler secret put DEEPSEEK_API_KEY

# 查看日志
wrangler tail

# 本地调试
wrangler dev
```

### 查看 Vectorize 状态

```bash
wrangler vectorize list
```

### 数据库操作

通过 Supabase 控制台操作：
1. 登录 https://supabase.com
2. 进入项目 Dashboard
3. 使用 Table Editor 或 SQL Editor

### 添加知识库内容

1. 在 Supabase 的 `knowledge_base` 表添加记录
2. 调用 API 同步到 Vectorize（或等待自动同步）

---

---

## AI 客服安全与验证

### 如何验证向量搜索是否工作？

在开发和测试阶段，你需要确认 AI 是否真的在使用向量搜索。

**最简单的方法：查看 Worker 日志**

```bash
# 在 xk-truck-worker 目录下运行
cd xk-truck-worker
wrangler tail

# 或者查看格式化的日志
wrangler tail --format pretty
```

**日志输出示例：**

```bash
# ✅ 向量搜索成功
[2025-12-13 10:30:15] Extracting keywords: "VOLVO headlamp price"
[2025-12-13 10:30:16] Vector search results: 3 items
[2025-12-13 10:30:16]   - Score: 0.92 - "VOLVO FH4 LED: $180"
[2025-12-13 10:30:16]   - Score: 0.85 - "VOLVO FH4 Halogen: $120"
[2025-12-13 10:30:16]   - Score: 0.73 - "Warranty: 1 year"

# ⚠️ 回退到全文搜索
[2025-12-13 10:30:20] Vector search failed: Vectorize not available
[2025-12-13 10:30:20] Falling back to text search
[2025-12-13 10:30:20] Text search results: 2 items

# ❌ 两者都失败
[2025-12-13 10:30:25] Vector search failed: API timeout
[2025-12-13 10:30:25] Text search failed: Database error
[2025-12-13 10:30:25] No knowledge found, using general knowledge
```

**如何解读日志：**
- 看到 "Vector search results" = 向量搜索工作正常 ✅
- 看到 "Falling back to text search" = 向量搜索失败，使用全文搜索 ⚠️
- 看到 "No knowledge found" = 两者都失败，AI 基于通用知识回答 ❌

### 防止 AI 回答错误信息

**问题：** 当向量搜索和全文搜索都失败时，AI 会基于通用知识回答，可能会：
- ❌ 瞎编价格
- ❌ 说有实际没有的产品
- ❌ 提供错误的政策信息

**解决方案：禁止 AI 回答敏感信息**

在系统提示词中添加严格规则，让 AI 知道什么能说、什么不能说。

**配置位置：** 管理后台 → 系统设置 → 系统提示词

**添加以下规则：**

```
CRITICAL SAFETY RULES:

1. NEVER provide specific prices unless you have exact information from the knowledge base
   - ❌ 错误: "VOLVO 大灯大约 $100-$200"
   - ✅ 正确: "For accurate pricing, please contact us at..."

2. NEVER make up product specifications or OE numbers
   - ❌ 错误: "OE 编号是 1234567"
   - ✅ 正确: "Please provide your OE number and we'll check availability"

3. If you don't have information in the knowledge base, say:
   "I don't have that specific information right now. Please contact us:
    📧 Email: harry.zhang592802@gmail.com
    📱 WhatsApp: +86 130-6287-0118"

4. For pricing inquiries without knowledge base info:
   "For accurate pricing, please send us an inquiry with your specific requirements."

5. Always be honest about what you know and don't know

SAFE TO ANSWER (without knowledge base):
✅ General company information (factory size, certifications, experience)
✅ Product categories we offer (headlamps, mirrors, body parts)
✅ How to contact us
✅ General inquiry process

UNSAFE TO ANSWER (require knowledge base):
❌ Specific product prices
❌ Exact OE numbers
❌ Detailed specifications
❌ Warranty terms
❌ Shipping costs
❌ Lead times
```

**效果：**

```
用户："VOLVO FH4 大灯多少钱？"
  ↓
向量搜索 + 全文搜索都失败
  ↓
AI 看到提示词中的规则
  ↓
AI 回复："For accurate pricing on VOLVO FH4 headlamps, please contact us:
📧 Email: harry.zhang592802@gmail.com
📱 WhatsApp: +86 130-6287-0118
Our team will provide you with the most up-to-date pricing and availability."
  ↓
✅ 安全！没有瞎编价格
```

### 推荐配置（按阶段）

**阶段 1：开发测试（当前）**
```javascript
{
  "ai_enabled": true,           // 开启 AI，方便测试
  "auto_learn_enabled": false,  // 关闭自动学习，避免学到测试数据
  "system_prompt": "... [包含上述安全规则] ..."
}
```

**阶段 2：小范围上线**
```javascript
{
  "ai_enabled": true,
  "auto_learn_enabled": false,  // 仍然关闭，人工审核对话
  "system_prompt": "... [包含上述安全规则] ..."
}
```
- 每天检查对话记录
- 发现问题及时修正
- 持续完善知识库

**阶段 3：稳定运行**
```javascript
{
  "ai_enabled": true,
  "auto_learn_enabled": true,   // 可以开启自动学习
  "system_prompt": "... [包含上述安全规则] ..."
}
```
- 知识库已完善（100+ 条）
- 每周检查一次
- 定期清理低质量知识

---

## 📚 相关文档

- [部署指南](./DEPLOYMENT.md) - 详细的部署和运维说明
- [AI 提示词](./AI-PROMPTS.md) - AI 客服的提示词配置
- [AI 安全验证](./AI-SAFETY.md) - 完整的安全验证指南
- [项目 README](./README.md) - 项目总体介绍

---

*如需深入学习具体技术，请参考各技术的官方文档。*
