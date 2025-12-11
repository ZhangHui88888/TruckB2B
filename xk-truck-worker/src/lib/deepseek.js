/**
 * DeepSeek AI 客户端
 */

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

/**
 * 默认系统提示词
 */
const DEFAULT_SYSTEM_PROMPT = `You are a professional customer service assistant for XKTRUCK, a leading manufacturer of heavy truck parts.

Company Information:
- Brand: XKTRUCK / XKLAMP
- Products: Truck headlamps, mirrors, and exterior parts
- Supported Brands: VOLVO, SCANIA, MERCEDES-BENZ, MAN, IVECO, RENAULT, DAF, FORD
- Factory: 35,000㎡ manufacturing facility in China
- Quality: ADB-certified, OEM quality standards

Your responsibilities:
1. Answer product inquiries professionally
2. Provide information about specifications, compatibility, and availability
3. Guide customers to submit inquiry forms for quotes
4. Be helpful, concise, and professional

Guidelines:
- Always respond in English unless the customer writes in another language
- For pricing questions, ask them to submit an inquiry form or contact via WhatsApp
- For technical questions, provide helpful information based on your knowledge
- If you don't know something, honestly say so and suggest contacting the sales team
- Keep responses concise but helpful (under 200 words when possible)
- Use a friendly, professional tone`;

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
        max_tokens: 500,
        temperature: 0.7,
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
 * 生成带知识库上下文的回复
 */
export async function generateRAGResponse(env, messages, knowledgeContext, systemPrompt = null) {
  let prompt = systemPrompt || DEFAULT_SYSTEM_PROMPT;
  
  // 如果有知识库上下文，添加到系统提示
  if (knowledgeContext && knowledgeContext.length > 0) {
    const contextText = knowledgeContext
      .map(item => item.content)
      .join('\n\n');
    
    prompt += `\n\nRelevant Information from Knowledge Base:\n${contextText}\n\nUse this information to answer the customer's question if relevant.`;
  }

  return generateChatResponse(env, messages, prompt);
}
