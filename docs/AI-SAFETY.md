# AI 客服安全与验证指南

本文档说明如何验证 AI 客服的工作状态，以及如何防止 AI 回答错误信息造成损失。

---

## 一、如何验证向量搜索是否工作

### 方法 1：查看 Worker 日志（最直接）

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
[2025-12-13 10:30:15] Extracting keywords from: "VOLVO 大灯多少钱？"
[2025-12-13 10:30:15] Keywords: "VOLVO headlamp price"
[2025-12-13 10:30:16] Vector search results: 3 items
[2025-12-13 10:30:16]   - Score: 0.92 - "VOLVO FH4 LED headlamp: $180"
[2025-12-13 10:30:16]   - Score: 0.85 - "VOLVO FH4 Halogen: $120"
[2025-12-13 10:30:16]   - Score: 0.73 - "All headlamps: 1-year warranty"

# ⚠️ 回退到全文搜索
[2025-12-13 10:30:20] Vector search failed: Vectorize not available
[2025-12-13 10:30:20] Falling back to text search
[2025-12-13 10:30:20] Text search results: 2 items

# ❌ 两者都失败
[2025-12-13 10:30:25] Vector search failed: API timeout
[2025-12-13 10:30:25] Text search failed: Database error
[2025-12-13 10:30:25] No knowledge found, using general knowledge
```

### 方法 2：API 响应中的调试信息

**开发环境会返回调试信息：**

```bash
# 测试 API
curl -X POST https://your-worker.workers.dev/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "VOLVO 大灯多少钱？",
    "sessionId": "test-123"
  }'
```

**响应示例：**

```json
{
  "success": true,
  "aiEnabled": true,
  "reply": "我们的 VOLVO FH4 大灯有两种选择：LED 款 $180，卤素款 $120...",
  "sessionId": "test-123",
  "debug": {
    "knowledgeUsed": true,
    "knowledgeCount": 3,
    "searchMethod": "vector",
    "scores": [0.92, 0.85, 0.73]
  }
}
```

**字段说明：**
- `knowledgeUsed`: 是否使用了知识库
- `knowledgeCount`: 找到的知识条目数量
- `searchMethod`: `"vector"` 或 `"text"`
- `scores`: 相似度分数（只有向量搜索有）

### 方法 3：在浏览器控制台查看

打开浏览器开发者工具（F12），在 Console 中查看：

```javascript
// 前端会打印调试信息
[ChatWidget] Sending message: "VOLVO 大灯多少钱？"
[ChatWidget] Response: {
  debug: {
    searchMethod: "vector",
    knowledgeCount: 3,
    scores: [0.92, 0.85, 0.73]
  }
}
```

### 方法 4：检查 Vectorize 状态

```bash
# 查看 Vectorize 索引
wrangler vectorize list

# 查看索引详情
wrangler vectorize get xktruck-knowledge

# 输出示例：
# Index: xktruck-knowledge
# Dimensions: 1024
# Metric: cosine
# Vectors: 23
# Status: ready
```

---

## 二、防止 AI 回答错误信息的策略

### 问题：两者都失败时的风险

```
场景：向量搜索 + 全文搜索都失败
  ↓
AI 基于通用知识回答
  ↓
可能的问题：
  ❌ 价格不准确（瞎编价格）
  ❌ 产品信息错误（说有实际没有的产品）
  ❌ 政策错误（质保、运输等）
  ❌ 联系方式错误
```

### 解决方案 1：禁止 AI 回答敏感信息（推荐）

**修改系统提示词：**

```javascript
// 在管理后台 → 系统设置 → 系统提示词中添加：

CRITICAL RULES:
1. NEVER provide specific prices unless you have exact information from the knowledge base
2. NEVER make up product specifications or OE numbers
3. If you don't have information in the knowledge base, say:
   "I don't have that specific information right now. Please contact us at harry.zhang592802@gmail.com or WhatsApp +86 130-6287-0118 for accurate details."
4. For pricing inquiries without knowledge base info, say:
   "For accurate pricing, please send us an inquiry with your specific requirements."
5. Always be honest about what you know and don't know

SAFE RESPONSES:
- General company information (factory size, certifications, experience)
- Product categories we offer
- How to contact us
- General inquiry process

UNSAFE RESPONSES (require knowledge base):
- Specific product prices
- Exact OE numbers
- Detailed specifications
- Warranty terms
- Shipping costs
```

### 解决方案 2：在代码中检测并拦截

修改 `chat.js`，当没有知识库时给出安全回复：

```javascript
// 如果没有找到知识库
if (knowledgeContext.length === 0) {
  // 检测是否是敏感问题
  const sensitiveKeywords = ['price', 'cost', '价格', '多少钱', 'how much', 'warranty', '质保'];
  const isSensitive = sensitiveKeywords.some(keyword => 
    message.toLowerCase().includes(keyword)
  );
  
  if (isSensitive) {
    // 返回安全的标准回复
    const safeReply = "Thank you for your inquiry! For accurate pricing and detailed product information, please contact us:\n\n" +
      "📧 Email: harry.zhang592802@gmail.com\n" +
      "📱 WhatsApp: +86 130-6287-0118\n\n" +
      "Our team will provide you with the most up-to-date information and a customized quote.";
    
    await saveConversation(env, {
      sessionId,
      role: 'assistant',
      message: safeReply,
      isAi: true,
      metadata: { safeMode: true, reason: 'no_knowledge' }
    });
    
    return new Response(JSON.stringify({
      success: true,
      aiEnabled: true,
      reply: safeReply,
      sessionId,
      safeMode: true
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
```

### 解决方案 3：人工审核模式（最安全）

**初期建议配置：**

```javascript
// 管理后台 → 系统设置
{
  "ai_enabled": false,  // 关闭 AI 自动回复
  "welcome_message": "Thank you for your message! Our team will respond within 24 hours. For urgent inquiries, please contact us via WhatsApp: +86 130-6287-0118"
}
```

**工作流程：**
```
用户提问
  ↓
保存到数据库
  ↓
发送邮件通知管理员
  ↓
管理员人工回复（通过邮件或 WhatsApp）
```

**优势：**
- ✅ 100% 准确
- ✅ 无风险
- ✅ 可以积累对话数据

**劣势：**
- ❌ 响应慢
- ❌ 需要人工处理

### 解决方案 4：混合模式（平衡）

**配置：**

```javascript
{
  "ai_enabled": true,
  "auto_learn_enabled": false,  // 关闭自动学习
  "safe_mode": true,  // 启用安全模式
  "system_prompt": "... [包含上述 CRITICAL RULES] ..."
}
```

**工作流程：**
```
用户提问
  ↓
尝试向量搜索 + 全文搜索
  ↓
找到知识？
  ├─ 是 → AI 基于知识回答（安全）
  └─ 否 → 检测是否敏感问题
      ├─ 是 → 返回标准回复（引导联系）
      └─ 否 → AI 基于通用知识回答（低风险）
```

---

## 三、监控和告警

### 1. 设置邮件告警

当知识库搜索失败时发送通知：

```javascript
// 在 chat.js 中添加
if (knowledgeContext.length === 0) {
  // 发送告警邮件
  sendAlertEmail(env, {
    subject: '⚠️ AI 客服知识库搜索失败',
    message: `用户问题: ${message}\n会话ID: ${sessionId}\n时间: ${new Date().toISOString()}`
  }).catch(console.error);
}
```

### 2. 记录失败日志

```javascript
// 保存到 Supabase
await supabase.from('ai_failures').insert({
  session_id: sessionId,
  user_message: message,
  failure_type: 'no_knowledge',
  timestamp: new Date().toISOString()
});
```

### 3. 定期检查

**每周检查清单：**
- [ ] 查看 AI 失败日志
- [ ] 检查 Vectorize 状态
- [ ] 审核新增的对话
- [ ] 更新知识库（添加常见问题）
- [ ] 测试关键场景（价格、产品、政策）

---

## 四、测试场景

### 安全测试用例

```bash
# 测试 1：价格询问（敏感）
curl -X POST https://your-worker.workers.dev/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "VOLVO 大灯多少钱？", "sessionId": "test-1"}'

# 期望：如果知识库有信息，返回准确价格；否则引导联系

# 测试 2：产品询问（一般）
curl -X POST https://your-worker.workers.dev/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "你们有 VOLVO 配件吗？", "sessionId": "test-2"}'

# 期望：可以基于通用知识回答（我们有 VOLVO 全系列配件）

# 测试 3：公司信息（安全）
curl -X POST https://your-worker.workers.dev/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "你们工厂在哪里？", "sessionId": "test-3"}'

# 期望：可以回答（中国，35,000㎡）

# 测试 4：不存在的产品（危险）
curl -X POST https://your-worker.workers.dev/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "你们有特斯拉配件吗？", "sessionId": "test-4"}'

# 期望：诚实回答"我们专注于重型卡车配件，不提供特斯拉配件"
```

---

## 五、推荐配置（按阶段）

### 阶段 1：开发测试（当前）

```javascript
{
  "ai_enabled": true,
  "auto_learn_enabled": false,
  "safe_mode": true,
  "environment": "development"  // 返回调试信息
}
```

**特点：**
- ✅ AI 开启，方便测试
- ✅ 返回调试信息，便于验证
- ✅ 安全模式，防止错误回答
- ✅ 关闭自动学习，避免学到测试数据

### 阶段 2：内部测试

```javascript
{
  "ai_enabled": true,
  "auto_learn_enabled": false,
  "safe_mode": true,
  "environment": "staging"
}
```

**特点：**
- ✅ 邀请团队成员测试
- ✅ 收集真实问题
- ✅ 人工审核所有对话
- ✅ 逐步完善知识库

### 阶段 3：小范围上线

```javascript
{
  "ai_enabled": true,
  "auto_learn_enabled": false,
  "safe_mode": true,
  "environment": "production"
}
```

**特点：**
- ✅ 对外开放
- ✅ 每天检查对话记录
- ✅ 快速修正错误回答
- ✅ 持续优化知识库

### 阶段 4：稳定运行

```javascript
{
  "ai_enabled": true,
  "auto_learn_enabled": true,  // 可以开启自动学习
  "safe_mode": true,
  "environment": "production"
}
```

**特点：**
- ✅ 知识库已完善
- ✅ 开启自动学习
- ✅ 每周检查一次
- ✅ 定期清理低质量知识

---

## 六、常见问题

**Q1: 如何知道 AI 是否在瞎编？**

A: 查看日志中的 `knowledgeUsed` 字段：
- `true` = 基于知识库回答（可信）
- `false` = 基于通用知识回答（需谨慎）

**Q2: 如果 AI 回答错了怎么办？**

A: 
1. 立即在管理后台查看对话记录
2. 记录错误回答
3. 更新知识库，添加正确答案
4. 如果是敏感错误（价格、政策），考虑主动联系客户更正

**Q3: 应该什么时候开启 AI？**

A: 建议满足以下条件后再开启：
- ✅ 知识库至少有 50+ 条高质量内容
- ✅ 测试了所有关键场景
- ✅ 配置了安全模式和告警
- ✅ 有人每天检查对话记录

**Q4: 如何平衡自动化和安全性？**

A: 使用混合模式：
- 一般问题：AI 自动回答
- 敏感问题：引导人工联系
- 复杂问题：AI 提供初步信息 + 建议联系

---

*最后更新: 2025-12-13*
