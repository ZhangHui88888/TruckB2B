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
  apiPath: '/zh/collections/{collection}/products.json',
  // xklamp.com collection 路径 -> 数据库品牌 slug 映射
  brandMapping: {
    'volvo': 'volvo',
    'scania': 'scania', 
    'benz': 'mercedes-benz',      // xklamp 用 benz，数据库用 mercedes-benz
    'man': 'man',
    'iveco': 'iveco',
    'renault': 'renault',
    'daf': 'daf',
    'ford': 'ford',
  },
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
async function fetchShopifyProducts(collectionSlug) {
  const url = `${CONFIG.sourceUrl}${CONFIG.apiPath.replace('{collection}', collectionSlug)}`;
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
 * 从描述中提取交叉引用号码
 */
function extractCrossReferences(text) {
  const refs = new Set();
  // 匹配常见的OE号码格式 (6-10位数字)
  const matches = text.match(/\b\d{6,10}\b/g);
  if (matches) {
    matches.forEach(m => refs.add(m));
  }
  return Array.from(refs).slice(0, 10); // 最多10个
}

/**
 * 从描述中提取适配车型
 */
function extractFitment(text, title) {
  const fitment = new Set();
  
  // 从标题提取
  const titleMatch = title.match(/Compatible with\s+([^-]+)/i);
  if (titleMatch) {
    fitment.add(titleMatch[1].trim());
  }
  
  // 从描述中提取车型系列
  const seriesPatterns = [
    /(?:VOLVO|Volvo)\s+(FH\d?|FM\d?|FMX|FE)\s*(?:\d{4})?(?:\s*-\s*\d{4})?/gi,
    /(?:SCANIA|Scania)\s+(R|S|P|G)\s*(?:Series)?/gi,
    /(?:MERCEDES|Mercedes|Benz)\s+(Actros|Arocs|Atego)\s*(?:MP\d)?/gi,
    /(?:MAN)\s+(TGX|TGS|TGL|TGM)/gi,
    /(?:IVECO)\s+(Stralis|S-Way|Eurocargo|Daily)/gi,
    /(?:RENAULT)\s+(T|C|K|D)\s*(?:Series)?/gi,
    /(?:DAF)\s+(XF|CF|LF)/gi,
    /(?:FORD)\s+(Cargo)/gi,
  ];
  
  seriesPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(m => fitment.add(m.trim()));
    }
  });
  
  return Array.from(fitment).slice(0, 8); // 最多8个
}

/**
 * 生成SEO友好的产品描述
 */
function generateSEODescription(product, brandSlug, oeNumber, fitment) {
  const brandName = brandSlug.toUpperCase().replace('MERCEDES-BENZ', 'MERCEDES-BENZ');
  const productType = extractProductType(product.title);
  
  // 第一句：产品核心信息
  let desc = `High-quality ${productType} designed for ${brandName} trucks`;
  if (fitment.length > 0) {
    desc += ` (${fitment[0]})`;
  }
  desc += '. ';
  
  // 第二句：特点和质量
  desc += `Features OEM quality construction with premium materials for superior performance and durability. `;
  
  // 第三句：OE号码和认证
  if (oeNumber) {
    desc += `Direct replacement for OE number ${oeNumber}. `;
  }
  desc += `E-Mark certified for European standards. `;
  
  // 第四句：供应信息
  desc += `Factory direct pricing with immediate shipping available from our 35,000㎡ manufacturing facility.`;
  
  return desc;
}

/**
 * 从标题提取产品类型
 */
function extractProductType(title) {
  const types = {
    'headlamp': 'LED headlamp',
    'headlight': 'LED headlight',
    'tail lamp': 'tail lamp',
    'tail light': 'tail light',
    'fog lamp': 'fog lamp',
    'fog light': 'fog light',
    'side marker': 'side marker lamp',
    'mirror': 'mirror assembly',
    'grille': 'front grille',
    'bumper': 'bumper',
    'corner lamp': 'corner lamp',
  };
  
  const lowerTitle = title.toLowerCase();
  for (const [key, value] of Object.entries(types)) {
    if (lowerTitle.includes(key)) {
      return value;
    }
  }
  
  return 'truck part';
}

/**
 * 提取产品特点
 */
function extractFeatures(text, productType) {
  const features = [];
  
  // 通用特点
  features.push('OEM quality construction');
  features.push('Direct fit replacement');
  features.push('E-Mark certified');
  
  // 根据产品类型添加特定特点
  if (productType.includes('LED') || productType.includes('lamp') || productType.includes('light')) {
    features.push('Superior visibility');
    features.push('Weather resistant design');
    features.push('Long service life');
  }
  
  if (productType.includes('mirror')) {
    features.push('Wide viewing angle');
    features.push('Anti-vibration design');
  }
  
  // 从描述中提取特点关键词
  const keywords = ['durable', 'premium', 'certified', 'waterproof', 'resistant'];
  keywords.forEach(kw => {
    if (text.toLowerCase().includes(kw) && features.length < 8) {
      features.push(`${kw.charAt(0).toUpperCase() + kw.slice(1)} quality`);
    }
  });
  
  return features.slice(0, 6);
}

/**
 * 解析 Shopify 产品数据
 */
function parseShopifyProduct(product, brandSlug) {
  // 从标题提取 OE 编号 (通常是开头的数字)
  const oeMatch = product.title.match(/^(\d{6,})/);
  const oeNumber = oeMatch ? oeMatch[1] : '';
  
  // 处理图片 URL
  const images = (product.images || []).map(img => img.src);
  
  // 清理 HTML 描述
  let rawDescription = product.body_html || '';
  rawDescription = rawDescription.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  rawDescription = rawDescription.replace(/<[^>]+>/g, ' ');
  rawDescription = rawDescription.replace(/\s+/g, ' ').trim();
  
  // 提取结构化信息
  const crossReferences = extractCrossReferences(rawDescription);
  const fitment = extractFitment(rawDescription, product.title);
  const productType = extractProductType(product.title);
  
  // 生成SEO友好的描述
  const seoDescription = generateSEODescription(product, brandSlug, oeNumber, fitment);
  
  // 生成简短描述（用于列表页）
  const shortDescription = `${productType.charAt(0).toUpperCase() + productType.slice(1)} for ${brandSlug.toUpperCase()} trucks${fitment.length > 0 ? ' - ' + fitment[0] : ''}`;
  
  // 提取特点
  const features = extractFeatures(rawDescription, productType);
  
  // 提取年份范围
  const yearMatch = rawDescription.match(/(\d{4})\s*-\s*(\d{4})/);
  const fitmentYears = yearMatch ? `${yearMatch[1]}-${yearMatch[2]}` : '';
  
  return {
    shopifyId: product.id.toString(),
    handle: product.handle,
    name: product.title,
    description: seoDescription,
    shortDescription: shortDescription,
    oeNumber: oeNumber,
    crossReferences: crossReferences.filter(ref => ref !== oeNumber).slice(0, 5), // 排除主OE号，最多5个
    images: images,
    mainImage: images[0] || '',
    fitment: fitment,
    fitmentYears: fitmentYears,
    features: features,
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

async function syncBrand(collectionSlug, dbBrandSlug) {
  console.log(`\n🚛 开始同步品牌: ${dbBrandSlug.toUpperCase()} (collection: ${collectionSlug})`);
  
  const brandId = await getBrandId(dbBrandSlug);
  if (!brandId) {
    console.error(`❌ 未找到品牌: ${dbBrandSlug}`);
    return { success: 0, failed: 0 };
  }
  
  // 从 Shopify JSON API 获取产品
  const shopifyProducts = await fetchShopifyProducts(collectionSlug);
  console.log(`📦 共找到 ${shopifyProducts.length} 个产品`);
  
  if (shopifyProducts.length === 0) {
    return { success: 0, failed: 0 };
  }
  
  let success = 0;
  let failed = 0;
  
  for (const shopifyProduct of shopifyProducts) {
    try {
      // 解析 Shopify 产品数据
      const parsed = parseShopifyProduct(shopifyProduct, dbBrandSlug);
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
        cross_reference: parsed.crossReferences,
        main_image_url: parsed.mainImage,
        images: parsed.images,
        fitment: parsed.fitment,
        fitment_years: parsed.fitmentYears,
        specifications: {
          'Part Type': categoryName,
          'OE Number': parsed.oeNumber,
          'Certification': 'E-Mark, ADB',
          'Voltage': '24V',
          'Material': 'PP + PC',
          'Warranty': '12 months',
        },
        features: parsed.features,
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
  
  // 遍历品牌映射
  for (const [collectionSlug, dbBrandSlug] of Object.entries(CONFIG.brandMapping)) {
    const result = await syncBrand(collectionSlug, dbBrandSlug);
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
    details: { brands: Object.keys(CONFIG.brandMapping), duration: `${duration}s` },
  });
}

main().catch(console.error);
