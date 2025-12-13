# Cloudflare Vectorize 向量搜索设置指南

## 1. 创建 Vectorize 索引

在 `xk-truck-worker` 目录下运行：

```bash
# 创建向量索引（1024 维度，对应 DeepSeek Embedding）
wrangler vectorize create xktruck-knowledge --dimensions=1024 --metric=cosine
```

## 2. 部署 Worker

```bash
wrangler deploy
```

> **注意**：Embedding 使用现有的 `DEEPSEEK_API_KEY`，无需额外配置。

## 4. 迁移现有知识库数据（可选）

如果你的 Supabase `knowledge_base` 表中已有数据，需要迁移到 Vectorize。

### 方法 A：通过 API 迁移

创建一个迁移脚本或调用 Worker API：

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

### 方法 B：批量迁移 API（推荐）

我们已经在 Worker 中添加了批量迁移端点：

```bash
# 调用迁移 API
curl -X POST https://your-worker.workers.dev/api/knowledge/migrate
```

## 5. 验证

```bash
# 测试向量搜索
curl -X POST https://your-worker.workers.dev/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "你们有什么产品", "sessionId": "test-123"}'
```

## 费用说明

| 项目 | 免费额度 | 超出后 |
|------|----------|--------|
| Vectorize 存储 | 500万向量/月 | $0.05/100万向量 |
| Vectorize 查询 | 3000万查询/月 | $0.01/100万查询 |
| DeepSeek Embedding | 使用现有 API Key | 包含在 DeepSeek 费用中 |

对于中小规模使用，成本几乎可以忽略。

## 架构说明

```
用户提问
    ↓
生成查询向量 (DeepSeek Embedding)
    ↓
Vectorize 相似度搜索
    ↓
返回相关知识 (score >= 0.7)
    ↓
AI 生成回复 (DeepSeek)
```

## 故障回退

如果 Vectorize 不可用，系统会自动回退到 Supabase 全文搜索，确保服务不中断。
