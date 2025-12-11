/**
 * SEO Auto Update Script
 * 
 * This script runs weekly via GitHub Actions to:
 * 1. Fetch search performance data from Google Search Console
 * 2. Analyze keywords with AI to find optimization opportunities
 * 3. Update SEO metadata in Supabase
 * 4. Send a weekly SEO report via email
 * 
 * Required environment variables:
 * - GSC_CREDENTIALS: Google Cloud service account JSON
 * - GSC_SITE_URL: Site URL registered in GSC (e.g., https://xk-truck.cn)
 * - SUPABASE_URL: Supabase project URL
 * - SUPABASE_KEY: Supabase service role key
 * - DEEPSEEK_API_KEY: DeepSeek API key (or OPENAI_API_KEY)
 * - RESEND_API_KEY: Resend API key for sending emails
 * - NOTIFY_EMAIL: Email address to receive reports
 */

import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

// Initialize clients
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const resend = new Resend(process.env.RESEND_API_KEY);

// Use DeepSeek API (OpenAI-compatible)
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;

/**
 * Main function
 */
async function main() {
  console.log('🚀 Starting SEO Auto Update...');
  console.log(`📅 Date: ${new Date().toISOString()}`);

  try {
    // 1. Fetch GSC data
    const gscData = await fetchGSCData();
    console.log(`📊 Fetched ${gscData.length} search queries from GSC`);

    if (gscData.length === 0) {
      console.log('⚠️ No search data available yet. This is normal for new sites.');
      await sendReport({
        summary: 'No search data available yet. Google needs time to index your site and collect search data.',
        high_potential: [],
        new_content_ideas: []
      }, []);
      return;
    }

    // 2. AI Analysis
    const analysis = await analyzeWithAI(gscData);
    console.log('🤖 AI analysis completed');

    // 3. Update Supabase
    const updates = await updateSupabase(analysis);
    console.log(`✅ Updated ${updates.length} SEO records`);

    // 4. Record keyword performance
    await recordKeywordPerformance(gscData);
    console.log('📈 Keyword performance recorded');

    // 5. Send report
    await sendReport(analysis, updates);
    console.log('📧 Report sent');

    console.log('\n🎉 SEO Auto Update completed successfully!');
  } catch (error) {
    console.error('❌ Error:', error);
    
    // Send error notification
    try {
      await resend.emails.send({
        from: 'SEO Bot <noreply@xk-truck.cn>',
        to: process.env.NOTIFY_EMAIL,
        subject: '❌ SEO Auto Update Failed',
        html: `
          <h2>SEO Auto Update Error</h2>
          <p>The weekly SEO update failed with the following error:</p>
          <pre style="background: #f5f5f5; padding: 16px; border-radius: 8px;">${error.message}</pre>
          <p>Please check the GitHub Actions logs for more details.</p>
        `
      });
    } catch (emailError) {
      console.error('Failed to send error notification:', emailError);
    }
    
    process.exit(1);
  }
}

/**
 * Fetch data from Google Search Console API
 */
async function fetchGSCData() {
  if (!process.env.GSC_CREDENTIALS) {
    console.log('⚠️ GSC_CREDENTIALS not configured, skipping GSC data fetch');
    return [];
  }

  try {
    const credentials = JSON.parse(process.env.GSC_CREDENTIALS);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
    });

    const searchconsole = google.searchconsole({ version: 'v1', auth });

    // Get data for the last 7 days
    const endDate = new Date();
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const response = await searchconsole.searchanalytics.query({
      siteUrl: process.env.GSC_SITE_URL,
      requestBody: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        dimensions: ['query', 'page'],
        rowLimit: 500,
      },
    });

    return response.data.rows || [];
  } catch (error) {
    console.error('GSC API Error:', error.message);
    return [];
  }
}

/**
 * Analyze search data with AI
 */
async function analyzeWithAI(gscData) {
  if (!DEEPSEEK_API_KEY) {
    console.log('⚠️ AI API key not configured, returning basic analysis');
    return {
      summary: 'AI analysis not available. Please configure DEEPSEEK_API_KEY or OPENAI_API_KEY.',
      high_potential: [],
      new_content_ideas: []
    };
  }

  // Prepare data for analysis
  const dataForAnalysis = gscData.slice(0, 100).map(row => ({
    query: row.keys[0],
    page: row.keys[1],
    clicks: row.clicks,
    impressions: row.impressions,
    ctr: (row.ctr * 100).toFixed(2) + '%',
    position: row.position.toFixed(1)
  }));

  const prompt = `You are an SEO expert analyzing Google Search Console data for a B2B heavy truck parts website (xk-truck.cn).

Analyze the following search data and return JSON with optimization suggestions.

Data format: Each row contains [search query, page URL, clicks, impressions, CTR, average position]

${JSON.stringify(dataForAnalysis, null, 2)}

Return a JSON object with this structure:
{
  "high_potential": [
    {
      "keyword": "the search keyword",
      "page": "page URL",
      "reason": "why this needs optimization (e.g., high impressions but low CTR)",
      "suggested_title": "suggested new page title (max 60 chars)",
      "suggested_description": "suggested meta description (max 160 chars)"
    }
  ],
  "new_content_ideas": [
    {
      "keyword": "keyword users are searching for",
      "reason": "why we should create content for this",
      "suggested_page": "/suggested/url/path"
    }
  ],
  "summary": "Brief summary of this week's SEO performance and key insights (2-3 sentences)"
}

Focus on:
1. High impressions + low CTR = needs better title/description
2. Position 5-20 = close to first page, worth optimizing
3. Keywords without matching content = content gap

Return ONLY valid JSON, no other text.`;

  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    throw new Error('Could not parse AI response as JSON');
  } catch (error) {
    console.error('AI Analysis Error:', error.message);
    return {
      summary: `Analysis failed: ${error.message}`,
      high_potential: [],
      new_content_ideas: []
    };
  }
}

/**
 * Update SEO metadata in Supabase
 */
async function updateSupabase(analysis) {
  const updates = [];

  for (const item of analysis.high_potential || []) {
    try {
      // Extract page path from URL
      let pagePath;
      try {
        pagePath = new URL(item.page).pathname;
      } catch {
        pagePath = item.page;
      }

      const { error } = await supabase
        .from('page_seo')
        .upsert({
          page_path: pagePath,
          title: item.suggested_title,
          description: item.suggested_description,
          keywords: [item.keyword],
          updated_at: new Date().toISOString(),
        }, { 
          onConflict: 'page_path' 
        });

      if (!error) {
        updates.push(item);
        console.log(`  ✓ Updated SEO for: ${pagePath}`);
      } else {
        console.error(`  ✗ Failed to update ${pagePath}:`, error.message);
      }
    } catch (err) {
      console.error(`  ✗ Error processing ${item.page}:`, err.message);
    }
  }

  return updates;
}

/**
 * Record keyword performance for tracking
 */
async function recordKeywordPerformance(gscData) {
  const today = new Date().toISOString().split('T')[0];
  
  // Aggregate by keyword
  const keywordStats = {};
  for (const row of gscData) {
    const keyword = row.keys[0];
    if (!keywordStats[keyword]) {
      keywordStats[keyword] = {
        impressions: 0,
        clicks: 0,
        positions: []
      };
    }
    keywordStats[keyword].impressions += row.impressions;
    keywordStats[keyword].clicks += row.clicks;
    keywordStats[keyword].positions.push(row.position);
  }

  // Insert top 50 keywords
  const topKeywords = Object.entries(keywordStats)
    .sort((a, b) => b[1].impressions - a[1].impressions)
    .slice(0, 50);

  for (const [keyword, stats] of topKeywords) {
    const avgPosition = stats.positions.reduce((a, b) => a + b, 0) / stats.positions.length;
    
    try {
      await supabase
        .from('keyword_performance')
        .upsert({
          keyword,
          impressions: stats.impressions,
          clicks: stats.clicks,
          position: avgPosition.toFixed(1),
          recorded_at: today
        }, {
          onConflict: 'keyword,recorded_at'
        });
    } catch (err) {
      // Ignore duplicate errors
    }
  }
}

/**
 * Send weekly SEO report via email
 */
async function sendReport(analysis, updates) {
  if (!process.env.RESEND_API_KEY || !process.env.NOTIFY_EMAIL) {
    console.log('⚠️ Email not configured, skipping report');
    return;
  }

  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        h1 { color: #1a56db; }
        h2 { color: #374151; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; }
        .summary { background: #f0f9ff; padding: 16px; border-radius: 8px; margin-bottom: 24px; }
        .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
        .card-title { font-weight: 600; color: #1f2937; }
        .card-meta { font-size: 14px; color: #6b7280; margin-top: 4px; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; }
        .badge-blue { background: #dbeafe; color: #1e40af; }
        .badge-green { background: #dcfce7; color: #166534; }
        .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>📊 Weekly SEO Report</h1>
        <p style="color: #6b7280;">${date} | xk-truck.cn</p>
        
        <div class="summary">
          <strong>Summary:</strong><br>
          ${analysis.summary || 'No summary available.'}
        </div>
        
        <h2>✅ Optimized Pages (${updates.length})</h2>
        ${updates.length > 0 ? updates.map(u => `
          <div class="card">
            <div class="card-title">${u.keyword}</div>
            <div class="card-meta">${u.reason}</div>
            <div style="margin-top: 8px;">
              <span class="badge badge-blue">New Title</span>
              <span style="font-size: 14px; margin-left: 4px;">${u.suggested_title || 'N/A'}</span>
            </div>
          </div>
        `).join('') : '<p style="color: #6b7280;">No pages optimized this week.</p>'}
        
        <h2>💡 Content Ideas</h2>
        ${(analysis.new_content_ideas || []).length > 0 ? (analysis.new_content_ideas || []).map(n => `
          <div class="card">
            <div class="card-title">${n.keyword}</div>
            <div class="card-meta">${n.reason}</div>
            <div style="margin-top: 8px;">
              <span class="badge badge-green">Suggested URL</span>
              <span style="font-size: 14px; margin-left: 4px;">${n.suggested_page}</span>
            </div>
          </div>
        `).join('') : '<p style="color: #6b7280;">No new content suggestions this week.</p>'}
        
        <div class="footer">
          <p>This report was automatically generated by the SEO Auto Update workflow.</p>
          <p>View detailed analytics in <a href="https://search.google.com/search-console">Google Search Console</a></p>
        </div>
      </div>
    </body>
    </html>
  `;

  await resend.emails.send({
    from: 'SEO Bot <noreply@xk-truck.cn>',
    to: process.env.NOTIFY_EMAIL,
    subject: `📊 Weekly SEO Report - ${updates.length} pages optimized`,
    html
  });
}

// Run main function
main();
