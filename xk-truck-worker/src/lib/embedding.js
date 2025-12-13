/**
 * Embedding 向量生成模块
 * 使用 DeepSeek Embedding 模型（与 OpenAI API 兼容）
 */

const DEEPSEEK_EMBEDDING_URL = 'https://api.deepseek.com/v1/embeddings';
const EMBEDDING_MODEL = 'deepseek-embedding';
const EMBEDDING_DIMENSIONS = 1024; // DeepSeek embedding 维度

/**
 * 生成文本的向量表示
 * @param {Object} env - Worker 环境变量
 * @param {string} text - 要生成向量的文本
 * @returns {Promise<number[]>} - 1024 维向量
 */
export async function generateEmbedding(env, text) {
  if (!text || text.trim().length === 0) {
    throw new Error('Text cannot be empty');
  }

  // 清理文本，移除多余空白
  const cleanedText = text.trim().replace(/\s+/g, ' ');
  
  // 截断过长文本（建议 1000 字符以内效果最佳）
  const maxLength = 2000;
  const truncatedText = cleanedText.length > maxLength 
    ? cleanedText.substring(0, maxLength) 
    : cleanedText;

  const response = await fetch(DEEPSEEK_EMBEDDING_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.DEEPSEEK_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: truncatedText
    })
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('DeepSeek Embedding API error:', error);
    throw new Error(`Embedding API error: ${response.status}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

/**
 * 批量生成向量
 * @param {Object} env - Worker 环境变量
 * @param {string[]} texts - 文本数组
 * @returns {Promise<number[][]>} - 向量数组
 */
export async function generateEmbeddings(env, texts) {
  if (!texts || texts.length === 0) {
    return [];
  }

  // 清理文本
  const cleanedTexts = texts.map(t => t.trim().replace(/\s+/g, ' '));

  const response = await fetch(DEEPSEEK_EMBEDDING_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.DEEPSEEK_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: cleanedTexts
    })
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('DeepSeek Embedding API error:', error);
    throw new Error(`Embedding API error: ${response.status}`);
  }

  const data = await response.json();
  return data.data.map(d => d.embedding);
}

/**
 * 获取向量维度
 */
export function getEmbeddingDimensions() {
  return EMBEDDING_DIMENSIONS;
}
