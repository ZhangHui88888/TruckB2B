/**
 * 管理后台 API Handler
 */
import { getSupabaseClient } from '../lib/supabase.js';

/**
 * 处理管理后台请求
 */
export async function handleAdmin(request, env, path) {
  const supabase = getSupabaseClient(env);
  
  // GET /api/admin/stats - 获取统计数据
  if (path === '/api/admin/stats' && request.method === 'GET') {
    return getStats(supabase);
  }
  
  // GET /api/admin/inquiries - 获取询盘列表
  if (path === '/api/admin/inquiries' && request.method === 'GET') {
    const url = new URL(request.url);
    return getInquiries(supabase, url.searchParams);
  }
  
  // PUT /api/admin/inquiries/:id - 更新询盘状态
  if (path.startsWith('/api/admin/inquiries/') && request.method === 'PUT') {
    const id = path.split('/').pop();
    const body = await request.json();
    return updateInquiry(supabase, id, body);
  }
  
  // GET /api/admin/conversations/sessions - 获取会话列表
  if (path === '/api/admin/conversations/sessions' && request.method === 'GET') {
    return getConversationSessions(supabase);
  }
  
  // GET /api/admin/conversations/:sessionId - 获取会话详情
  if (path.startsWith('/api/admin/conversations/') && request.method === 'GET') {
    const sessionId = path.split('/').pop();
    if (sessionId !== 'sessions') {
      return getConversationDetail(supabase, sessionId);
    }
  }
  
  // POST /api/admin/sync-products - 同步产品
  if (path === '/api/admin/sync-products' && request.method === 'POST') {
    return syncProducts(env);
  }
  
  return new Response(JSON.stringify({ error: 'Not Found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * 获取统计数据
 */
async function getStats(supabase) {
  try {
    // 今日询盘
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { count: todayInquiries } = await supabase
      .from('inquiries')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString());
    
    // 总询盘
    const { count: totalInquiries } = await supabase
      .from('inquiries')
      .select('*', { count: 'exact', head: true });
    
    // 产品数量
    const { count: totalProducts } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);
    
    return new Response(JSON.stringify({
      todayInquiries: todayInquiries || 0,
      totalInquiries: totalInquiries || 0,
      totalProducts: totalProducts || 0
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Stats error:', error);
    return new Response(JSON.stringify({ error: 'Failed to get stats' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * 获取询盘列表
 */
async function getInquiries(supabase, params) {
  try {
    const page = parseInt(params.get('page') || '1');
    const limit = parseInt(params.get('limit') || '20');
    const status = params.get('status');
    const subject = params.get('subject');
    const search = params.get('search');
    
    let query = supabase
      .from('inquiries')
      .select('*', { count: 'exact' });
    
    if (status) {
      query = query.eq('status', status);
    }
    
    if (subject) {
      query = query.eq('subject', subject);
    }
    
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }
    
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    
    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);
    
    if (error) throw error;
    
    return new Response(JSON.stringify({
      inquiries: data || [],
      total: count || 0,
      page,
      limit
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Inquiries error:', error);
    return new Response(JSON.stringify({ error: 'Failed to get inquiries' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * 更新询盘状态
 */
async function updateInquiry(supabase, id, data) {
  try {
    const { error } = await supabase
      .from('inquiries')
      .update({
        status: data.status,
        notes: data.notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);
    
    if (error) throw error;
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Update inquiry error:', error);
    return new Response(JSON.stringify({ error: 'Failed to update inquiry' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * 获取会话列表
 */
async function getConversationSessions(supabase) {
  try {
    // 获取所有会话的统计
    const { data: sessions, error } = await supabase
      .from('conversations')
      .select('session_id, created_at')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // 按 session_id 分组
    const sessionMap = new Map();
    (sessions || []).forEach(msg => {
      if (!sessionMap.has(msg.session_id)) {
        sessionMap.set(msg.session_id, {
          session_id: msg.session_id,
          message_count: 0,
          last_message: msg.created_at
        });
      }
      sessionMap.get(msg.session_id).message_count++;
    });
    
    const sessionList = Array.from(sessionMap.values())
      .sort((a, b) => new Date(b.last_message).getTime() - new Date(a.last_message).getTime())
      .slice(0, 50);
    
    // 统计
    const { count: totalMessages } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true });
    
    const { count: aiResponses } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('is_ai', true);
    
    return new Response(JSON.stringify({
      sessions: sessionList,
      totalMessages: totalMessages || 0,
      aiResponses: aiResponses || 0
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Sessions error:', error);
    return new Response(JSON.stringify({ error: 'Failed to get sessions' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * 获取会话详情
 */
async function getConversationDetail(supabase, sessionId) {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    
    return new Response(JSON.stringify({
      messages: data || []
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Conversation detail error:', error);
    return new Response(JSON.stringify({ error: 'Failed to get conversation' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * 同步产品（调用已有的同步脚本逻辑）
 */
async function syncProducts(env) {
  // 这里返回提示，实际同步通过前端脚本执行
  return new Response(JSON.stringify({
    success: false,
    error: 'Product sync should be run from the frontend scripts folder. Run: npm run sync:products'
  }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' }
  });
}
