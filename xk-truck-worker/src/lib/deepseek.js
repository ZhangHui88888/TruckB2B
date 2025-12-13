/**
 * DeepSeek AI 客户端
 */

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

/**
 * 默认系统提示词 - 包含安全规则
 */
const DEFAULT_SYSTEM_PROMPT = `You are XKTRUCK's professional customer service assistant.

=== COMPANY INFORMATION ===
Company: XKTRUCK (brand XKLAMP)
Location: Jiangsu, China (35,000㎡ factory)
Experience: 15+ years in truck parts industry
Certifications: ADB, E-Mark

Main Products (priority order):
1. Truck LAMPS/LIGHTS (our specialty): headlamps, tail lamps, fog lamps, side marker lights, work lights
2. Mirrors: side mirrors, rearview mirrors
3. Some body parts: limited selection

We do NOT sell: engines, transmissions, or mechanical parts
Brands: VOLVO, SCANIA, MERCEDES-BENZ, MAN, IVECO, RENAULT, DAF, FORD
MOQ: 40 pieces per item
Payment: T/T, PayPal, Western Union (30% deposit, 70% before shipment)
Shipping: Worldwide, 15-30 days delivery

Contact:
📧 Email: harry.zhang592802@gmail.com
📱 WhatsApp: +86 130-6287-0118
🌐 Website: https://xk-truck.cn

=== CRITICAL SAFETY RULES ===
⚠️ Follow these rules strictly to avoid providing incorrect information:

1. PRICING INFORMATION
   ❌ NEVER provide specific prices unless you have exact information from the knowledge base
   ❌ NEVER estimate or guess prices
   ✅ If no knowledge: "For accurate pricing, please contact us at harry.zhang592802@gmail.com or WhatsApp +86 130-6287-0118"

2. PRODUCT SPECIFICATIONS
   ❌ NEVER make up OE numbers, specifications, or technical details
   ❌ NEVER confirm product availability without knowledge base info
   ✅ If uncertain: "Please provide your requirements (OE number, vehicle model, year) and contact us for accurate information"

3. WARRANTY & POLICIES
   ❌ NEVER provide warranty terms, shipping costs, or lead times without knowledge base info
   ✅ If no info: "For warranty and shipping details, please contact our team directly"

4. HONESTY PRINCIPLE
   ✅ Always be honest about what you know and don't know
   ✅ If you don't have information: clearly state it and guide customer to contact us
   ✅ Never pretend to have information you don't have

=== SAFE TO ANSWER (without knowledge base) ===
✅ Company background (factory size, experience, certifications)
✅ Product categories (lamps, mirrors, body parts)
✅ Brands we support
✅ How to contact us
✅ General inquiry process

=== UNSAFE TO ANSWER (require knowledge base) ===
❌ Specific product prices
❌ Exact OE numbers and cross-references
❌ Detailed product specifications
❌ Current stock availability
❌ Warranty terms and conditions
❌ Shipping costs and lead times

=== RESPONSE STYLE ===
- Professional & friendly
- Clear & concise
- Respond in customer's language
- Always provide contact info for detailed inquiries

When mentioning brands, write completely: VOLVO (not VO), SCANIA (not SCA), MERCEDES-BENZ, MAN, IVECO, RENAULT, DAF, FORD.`;

/**
 * 调用 DeepSeek API 生成回复
 */
export async function generateChatResponse(env, messages, systemPrompt = null) {
  const prompt = systemPrompt || DEFAULT_SYSTEM_PROMPT;
  
  // 构建消息数组
  const apiMessages = [
    { role: 'system', content: prompt },
    ...messages.map(m => ({
      role: m.role,
      content: m.message || m.content
    }))
  ];

  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: apiMessages,
        max_tokens: 800,
        temperature: 0.3,
        stream: false
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('DeepSeek API error:', error);
      throw new Error(`DeepSeek API error: ${error}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
  } catch (error) {
    console.error('DeepSeek error:', error);
    throw error;
  }
}

/**
 * 从用户消息中提取英文搜索关键词（支持多语言输入）
 * 用于知识库搜索
 */
export async function extractSearchKeywords(env, message) {
  // 如果消息已经是英文且较短，直接返回
  if (/^[a-zA-Z0-9\s\?\.\,\!]+$/.test(message) && message.length < 100) {
    return message;
  }

  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'Extract 2-5 English keywords from the user message for searching a knowledge base about truck parts. Only output the keywords separated by spaces, nothing else. If the message is in another language, translate the key concepts to English keywords.'
          },
          { role: 'user', content: message }
        ],
        max_tokens: 50,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      return message;
    }

    const data = await response.json();
    const keywords = data.choices[0]?.message?.content?.trim();
    
    // 如果提取成功，返回关键词；否则返回原消息
    return keywords && keywords.length > 0 ? keywords : message;
  } catch (error) {
    console.error('Keyword extraction error:', error);
    return message;
  }
}

/**
 * 语言匹配规则（强制追加到所有 prompt）
 */
const LANGUAGE_RULE = `

CRITICAL LANGUAGE RULES:
1. DETECT the language of the customer's CURRENT/LATEST message ONLY (ignore previous messages in conversation history).
2. RESPOND in that EXACT same language.
3. Examples:
   - If current message is in English ("20 pieces OK?") → respond in English
   - If current message is in Thai → respond in Thai
   - If current message is in Chinese → respond in Chinese
4. Do NOT use Markdown formatting (no ** or * or #). Write plain text only.
5. Write naturally and fluently as a native speaker.`;

/**
 * 清理文本中的 Markdown 格式
 */
function cleanMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/\*\*/g, '')  // 移除 **
    .replace(/\*/g, '')    // 移除 *
    .replace(/#{1,6}\s/g, '') // 移除标题 #
    .replace(/`/g, '')     // 移除代码标记
    .trim();
}

/**
 * 生成带知识库上下文的回复
 */
export async function generateRAGResponse(env, messages, knowledgeContext, systemPrompt = null) {
  // 始终使用默认提示词，忽略数据库中可能有问题的 prompt
  let prompt = DEFAULT_SYSTEM_PROMPT;
  
  // 强制追加语言匹配规则
  prompt += LANGUAGE_RULE;
  
  // 如果有知识库上下文，添加到系统提示
  if (knowledgeContext && knowledgeContext.length > 0) {
    const contextText = knowledgeContext
      .map(item => cleanMarkdown(item.content))
      .join('\n\n');
    
    prompt += `\n\nRelevant Information from Knowledge Base:\n${contextText}\n\nUse this information to answer the customer's question if relevant.`;
  }

  return generateChatResponse(env, messages, prompt);
}

/**
 * 生成流式回复（SSE）
 */
export async function generateStreamResponse(env, messages, knowledgeContext, systemPrompt = null) {
  // 始终使用默认提示词，忽略数据库中可能有问题的 prompt
  let prompt = DEFAULT_SYSTEM_PROMPT;
  
  // 强制追加语言匹配规则
  prompt += LANGUAGE_RULE;
  
  // 添加知识库上下文
  if (knowledgeContext && knowledgeContext.length > 0) {
    const contextText = knowledgeContext
      .map(item => cleanMarkdown(item.content))
      .join('\n\n');
    prompt += `\n\nRelevant Information from Knowledge Base:\n${contextText}\n\nUse this information to answer the customer's question if relevant.`;
  }

  const apiMessages = [
    { role: 'system', content: prompt },
    ...messages.map(m => ({
      role: m.role,
      content: m.message || m.content
    }))
  ];

  const response = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.DEEPSEEK_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: apiMessages,
      max_tokens: 800,
      temperature: 0.3,
      stream: true
    })
  });

  if (!response.ok) {
    throw new Error(`DeepSeek API error: ${response.status}`);
  }

  return response.body;
}
