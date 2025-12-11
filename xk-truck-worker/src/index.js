/**
 * XKTRUCK API Worker
 * 处理询盘表单、AI客服对话
 */

import { handleInquiry } from './handlers/inquiry.js';
import { handleChat } from './handlers/chat.js';
import { handleSettings } from './handlers/settings.js';

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
      } else if (path === '/api/settings' && request.method === 'GET') {
        // 获取设置（AI开关状态）
        response = await handleSettings(request, env, 'GET');
      } else if (path === '/api/settings' && request.method === 'PUT') {
        // 更新设置
        response = await handleSettings(request, env, 'PUT');
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
