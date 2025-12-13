/**
 * WhatsApp Business API Handler
 * 处理 WhatsApp 消息接收和发送
 * 
 * 需要配置的环境变量（通过 wrangler secret put 设置）：
 * - WHATSAPP_PHONE_NUMBER_ID: WhatsApp 商业账号的电话号码 ID
 * - WHATSAPP_ACCESS_TOKEN: Meta Graph API 访问令牌
 * - WHATSAPP_VERIFY_TOKEN: Webhook 验证令牌（自定义字符串）
 */

import { getSupabaseClient } from '../lib/supabase.js';
import { generateChatResponse } from '../lib/deepseek.js';

/**
 * 处理 WhatsApp Webhook
 */
export async function handleWhatsApp(request, env, path) {
  const url = new URL(request.url);
  
  // Webhook 验证（GET 请求）
  if (request.method === 'GET') {
    return handleWebhookVerification(url, env);
  }
  
  // 消息处理（POST 请求）
  if (request.method === 'POST') {
    return handleIncomingMessage(request, env);
  }
  
  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Webhook 验证（Meta 会发送 GET 请求验证）
 */
function handleWebhookVerification(url, env) {
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');
  
  // 检查配置
  if (!env.WHATSAPP_VERIFY_TOKEN) {
    console.error('WHATSAPP_VERIFY_TOKEN not configured');
    return new Response('Configuration error', { status: 500 });
  }
  
  if (mode === 'subscribe' && token === env.WHATSAPP_VERIFY_TOKEN) {
    console.log('WhatsApp webhook verified');
    return new Response(challenge, { status: 200 });
  }
  
  return new Response('Verification failed', { status: 403 });
}

/**
 * 处理收到的 WhatsApp 消息
 */
async function handleIncomingMessage(request, env) {
  try {
    const body = await request.json();
    
    // 解析 WhatsApp 消息格式
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    
    if (!value?.messages?.[0]) {
      // 可能是状态更新，不是消息
      return new Response(JSON.stringify({ status: 'ok' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const message = value.messages[0];
    const contact = value.contacts?.[0];
    
    const messageData = {
      messageId: message.id,
      from: message.from, // 发送者手机号
      timestamp: message.timestamp,
      type: message.type,
      text: message.text?.body || '',
      contactName: contact?.profile?.name || 'Unknown'
    };
    
    console.log('Received WhatsApp message:', messageData);
    
    // 存储消息到数据库
    const supabase = getSupabaseClient(env);
    await storeMessage(supabase, messageData, 'incoming');
    
    // 获取或创建对话
    const conversation = await getOrCreateConversation(supabase, messageData.from, messageData.contactName);
    
    // 检查 AI 是否启用
    const settings = await getSettings(supabase);
    
    if (settings?.ai_enabled) {
      // AI 自动回复（返回回复内容和是否使用了知识库）
      const { response: aiResponse, knowledgeUsed } = await generateAIResponse(env, messageData.text, conversation.id, supabase);
      
      // 发送回复
      await sendWhatsAppMessage(env, messageData.from, aiResponse);
      
      // 存储 AI 回复
      await storeMessage(supabase, {
        messageId: `ai_${Date.now()}`,
        from: 'system',
        to: messageData.from,
        timestamp: Math.floor(Date.now() / 1000).toString(),
        type: 'text',
        text: aiResponse,
        contactName: 'XKTRUCK AI'
      }, 'outgoing');
      
      // 自动学习（当未使用知识库时）
      if (settings?.auto_learn_enabled && !knowledgeUsed) {
        const { autoLearnFromConversation } = await import('./knowledge-learn.js');
        autoLearnFromConversation(env, conversation.id, messageData.text, aiResponse, {
          source: 'whatsapp',
          phoneNumber: messageData.from
        }).catch(err => {
          console.error('WhatsApp auto-learn failed:', err);
        });
      }
    }
    
    return new Response(JSON.stringify({ status: 'ok' }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Error processing WhatsApp message:', error);
    // 返回 200 避免 Meta 重试
    return new Response(JSON.stringify({ status: 'error', message: error.message }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * 发送 WhatsApp 消息
 */
async function sendWhatsAppMessage(env, to, text) {
  // 检查配置
  if (!env.WHATSAPP_PHONE_NUMBER_ID || !env.WHATSAPP_ACCESS_TOKEN) {
    console.error('WhatsApp credentials not configured');
    throw new Error('WhatsApp not configured');
  }
  
  const url = `https://graph.facebook.com/v18.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: to,
      type: 'text',
      text: {
        preview_url: false,
        body: text
      }
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    console.error('WhatsApp API error:', error);
    throw new Error(`WhatsApp API error: ${response.status}`);
  }
  
  const result = await response.json();
  console.log('WhatsApp message sent:', result);
  return result;
}

/**
 * 检测敏感问题（与 chat.js 保持一致）
 */
function checkSensitiveQuestion(message) {
  const lowerMessage = message.toLowerCase();
  
  const sensitiveKeywords = {
    pricing: ['price', 'cost', 'how much', '价格', '多少钱', '费用', 'precio', 'cuánto'],
    specifications: ['specification', 'spec', 'oe number', 'oe编号', '规格', 'especificación'],
    warranty: ['warranty', 'guarantee', '质保', '保修', 'garantía'],
    shipping: ['shipping', 'delivery', 'lead time', '运输', '交货', '发货', 'envío'],
    stock: ['stock', 'availability', 'in stock', '库存', '有货', 'disponible']
  };
  
  let isSensitive = false;
  for (const [category, keywords] of Object.entries(sensitiveKeywords)) {
    if (keywords.some(keyword => lowerMessage.includes(keyword))) {
      isSensitive = true;
      console.log(`[WhatsApp] Sensitive question detected: ${category}`);
      break;
    }
  }
  
  if (!isSensitive) {
    return null;
  }
  
  return `Thank you for your inquiry! For accurate information, please contact us:

📧 Email: harry.zhang592802@gmail.com
📱 WhatsApp: +86 130-6287-0118

Our team will provide you with accurate pricing, specifications, and availability.`;
}

/**
 * 生成 AI 回复
 */
async function generateAIResponse(env, userMessage, conversationId, supabase) {
  try {
    // 获取对话历史
    const { data: history } = await supabase
      .from('whatsapp_messages')
      .select('direction, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(10);
    
    // 使用统一的知识库查询（向量搜索 + 全文搜索）
    const { queryKnowledgeBase, extractSearchKeywords } = await import('../lib/supabase.js');
    const { generateRAGResponse } = await import('../lib/deepseek.js');
    
    // 提取搜索关键词
    let searchQuery = userMessage;
    try {
      searchQuery = await extractSearchKeywords(env, userMessage);
    } catch (err) {
      console.log('Keyword extraction failed:', err);
    }
    
    // 查询知识库（使用向量搜索）
    let knowledgeContext = [];
    try {
      knowledgeContext = await queryKnowledgeBase(env, searchQuery, 3);
    } catch (kbError) {
      console.error('Knowledge base query failed:', kbError);
    }

    // 安全检查：如果没有知识库且是敏感问题，返回安全回复
    if (knowledgeContext.length === 0) {
      const safeReply = checkSensitiveQuestion(userMessage);
      if (safeReply) {
        console.log('[WhatsApp] Returning safe reply for sensitive question');
        return {
          response: safeReply,
          knowledgeUsed: false
        };
      }
    }
    
    // 构建消息历史
    const messages = history?.reverse().map(m => ({
      role: m.direction === 'incoming' ? 'user' : 'assistant',
      content: m.content
    })) || [];
    
    // 添加当前消息
    messages.push({ role: 'user', content: userMessage });
    
    // 系统提示词（WhatsApp 专用）
    const systemPrompt = `You are XKTRUCK's professional customer service assistant on WhatsApp.

COMPANY INFO:
- XKTRUCK is a heavy truck parts manufacturer based in China
- We supply parts for VOLVO, SCANIA, MERCEDES-BENZ, MAN, IVECO, RENAULT, DAF, FORD
- Factory: 35,000㎡ in China
- Experience: 15+ years in truck parts industry

GUIDELINES:
1. Be professional, friendly, and helpful
2. Keep responses concise (suitable for WhatsApp, max 2-3 paragraphs)
3. If asked about specific products, provide general info and offer to send details
4. For pricing inquiries, ask for product details and quantity
5. Always offer to help further
6. Respond in the same language as the customer
7. Use knowledge base information when available`;

    // 使用 RAG 生成回复
    const response = await generateRAGResponse(env, messages, knowledgeContext, systemPrompt);
    
    // 返回回复和是否使用了知识库
    return {
      response: response || "Thank you for your message. Our team will get back to you shortly. For urgent inquiries, please email harry.zhang592802@gmail.com",
      knowledgeUsed: knowledgeContext.length > 0
    };
    
  } catch (error) {
    console.error('AI response error:', error);
    return {
      response: "Thank you for contacting XKTRUCK! Our team will respond to your inquiry shortly. For immediate assistance, please email harry.zhang592802@gmail.com",
      knowledgeUsed: false
    };
  }
}

/**
 * 存储消息到数据库
 */
async function storeMessage(supabase, messageData, direction) {
  try {
    // 获取或创建对话
    const conversation = await getOrCreateConversation(
      supabase, 
      direction === 'incoming' ? messageData.from : messageData.to,
      messageData.contactName
    );
    
    const { error } = await supabase
      .from('whatsapp_messages')
      .insert({
        conversation_id: conversation.id,
        message_id: messageData.messageId,
        direction: direction,
        content: messageData.text,
        message_type: messageData.type,
        whatsapp_timestamp: new Date(parseInt(messageData.timestamp) * 1000).toISOString()
      });
    
    if (error) {
      console.error('Error storing message:', error);
    }
    
    // 更新对话最后消息时间
    await supabase
      .from('whatsapp_conversations')
      .update({ 
        last_message_at: new Date().toISOString(),
        last_message: messageData.text?.substring(0, 100)
      })
      .eq('id', conversation.id);
      
  } catch (error) {
    console.error('Error in storeMessage:', error);
  }
}

/**
 * 获取或创建对话
 */
async function getOrCreateConversation(supabase, phoneNumber, contactName) {
  // 查找现有对话
  const { data: existing } = await supabase
    .from('whatsapp_conversations')
    .select('*')
    .eq('phone_number', phoneNumber)
    .single();
  
  if (existing) {
    return existing;
  }
  
  // 创建新对话
  const { data: newConversation, error } = await supabase
    .from('whatsapp_conversations')
    .insert({
      phone_number: phoneNumber,
      contact_name: contactName,
      status: 'active'
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error creating conversation:', error);
    throw error;
  }
  
  return newConversation;
}

/**
 * 获取系统设置
 */
async function getSettings(supabase) {
  const { data } = await supabase
    .from('system_settings')
    .select('*')
    .single();
  return data;
}

/**
 * 获取 WhatsApp 对话列表（管理后台用）
 */
export async function getWhatsAppConversations(env) {
  const supabase = getSupabaseClient(env);
  
  const { data, error } = await supabase
    .from('whatsapp_conversations')
    .select('*')
    .order('last_message_at', { ascending: false })
    .limit(50);
  
  if (error) {
    throw error;
  }
  
  return data;
}

/**
 * 获取对话消息（管理后台用）
 */
export async function getConversationMessages(env, conversationId) {
  const supabase = getSupabaseClient(env);
  
  const { data, error } = await supabase
    .from('whatsapp_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  
  if (error) {
    throw error;
  }
  
  return data;
}
