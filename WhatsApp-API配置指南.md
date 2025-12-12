# WhatsApp Business API 配置指南

本文档说明如何配置 WhatsApp Business API，实现 AI 自动回复和对话记录采集。

---

## 一、前置条件

- [x] Cloudflare Worker 已部署
- [x] Supabase 数据库已配置
- [x] DeepSeek API 已配置
- [ ] Meta 开发者账号已验证（需要海外手机号）

---

## 二、Meta 开发者平台配置

### 1. 创建应用

1. 访问 [Meta for Developers](https://developers.facebook.com/)
2. 登录 Facebook 账号
3. 点击「My Apps」→「Create App」
4. 选择「Other」→「Business」
5. 填写应用信息：
   - App name: `XKTRUCK`
   - App contact email: `harry.zhang592802@gmail.com`

### 2. 添加 WhatsApp 产品

1. 在应用仪表板，点击「Add Product」
2. 找到「WhatsApp」，点击「Set up」
3. 选择或创建 Meta Business Account

### 3. 获取 API 凭证

在 WhatsApp → API Setup 页面获取：

| 凭证 | 说明 | 位置 |
|------|------|------|
| **Phone Number ID** | 电话号码 ID | API Setup 页面 |
| **Access Token** | 临时访问令牌 | API Setup 页面（点击生成） |
| **Verify Token** | 自定义验证令牌 | 自己设置，如 `xktruck_webhook_2024` |

### 4. 配置 Webhook

1. 在 WhatsApp → Configuration 页面
2. 点击「Edit」配置 Webhook
3. 填写：
   - **Callback URL**: `https://xk-truck-api.你的账号.workers.dev/api/whatsapp/webhook`
   - **Verify Token**: `xktruck_webhook_2024`（与 Worker 配置一致）
4. 订阅字段：勾选 `messages`

---

## 三、Cloudflare Worker 配置

### 1. 设置环境变量

在项目目录执行：

```bash
cd xk-truck-worker

# 设置 WhatsApp 凭证
wrangler secret put WHATSAPP_PHONE_NUMBER_ID
# 输入从 Meta 获取的 Phone Number ID

wrangler secret put WHATSAPP_ACCESS_TOKEN
# 输入从 Meta 获取的 Access Token

wrangler secret put WHATSAPP_VERIFY_TOKEN
# 输入自定义的验证令牌，如：xktruck_webhook_2024
```

### 2. 部署 Worker

```bash
wrangler deploy
```

---

## 四、Supabase 数据库配置

在 Supabase SQL Editor 中执行 `sql/whatsapp-tables.sql` 创建表：

```sql
-- 执行 xk-truck-worker/sql/whatsapp-tables.sql 中的内容
```

这会创建：
- `whatsapp_conversations` - 对话记录表
- `whatsapp_messages` - 消息记录表
- `whatsapp_stats` - 统计视图

---

## 五、API 端点

配置完成后，以下 API 可用：

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/whatsapp/webhook` | GET | Meta Webhook 验证 |
| `/api/whatsapp/webhook` | POST | 接收 WhatsApp 消息 |
| `/api/whatsapp/conversations` | GET | 获取对话列表 |
| `/api/whatsapp/conversations/:id/messages` | GET | 获取对话消息 |

---

## 六、功能说明

### 自动回复流程

```
客户发送 WhatsApp 消息
    ↓
Meta 转发到 Webhook
    ↓
Worker 接收并存储消息
    ↓
调用 DeepSeek AI 生成回复
    ↓
通过 WhatsApp API 发送回复
    ↓
存储 AI 回复到数据库
```

### AI 回复特点

- 使用知识库内容回答产品问题
- 保持对话上下文（最近 10 条消息）
- 支持多语言（根据客户语言回复）
- 专业友好的客服风格

---

## 七、待配置项清单

完成 Meta 开发者验证后，需要配置：

| 配置项 | 值 | 状态 |
|--------|-----|------|
| WHATSAPP_PHONE_NUMBER_ID | 从 Meta 获取 | ⏳ 待配置 |
| WHATSAPP_ACCESS_TOKEN | 从 Meta 获取 | ⏳ 待配置 |
| WHATSAPP_VERIFY_TOKEN | xktruck_webhook_2024 | ⏳ 待配置 |
| Webhook URL | https://xk-truck-api.xxx.workers.dev/api/whatsapp/webhook | ⏳ 待配置 |
| Supabase 表 | 执行 whatsapp-tables.sql | ⏳ 待执行 |

---

## 八、测试步骤

1. 配置完成后，在 Meta 开发者平台发送测试消息
2. 检查 Worker 日志：`wrangler tail`
3. 检查 Supabase 数据库是否有记录
4. 验证 AI 回复是否正常

---

## 九、注意事项

### Access Token 有效期

- 临时令牌有效期约 24 小时
- 生产环境需要配置永久令牌（System User Token）
- 参考：[Meta 文档 - 访问令牌](https://developers.facebook.com/docs/whatsapp/business-management-api/get-started)

### 消息模板

- 24 小时外回复需要使用消息模板
- 模板需要在 Meta Business Manager 中创建和审核
- 当前代码仅支持 24 小时内的会话消息

### 费用

- WhatsApp Business API 按对话收费
- 前 1000 条对话/月免费
- 参考：[WhatsApp 定价](https://developers.facebook.com/docs/whatsapp/pricing)

---

*最后更新: 2025-12-12*
