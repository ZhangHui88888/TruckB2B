/**
 * AI 客服对话 Handler
 */
import { saveConversation, getConversationHistory, getSettings, queryKnowledgeBase } from '../lib/supabase.js';
import { autoLearnFromConversation } from './knowledge-learn.js';
import { generateRAGResponse, extractSearchKeywords, generateStreamResponse } from '../lib/deepseek.js';
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

    // 2. 提取搜索关键词（支持多语言）
    // 从用户消息中提取英文关键词用于知识库搜索
    let searchQuery = message;
    try {
      searchQuery = await extractSearchKeywords(env, message);
    } catch (err) {
      console.log('Keyword extraction failed, using original message:', err);
    }

    // 3. 查询知识库（用英文关键词搜索）
    let knowledgeContext = [];
    try {
      knowledgeContext = await queryKnowledgeBase(env, searchQuery, 3);
    } catch (kbError) {
      console.error('Knowledge base query failed:', kbError);
      // 继续，不影响主流程
    }

    // 4. 构建消息历史（清理 Markdown 格式）
    const cleanText = (text) => text ? text.replace(/\*\*/g, '').replace(/\*/g, '').replace(/#{1,6}\s/g, '').trim() : '';
    
    const messages = history.map(h => ({
      role: h.role,
      content: cleanText(h.message)
    }));
    
    // 添加当前消息
    messages.push({ role: 'user', content: message });

    // 5. 调用 AI 生成回复
    const aiReply = await generateRAGResponse(
      env,
      messages,
      knowledgeContext,
      settings.system_prompt
    );

    // 6. 清理 AI 回复中的 Markdown
    const cleanReply = cleanText(aiReply);
    
    // 7. 保存 AI 回复
    await saveConversation(env, {
      sessionId,
      role: 'assistant',
      message: cleanReply,
      isAi: true,
      metadata: { knowledgeUsed: knowledgeContext.length > 0 }
    });

    // 8. 自动学习（当未使用知识库时，说明是新问题，可以学习）
    if (settings.auto_learn_enabled && knowledgeContext.length === 0) {
      // 异步执行，不阻塞响应
      autoLearnFromConversation(env, sessionId, message, cleanReply).catch(err => {
        console.error('Auto-learn failed:', err);
      });
    }

    return new Response(JSON.stringify({
      success: true,
      aiEnabled: true,
      reply: cleanReply,
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

/**
 * 处理 AI 客服对话（流式输出）
 */
export async function handleChatStream(request, env) {
  try {
    const body = await request.json();
    const { message, sessionId } = body;

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

    // 如果 AI 关闭
    if (!settings.ai_enabled) {
      sendChatNotification(env, { sessionId, message }).catch(console.error);
      return new Response(JSON.stringify({
        success: true,
        aiEnabled: false,
        reply: settings.welcome_message || "Thank you for your message! Our team will get back to you shortly."
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 获取对话历史
    const history = await getConversationHistory(env, sessionId, 10);

    // 提取搜索关键词
    let searchQuery = message;
    try {
      searchQuery = await extractSearchKeywords(env, message);
    } catch (err) {
      console.log('Keyword extraction failed:', err);
    }

    // 查询知识库
    let knowledgeContext = [];
    try {
      knowledgeContext = await queryKnowledgeBase(env, searchQuery, 3);
    } catch (kbError) {
      console.error('Knowledge base query failed:', kbError);
    }

    // 构建消息历史（清理 Markdown 格式）
    const cleanText = (text) => text ? text.replace(/\*\*/g, '').replace(/\*/g, '').replace(/#{1,6}\s/g, '').trim() : '';
    
    const messages = history.map(h => ({
      role: h.role,
      content: cleanText(h.message)
    }));
    // 添加当前消息，并提示 AI 用相同语言回复
    messages.push({ role: 'user', content: `[Respond in the same language as this message] ${message}` });

    // 获取流式响应
    const stream = await generateStreamResponse(
      env,
      messages,
      knowledgeContext,
      settings.system_prompt
    );

    // 创建 TransformStream 来处理和收集完整回复
    let fullReply = '';
    let buffer = '';  // 缓存不完整的数据
    
    const { readable, writable } = new TransformStream({
      transform(chunk, controller) {
        const text = new TextDecoder().decode(chunk);
        buffer += text;
        
        // 按 \n\n 分割，保留最后一个可能不完整的部分
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';  // 最后一个可能不完整，保留到下次
        
        for (const part of parts) {
          const line = part.trim();
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              continue;
            }
            try {
              const json = JSON.parse(data);
              const content = json.choices?.[0]?.delta?.content || '';
              if (content) {
                fullReply += content;
                controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content })}\n\n`));
              }
            } catch (e) {
              console.error('SSE parse error:', e, 'data:', data);
            }
          }
        }
      },
      async flush(controller) {
        // 流结束时保存完整回复
        if (fullReply) {
          await saveConversation(env, {
            sessionId,
            role: 'assistant',
            message: fullReply,
            isAi: true,
            metadata: { knowledgeUsed: knowledgeContext.length > 0 }
          });
        }
        controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
      }
    });

    // 将原始流通过 TransformStream
    stream.pipeTo(writable);

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });

  } catch (error) {
    console.error('Chat stream error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Stream failed'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
