/**
 * 产品同步脚本 (简化版)
 * 从 xklamp.com 爬取产品数据并同步到 Supabase
 * 图片直接使用 xklamp.com 的原始 URL
 * 
 * 使用方法:
 *   node scripts/sync-products-simple.js
 * 
 * 环境变量:
 *   SUPABASE_URL - Supabase 项目 URL
 *   SUPABASE_SERVICE_KEY - Supabase service_role key
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';

// =====================================================
// 配置
// =====================================================
const CONFIG = {
  sourceUrl: 'https://xklamp.com',
  brands: ['volvo', 'scania', 'mercedes-benz', 'man', 'iveco', 'renault', 'daf', 'ford'],
  delayBetweenRequests: 1000, // ms
};

// =====================================================
// 初始化 Supabase 客户端
// =====================================================
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少环境变量: SUPABASE_URL 或 SUPABASE_SERVICE_KEY');
  console.log('请在 .env 文件中配置这些变量');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// =====================================================
// 工具函数
// =====================================================

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function generateSlug(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 100);
}

async function fetchPage(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    return await response.text();
  } catch (error) {
    console.error(`获取页面失败 ${url}:`, error.message);
    return null;
  }
}

// 确保 URL 是完整的
function ensureFullUrl(url) {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  if (url.startsWith('//')) return 'https:' + url;
  return CONFIG.sourceUrl + (url.startsWith('/') ? '' : '/') + url;
}

// =====================================================
// 爬虫解析函数 (需要根据 xklamp.com 实际结构调整)
// =====================================================

/**
 * 解析品牌产品列表页
 * 注意: 选择器需要根据 xklamp.com 实际 HTML 结构调整
 */
async function parseBrandProductList(brandSlug) {
  const products = [];
  let page = 1;
  let hasMore = true;
  
  while (hasMore && page <= 10) { // 限制最多10页
    const url = `${CONFIG.sourceUrl}/products/${brandSlug}?page=${page}`;
    console.log(`  📄 获取: ${url}`);
    
    const html = await fetchPage(url);
    if (!html) {
      hasMore = false;
      continue;
    }
    
    const $ = cheerio.load(html);
    
    // 尝试多种选择器 (根据实际网站调整)
    const productCards = $('.product-card, .product-item, .product-box, [data-product], .item');
    
    if (productCards.length === 0) {
      console.log(`  ⚠️ 未找到产品，可能需要调整选择器`);
      hasMore = false;
      continue;
    }
    
    productCards.each((_, el) => {
      const $el = $(el);
      const product = {
        sourceUrl: ensureFullUrl($el.find('a').first().attr('href')),
        name: $el.find('.product-name, .title, h3, h4, .name').first().text().trim(),
        image: ensureFullUrl($el.find('img').first().attr('src') || $el.find('img').first().attr('data-src')),
        oeNumber: $el.find('.oe-number, .part-number, .sku').first().text().trim().replace(/OE:?\s*/i, ''),
        brand: brandSlug,
      };
      
      if (product.name) {
        products.push(product);
      }
    });
    
    console.log(`  ✓ 找到 ${productCards.length} 个产品`);
    
    page++;
    await delay(CONFIG.delayBetweenRequests);
  }
  
  return products;
}

/**
 * 解析产品详情页
 */
async function parseProductDetail(productUrl) {
  const html = await fetchPage(productUrl);
  if (!html) return null;
  
  const $ = cheerio.load(html);
  
  const detail = {
    name: $('h1, .product-title, .product-name').first().text().trim(),
    description: $('.product-description, .description, .content').first().text().trim(),
    shortDescription: $('.short-description, .excerpt, .summary').first().text().trim(),
    oeNumber: '',
    crossReference: [],
    images: [],
    fitment: [],
    specifications: {},
    features: [],
    category: '',
  };
  
  // 解析 OE 编号
  const oeText = $('.oe-number, .part-number, [data-oe]').first().text();
  detail.oeNumber = oeText.replace(/OE\s*:?\s*/i, '').trim();
  
  // 解析图片 - 直接使用原始 URL
  $('.product-images img, .gallery img, .product-gallery img, .main-image img').each((_, el) => {
    const src = ensureFullUrl($(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-large'));
    if (src && !detail.images.includes(src)) {
      detail.images.push(src);
    }
  });
  
  // 解析适配车型
  $('.fitment li, .compatible-vehicles li, .application li').each((_, el) => {
    const text = $(el).text().trim();
    if (text) detail.fitment.push(text);
  });
  
  // 解析分类
  detail.category = $('.breadcrumb a, .category-name').last().text().trim();
  
  return detail;
}

// =====================================================
// 数据库操作
// =====================================================

async function getBrandId(brandSlug) {
  const { data } = await supabase
    .from('brands')
    .select('id')
    .eq('slug', brandSlug)
    .single();
  return data?.id;
}

async function getCategoryId(categoryName) {
  if (!categoryName) return null;
  
  const slug = generateSlug(categoryName);
  
  // 尝试获取现有分类
  let { data } = await supabase
    .from('categories')
    .select('id')
    .eq('slug', slug)
    .single();
  
  if (data) return data.id;
  
  // 创建新分类
  const { data: newCategory } = await supabase
    .from('categories')
    .insert({ name: categoryName, slug })
    .select('id')
    .single();
  
  return newCategory?.id;
}

async function upsertProduct(product) {
  const { data, error } = await supabase
    .from('products')
    .upsert(product, { onConflict: 'slug' })
    .select('id')
    .single();
  
  if (error) {
    console.error(`保存产品失败:`, error.message);
    return null;
  }
  
  return data?.id;
}

// =====================================================
// 主同步函数
// =====================================================

async function syncBrand(brandSlug) {
  console.log(`\n🚛 开始同步品牌: ${brandSlug.toUpperCase()}`);
  
  const brandId = await getBrandId(brandSlug);
  if (!brandId) {
    console.error(`❌ 未找到品牌: ${brandSlug}`);
    return { success: 0, failed: 0 };
  }
  
  // 获取产品列表
  const productList = await parseBrandProductList(brandSlug);
  console.log(`📦 共找到 ${productList.length} 个产品`);
  
  let success = 0;
  let failed = 0;
  
  for (const item of productList) {
    try {
      console.log(`  处理: ${item.name || item.sourceUrl}`);
      
      // 获取详情
      let detail = {};
      if (item.sourceUrl) {
        detail = await parseProductDetail(item.sourceUrl) || {};
        await delay(500);
      }
      
      // 合并数据
      const name = detail.name || item.name;
      const slug = generateSlug(name);
      const categoryId = await getCategoryId(detail.category);
      
      const product = {
        slug,
        name,
        description: detail.description || '',
        short_description: detail.shortDescription || '',
        brand_id: brandId,
        category_id: categoryId,
        oe_number: detail.oeNumber || item.oeNumber || '',
        cross_reference: detail.crossReference || [],
        main_image_url: detail.images?.[0] || item.image || '',  // 直接使用原始图片 URL
        images: detail.images || (item.image ? [item.image] : []),
        fitment: detail.fitment || [],
        specifications: detail.specifications || {},
        features: detail.features || [],
        source_url: item.sourceUrl,
        is_active: true,
      };
      
      const productId = await upsertProduct(product);
      if (productId) {
        success++;
        console.log(`  ✅ 已保存: ${name}`);
      } else {
        failed++;
      }
      
    } catch (error) {
      console.error(`  ❌ 处理失败:`, error.message);
      failed++;
    }
  }
  
  return { success, failed };
}

async function main() {
  console.log('========================================');
  console.log('🚀 XKTRUCK 产品同步 (简化版)');
  console.log('📷 图片直接使用 xklamp.com 原始 URL');
  console.log('========================================');
  
  const startTime = Date.now();
  let totalSuccess = 0;
  let totalFailed = 0;
  
  for (const brand of CONFIG.brands) {
    const result = await syncBrand(brand);
    totalSuccess += result.success;
    totalFailed += result.failed;
  }
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  
  console.log('\n========================================');
  console.log('📊 同步完成');
  console.log(`✅ 成功: ${totalSuccess}`);
  console.log(`❌ 失败: ${totalFailed}`);
  console.log(`⏱️ 耗时: ${duration}s`);
  console.log('========================================');
  
  // 记录同步日志
  await supabase.from('sync_logs').insert({
    sync_type: 'products',
    status: totalFailed === 0 ? 'success' : 'partial',
    items_synced: totalSuccess,
    items_failed: totalFailed,
    details: { brands: CONFIG.brands, duration: `${duration}s` },
  });
}

main().catch(console.error);
