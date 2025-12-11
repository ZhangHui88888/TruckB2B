/**
 * 邮件发送工具（使用 Resend）
 */

const RESEND_API_URL = 'https://api.resend.com/emails';

/**
 * 发送询盘通知邮件
 */
export async function sendInquiryNotification(env, inquiry) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1a365d; border-bottom: 2px solid #e53e3e; padding-bottom: 10px;">
        🚚 New Inquiry from XKTRUCK Website
      </h2>
      
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr>
          <td style="padding: 10px; background: #f7fafc; font-weight: bold; width: 120px;">Name</td>
          <td style="padding: 10px; background: #f7fafc;">${escapeHtml(inquiry.name)}</td>
        </tr>
        <tr>
          <td style="padding: 10px; font-weight: bold;">Email</td>
          <td style="padding: 10px;">
            <a href="mailto:${escapeHtml(inquiry.email)}">${escapeHtml(inquiry.email)}</a>
          </td>
        </tr>
        ${inquiry.company ? `
        <tr>
          <td style="padding: 10px; background: #f7fafc; font-weight: bold;">Company</td>
          <td style="padding: 10px; background: #f7fafc;">${escapeHtml(inquiry.company)}</td>
        </tr>
        ` : ''}
        ${inquiry.phone ? `
        <tr>
          <td style="padding: 10px; font-weight: bold;">Phone</td>
          <td style="padding: 10px;">
            <a href="https://wa.me/${inquiry.phone.replace(/[^0-9]/g, '')}">${escapeHtml(inquiry.phone)}</a>
          </td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding: 10px; background: #f7fafc; font-weight: bold;">Subject</td>
          <td style="padding: 10px; background: #f7fafc;">${getSubjectLabel(inquiry.subject)}</td>
        </tr>
        ${inquiry.productName ? `
        <tr>
          <td style="padding: 10px; font-weight: bold;">Product</td>
          <td style="padding: 10px;">${escapeHtml(inquiry.productName)}</td>
        </tr>
        ` : ''}
      </table>
      
      <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #2d3748;">Message:</h3>
        <p style="white-space: pre-wrap; color: #4a5568;">${escapeHtml(inquiry.message)}</p>
      </div>
      
      <div style="margin-top: 20px; padding: 15px; background: #e6fffa; border-radius: 8px;">
        <strong>Quick Actions:</strong>
        <ul style="margin: 10px 0; padding-left: 20px;">
          <li><a href="mailto:${escapeHtml(inquiry.email)}?subject=Re: ${encodeURIComponent(getSubjectLabel(inquiry.subject))}">Reply via Email</a></li>
          ${inquiry.phone ? `<li><a href="https://wa.me/${inquiry.phone.replace(/[^0-9]/g, '')}">Chat on WhatsApp</a></li>` : ''}
        </ul>
      </div>
      
      <p style="color: #718096; font-size: 12px; margin-top: 30px;">
        This email was sent automatically from xk-truck.cn<br>
        Time: ${new Date().toISOString()}
      </p>
    </div>
  `;

  return sendEmail(env, {
    to: env.NOTIFY_EMAIL,
    subject: `[XKTRUCK] New ${getSubjectLabel(inquiry.subject)} from ${inquiry.name}`,
    html
  });
}

/**
 * 发送 AI 对话通知邮件（当 AI 关闭时）
 */
export async function sendChatNotification(env, data) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1a365d; border-bottom: 2px solid #38a169; padding-bottom: 10px;">
        💬 New Chat Message (AI Disabled)
      </h2>
      
      <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; color: #718096; font-size: 12px;">Session: ${data.sessionId}</p>
        <p style="margin-top: 10px; white-space: pre-wrap; color: #2d3748;">${escapeHtml(data.message)}</p>
      </div>
      
      <p style="color: #e53e3e; font-size: 14px;">
        ⚠️ AI auto-reply is currently disabled. Please respond manually.
      </p>
      
      <p style="color: #718096; font-size: 12px; margin-top: 30px;">
        Time: ${new Date().toISOString()}
      </p>
    </div>
  `;

  return sendEmail(env, {
    to: env.NOTIFY_EMAIL,
    subject: `[XKTRUCK] Chat Message - AI Disabled`,
    html
  });
}

/**
 * 发送邮件
 */
async function sendEmail(env, { to, subject, html }) {
  try {
    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'XKTRUCK <noreply@xk-truck.cn>',
        to: [to],
        subject,
        html
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Resend API error:', error);
      throw new Error(`Failed to send email: ${error}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Email send error:', error);
    throw error;
  }
}

/**
 * HTML 转义
 */
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * 获取主题标签
 */
function getSubjectLabel(subject) {
  const labels = {
    'quote': 'Quote Request',
    'product': 'Product Inquiry',
    'wholesale': 'Wholesale Partnership',
    'support': 'Technical Support',
    'other': 'General Inquiry'
  };
  return labels[subject] || subject;
}
