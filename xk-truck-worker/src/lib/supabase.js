/**
 * Supabase 客户端工具
 */
import { createClient } from '@supabase/supabase-js';
import { insertVector, searchVectors } from './vectorize.js';

/**
 * 创建 Supabase 客户端
 * @param {Object} env - Worker 环境变量
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
export function getSupabaseClient(env) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
}

/**
 * 保存询盘记录
 */
export async function saveInquiry(env, data) {
  const supabase = getSupabaseClient(env);
  const { error } = await supabase.from('inquiries').insert({
    name: data.name,
    email: data.email,
    company: data.company || null,
    phone: data.phone || null,
    subject: data.subject,
    message: data.message,
    product_id: data.productId || null,
    product_name: data.productName || null,
    source: data.source || 'website',
    status: 'new',
    created_at: new Date().toISOString()
  });
  
  if (error) {
    console.error('Error saving inquiry:', error);
    throw error;
  }
}

/**
 * 保存对话记录
 */
export async function saveConversation(env, data) {
  const supabase = getSupabaseClient(env);
  const { error } = await supabase.from('conversations').insert({
    session_id: data.sessionId,
    role: data.role, // 'user' 或 'assistant'
    message: data.message,
    is_ai: data.isAi || false,
    metadata: data.metadata || null,
    created_at: new Date().toISOString()
  });
  
  if (error) {
    console.error('Error saving conversation:', error);
    throw error;
  }
}

/**
 * 获取对话历史
 */
export async function getConversationHistory(env, sessionId, limit = 10) {
  const supabase = getSupabaseClient(env);
  const { data, error } = await supabase
    .from('conversations')
    .select('role, message, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
    .limit(limit);
  
  if (error) {
    console.error('Error fetching conversation history:', error);
    return [];
  }
  
  return data || [];
}

/**
 * 获取系统设置
 */
export async function getSettings(env) {
  const supabase = getSupabaseClient(env);
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .eq('key', 'ai_config')
    .single();
  
  if (error) {
    console.error('Error fetching settings:', error);
    // 返回默认设置
    return {
      ai_enabled: false,
      welcome_message: 'Hello! How can I help you today?',
      system_prompt: 'You are a helpful customer service assistant for XKTRUCK, a heavy truck parts supplier.'
    };
  }
  
  return data?.value || {
    ai_enabled: false,
    welcome_message: 'Hello! How can I help you today?',
    system_prompt: 'You are a helpful customer service assistant for XKTRUCK, a heavy truck parts supplier.'
  };
}

/**
 * 更新系统设置
 */
export async function updateSettings(env, settings) {
  const supabase = getSupabaseClient(env);
  const { error } = await supabase
    .from('settings')
    .upsert({
      key: 'ai_config',
      value: settings,
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' });
  
  if (error) {
    console.error('Error updating settings:', error);
    throw error;
  }
}

/**
 * 将对话保存到知识库（用于AI学习）
 * 同时存入 Supabase（原始数据）和 Vectorize（向量索引）
 * @param {Object} env - 环境变量
 * @param {string} question - 用户问题
 * @param {string} answer - AI回答
 * @param {Object} metadata - 元数据（来源、质量评分等）
 */
export async function saveToKnowledgeBase(env, question, answer, metadata = {}) {
  const supabase = getSupabaseClient(env);
  
  // 构建知识条目内容
  const content = `Q: ${question}\nA: ${answer}`;
  
  // 1. 先存入 Supabase（获取 ID）
  const { data, error } = await supabase.from('knowledge_base').insert({
    content,
    metadata: {
      source: 'conversation',
      question,
      answer,
      learned_at: new Date().toISOString(),
      ...metadata
    },
    created_at: new Date().toISOString()
  }).select('id').single();
  
  if (error) {
    console.error('Error saving to knowledge base:', error);
    throw error;
  }
  
  // 2. 存入 Vectorize（向量索引）
  try {
    await insertVector(env, data.id.toString(), content, {
      question,
      answer,
      source: metadata.source || 'conversation'
    });
  } catch (vectorError) {
    console.error('Error inserting vector:', vectorError);
    // 向量插入失败不影响主流程，数据已存入 Supabase
  }
  
  return data.id;
}

/**
 * 检查知识库中是否已存在相似问题（避免重复）
 */
export async function checkDuplicateKnowledge(env, question, threshold = 0.8) {
  const supabase = getSupabaseClient(env);
  
  // 简单检查：搜索相似问题
  const { data } = await supabase
    .from('knowledge_base')
    .select('content')
    .textSearch('content', question, { type: 'websearch' })
    .limit(1);
  
  return data && data.length > 0;
}

/**
 * 查询知识库（用于 RAG）
 * 优先使用向量搜索，失败时回退到全文搜索
 */
export async function queryKnowledgeBase(env, query, limit = 5) {
  // 1. 尝试向量搜索
  try {
    if (env.VECTORIZE) {
      const vectorResults = await searchVectors(env, query, limit);
      if (vectorResults && vectorResults.length > 0) {
        // 过滤低相似度结果（阈值 0.7）
        const filtered = vectorResults.filter(r => r.score >= 0.7);
        if (filtered.length > 0) {
          return filtered.map(r => ({
            content: r.content,
            metadata: r.metadata,
            score: r.score
          }));
        }
      }
    }
  } catch (vectorError) {
    console.error('Vector search failed, falling back to text search:', vectorError);
  }
  
  // 2. 回退到全文搜索
  const supabase = getSupabaseClient(env);
  const { data, error } = await supabase
    .from('knowledge_base')
    .select('content, metadata')
    .textSearch('content', query, { type: 'websearch' })
    .limit(limit);
  
  if (error) {
    console.error('Error querying knowledge base:', error);
    return [];
  }
  
  return data || [];
}

/**
 * 获取待审核的对话（用于人工审核入库）
 */
export async function getPendingConversationsForReview(env, limit = 20) {
  const supabase = getSupabaseClient(env);
  
  // 获取最近的成功对话（AI回复且未标记为已审核）
  const { data, error } = await supabase
    .from('conversations')
    .select('id, session_id, role, message, metadata, created_at')
    .eq('is_ai', true)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) {
    console.error('Error fetching pending conversations:', error);
    return [];
  }
  
  // 过滤未审核的
  return (data || []).filter(c => !c.metadata?.reviewed);
}

/**
 * 标记对话为已审核
 */
export async function markConversationReviewed(env, conversationId, approved = false) {
  const supabase = getSupabaseClient(env);
  
  const { error } = await supabase
    .from('conversations')
    .update({
      metadata: {
        reviewed: true,
        approved,
        reviewed_at: new Date().toISOString()
      }
    })
    .eq('id', conversationId);
  
  if (error) {
    console.error('Error marking conversation reviewed:', error);
    throw error;
  }
}
