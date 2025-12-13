/**
 * Cloudflare Vectorize 向量数据库操作模块
 */

import { generateEmbedding } from './embedding.js';

/**
 * 将知识条目插入向量数据库
 * @param {Object} env - Worker 环境变量（包含 VECTORIZE 绑定）
 * @param {string} id - 唯一标识符
 * @param {string} content - 知识内容
 * @param {Object} metadata - 元数据
 */
export async function insertVector(env, id, content, metadata = {}) {
  // 生成向量
  const embedding = await generateEmbedding(env, content);
  
  // 插入 Vectorize
  await env.VECTORIZE.insert([{
    id,
    values: embedding,
    metadata: {
      content: content.substring(0, 1000), // 存储内容摘要用于返回
      ...metadata
    }
  }]);
  
  return { id, success: true };
}

/**
 * 批量插入向量
 * @param {Object} env - Worker 环境变量
 * @param {Array<{id: string, content: string, metadata?: Object}>} items - 知识条目数组
 */
export async function insertVectors(env, items) {
  const { generateEmbeddings } = await import('./embedding.js');
  
  // 批量生成向量
  const contents = items.map(item => item.content);
  const embeddings = await generateEmbeddings(env, contents);
  
  // 构建向量记录
  const vectors = items.map((item, index) => ({
    id: item.id,
    values: embeddings[index],
    metadata: {
      content: item.content.substring(0, 1000),
      ...item.metadata
    }
  }));
  
  // 批量插入（Vectorize 单次最多 1000 条）
  const batchSize = 100;
  for (let i = 0; i < vectors.length; i += batchSize) {
    const batch = vectors.slice(i, i + batchSize);
    await env.VECTORIZE.insert(batch);
  }
  
  return { count: vectors.length, success: true };
}

/**
 * 向量相似度搜索
 * @param {Object} env - Worker 环境变量
 * @param {string} query - 查询文本
 * @param {number} topK - 返回结果数量
 * @returns {Promise<Array<{id: string, score: number, content: string, metadata: Object}>>}
 */
export async function searchVectors(env, query, topK = 5) {
  // 生成查询向量
  const queryEmbedding = await generateEmbedding(env, query);
  
  // 向量搜索
  const results = await env.VECTORIZE.query(queryEmbedding, {
    topK,
    returnMetadata: true
  });
  
  // 格式化结果
  return results.matches.map(match => ({
    id: match.id,
    score: match.score,
    content: match.metadata?.content || '',
    metadata: match.metadata || {}
  }));
}

/**
 * 删除向量
 * @param {Object} env - Worker 环境变量
 * @param {string[]} ids - 要删除的向量 ID 数组
 */
export async function deleteVectors(env, ids) {
  await env.VECTORIZE.deleteByIds(ids);
  return { deleted: ids.length, success: true };
}

/**
 * 更新向量（删除后重新插入）
 * @param {Object} env - Worker 环境变量
 * @param {string} id - 向量 ID
 * @param {string} content - 新内容
 * @param {Object} metadata - 新元数据
 */
export async function updateVector(env, id, content, metadata = {}) {
  // Vectorize 使用 upsert 语义，相同 ID 会覆盖
  return await insertVector(env, id, content, metadata);
}
