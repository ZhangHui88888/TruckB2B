/**
 * 知识库学习 Handler
 * 用于从对话中学习并扩充知识库
 */
import { 
  saveToKnowledgeBase, 
  checkDuplicateKnowledge,
  getPendingConversationsForReview,
  markConversationReviewed,
  getConversationHistory
} from '../lib/supabase.js';

/**
 * 自动学习：将高质量对话存入知识库
 * 触发条件：AI成功回复且使用了知识库
 */
export async function autoLearnFromConversation(env, sessionId, question, answer, metadata = {}) {
  try {
    // 检查是否已存在相似问题
    const isDuplicate = await checkDuplicateKnowledge(env, question);
    if (isDuplicate) {
      console.log('Similar knowledge already exists, skipping:', question.substring(0, 50));
      return { learned: false, reason: 'duplicate' };
    }

    // 保存到知识库
    await saveToKnowledgeBase(env, question, answer, {
      sessionId,
      autoLearned: true,
      ...metadata
    });

    console.log('Auto-learned new knowledge:', question.substring(0, 50));
    return { learned: true };
  } catch (error) {
    console.error('Auto-learn failed:', error);
    return { learned: false, reason: 'error', error: error.message };
  }
}

/**
 * 获取待审核的对话列表
 * GET /api/knowledge/pending
 */
export async function handleGetPendingReviews(request, env) {
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '20');
    
    const pending = await getPendingConversationsForReview(env, limit);
    
    // 为每个AI回复获取对应的用户问题
    const enrichedPending = [];
    for (const conv of pending) {
      const history = await getConversationHistory(env, conv.session_id, 20);
      
      // 找到这条AI回复之前的用户消息
      const convTime = new Date(conv.created_at).getTime();
      const userMessages = history.filter(h => 
        h.role === 'user' && 
        new Date(h.created_at).getTime() < convTime
      );
      
      const lastUserMessage = userMessages[userMessages.length - 1];
      
      enrichedPending.push({
        id: conv.id,
        sessionId: conv.session_id,
        question: lastUserMessage?.message || '[No question found]',
        answer: conv.message,
        createdAt: conv.created_at
      });
    }

    return new Response(JSON.stringify({
      success: true,
      data: enrichedPending
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Get pending reviews error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * 审核对话并决定是否入库
 * POST /api/knowledge/review
 * Body: { conversationId, approved, question?, answer? }
 */
export async function handleReviewConversation(request, env) {
  try {
    const body = await request.json();
    const { conversationId, approved, question, answer } = body;

    if (!conversationId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing conversationId'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 如果批准，保存到知识库
    if (approved && question && answer) {
      // 检查重复
      const isDuplicate = await checkDuplicateKnowledge(env, question);
      if (!isDuplicate) {
        await saveToKnowledgeBase(env, question, answer, {
          source: 'manual_review',
          conversationId
        });
      }
    }

    // 标记为已审核
    await markConversationReviewed(env, conversationId, approved);

    return new Response(JSON.stringify({
      success: true,
      message: approved ? 'Approved and added to knowledge base' : 'Rejected'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Review conversation error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * 手动添加知识条目
 * POST /api/knowledge/add
 * Body: { question, answer, metadata? }
 */
export async function handleAddKnowledge(request, env) {
  try {
    const body = await request.json();
    const { question, answer, metadata = {} } = body;

    if (!question || !answer) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing question or answer'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 检查重复
    const isDuplicate = await checkDuplicateKnowledge(env, question);
    if (isDuplicate) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Similar knowledge already exists'
      }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await saveToKnowledgeBase(env, question, answer, {
      source: 'manual',
      ...metadata
    });

    return new Response(JSON.stringify({
      success: true,
      message: 'Knowledge added successfully'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Add knowledge error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * 迁移现有知识库到 Vectorize
 * POST /api/knowledge/migrate
 */
export async function handleMigrateKnowledge(request, env) {
  try {
    const { getSupabaseClient } = await import('../lib/supabase.js');
    const { insertVector } = await import('../lib/vectorize.js');
    
    const supabase = getSupabaseClient(env);
    
    // 获取所有知识条目
    const { data: items, error } = await supabase
      .from('knowledge_base')
      .select('id, content, metadata')
      .order('created_at', { ascending: true });
    
    if (error) {
      throw error;
    }
    
    if (!items || items.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No knowledge items to migrate',
        count: 0
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 逐条迁移到 Vectorize
    let migrated = 0;
    let failed = 0;
    const errors = [];
    
    for (const item of items) {
      try {
        await insertVector(env, item.id.toString(), item.content, {
          question: item.metadata?.question || '',
          answer: item.metadata?.answer || '',
          source: item.metadata?.source || 'migration'
        });
        migrated++;
      } catch (err) {
        failed++;
        errors.push({ id: item.id, error: err.message });
        console.error(`Failed to migrate item ${item.id}:`, err);
      }
    }
    
    return new Response(JSON.stringify({
      success: true,
      message: `Migration completed: ${migrated} succeeded, ${failed} failed`,
      migrated,
      failed,
      errors: errors.slice(0, 10) // 只返回前10个错误
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Migration error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
