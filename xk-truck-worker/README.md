# XKTRUCK API Worker

Cloudflare Worker 后端服务，处理询盘表单和 AI 客服对话。

## 功能

- **询盘 API** (`POST /api/inquiry`) - 接收网站询盘表单，保存到 Supabase，发送邮件通知
- **AI 客服** (`POST /api/chat`) - 基于 DeepSeek 的智能客服对话
- **设置管理** (`GET/PUT /api/settings`) - AI 开关控制
- **健康检查** (`GET /api/health`) - 服务状态检查

## 部署步骤

### 1. 安装依赖

```bash
cd xk-truck-worker
npm install
```

### 2. 配置 Secrets

使用 Wrangler CLI 设置环境变量：

```bash
# Supabase
wrangler secret put SUPABASE_URL
# 输入: https://xktruck.supabase.co

wrangler secret put SUPABASE_SERVICE_KEY
# 输入: sb_secret_xxxxx（从 Supabase 项目设置获取）

# DeepSeek AI
wrangler secret put DEEPSEEK_API_KEY
# 输入: sk-xxxxx（从 DeepSeek 平台获取）

# Resend 邮件
wrangler secret put RESEND_API_KEY
# 输入: re_xxxxx（从 Resend 获取）

# 通知邮箱
wrangler secret put NOTIFY_EMAIL
# 输入: harry.zhang592802@gmail.com

# 管理 API Key（用于设置接口鉴权）
wrangler secret put ADMIN_API_KEY
# 输入: 自定义一个强密码
```

### 3. 创建数据库表

在 Supabase SQL Editor 中执行 `sql/create_tables.sql`

### 4. 本地开发

```bash
npm run dev
```

Worker 将在 `http://localhost:8787` 运行

### 5. 部署到 Cloudflare

```bash
npm run deploy
```

部署后会得到 Worker URL，如：`https://xk-truck-api.your-subdomain.workers.dev`

### 6. 配置自定义域名（可选）

在 Cloudflare Dashboard 中：
1. 进入 Workers & Pages
2. 选择 `xk-truck-api`
3. Settings → Triggers → Custom Domains
4. 添加 `api.xk-truck.cn`

## API 文档

### POST /api/inquiry

提交询盘表单

**请求体：**
```json
{
  "name": "John Smith",
  "email": "john@example.com",
  "company": "ABC Company",
  "phone": "+1234567890",
  "subject": "quote",
  "message": "I need a quote for...",
  "productId": "uuid",
  "productName": "Product Name",
  "source": "contact_form"
}
```

**响应：**
```json
{
  "success": true,
  "message": "Thank you for your inquiry!"
}
```

### POST /api/chat

AI 客服对话

**请求体：**
```json
{
  "message": "What products do you offer?",
  "sessionId": "session_123456"
}
```

**响应：**
```json
{
  "success": true,
  "aiEnabled": true,
  "reply": "We offer truck headlamps, mirrors...",
  "sessionId": "session_123456"
}
```

### GET /api/settings

获取 AI 设置

**响应：**
```json
{
  "success": true,
  "data": {
    "ai_enabled": false,
    "welcome_message": "Hello!",
    "system_prompt": "..."
  }
}
```

### PUT /api/settings

更新 AI 设置（需要 Authorization header）

**请求头：**
```
Authorization: Bearer YOUR_ADMIN_API_KEY
```

**请求体：**
```json
{
  "ai_enabled": true
}
```

## 环境变量

| 变量名 | 说明 | 必需 |
|--------|------|------|
| SUPABASE_URL | Supabase 项目 URL | ✅ |
| SUPABASE_SERVICE_KEY | Supabase Service Role Key | ✅ |
| DEEPSEEK_API_KEY | DeepSeek API Key | ✅ |
| RESEND_API_KEY | Resend API Key | ✅ |
| NOTIFY_EMAIL | 接收通知的邮箱 | ✅ |
| ADMIN_API_KEY | 管理接口鉴权密钥 | ✅ |
| CORS_ORIGIN | 允许的跨域来源 | 可选 |

## 目录结构

```
xk-truck-worker/
├── src/
│   ├── index.js          # 入口文件，路由
│   ├── handlers/
│   │   ├── inquiry.js    # 询盘处理
│   │   ├── chat.js       # AI 对话
│   │   └── settings.js   # 设置管理
│   └── lib/
│       ├── supabase.js   # Supabase 客户端
│       ├── email.js      # 邮件发送
│       └── deepseek.js   # DeepSeek AI
├── sql/
│   └── create_tables.sql # 数据库建表脚本
├── wrangler.toml         # Wrangler 配置
├── package.json
└── README.md
```

## 注意事项

1. **AI 默认关闭** - 首次部署后 AI 客服默认关闭，需要在管理后台或通过 API 开启
2. **邮件发送** - 需要在 Resend 中验证发送域名 `xk-truck.cn`
3. **CORS** - 生产环境建议设置 `CORS_ORIGIN` 为具体域名
4. **费用** - Cloudflare Workers 免费额度：10万次请求/天
