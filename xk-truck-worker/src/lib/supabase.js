/**
 * Supabase 客户端工具
 */
import { createClient } from '@supabase/supabase-js';

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
 * 查询知识库（用于 RAG）
 */
export async function queryKnowledgeBase(env, query, limit = 5) {
  const supabase = getSupabaseClient(env);
  
  // 简单文本搜索（后续可升级为向量搜索）
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
