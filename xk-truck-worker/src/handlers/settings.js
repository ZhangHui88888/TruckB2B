/**
 * 设置管理 Handler
 */
import { getSettings, updateSettings } from '../lib/supabase.js';

/**
 * 处理设置请求
 */
export async function handleSettings(request, env, method) {
  try {
    if (method === 'GET') {
      // 获取设置
      const settings = await getSettings(env);
      return new Response(JSON.stringify({
        success: true,
        data: settings
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (method === 'PUT') {
      // 更新设置
      const body = await request.json();
      
      // 验证请求（简单的 API Key 验证，生产环境应使用更安全的方式）
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || authHeader !== `Bearer ${env.ADMIN_API_KEY}`) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Unauthorized'
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // 获取当前设置
      const currentSettings = await getSettings(env);

      // 合并更新
      const newSettings = {
        ...currentSettings,
        ...body,
        updated_at: new Date().toISOString()
      };

      // 保存
      await updateSettings(env, newSettings);

      return new Response(JSON.stringify({
        success: true,
        data: newSettings,
        message: 'Settings updated successfully'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: false,
      error: 'Method not allowed'
    }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Settings handler error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to process settings request'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
