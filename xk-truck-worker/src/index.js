/**
 * XKTRUCK API Worker
 * 处理询盘表单、AI客服对话
 */

import { handleInquiry } from './handlers/inquiry.js';
import { handleChat, handleChatStream } from './handlers/chat.js';
import { handleSettings } from './handlers/settings.js';
import { handleAdmin } from './handlers/admin.js';
import { handleWhatsApp, getWhatsAppConversations, getConversationMessages } from './handlers/whatsapp.js';
import { handleGetPendingReviews, handleReviewConversation, handleAddKnowledge, handleMigrateKnowledge } from './handlers/knowledge-learn.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS 预检请求
    if (request.method === 'OPTIONS') {
      return handleCORS(env);
    }

    // 路由
    let response;
    try {
      if (path === '/api/inquiry' && request.method === 'POST') {
        // 询盘表单提交
        response = await handleInquiry(request, env);
      } else if (path === '/api/chat' && request.method === 'POST') {
        // AI 客服对话
        response = await handleChat(request, env);
      } else if (path === '/api/chat/stream' && request.method === 'POST') {
        // AI 客服对话（流式）
        response = await handleChatStream(request, env);
      } else if (path === '/api/settings' && request.method === 'GET') {
        // 获取设置（AI开关状态）
        response = await handleSettings(request, env, 'GET');
      } else if (path === '/api/settings' && request.method === 'PUT') {
        // 更新设置
        response = await handleSettings(request, env, 'PUT');
      } else if (path.startsWith('/api/admin/')) {
        // 管理后台 API
        response = await handleAdmin(request, env, path);
      } else if (path === '/api/whatsapp/webhook') {
        // WhatsApp Webhook（GET 验证 / POST 消息）
        response = await handleWhatsApp(request, env, path);
      } else if (path === '/api/whatsapp/conversations' && request.method === 'GET') {
        // 获取 WhatsApp 对话列表
        const conversations = await getWhatsAppConversations(env);
        response = new Response(JSON.stringify({ success: true, data: conversations }), {
          headers: { 'Content-Type': 'application/json' }
        });
      } else if (path.match(/^\/api\/whatsapp\/conversations\/[\w-]+\/messages$/) && request.method === 'GET') {
        // 获取对话消息
        const conversationId = path.split('/')[4];
        const messages = await getConversationMessages(env, conversationId);
        response = new Response(JSON.stringify({ success: true, data: messages }), {
          headers: { 'Content-Type': 'application/json' }
        });
      } else if (path === '/api/knowledge/pending' && request.method === 'GET') {
        // 获取待审核的对话
        response = await handleGetPendingReviews(request, env);
      } else if (path === '/api/knowledge/review' && request.method === 'POST') {
        // 审核对话并决定是否入库
        response = await handleReviewConversation(request, env);
      } else if (path === '/api/knowledge/add' && request.method === 'POST') {
        // 手动添加知识条目
        response = await handleAddKnowledge(request, env);
      } else if (path === '/api/knowledge/migrate' && request.method === 'POST') {
        // 迁移现有知识库到 Vectorize
        response = await handleMigrateKnowledge(request, env);
      } else if (path === '/api/health') {
        // 健康检查
        response = new Response(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }), {
          headers: { 'Content-Type': 'application/json' }
        });
      } else {
        response = new Response(JSON.stringify({ error: 'Not Found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } catch (error) {
      console.error('Worker error:', error);
      response = new Response(JSON.stringify({ error: 'Internal Server Error', message: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 添加 CORS 头
    return addCORSHeaders(response, env);
  }
};

/**
 * 处理 CORS 预检请求
 */
function handleCORS(env) {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': env.CORS_ORIGIN || '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    }
  });
}

/**
 * 添加 CORS 响应头
 */
function addCORSHeaders(response, env) {
  const newHeaders = new Headers(response.headers);
  newHeaders.set('Access-Control-Allow-Origin', env.CORS_ORIGIN || '*');
  newHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  newHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders
  });
}
