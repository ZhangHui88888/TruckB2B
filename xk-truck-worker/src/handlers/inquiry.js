/**
 * 询盘处理 Handler
 */
import { saveInquiry } from '../lib/supabase.js';
import { sendInquiryNotification } from '../lib/email.js';

/**
 * 处理询盘表单提交
 */
export async function handleInquiry(request, env) {
  try {
    const body = await request.json();
    
    // 验证必填字段
    const { name, email, subject, message } = body;
    if (!name || !email || !subject || !message) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required fields: name, email, subject, message'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 验证邮箱格式
    if (!isValidEmail(email)) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid email address'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 构建询盘数据
    const inquiryData = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      company: body.company?.trim() || null,
      phone: body.phone?.trim() || null,
      subject,
      message: message.trim(),
      productId: body.productId || null,
      productName: body.productName || null,
      source: body.source || 'contact_form'
    };

    // 保存到数据库
    await saveInquiry(env, inquiryData);

    // 发送邮件通知
    try {
      await sendInquiryNotification(env, inquiryData);
    } catch (emailError) {
      // 邮件发送失败不影响主流程
      console.error('Email notification failed:', emailError);
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Thank you for your inquiry! We will get back to you within 24 hours.'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Inquiry handler error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to process inquiry. Please try again or contact us via WhatsApp.'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * 验证邮箱格式
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
