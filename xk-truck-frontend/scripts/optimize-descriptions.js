/**
 * 优化现有产品描述脚本
 * 将数据库中冗长的描述优化为SEO友好的简洁描述
 * 
 * 使用方法:
 *   node scripts/optimize-descriptions.js
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少环境变量: SUPABASE_URL 或 SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

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
 * 生成SEO友好的产品描述
 */
function generateSEODescription(product) {
  const brandName = product.brand_name || 'truck';
  const productType = extractProductType(product.name);
  const fitment = product.fitment && product.fitment.length > 0 ? product.fitment[0] : '';
  const oeNumber = product.oe_number;
  
  // 第一句：产品核心信息
  let desc = `High-quality ${productType} designed for ${brandName} trucks`;
  if (fitment) {
    desc += ` (${fitment})`;
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
 * 生成简短描述
 */
function generateShortDescription(product) {
  const productType = extractProductType(product.name);
  const brandName = product.brand_name || 'truck';
  const fitment = product.fitment && product.fitment.length > 0 ? product.fitment[0] : '';
  
  return `${productType.charAt(0).toUpperCase() + productType.slice(1)} for ${brandName} trucks${fitment ? ' - ' + fitment : ''}`;
}

/**
 * 生成产品特点
 */
function generateFeatures(productType) {
  const features = [
    'OEM quality construction',
    'Direct fit replacement',
    'E-Mark certified',
  ];
  
  if (productType.includes('LED') || productType.includes('lamp') || productType.includes('light')) {
    features.push('Superior visibility');
    features.push('Weather resistant design');
    features.push('Long service life');
  } else if (productType.includes('mirror')) {
    features.push('Wide viewing angle');
    features.push('Anti-vibration design');
    features.push('Durable construction');
  } else {
    features.push('Premium materials');
    features.push('Durable construction');
    features.push('Factory tested');
  }
  
  return features.slice(0, 6);
}

async function main() {
  console.log('========================================');
  console.log('🔧 优化产品描述');
  console.log('========================================\n');
  
  // 获取所有产品
  console.log('📦 获取产品列表...');
  const { data: products, error } = await supabase
    .from('products')
    .select(`
      id,
      name,
      description,
      short_description,
      oe_number,
      fitment,
      features,
      brands(name)
    `)
    .eq('is_active', true);
  
  if (error) {
    console.error('❌ 获取产品失败:', error.message);
    process.exit(1);
  }
  
  console.log(`✅ 找到 ${products.length} 个产品\n`);
  
  let updated = 0;
  let skipped = 0;
  
  for (const product of products) {
    const productData = {
      ...product,
      brand_name: product.brands?.name,
    };
    
    // 检查是否需要优化（描述过长或包含大量重复内容）
    const needsOptimization = 
      !product.description || 
      product.description.length > 500 ||
      (product.description.match(/\d{6,}/g) || []).length > 3;
    
    if (!needsOptimization) {
      skipped++;
      continue;
    }
    
    console.log(`  🔄 优化: ${product.name.substring(0, 50)}...`);
    
    // 生成新描述
    const newDescription = generateSEODescription(productData);
    const newShortDescription = generateShortDescription(productData);
    const productType = extractProductType(product.name);
    const newFeatures = product.features && product.features.length > 0 
      ? product.features 
      : generateFeatures(productType);
    
    // 更新产品
    const { error: updateError } = await supabase
      .from('products')
      .update({
        description: newDescription,
        short_description: newShortDescription,
        features: newFeatures,
      })
      .eq('id', product.id);
    
    if (updateError) {
      console.error(`  ❌ 更新失败: ${updateError.message}`);
    } else {
      updated++;
      console.log(`  ✅ 已优化`);
    }
    
    // 小延迟避免数据库压力
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('\n========================================');
  console.log('📊 优化完成');
  console.log(`✅ 已优化: ${updated}`);
  console.log(`⏭️ 跳过: ${skipped}`);
  console.log('========================================');
}

main().catch(console.error);
