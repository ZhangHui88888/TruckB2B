# AI 客服和询盘功能部署记录

> 部署时间：2025-12-11

---

## 一、已完成的工作

### 1. Cloudflare Worker 后端

**API 地址：** `https://xk-truck-api.harry-zhang592802.workers.dev`

**功能接口：**
| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/health` | GET | 健康检查 |
| `/api/inquiry` | POST | 询盘表单提交 |
| `/api/chat` | POST | AI 客服对话 |
| `/api/settings` | GET/PUT | AI 开关设置 |

**已配置的 Secrets：**
- `SUPABASE_URL` - https://xktruck.supabase.co
- `SUPABASE_SERVICE_KEY` - sb_secret_CUSHbAvZlq7M-4OJgXby6g_cEV5aYHd
- `DEEPSEEK_API_KEY` - sk-e1cb78491f84483fbf9e550f7321603b
- `RESEND_API_KEY` - re_jf9cgopc_LXyEDqAR7tPjxmEYRti8nazh
- `NOTIFY_EMAIL` - harry.zhang592802@gmail.com
- `ADMIN_API_KEY` - xktruck_admin_2024_secure

### 2. 前端组件

- **ChatWidget.astro** - AI 聊天浮窗组件（已添加到 Layout）
- **contact.astro** - 联系表单（已连接 Worker API）

### 3. 数据库表（待执行）

SQL 脚本位置：`xk-truck-worker/sql/create_tables.sql`

需要创建的表：
- `inquiries` - 询盘记录
- `conversations` - 对话历史
- `settings` - AI 开关配置
- `knowledge_base` - 知识库（含初始 FAQ）

---

## 二、待完成的工作

### 1. 执行数据库建表脚本

在 Supabase SQL Editor 中执行 `xk-truck-worker/sql/create_tables.sql`

### 2. 更新前端环境变量

在 `xk-truck-frontend/` 目录创建 `.env` 文件：

```env
PUBLIC_SUPABASE_URL=https://xktruck.supabase.co
PUBLIC_SUPABASE_ANON_KEY=sb_publishable_VjrbThKmSR4LvYEeotnMlw_d8IZqYs4
PUBLIC_R2_PUBLIC_DOMAIN=images.xk-truck.cn
PUBLIC_API_URL=https://xk-truck-api.harry-zhang592802.workers.dev
```

### 3. 配置自定义域名（可选）

在 Cloudflare Dashboard 中：
1. Workers & Pages → xk-truck-api
2. Settings → Triggers → Custom Domains
3. 添加 `api.xk-truck.cn`

### 4. 验证 Resend 发送域名

在 Resend 中添加并验证 `xk-truck.cn` 域名，否则邮件可能发送失败。

---

## 三、功能说明

### AI 客服开关

- **默认状态：** 关闭
- **关闭时：** 记录对话 + 邮件通知，不自动回复
- **开启时：** 使用 DeepSeek AI 自动回复

**开启 AI 的方法：**

```bash
curl -X PUT https://xk-truck-api.harry-zhang592802.workers.dev/api/settings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer xktruck_admin_2024_secure" \
  -d '{"ai_enabled": true}'
```

### 询盘流程

1. 用户填写表单 → 提交到 `/api/inquiry`
2. Worker 保存到 Supabase `inquiries` 表
3. 通过 Resend 发送邮件通知到 harry.zhang592802@gmail.com

### AI 对话流程

1. 用户发送消息 → 提交到 `/api/chat`
2. Worker 检查 AI 开关状态
3. 如果开启：查询知识库 → 调用 DeepSeek → 返回回复
4. 如果关闭：返回默认消息 + 发送邮件通知

---

## 四、文件结构

```
xk-truck-worker/
├── src/
│   ├── index.js              # 入口，路由
│   ├── handlers/
│   │   ├── inquiry.js        # 询盘处理
│   │   ├── chat.js           # AI 对话
│   │   └── settings.js       # 设置管理
│   └── lib/
│       ├── supabase.js       # 数据库操作
│       ├── email.js          # 邮件发送
│       └── deepseek.js       # AI 调用
├── sql/
│   └── create_tables.sql     # 建表脚本
├── wrangler.toml             # Worker 配置
└── package.json

xk-truck-frontend/src/
├── components/
│   └── ChatWidget.astro      # AI 聊天组件
├── layouts/
│   └── Layout.astro          # 已添加 ChatWidget
└── pages/
    └── contact.astro         # 已连接 API
```

---

## 五、费用说明

| 服务 | 费用 |
|------|------|
| Cloudflare Workers | 免费（10万次/天） |
| Supabase | 免费（500MB） |
| Resend | 免费（100封/天） |
| DeepSeek API | 按量付费（约 $0.27/百万 tokens） |

---

## 六、后续维护

### 更新 Worker 代码

```bash
cd d:\github\funNovels\TruckB2B\xk-truck-worker
npm run deploy
```

### 查看 Worker 日志

```bash
wrangler tail
```

### 修改 Secrets

```bash
wrangler secret put SECRET_NAME
```

---

## 七、测试命令

### 健康检查
```bash
curl https://xk-truck-api.harry-zhang592802.workers.dev/api/health
```

### 测试询盘
```bash
curl -X POST https://xk-truck-api.harry-zhang592802.workers.dev/api/inquiry \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "subject": "quote",
    "message": "This is a test inquiry"
  }'
```

### 测试 AI 对话
```bash
curl -X POST https://xk-truck-api.harry-zhang592802.workers.dev/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What products do you offer?",
    "sessionId": "test_session_123"
  }'
```
