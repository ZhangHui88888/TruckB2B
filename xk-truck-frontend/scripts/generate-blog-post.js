/**
 * AI 博客文章生成脚本
 * 
 * 使用 DeepSeek AI 自动生成 SEO 优化的博客文章
 * 
 * 使用方法:
 *   node scripts/generate-blog-post.js "文章主题"
 * 
 * 示例:
 *   node scripts/generate-blog-post.js "How to Choose VOLVO Truck Headlamps"
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

if (!DEEPSEEK_API_KEY) {
  console.error('❌ 缺少环境变量: DEEPSEEK_API_KEY');
  process.exit(1);
}

/**
 * 调用 DeepSeek API 生成内容
 */
async function generateContent(prompt) {
  const response = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 3000
    })
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

/**
 * 人性化内容 - 添加随机的人类特征
 */
async function humanizeContent(content) {
  // 添加随机的人类化元素
  const humanizationPrompt = `Take this article and make it MORE HUMAN by adding these elements:

${content}

Add these human touches (but keep it natural, don't overdo it):

1. Add 2-3 personal anecdotes:
   - "I remember when..."
   - "One of our customers once told me..."
   - "In our factory, we've noticed..."

2. Add 1-2 casual asides in parentheses:
   - (and trust me, this matters)
   - (I learned this the hard way)
   - (more on this later)

3. Add 2-3 rhetorical questions:
   - "Why does this matter?"
   - "Sound familiar?"
   - "Want to know the secret?"

4. Add specific numbers and dates:
   - "Last month"
   - "In 2023"
   - "Over 500 customers"
   - "15+ years of experience"

5. Vary sentence length more:
   - Add 2-3 very short sentences for emphasis
   - "Here's why." "It's simple." "Trust me."

6. Add 1-2 industry-specific jokes or light humor:
   - Keep it professional but relatable
   - Truck industry insider humor

Return the COMPLETE article with these additions. Keep all the original content, just make it more human.`;

  try {
    const humanized = await generateContent(humanizationPrompt);
    return humanized;
  } catch (error) {
    console.log('⚠️ 人性化处理失败，使用原始内容');
    return content;
  }
}

/**
 * 生成博客文章
 */
async function generateBlogPost(topic) {
  console.log(`\n🤖 正在生成博客文章: "${topic}"\n`);

  // 第一步：生成文章大纲
  console.log('📝 步骤 1/3: 生成文章大纲...');
  const outlinePrompt = `You are an SEO expert writing for a B2B truck parts website (xk-truck.cn).

Create a detailed outline for a blog post about: "${topic}"

Requirements:
- Target audience: Truck fleet managers, mechanics, parts buyers
- Focus on: VOLVO, SCANIA, MERCEDES-BENZ, MAN, IVECO, RENAULT, DAF, FORD
- Include: practical tips, technical details, buying guide
- SEO keywords: truck parts, headlamps, mirrors, OE numbers, wholesale

Return ONLY the outline in this format:
# Main Title
## Introduction (2-3 sentences)
## Section 1: [Title]
- Point 1
- Point 2
## Section 2: [Title]
- Point 1
- Point 2
## Conclusion (2-3 sentences)`;

  const outline = await generateContent(outlinePrompt);
  console.log('✅ 大纲生成完成\n');

  // 第二步：生成完整文章（反 AI 检测版本）
  console.log('📝 步骤 2/3: 生成完整文章（反 AI 检测优化）...');
  const articlePrompt = `Based on this outline, write a complete, SEO-optimized blog post (1000-1500 words):

${outline}

CRITICAL: Write like a REAL HUMAN, not AI. Follow these rules to avoid AI detection:

1. NATURAL IMPERFECTIONS:
   - Use contractions (we're, it's, don't)
   - Occasionally start sentences with "And" or "But"
   - Use casual phrases like "Here's the thing", "Let me tell you", "In my experience"
   - Add 1-2 minor grammatical variations (not errors, just natural speech)

2. PERSONAL TOUCH:
   - Include phrases like "I've seen", "In our factory", "Our customers often ask"
   - Share specific examples: "Last month, a customer from Germany..."
   - Use first-person occasionally: "I recommend", "We've found that"
   - Add opinions: "Personally, I think...", "In my view..."

3. VARY SENTENCE STRUCTURE:
   - Mix short punchy sentences with longer ones
   - Use questions: "Why does this matter?"
   - Add transitions: "Now here's the interesting part..."
   - Break rules occasionally for emphasis. Like this.

4. SPECIFIC DETAILS (not generic):
   - Real OE numbers: "21354789", "82329506"
   - Specific prices: "around $150-200"
   - Exact measurements: "35,000㎡ factory"
   - Real timeframes: "typically 7-15 days"
   - Actual certifications: "E-Mark ECE R112"

5. CONVERSATIONAL TONE:
   - Address reader directly: "You might be wondering..."
   - Use rhetorical questions: "Sound familiar?"
   - Add casual asides: "(trust me on this)"
   - Use analogies: "Think of it like..."

6. HUMAN QUIRKS:
   - Occasionally emphasize with italics or bold
   - Use parentheses for side thoughts (like this)
   - Add "..." for dramatic pauses
   - Use em dashes for emphasis — like this

7. INDUSTRY EXPERTISE:
   - Reference real industry standards
   - Mention actual truck models (FH4, FH5, R-series)
   - Cite real regulations (ECE R112, ADR)
   - Use technical jargon naturally

8. AVOID AI PATTERNS:
   - Don't use "delve into", "landscape", "realm", "tapestry"
   - Don't start every paragraph the same way
   - Don't use overly formal language
   - Don't be too perfect or polished

Example opening (GOOD):
"Here's something most people don't know about VOLVO headlamps. After working with these parts for over 15 years, I've seen countless buyers make the same mistake — and it costs them. Let me share what I've learned..."

Example opening (BAD - too AI):
"In the realm of heavy-duty truck components, headlamps represent a critical element that demands careful consideration. This comprehensive guide will delve into the intricacies of..."

Now write the article following these rules:`;

  const article = await generateContent(articlePrompt);
  console.log('✅ 文章生成完成\n');

  // 第 2.5 步：后处理 - 添加更多人性化元素
  console.log('🎨 步骤 2.5/3: 添加人性化元素...');
  const humanizedArticle = await humanizeContent(article);
  console.log('✅ 人性化处理完成\n');

  // 第三步：生成 frontmatter
  console.log('📝 步骤 3/3: 生成元数据...');
  const metaPrompt = `For this blog post, generate SEO metadata in JSON format:

Title: "${topic}"

Return ONLY valid JSON:
{
  "title": "SEO-optimized title (max 60 chars)",
  "description": "SEO meta description (max 160 chars)",
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "slug": "url-friendly-slug",
  "category": "guides|tips|news|technical",
  "tags": ["tag1", "tag2", "tag3"]
}`;

  const metaResponse = await generateContent(metaPrompt);
  const metaMatch = metaResponse.match(/\{[\s\S]*\}/);
  const metadata = metaMatch ? JSON.parse(metaMatch[0]) : {
    title: topic,
    description: topic,
    keywords: [],
    slug: topic.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    category: 'guides',
    tags: []
  };
  console.log('✅ 元数据生成完成\n');

  return { metadata, article };
}

/**
 * 保存文章到文件
 */
function saveBlogPost(metadata, article) {
  const date = new Date().toISOString().split('T')[0];
  const filename = `${date}-${metadata.slug}.md`;
  const filepath = path.join(process.cwd(), 'src', 'content', 'blog', filename);

  // 创建 frontmatter
  const frontmatter = `---
title: "${metadata.title}"
description: "${metadata.description}"
pubDate: ${date}
author: "XKTRUCK Team"
category: "${metadata.category}"
tags: ${JSON.stringify(metadata.tags)}
keywords: ${JSON.stringify(metadata.keywords)}
featured: false
draft: false
---

`;

  const content = frontmatter + article;

  // 确保目录存在
  const dir = path.dirname(filepath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // 保存文件
  fs.writeFileSync(filepath, content, 'utf-8');

  return filepath;
}

/**
 * 最终人性化检查 - 移除 AI 痕迹
 */
async function finalHumanCheck(content) {
  // AI 常用词替换表
  const aiPhrases = {
    'delve into': 'look at',
    'landscape': 'industry',
    'realm': 'world',
    'tapestry': 'mix',
    'comprehensive': 'complete',
    'utilize': 'use',
    'facilitate': 'help',
    'implement': 'use',
    'leverage': 'use',
    'robust': 'strong',
    'seamless': 'smooth',
    'cutting-edge': 'modern',
    'state-of-the-art': 'latest',
    'game-changer': 'important',
    'revolutionize': 'change'
  };

  let humanized = content;

  // 替换 AI 常用词
  for (const [aiWord, humanWord] of Object.entries(aiPhrases)) {
    const regex = new RegExp(aiWord, 'gi');
    humanized = humanized.replace(regex, humanWord);
  }

  // 添加随机的小变化
  // 1. 随机添加缩写
  humanized = humanized.replace(/\bdo not\b/g, "don't");
  humanized = humanized.replace(/\bit is\b/g, "it's");
  humanized = humanized.replace(/\bwe are\b/g, "we're");
  humanized = humanized.replace(/\bthat is\b/g, "that's");

  // 2. 随机添加口语化
  const sentences = humanized.split('. ');
  if (sentences.length > 5) {
    // 在中间某处添加一个短句
    const midPoint = Math.floor(sentences.length / 2);
    sentences[midPoint] = sentences[midPoint] + '. Here's why';
  }
  humanized = sentences.join('. ');

  return humanized;
}

/**
 * 主函数
 */
async function main() {
  const topic = process.argv[2];

  if (!topic) {
    console.error('❌ 请提供文章主题');
    console.log('\n使用方法:');
    console.log('  node scripts/generate-blog-post.js "文章主题"');
    console.log('\n示例:');
    console.log('  node scripts/generate-blog-post.js "How to Choose VOLVO Truck Headlamps"');
    console.log('  node scripts/generate-blog-post.js "Top 5 Common Truck Mirror Problems"');
    console.log('  node scripts/generate-blog-post.js "SCANIA vs VOLVO Parts Comparison"');
    process.exit(1);
  }

  console.log('========================================');
  console.log('🤖 AI 博客文章生成器');
  console.log('========================================');

  try {
    // 生成文章
    const { metadata, article } = await generateBlogPost(topic);

    // 最终人性化检查
    console.log('🔍 最终检查: 确保内容自然...');
    const finalArticle = await finalHumanCheck(article);

    // 保存文章
    const filepath = saveBlogPost(metadata, finalArticle);

    console.log('========================================');
    console.log('✅ 文章生成成功！');
    console.log('========================================');
    console.log(`\n📄 文件位置: ${filepath}`);
    console.log(`\n📊 文章信息:`);
    console.log(`   标题: ${metadata.title}`);
    console.log(`   分类: ${metadata.category}`);
    console.log(`   标签: ${metadata.tags.join(', ')}`);
    console.log(`   关键词: ${metadata.keywords.join(', ')}`);
    console.log(`\n💡 下一步:`);
    console.log(`   1. 检查并编辑文章内容`);
    console.log(`   2. 添加图片（如果需要）`);
    console.log(`   3. 提交并部署`);
    console.log(`   4. 在社交媒体分享`);
    console.log('\n');

  } catch (error) {
    console.error('\n❌ 生成失败:', error.message);
    process.exit(1);
  }
}

main();
