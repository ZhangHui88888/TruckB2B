/**
 * AI 客服对话 Handler
 */
import { saveConversation, getConversationHistory, getSettings, queryKnowledgeBase } from '../lib/supabase.js';
import { generateRAGResponse } from '../lib/deepseek.js';
import { sendChatNotification } from '../lib/email.js';

/**
 * 处理 AI 客服对话
 */
export async function handleChat(request, env) {
  try {
    const body = await request.json();
    const { message, sessionId } = body;

    // 验证必填字段
    if (!message || !sessionId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required fields: message, sessionId'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 保存用户消息
    await saveConversation(env, {
      sessionId,
      role: 'user',
      message: message.trim(),
      isAi: false
    });

    // 获取 AI 设置
    const settings = await getSettings(env);

    // 如果 AI 关闭，只记录并通知
    if (!settings.ai_enabled) {
      // 发送邮件通知（异步，不阻塞响应）
      sendChatNotification(env, { sessionId, message }).catch(console.error);

      return new Response(JSON.stringify({
        success: true,
        aiEnabled: false,
        reply: settings.welcome_message || "Thank you for your message! Our team will get back to you shortly. For faster response, please contact us via WhatsApp.",
        sessionId
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // AI 开启，生成回复
    // 1. 获取对话历史
    const history = await getConversationHistory(env, sessionId, 10);

    // 2. 查询知识库（可选）
    let knowledgeContext = [];
    try {
      knowledgeContext = await queryKnowledgeBase(env, message, 3);
    } catch (kbError) {
      console.error('Knowledge base query failed:', kbError);
      // 继续，不影响主流程
    }

    // 3. 构建消息历史
    const messages = history.map(h => ({
      role: h.role,
      content: h.message
    }));
    
    // 添加当前消息
    messages.push({ role: 'user', content: message });

    // 4. 调用 AI 生成回复
    const aiReply = await generateRAGResponse(
      env,
      messages,
      knowledgeContext,
      settings.system_prompt
    );

    // 5. 保存 AI 回复
    await saveConversation(env, {
      sessionId,
      role: 'assistant',
      message: aiReply,
      isAi: true,
      metadata: { knowledgeUsed: knowledgeContext.length > 0 }
    });

    return new Response(JSON.stringify({
      success: true,
      aiEnabled: true,
      reply: aiReply,
      sessionId
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Chat handler error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to process message. Please try again.',
      reply: "I'm sorry, I encountered an error. Please try again or contact us via WhatsApp for immediate assistance."
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
