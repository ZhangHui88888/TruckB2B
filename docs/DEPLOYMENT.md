# XKTRUCK 部署指南

本文档包含项目部署所需的全部信息，包括账号配置、部署步骤和运维指南。

> **快速导航**
> - [账号配置](#一账号注册无需提供密码)
> - [部署步骤](#十一部署步骤)
> - [日常运维](#十二日常运维)

---

## 一、账号注册（无需提供密码）

以下服务需要你自行注册账号，注册后在各平台获取 API Key：

| 服务 | 注册地址 | 用途 |
|------|----------|------|
| Cloudflare | https://dash.cloudflare.com/sign-up | 前端托管、Workers、R2存储 |
| Supabase | https://supabase.com | 向量数据库、知识库 |
| Resend | https://resend.com | 邮件通知 |
| OpenAI | https://platform.openai.com | AI 大模型 |
| Meta Business | https://business.facebook.com | WhatsApp Business API |

---

## 二、需要提供的 API Keys / Tokens

注册账号后，请在各平台获取以下密钥：

### 1. Cloudflare
- [x] **Account ID** - 在 Cloudflare 控制台右侧栏可见
- [x] **API Token** - 用于部署 Workers 和 R2

**已获取：**
- 账号：harry.zhang592802@gmail.com
- Account ID：4f2c0fb4069b0066d6158069fd309fb3
- API Token：Nj--6YcpOEpAWQg-w8cNFiUJJjLjCpU7ShZkBuZd

#### 获取 API Token 步骤：
1. 登录 Cloudflare 控制台：https://dash.cloudflare.com
2. 点击右上角 **Profile** 图标 → **My Profile**
3. 左侧菜单选择 **API Tokens**
4. 点击 **Create Token**
5. 找到 **Edit Cloudflare Workers** 模板，点击 **Use template**
6. **Permissions** 部分保持默认（已包含 Workers、R2 等权限）
7. **Zone Resources** 选择 **All zones**（或指定域名）
8. 点击 **Continue to summary** → **Create Token**
9. ⚠️ **立即复制保存 Token**（只显示一次！）

#### 获取 Account ID 步骤：
1. 回到 Cloudflare 主页
2. 点击左侧任意 Workers 项目或域名
3. 在页面**右侧边栏**找到 **Account ID**
4. 复制保存

- 🔗 API Token 获取地址：https://dash.cloudflare.com/profile/api-tokens


### 2. Supabase
- [x] **Project URL** - 格式：`https://xxxxx.supabase.co`
- [x] **Anon Key** - 公开密钥，用于前端
- [x] **Service Role Key** - 私密密钥，用于后端
- 🔗 创建项目：https://supabase.com/dashboard/projects
- 🔗 获取 Keys：项目 → Settings → API

**已创建项目信息：**
- 账号：GitHub 账号 ZhangHui88888
- Organization：ZhangHui88888's Org
- Project name：XKTRUCK
- Database password：YyIIytmU9B8EHoEC
- Region：Asia-Pacific
- Project URL：https://xktruck.supabase.co
- Anon Key (Publishable)：sb_publishable_VjrbThKmSR4LvYEeotnMlw_d8IZqYs4
- Service Role Key (Secret)：sb_secret_CUSHbAvZlq7M-4OJgXby6g_cEV5aYHd


### 3. Resend
- [x] **API Key** - 用于发送邮件通知
- 🔗 获取地址：https://resend.com/api-keys

**已创建：**
- 账号：GitHub 账号（harry.zhang592802）
- API Key Name：XKTRUCK-Production
- API Key：re_jf9cgopc_LXyEDqAR7tPjxmEYRti8nazh

### 4. DeepSeek（AI 大模型）
- [x] **DeepSeek API Key** - 格式：`sk-...`
- 🔗 注册地址：https://platform.deepseek.com
- 🔗 获取 API Key：https://platform.deepseek.com/api_keys

**优势：** 价格比 OpenAI 便宜约 10 倍，性能接近 GPT-4o

**已创建：**
- 账号：已注册
- API Key：sk-e1cb78491f84483fbf9e550f7321603b

### 5. WhatsApp Business
- [ ] **WhatsApp Business Account ID**
- [ ] **Phone Number ID** - 绑定的手机号 ID
- [ ] **Access Token** - 用于发送消息的令牌
- [ ] **Webhook Verify Token** - 自定义字符串，用于验证 Webhook
- 🔗 创建 App：https://developers.facebook.com/apps/create/
- 🔗 WhatsApp 设置：https://developers.facebook.com/apps → 你的App → WhatsApp → API Setup

**进度：**
- 账号：Facebook 账号（张辉）
- Meta Business Suite：已登录
- Meta 开发者账户：待验证（大陆手机收不到验证码，需用港澳或海外手机号）
- 状态：⏸️ 暂停，后续再配置

**配置步骤（代码已实现）：**
1. 完成 Meta 开发者账户验证
2. 创建 Meta Business App
3. 添加 WhatsApp 产品
4. 获取 Phone Number ID 和 Access Token
5. 配置 Webhook URL：`https://your-worker.workers.dev/api/whatsapp/webhook`
6. 设置 Webhook Verify Token（自定义字符串）
7. 在 Worker 中设置 Secrets：
   ```bash
   wrangler secret put WHATSAPP_PHONE_NUMBER_ID
   wrangler secret put WHATSAPP_ACCESS_TOKEN
   wrangler secret put WHATSAPP_VERIFY_TOKEN
   ```

---

## 三、业务数据

### 1. 域名
- [x] **域名** - `xk-truck.cn`
- [x] 域名已接入 Cloudflare DNS

**已配置：**
- 域名：xk-truck.cn
- 注册商：阿里云
- 注册时间：2025-12-10
- 到期时间：2026-12-10
- DNS 服务器：aria.ns.cloudflare.com / jack.ns.cloudflare.com
- Cloudflare 计划：Free
- 状态：✅ DNS 已生效，Cloudflare 已激活

#### 域名配置步骤（已完成）：
1. 在阿里云购买域名 `xk-truck.cn`
2. 登录 Cloudflare → Add a site → 输入 `xk-truck.cn`
3. 选择 Free 免费计划
4. 获取 Cloudflare NS 服务器地址：
   - `aria.ns.cloudflare.com`
   - `jack.ns.cloudflare.com`
5. 回到阿里云 → 域名管理 → DNS修改
6. 将原 DNS 服务器改为 Cloudflare 的 NS 地址
7. 等待 DNS 生效（几分钟到 24 小时）

### 2. 公司/产品信息
- [x] **公司名称**（中英文）
- [x] **公司简介**（英文，用于网站 About 页面）
- [x] **联系邮箱** - harry.zhang592802@gmail.com
- [x] **WhatsApp 手机号** - +86 13062870118

**公司信息（来源 xklamp.com）：**
- 品牌名：XKLAMP / XKTRUCK
- 中文名：星科车灯（待确认）
- 主营产品：卡车大灯、后视镜、外饰件
- 适配品牌：VOLVO、SCANIA、MERCEDES-BENZ、MAN、IVECO、RENAULT、DAF、FORD
- 工厂面积：35,000㎡（中国）
- 特点：ADB 认证、OEM 品质、厂家直销

**公司简介（英文）：**
```
XKLAMP is a leading manufacturer of truck headlamps, mirrors and exterior parts 
for VOLVO, SCANIA, MERCEDES-BENZ, MAN, IVECO, RENAULT, DAF and FORD. 

With a 35,000㎡ China factory, strict quality control and fast global delivery, 
we offer competitive wholesale prices and reliable aftermarket truck parts.

All products are ADB-certified with OEM quality standards.
```


### 3. 产品数据
- [x] **产品来源** - 从 xklamp.com 自动同步
- [x] **同步方式** - 管理后台一键同步按钮

**产品同步功能（已规划）：**
- 源站：https://xklamp.com
- 品牌：VOLVO、BENZ、SCANIA、DAF、IVECO、MAN、RENAULT、FORD
- 同步内容：产品名称、描述、规格、OE编号、图片
- 图片存储：Cloudflare R2（免费 10GB）
- 数据存储：Supabase products 表
- 触发方式：管理后台手动触发 / 每周自动同步

**管理后台页面：**
```
/admin              → 登录页
/admin/dashboard    → 仪表盘
/admin/products     → 产品管理 + 同步按钮
/admin/inquiries    → 询盘列表
/admin/settings     → 系统设置
```

### 4. 知识库内容（用于 AI 客服）
- [x] **常见问题 FAQ**（英文）- 已导入初始 FAQ
- [ ] **产品详细介绍** - 从 xklamp.com 同步
- [ ] **公司优势、资质**
- [ ] **付款方式、交货期**
- [ ] **售后政策**
- [x] **客户对话记录** - 通过 WhatsApp 对话自动收集

**AI 客服功能规划：**
- 管理后台可开关 AI 自动回复
- 对话记录自动保存到 Supabase
- 定期从对话中提取 FAQ 训练知识库
- 初期可关闭 AI，手动回复积累数据

---

## 四、配置信息汇总表

请填写以下信息（**请勿泄露给他人**）：

```
# ===== Cloudflare =====
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_API_TOKEN=

# ===== Supabase =====
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=

# ===== Resend =====
RESEND_API_KEY=

# ===== DeepSeek AI =====
DEEPSEEK_API_KEY=

# ===== WhatsApp =====
WHATSAPP_BUSINESS_ACCOUNT_ID=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_VERIFY_TOKEN=

# ===== 业务信息 =====
COMPANY_NAME=
CONTACT_EMAIL=
WHATSAPP_NUMBER=
DOMAIN=
```

---

## 五、WhatsApp Business API 申请流程

1. 注册 Meta Business 账号：https://business.facebook.com
2. 创建 Business App：https://developers.facebook.com/apps
3. 添加 WhatsApp 产品到 App
4. 绑定手机号（需验证）
5. 获取 Access Token 和 Phone Number ID
6. 配置 Webhook URL（部署 Worker 后填写）

**注意：** WhatsApp Business API 需要企业验证，审核约 1-3 天。

---

## 六、安全提醒

⚠️ **重要：**
- 所有 API Key 和 Token 都是敏感信息，请勿公开
- 不要将密钥提交到 Git 仓库
- 建议使用 Cloudflare Workers 的环境变量存储密钥
- 定期轮换 API Key

---

## 七、SEO/GEO 工具账号

### 1. Google Search Console（必需）
- [x] **注册地址**：https://search.google.com/search-console
- [x] **验证网站所有权**（通过 DNS 验证）
- [x] **提交 sitemap.xml**

**已配置：**
- 域名资源：xk-truck.cn（已验证）
- URL 前缀资源：https://xk-truck.cn（已验证）
- Sitemap：✅ 已提交 sitemap-index.xml
- 状态：✅ 等待 Google 索引（通常 1-3 天）

### 2. Bing Webmaster Tools（推荐）
- [ ] **注册地址**：https://www.bing.com/webmasters
- [ ] **可从 GSC 导入验证**

### 3. Google Analytics 4（可选）
- [ ] **注册地址**：https://analytics.google.com
- [ ] **获取 Measurement ID**（格式：`G-XXXXXXX`）

---

## 八、动态关键词更新（方案 C）

如果使用全自动 SEO 关键词更新方案，还需配置：

### 1. Google Cloud 服务账号（用于 GSC API）
- [ ] **创建项目**：https://console.cloud.google.com
- [ ] **启用 Search Console API**
- [ ] **创建服务账号**，下载 JSON 密钥
- [ ] **在 GSC 中添加服务账号为用户**（只读权限）

### 2. GitHub Secrets
在仓库 Settings → Secrets and variables → Actions 中添加：

| Secret 名称 | 说明 |
|-------------|------|
| `GSC_CREDENTIALS` | Google Cloud 服务账号 JSON 内容 |
| `GSC_SITE_URL` | 网站 URL，如 `https://yourdomain.com` |
| `SUPABASE_URL` | Supabase 项目 URL |
| `SUPABASE_KEY` | Supabase service_role key |
| `DEEPSEEK_API_KEY` | DeepSeek API Key（用于 Chat + Embedding） |
| `RESEND_API_KEY` | Resend API Key |
| `NOTIFY_EMAIL` | 接收 SEO 周报的邮箱 |
| `CF_DEPLOY_HOOK` | Cloudflare Pages 部署钩子 |

### 3. Cloudflare Deploy Hook
- [ ] 在 Cloudflare Pages → 项目设置 → 构建和部署 → 部署钩子
- [ ] 创建钩子，复制 URL 中的 ID 部分

---

## 九、Supabase 数据库表

部署前需在 Supabase 中创建以下表：

### 1. 基础表（create_tables.sql）
执行 `xk-truck-worker/sql/create_tables.sql`，包含：
- `products` - 产品表
- `brands` - 品牌表
- `categories` - 分类表
- `inquiries` - 询盘表
- `conversations` - 对话表
- `settings` - 设置表

### 2. 知识库表（knowledge-base.sql）
执行 `xk-truck-worker/sql/knowledge-base.sql`，包含：
- `knowledge_base` - 知识库表（支持全文搜索）
- 初始示例数据（公司信息、产品信息、FAQ）

### 3. WhatsApp 表（whatsapp-tables.sql）
执行 `xk-truck-worker/sql/whatsapp-tables.sql`，包含：
- `whatsapp_conversations` - WhatsApp 对话表
- `whatsapp_messages` - WhatsApp 消息表
- `whatsapp_stats` - 统计视图

### 4. SEO 配置表（可选，方案 C）
```sql
CREATE TABLE page_seo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_path TEXT UNIQUE NOT NULL,
  title TEXT,
  description TEXT,
  keywords TEXT[],
  og_image TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 5. 关键词追踪表（可选，方案 C）
```sql
CREATE TABLE keyword_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword TEXT NOT NULL,
  impressions INT,
  clicks INT,
  position DECIMAL,
  recorded_at DATE,
  UNIQUE(keyword, recorded_at)
);
```

### 6. AI 爬虫日志表（可选，GEO 监控）
```sql
CREATE TABLE ai_bot_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot TEXT,
  path TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 十、配置信息汇总表（更新版）

```
# ===== Cloudflare =====
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_API_TOKEN=
CF_DEPLOY_HOOK=

# ===== Supabase =====
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=

# ===== Resend =====
RESEND_API_KEY=

# ===== DeepSeek AI =====
DEEPSEEK_API_KEY=

# ===== WhatsApp =====
WHATSAPP_BUSINESS_ACCOUNT_ID=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_VERIFY_TOKEN=

# ===== Google (SEO) =====
GSC_SITE_URL=
GSC_CREDENTIALS=（JSON 文件内容）
GA4_MEASUREMENT_ID=

# ===== 业务信息 =====
COMPANY_NAME=
CONTACT_EMAIL=
NOTIFY_EMAIL=
WHATSAPP_NUMBER=
DOMAIN=
```

---

## 十一、部署步骤

### 11.1 部署前端（Cloudflare Pages）

```bash
# 推送代码后自动部署
git add -A
git commit -m "feat: update frontend"
git push
```

或手动触发：Cloudflare Pages → Deployments → Retry

### 11.2 部署后端（Cloudflare Worker）

```bash
cd xk-truck-worker
wrangler deploy --env=""
```

### 11.3 配置 Worker 密钥

```bash
cd xk-truck-worker

# Supabase
wrangler secret put SUPABASE_URL
# 输入: https://xktruck.supabase.co

wrangler secret put SUPABASE_SERVICE_KEY
# 输入: sb_secret_xxxxx

# DeepSeek AI
wrangler secret put DEEPSEEK_API_KEY
# 注意：变量名是 DEEPSEEK_API_KEY（不是 DEEPSEEK）
# 输入: sk-xxxxx

# Resend 邮件
wrangler secret put RESEND_API_KEY
# 输入: re_xxxxx

# 通知邮箱
wrangler secret put NOTIFY_EMAIL
# 输入: harry.zhang592802@gmail.com

# 管理 API Key（可选，用于设置接口鉴权）
wrangler secret put ADMIN_API_KEY
# 输入: 自定义强密码

# WhatsApp（可选，待配置）
# wrangler secret put WHATSAPP_PHONE_NUMBER_ID
# wrangler secret put WHATSAPP_ACCESS_TOKEN
# wrangler secret put WHATSAPP_VERIFY_TOKEN
```

### 11.4 配置 Vectorize（向量搜索）

#### 什么是 Vectorize？

Vectorize 是 Cloudflare 的向量数据库服务，用于存储和搜索文本向量（Embeddings）。

**为什么需要 Vectorize？**
- **语义搜索**：理解问题的意思，而不只是关键词匹配
- **多语言支持**：中文问题也能搜到英文答案
- **高性能**：毫秒级搜索响应
- **免费额度大**：500 万向量、3000 万查询/月

#### 步骤 1：创建向量索引

在 `xk-truck-worker` 目录下运行：

```bash
# 创建向量索引
# --dimensions=1024: DeepSeek Embedding 模型的输出维度
# --metric=cosine: 使用余弦相似度计算
wrangler vectorize create xktruck-knowledge --dimensions=1024 --metric=cosine
```

**输出示例：**
```
✅ Successfully created index 'xktruck-knowledge'
📋 Index ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
📐 Dimensions: 1024
📏 Metric: cosine
```

#### 步骤 2：部署 Worker

```bash
# Vectorize 绑定会自动配置（在 wrangler.toml 中已定义）
wrangler deploy
```

**wrangler.toml 中的配置：**
```toml
[[vectorize]]
binding = "VECTORIZE"
index_name = "xktruck-knowledge"
```

> **注意**：Embedding 使用现有的 `DEEPSEEK_API_KEY`，无需额外配置。

#### 步骤 3：迁移现有知识库（可选）

如果你的 Supabase `knowledge_base` 表中已有数据，需要迁移到 Vectorize。

**方法 A：批量迁移 API（推荐）**

```bash
# 调用迁移 API（自动将 Supabase 知识库转为向量存入 Vectorize）
curl -X POST https://your-worker.workers.dev/api/knowledge/migrate
```

**返回示例：**
```json
{
  "success": true,
  "message": "Migration completed: 20 succeeded, 0 failed",
  "migrated": 20,
  "failed": 0
}
```

**方法 B：手动迁移脚本**

```javascript
// 在本地运行的迁移脚本示例
const WORKER_URL = 'https://your-worker.workers.dev';

async function migrateKnowledge() {
  // 1. 从 Supabase 获取所有知识条目
  const { data } = await supabase.from('knowledge_base').select('*');
  
  // 2. 逐条调用 API 重新保存（会自动生成向量）
  for (const item of data) {
    await fetch(`${WORKER_URL}/api/knowledge/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: item.metadata?.question || item.content,
        answer: item.metadata?.answer || '',
        metadata: { migrated: true }
      })
    });
  }
}
```

#### 步骤 4：验证 Vectorize

**测试向量搜索：**
```bash
# 发送测试消息，检查是否使用了向量搜索
curl -X POST https://your-worker.workers.dev/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "你们有什么产品？", "sessionId": "test-123"}'
```

**检查响应：**
- AI 回复应该基于知识库内容
- 查看 Worker 日志：`wrangler tail`
- 日志中应该显示 "Vector search results: X items"

**查看 Vectorize 状态：**
```bash
# 列出所有向量索引
wrangler vectorize list

# 查看索引详情
wrangler vectorize get xktruck-knowledge
```

#### 工作原理

```
用户提问："VOLVO 大灯多少钱？"
    ↓
1. 提取关键词："VOLVO headlamp price"
    ↓
2. 生成查询向量 (DeepSeek Embedding API)
   [0.15, -0.42, 0.81, ..., 0.23]  // 1024 个数字
    ↓
3. Vectorize 相似度搜索
   找到最相似的 3 条知识（score >= 0.7）
    ↓
4. 返回相关知识给 AI
    ↓
5. AI 基于知识生成回答 (DeepSeek Chat)
```

#### 故障回退机制

如果 Vectorize 不可用，系统会自动回退到 Supabase 全文搜索：

```javascript
// 代码中的回退逻辑
try {
  // 尝试向量搜索
  knowledgeContext = await searchVectors(env, query, 3);
} catch (vectorError) {
  console.error('Vector search failed, falling back to text search');
  // 回退到全文搜索
  knowledgeContext = await supabaseTextSearch(env, query, 3);
}
```

这确保即使 Vectorize 出现问题，AI 客服仍能正常工作。

#### 费用说明

| 项目 | 免费额度 | 超出后 |
|------|----------|--------|
| Vectorize 存储 | 500 万向量/月 | $0.05/100 万向量 |
| Vectorize 查询 | 3000 万查询/月 | $0.01/100 万查询 |
| DeepSeek Embedding | 按量付费 | $0.002/M tokens |

**预估成本：**
- 知识库 100 条 × 平均 200 tokens = 20,000 tokens ≈ $0.00004
- 每天 100 次查询 × 30 天 = 3,000 次查询（远低于免费额度）
- **月成本**: 几乎为 $0

#### 常见问题

**Q: 为什么是 1024 维度？**
A: DeepSeek Embedding 模型输出 1024 维向量，必须匹配。

**Q: 什么是余弦相似度（cosine）？**
A: 计算两个向量夹角的余弦值，范围 -1 到 1，越接近 1 越相似。

**Q: 为什么阈值是 0.7？**
A: 经验值，0.7 以上表示比较相关，可根据实际效果调整。

**Q: 如何更新知识库？**
A: 
- 自动学习：AI 对话中自动添加新知识
- 手动添加：`POST /api/knowledge/add`
- 人工审核：管理后台审核对话后添加

**Q: 如何删除错误的知识？**
A: 目前需要在 Supabase 中删除，然后重新迁移到 Vectorize。

**Q: Vectorize 和 Supabase 知识库的关系？**
A:
- Supabase：存储原始文本（可编辑、可查询）
- Vectorize：存储向量索引（只用于搜索）
- 两者同步：添加知识时同时存入两边

---

## 十二、日常运维

### 12.1 查看 Worker 日志

```bash
cd xk-truck-worker
wrangler tail
```

### 12.2 添加博客文章

1. 在 `xk-truck-frontend/src/content/blog/` 创建 `.md` 文件
2. 添加 frontmatter（title, description, pubDate）
3. 提交并推送

### 12.3 同步产品数据

```bash
cd xk-truck-frontend
npm run sync:products
```

### 12.4 知识库管理

**手动添加知识：**
```bash
curl -X POST https://your-worker.workers.dev/api/knowledge/add \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What is your MOQ?",
    "answer": "Our minimum order quantity is 5-10 pieces for most items.",
    "metadata": {"category": "faq"}
  }'
```

**审核对话并入库：**
```bash
# 获取待审核对话
curl https://your-worker.workers.dev/api/knowledge/pending

# 审核并入库
curl -X POST https://your-worker.workers.dev/api/knowledge/review \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "uuid",
    "approved": true,
    "question": "用户问题",
    "answer": "AI回复"
  }'
```

### 12.5 查看 Worker 日志

```bash
cd xk-truck-worker
wrangler tail
```

### 12.6 健康检查

```bash
curl https://your-worker.workers.dev/api/health
```

---

## 十三、API 端点文档

### 13.1 询盘 API

**POST /api/inquiry**
- 提交询盘表单
- 保存到 Supabase，发送邮件通知

### 13.2 AI 客服 API

**POST /api/chat**
- 普通对话（JSON 响应）

**POST /api/chat/stream**
- 流式对话（SSE 响应）
- 实时显示 AI 回复

### 13.3 设置 API

**GET /api/settings**
- 获取 AI 设置（开关状态、欢迎消息等）

**PUT /api/settings**
- 更新 AI 设置（需要 Authorization header）

### 13.4 管理后台 API

**GET /api/admin/stats**
- 获取统计数据（今日询盘、总询盘、产品数）

**GET /api/admin/inquiries**
- 获取询盘列表（支持分页、筛选、搜索）

**PUT /api/admin/inquiries/:id**
- 更新询盘状态

**GET /api/admin/conversations/sessions**
- 获取会话列表

**GET /api/admin/conversations/:sessionId**
- 获取会话详情

### 13.5 WhatsApp API

**GET /api/whatsapp/webhook**
- Webhook 验证（Meta 调用）

**POST /api/whatsapp/webhook**
- 接收 WhatsApp 消息

**GET /api/whatsapp/conversations**
- 获取对话列表

**GET /api/whatsapp/conversations/:id/messages**
- 获取对话消息

### 13.6 知识库 API

**GET /api/knowledge/pending**
- 获取待审核的对话

**POST /api/knowledge/review**
- 审核对话并决定是否入库

**POST /api/knowledge/add**
- 手动添加知识条目

**POST /api/knowledge/migrate**
- 迁移现有知识库到 Vectorize

### 13.7 健康检查

**GET /api/health**
- 服务状态检查

---

## 十四、AI 安全配置（重要）

### 14.1 为什么需要配置

AI 客服的安全规则已添加到代码中，需要重新部署 Worker 使其生效。

**安全机制：**
- ✅ 代码层检测：自动识别敏感问题（价格、规格、质保、运输、库存）
- ✅ 提示词规则：硬编码在 `deepseek.js` 中，告诉 AI 什么该说、什么不该说

### 14.2 部署步骤（1 分钟）

```bash
cd xk-truck-worker
wrangler deploy
```

**期望结果：**
```
✅ Successfully deployed
URL: https://xk-truck-api.harry-zhang592802.workers.dev
```

### 14.3 测试验证（1 分钟）

```bash
node test-safety.js
```

**期望结果：**
```
✅ 通过: 9
❌ 失败: 0
🎉 所有测试通过！
```

### 14.4 网站测试

访问 https://xk-truck.cn，测试：
- "VOLVO 大灯多少钱？" → 应该引导联系（不瞎编价格）
- "你们有 VOLVO 配件吗？" → 可以直接回答

### 14.5 查看日志

```bash
wrangler tail
```

应该看到：
- `✅ Vector search results: 3 items` - 向量搜索成功
- `🛡️ Sensitive question detected: pricing` - 检测到敏感问题

### 14.6 修改系统提示词

如需修改 AI 的行为，编辑文件：
```
xk-truck-worker/src/lib/deepseek.js
```

找到 `DEFAULT_SYSTEM_PROMPT` 常量，修改后重新部署：
```bash
wrangler deploy
```

### 14.7 相关文档

- `docs/AI-SAFETY.md` - 安全验证方法
- `xk-truck-worker/test-safety.js` - 测试脚本
- `xk-truck-worker/src/lib/deepseek.js` - 系统提示词位置

---

## 十五、部署状态

### 基础部署
- ✅ Cloudflare 域名配置
- ✅ 前端部署（Cloudflare Pages）
- ✅ 后端部署（Cloudflare Worker）
- ✅ Vectorize 向量数据库配置
- ✅ 知识库导入（Supabase + Vectorize）
- ⏸️ WhatsApp Webhook（代码已实现，需配置 API）

### SEO 配置
- ✅ robots.txt 和 sitemap.xml
- ✅ Google Search Console 验证
- ✅ Schema.org 结构化数据
- ✅ Google Analytics 4
- ⏳ Bing Webmaster Tools

### AI 功能
- ✅ AI 客服对话（普通 + 流式）
- ✅ RAG 知识库检索（Vectorize + Supabase）
- ✅ 知识库学习功能
- ✅ 多语言支持
- ✅ 邮件通知
- ✅ 敏感问题检测（代码层）
- ⏳ 系统提示词配置（需执行 SQL）

---

*最后更新: 2025-12-13*
