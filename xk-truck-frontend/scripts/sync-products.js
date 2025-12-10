/**
 * 产品同步脚本
 * 从 xklamp.com 爬取产品数据并同步到 Supabase
 * 
 * 使用方法:
 *   node scripts/sync-products.js
 * 
 * 环境变量:
 *   SUPABASE_URL - Supabase 项目 URL
 *   SUPABASE_SERVICE_KEY - Supabase service_role key
 *   R2_ACCOUNT_ID - Cloudflare Account ID
 *   R2_ACCESS_KEY_ID - R2 Access Key ID
 *   R2_SECRET_ACCESS_KEY - R2 Secret Access Key
 *   R2_BUCKET_NAME - R2 存储桶名称
 */

import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';
import path from 'path';

// =====================================================
// 配置
// =====================================================
const CONFIG = {
  sourceUrl: 'https://xklamp.com',
  brands: ['volvo', 'scania', 'mercedes-benz', 'man', 'iveco', 'renault', 'daf', 'ford'],
  maxConcurrent: 3,
  delayBetweenRequests: 1000, // ms
  imageQuality: 80,
};

// =====================================================
// 初始化客户端
// =====================================================
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

// =====================================================
// 工具函数
// =====================================================

/**
 * 延迟函数
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 生成 slug
 */
function generateSlug(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 100);
}

/**
 * 生成图片文件名
 */
function generateImageFilename(url, productSlug) {
  const ext = path.extname(new URL(url).pathname) || '.jpg';
  const hash = crypto.createHash('md5').update(url).digest('hex').substring(0, 8);
  return `products/${productSlug}-${hash}${ext}`;
}

/**
 * 获取网页内容
 */
async function fetchPage(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.text();
  } catch (error) {
    console.error(`Failed to fetch ${url}:`, error.message);
    return null;
  }
}

/**
 * 上传图片到 R2
 */
async function uploadImageToR2(imageUrl, filename) {
  try {
    // 下载图片
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status}`);
    }
    
    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    
    // 上传到 R2
    await r2Client.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: filename,
      Body: buffer,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000', // 1 year cache
    }));
    
    // 返回 R2 公开 URL
    return `https://${process.env.R2_PUBLIC_DOMAIN}/${filename}`;
  } catch (error) {
    console.error(`Failed to upload image ${imageUrl}:`, error.message);
    return null;
  }
}

// =====================================================
// 爬虫解析函数 (需要根据 xklamp.com 实际结构调整)
// =====================================================

/**
 * 解析品牌产品列表页
 */
async function parseBrandProductList(brandSlug) {
  const products = [];
  let page = 1;
  let hasMore = true;
  
  while (hasMore) {
    const url = `${CONFIG.sourceUrl}/products/${brandSlug}?page=${page}`;
    console.log(`Fetching: ${url}`);
    
    const html = await fetchPage(url);
    if (!html) {
      hasMore = false;
      continue;
    }
    
    const $ = cheerio.load(html);
    const productCards = $('.product-card, .product-item, [data-product]');
    
    if (productCards.length === 0) {
      hasMore = false;
      continue;
    }
    
    productCards.each((_, el) => {
      const $el = $(el);
      const product = {
        sourceUrl: $el.find('a').attr('href'),
        name: $el.find('.product-name, .title, h3').text().trim(),
        image: $el.find('img').attr('src') || $el.find('img').attr('data-src'),
        oeNumber: $el.find('.oe-number, .part-number').text().trim(),
        brand: brandSlug,
      };
      
      if (product.sourceUrl && product.name) {
        // 确保 URL 是完整的
        if (!product.sourceUrl.startsWith('http')) {
          product.sourceUrl = CONFIG.sourceUrl + product.sourceUrl;
        }
        if (product.image && !product.image.startsWith('http')) {
          product.image = CONFIG.sourceUrl + product.image;
        }
        products.push(product);
      }
    });
    
    page++;
    await delay(CONFIG.delayBetweenRequests);
    
    // 安全限制：最多爬取 50 页
    if (page > 50) hasMore = false;
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
  
  // 解析产品详情 (需要根据实际页面结构调整选择器)
  const detail = {
    name: $('h1, .product-title').first().text().trim(),
    description: $('.product-description, .description, [itemprop="description"]').text().trim(),
    shortDescription: $('.short-description, .excerpt').text().trim(),
    
    // OE 编号
    oeNumber: $('.oe-number, .part-number, [data-oe]').text().trim()
      .replace(/OE\s*:?\s*/i, '').trim(),
    
    // 交叉参考编号
    crossReference: [],
    
    // 图片
    images: [],
    
    // 适配车型
    fitment: [],
    
    // 规格参数
    specifications: {},
    
    // 特性
    features: [],
    
    // 分类
    category: $('.breadcrumb a, .category').last().text().trim(),
  };
  
  // 解析图片
  $('.product-images img, .gallery img, .product-gallery img').each((_, el) => {
    let src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-large');
    if (src) {
      if (!src.startsWith('http')) {
        src = CONFIG.sourceUrl + src;
      }
      detail.images.push(src);
    }
  });
  
  // 解析交叉参考编号
  $('.cross-reference li, .ref-numbers li').each((_, el) => {
    const ref = $(el).text().trim();
    if (ref) detail.crossReference.push(ref);
  });
  
  // 解析适配车型
  $('.fitment li, .compatibility li, .vehicle-list li').each((_, el) => {
    const fit = $(el).text().trim();
    if (fit) detail.fitment.push(fit);
  });
  
  // 解析规格参数
  $('.specifications tr, .specs tr, .product-specs tr').each((_, el) => {
    const key = $(el).find('th, td:first').text().trim();
    const value = $(el).find('td:last').text().trim();
    if (key && value && key !== value) {
      detail.specifications[key] = value;
    }
  });
  
  // 解析特性
  $('.features li, .product-features li').each((_, el) => {
    const feature = $(el).text().trim();
    if (feature) detail.features.push(feature);
  });
  
  return detail;
}

// =====================================================
// 数据库操作
// =====================================================

/**
 * 获取或创建品牌
 */
async function getOrCreateBrand(brandName) {
  const slug = generateSlug(brandName);
  
  // 先查询
  const { data: existing } = await supabase
    .from('brands')
    .select('id')
    .eq('slug', slug)
    .single();
  
  if (existing) return existing.id;
  
  // 创建新品牌
  const { data: created, error } = await supabase
    .from('brands')
    .insert({ name: brandName.toUpperCase(), slug })
    .select('id')
    .single();
  
  if (error) {
    console.error('Failed to create brand:', error);
    return null;
  }
  
  return created.id;
}

/**
 * 获取或创建分类
 */
async function getOrCreateCategory(categoryName) {
  if (!categoryName) return null;
  
  const slug = generateSlug(categoryName);
  
  // 先查询
  const { data: existing } = await supabase
    .from('categories')
    .select('id')
    .eq('slug', slug)
    .single();
  
  if (existing) return existing.id;
  
  // 创建新分类
  const { data: created, error } = await supabase
    .from('categories')
    .insert({ name: categoryName, slug })
    .select('id')
    .single();
  
  if (error) {
    console.error('Failed to create category:', error);
    return null;
  }
  
  return created.id;
}

/**
 * 保存产品到数据库
 */
async function saveProduct(product, brandId, categoryId) {
  const slug = generateSlug(product.name);
  
  const productData = {
    name: product.name,
    slug,
    description: product.description,
    short_description: product.shortDescription || product.description?.substring(0, 200),
    brand_id: brandId,
    category_id: categoryId,
    oe_number: product.oeNumber,
    cross_reference: product.crossReference,
    main_image_url: product.mainImageUrl,
    images: product.images,
    fitment: product.fitment,
    specifications: product.specifications,
    features: product.features,
    source_url: product.sourceUrl,
    synced_at: new Date().toISOString(),
    is_active: true,
  };
  
  // Upsert: 如果存在则更新，否则插入
  const { data, error } = await supabase
    .from('products')
    .upsert(productData, { onConflict: 'slug' })
    .select('id')
    .single();
  
  if (error) {
    console.error('Failed to save product:', error);
    return null;
  }
  
  return data.id;
}

// =====================================================
// 主同步流程
// =====================================================

/**
 * 创建同步日志
 */
async function createSyncLog(syncType) {
  const { data, error } = await supabase
    .from('sync_logs')
    .insert({
      sync_type: syncType,
      status: 'running',
    })
    .select('id')
    .single();
  
  if (error) {
    console.error('Failed to create sync log:', error);
    return null;
  }
  
  return data.id;
}

/**
 * 更新同步日志
 */
async function updateSyncLog(logId, updates) {
  await supabase
    .from('sync_logs')
    .update(updates)
    .eq('id', logId);
}

/**
 * 同步单个品牌的产品
 */
async function syncBrandProducts(brandSlug, logId) {
  console.log(`\n========== Syncing ${brandSlug.toUpperCase()} ==========`);
  
  // 获取品牌 ID
  const brandId = await getOrCreateBrand(brandSlug);
  if (!brandId) {
    console.error(`Failed to get brand ID for ${brandSlug}`);
    return { processed: 0, failed: 0 };
  }
  
  // 获取产品列表
  const productList = await parseBrandProductList(brandSlug);
  console.log(`Found ${productList.length} products for ${brandSlug}`);
  
  let processed = 0;
  let failed = 0;
  
  for (const item of productList) {
    try {
      console.log(`Processing: ${item.name}`);
      
      // 获取产品详情
      const detail = await parseProductDetail(item.sourceUrl);
      if (!detail) {
        failed++;
        continue;
      }
      
      // 合并数据
      const product = {
        ...item,
        ...detail,
        name: detail.name || item.name,
        oeNumber: detail.oeNumber || item.oeNumber,
      };
      
      // 获取分类 ID
      const categoryId = await getOrCreateCategory(product.category);
      
      // 上传图片到 R2 (如果配置了 R2)
      if (process.env.R2_BUCKET_NAME && product.images?.length > 0) {
        const uploadedImages = [];
        const slug = generateSlug(product.name);
        
        for (let i = 0; i < Math.min(product.images.length, 5); i++) {
          const filename = generateImageFilename(product.images[i], slug);
          const r2Url = await uploadImageToR2(product.images[i], filename);
          if (r2Url) {
            uploadedImages.push(r2Url);
          }
          await delay(500); // 避免请求过快
        }
        
        if (uploadedImages.length > 0) {
          product.mainImageUrl = uploadedImages[0];
          product.images = uploadedImages;
        }
      } else {
        // 使用原始图片 URL
        product.mainImageUrl = product.images?.[0] || item.image;
      }
      
      // 保存到数据库
      const productId = await saveProduct(product, brandId, categoryId);
      if (productId) {
        processed++;
        console.log(`✓ Saved: ${product.name}`);
      } else {
        failed++;
      }
      
      // 更新进度
      if (logId) {
        await updateSyncLog(logId, {
          processed_items: processed,
          failed_items: failed,
        });
      }
      
      await delay(CONFIG.delayBetweenRequests);
      
    } catch (error) {
      console.error(`Error processing ${item.name}:`, error);
      failed++;
    }
  }
  
  return { processed, failed };
}

/**
 * 主函数：同步所有产品
 */
async function syncAllProducts() {
  console.log('========================================');
  console.log('Starting product sync from xklamp.com');
  console.log('========================================');
  
  // 创建同步日志
  const logId = await createSyncLog('products');
  
  let totalProcessed = 0;
  let totalFailed = 0;
  
  try {
    for (const brand of CONFIG.brands) {
      const { processed, failed } = await syncBrandProducts(brand, logId);
      totalProcessed += processed;
      totalFailed += failed;
    }
    
    // 更新同步日志为完成
    if (logId) {
      await updateSyncLog(logId, {
        status: 'completed',
        total_items: totalProcessed + totalFailed,
        processed_items: totalProcessed,
        failed_items: totalFailed,
        completed_at: new Date().toISOString(),
      });
    }
    
    console.log('\n========================================');
    console.log('Sync completed!');
    console.log(`Total processed: ${totalProcessed}`);
    console.log(`Total failed: ${totalFailed}`);
    console.log('========================================');
    
  } catch (error) {
    console.error('Sync failed:', error);
    
    if (logId) {
      await updateSyncLog(logId, {
        status: 'failed',
        error_message: error.message,
        completed_at: new Date().toISOString(),
      });
    }
    
    process.exit(1);
  }
}

// =====================================================
// 运行
// =====================================================

// 检查环境变量
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error('Missing required environment variables:');
  console.error('  SUPABASE_URL');
  console.error('  SUPABASE_SERVICE_KEY');
  console.error('\nOptional for image upload:');
  console.error('  R2_ACCOUNT_ID');
  console.error('  R2_ACCESS_KEY_ID');
  console.error('  R2_SECRET_ACCESS_KEY');
  console.error('  R2_BUCKET_NAME');
  console.error('  R2_PUBLIC_DOMAIN');
  process.exit(1);
}

syncAllProducts();
