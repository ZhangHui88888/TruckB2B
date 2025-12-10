/**
 * 产品同步脚本 (简化版)
 * 从 xklamp.com Shopify JSON API 获取产品数据并同步到 Supabase
 * 图片直接使用 Shopify CDN 的原始 URL
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

// =====================================================
// 配置
// =====================================================
const CONFIG = {
  sourceUrl: 'https://xklamp.com',
  // Shopify JSON API 格式
  apiPath: '/zh/collections/{brand}/products.json',
  brands: ['volvo', 'scania', 'mercedes-benz', 'man', 'iveco', 'renault', 'daf', 'ford'],
  delayBetweenRequests: 500, // ms
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

/**
 * 从 Shopify JSON API 获取产品列表
 */
async function fetchShopifyProducts(brandSlug) {
  const url = `${CONFIG.sourceUrl}${CONFIG.apiPath.replace('{brand}', brandSlug)}`;
  console.log(`  📄 获取: ${url}`);
  
  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    
    if (!response.ok) {
      console.log(`  ⚠️ HTTP ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    return data.products || [];
  } catch (error) {
    console.error(`  ❌ 获取失败:`, error.message);
    return [];
  }
}

/**
 * 解析 Shopify 产品数据
 */
function parseShopifyProduct(product, brandSlug) {
  // 从标题提取 OE 编号 (通常是开头的数字)
  const oeMatch = product.title.match(/^(\d{6,})/);
  const oeNumber = oeMatch ? oeMatch[1] : '';
  
  // 从标题提取适配车型 (Compatible with xxx)
  const fitment = [];
  const compatMatch = product.title.match(/Compatible with\s+(.+)/i);
  if (compatMatch) {
    fitment.push(compatMatch[1].trim());
  }
  
  // 处理图片 URL
  const images = (product.images || []).map(img => img.src);
  
  // 清理 HTML 描述
  let description = product.body_html || '';
  // 移除 style 标签
  description = description.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  // 移除 HTML 标签
  description = description.replace(/<[^>]+>/g, ' ');
  // 清理多余空格
  description = description.replace(/\s+/g, ' ').trim();
  // 截取前 2000 字符
  if (description.length > 2000) {
    description = description.substring(0, 2000) + '...';
  }
  
  return {
    shopifyId: product.id.toString(),
    handle: product.handle,
    name: product.title,
    description: description,
    shortDescription: product.title,
    oeNumber: oeNumber,
    images: images,
    mainImage: images[0] || '',
    fitment: fitment,
    brand: brandSlug,
    tags: product.tags || [],
    vendor: product.vendor,
    createdAt: product.created_at,
    updatedAt: product.updated_at,
  };
}

// =====================================================
// 数据库操作
// =====================================================

async function getBrandId(brandSlug) {
  const { data, error } = await supabase
    .from('brands')
    .select('id')
    .eq('slug', brandSlug)
    .single();
  
  if (error) {
    console.error(`  ❌ 查询品牌失败: ${error.message}`);
    console.error(`  详情: ${JSON.stringify(error)}`);
  }
  
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
  
  // 从 Shopify JSON API 获取产品
  const shopifyProducts = await fetchShopifyProducts(brandSlug);
  console.log(`📦 共找到 ${shopifyProducts.length} 个产品`);
  
  if (shopifyProducts.length === 0) {
    return { success: 0, failed: 0 };
  }
  
  let success = 0;
  let failed = 0;
  
  for (const shopifyProduct of shopifyProducts) {
    try {
      // 解析 Shopify 产品数据
      const parsed = parseShopifyProduct(shopifyProduct, brandSlug);
      console.log(`  处理: ${parsed.name}`);
      
      // 根据标签确定分类
      let categoryName = 'Headlamps'; // 默认分类
      const tags = parsed.tags.map(t => t.toLowerCase());
      if (tags.includes('tail') || tags.includes('rear')) {
        categoryName = 'Tail Lamps';
      } else if (tags.includes('fog')) {
        categoryName = 'Fog Lamps';
      } else if (tags.includes('mirror')) {
        categoryName = 'Mirrors';
      }
      
      const categoryId = await getCategoryId(categoryName);
      const slug = parsed.handle || generateSlug(parsed.name);
      
      const product = {
        slug,
        name: parsed.name,
        description: parsed.description,
        short_description: parsed.shortDescription,
        brand_id: brandId,
        category_id: categoryId,
        oe_number: parsed.oeNumber,
        cross_reference: [],
        main_image_url: parsed.mainImage,
        images: parsed.images,
        fitment: parsed.fitment,
        specifications: {},
        features: [],
        source_url: `${CONFIG.sourceUrl}/zh/products/${parsed.handle}`,
        is_active: true,
      };
      
      const productId = await upsertProduct(product);
      if (productId) {
        success++;
        console.log(`  ✅ 已保存: ${parsed.name.substring(0, 50)}...`);
      } else {
        failed++;
      }
      
      await delay(100); // 小延迟避免数据库压力
      
    } catch (error) {
      console.error(`  ❌ 处理失败:`, error.message);
      failed++;
    }
  }
  
  return { success, failed };
}

async function main() {
  console.log('========================================');
  console.log('🚀 XKTRUCK 产品同步 (Shopify JSON API)');
  console.log('📷 图片直接使用 Shopify CDN URL');
  console.log('========================================');
  
  // 测试数据库连接
  console.log('\n🔗 测试数据库连接...');
  console.log(`  URL: ${supabaseUrl}`);
  const { data: testData, error: testError } = await supabase.from('brands').select('count');
  if (testError) {
    console.error(`❌ 数据库连接失败: ${testError.message}`);
    console.error(`详情: ${JSON.stringify(testError)}`);
    process.exit(1);
  }
  console.log(`✅ 数据库连接成功`);
  
  // 列出所有品牌
  const { data: allBrands, error: brandsError } = await supabase.from('brands').select('slug');
  if (brandsError) {
    console.error(`❌ 获取品牌列表失败: ${brandsError.message}`);
  } else {
    console.log(`📋 数据库中的品牌: ${allBrands?.map(b => b.slug).join(', ') || '无'}`);
  }
  
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
