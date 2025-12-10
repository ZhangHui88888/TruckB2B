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
  // Shopify 格式: /zh/collections/{brand}
  collectionPath: '/zh/collections',
  productPath: '/zh/products',
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
 * 解析品牌产品列表页 (Shopify 格式)
 */
async function parseBrandProductList(brandSlug) {
  const products = [];
  let page = 1;
  let hasMore = true;
  
  while (hasMore && page <= 10) {
    const url = `${CONFIG.sourceUrl}${CONFIG.collectionPath}/${brandSlug}?page=${page}`;
    console.log(`  📄 获取: ${url}`);
    
    const html = await fetchPage(url);
    if (!html) {
      hasMore = false;
      continue;
    }
    
    const $ = cheerio.load(html);
    
    // Shopify 产品卡片选择器
    const productCards = $('a[href*="/products/"]').filter((_, el) => {
      const href = $(el).attr('href') || '';
      return href.includes('/products/') && !href.includes('#');
    });
    
    // 去重 (Shopify 页面可能有重复链接)
    const seenUrls = new Set();
    const uniqueProducts = [];
    
    productCards.each((_, el) => {
      const $el = $(el);
      const href = $el.attr('href');
      const fullUrl = ensureFullUrl(href);
      
      if (fullUrl && !seenUrls.has(fullUrl)) {
        seenUrls.add(fullUrl);
        
        // 从链接文本或父元素获取产品名称
        let name = $el.text().trim();
        if (!name || name.length < 5) {
          name = $el.find('h2, h3, .card__heading, .product-title').text().trim();
        }
        if (!name || name.length < 5) {
          name = $el.closest('.card, .product-card, .grid__item').find('h2, h3, .card__heading').text().trim();
        }
        
        // 从产品名称提取 OE 编号 (通常是开头的数字)
        const oeMatch = name.match(/^(\d{6,})/);
        const oeNumber = oeMatch ? oeMatch[1] : '';
        
        // 获取图片
        const $card = $el.closest('.card, .product-card, .grid__item');
        let image = $card.find('img').first().attr('src') || $card.find('img').first().attr('data-src');
        if (!image) {
          image = $el.find('img').attr('src');
        }
        
        if (name && name.length > 5) {
          uniqueProducts.push({
            sourceUrl: fullUrl,
            name: name,
            image: ensureFullUrl(image),
            oeNumber: oeNumber,
            brand: brandSlug,
          });
        }
      }
    });
    
    if (uniqueProducts.length === 0) {
      console.log(`  ⚠️ 第 ${page} 页未找到产品`);
      hasMore = false;
      continue;
    }
    
    products.push(...uniqueProducts);
    console.log(`  ✓ 第 ${page} 页找到 ${uniqueProducts.length} 个产品`);
    
    // 检查是否有下一页
    const hasNextPage = $('a[href*="page=' + (page + 1) + '"]').length > 0 ||
                        $('.pagination__item--next, .next').length > 0;
    if (!hasNextPage) {
      hasMore = false;
    }
    
    page++;
    await delay(CONFIG.delayBetweenRequests);
  }
  
  return products;
}

/**
 * 解析产品详情页 (Shopify 格式)
 */
async function parseProductDetail(productUrl) {
  const html = await fetchPage(productUrl);
  if (!html) return null;
  
  const $ = cheerio.load(html);
  
  const detail = {
    name: '',
    description: '',
    shortDescription: '',
    oeNumber: '',
    crossReference: [],
    images: [],
    fitment: [],
    specifications: {},
    features: [],
    category: '',
  };
  
  // Shopify 产品标题
  detail.name = $('h1.product__title, h1.product-single__title, h1').first().text().trim();
  
  // 从标题提取 OE 编号
  const oeMatch = detail.name.match(/^(\d{6,})/);
  if (oeMatch) {
    detail.oeNumber = oeMatch[1];
  }
  
  // Shopify 产品描述
  detail.description = $('.product__description, .product-single__description, .product-description, [data-product-description]').first().text().trim();
  
  // 从描述中提取适配车型 (Compatible with xxx)
  const compatMatch = detail.name.match(/Compatible with\s+(.+)/i);
  if (compatMatch) {
    detail.fitment.push(compatMatch[1].trim());
  }
  
  // Shopify 产品图片
  // 主图
  const mainImg = $('img.product__media-image, img.product-single__photo, .product-featured-media img, .product__media img').first();
  let mainSrc = mainImg.attr('src') || mainImg.attr('data-src');
  if (mainSrc) {
    // Shopify 图片 URL 处理 - 获取大图
    mainSrc = mainSrc.replace(/_\d+x\d*\./, '_1024x.').replace(/\?.*$/, '');
    if (mainSrc.startsWith('//')) mainSrc = 'https:' + mainSrc;
    detail.images.push(mainSrc);
  }
  
  // 缩略图
  $('img.product__media-image, .product__media-item img, .product-single__thumbnail img, .thumbnail-list img').each((_, el) => {
    let src = $(el).attr('src') || $(el).attr('data-src');
    if (src) {
      src = src.replace(/_\d+x\d*\./, '_1024x.').replace(/\?.*$/, '');
      if (src.startsWith('//')) src = 'https:' + src;
      if (!detail.images.includes(src)) {
        detail.images.push(src);
      }
    }
  });
  
  // 从 JSON-LD 获取更多信息
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const json = JSON.parse($(el).html());
      if (json['@type'] === 'Product') {
        if (!detail.name && json.name) detail.name = json.name;
        if (!detail.description && json.description) detail.description = json.description;
        if (json.image && Array.isArray(json.image)) {
          json.image.forEach(img => {
            if (!detail.images.includes(img)) {
              detail.images.push(img);
            }
          });
        }
        if (json.sku) detail.oeNumber = json.sku;
      }
    } catch (e) {
      // ignore JSON parse errors
    }
  });
  
  // 分类从面包屑获取
  $('.breadcrumb a, .breadcrumbs a').each((_, el) => {
    const text = $(el).text().trim();
    if (text && text.toLowerCase() !== 'home' && text !== '首页') {
      detail.category = text;
    }
  });
  
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
