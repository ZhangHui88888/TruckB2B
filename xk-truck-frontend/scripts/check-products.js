/**
 * 检查产品数据和图片状态
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少环境变量');
  console.log('\n请配置以下环境变量之一：');
  console.log('  SUPABASE_URL 或 PUBLIC_SUPABASE_URL');
  console.log('  SUPABASE_SERVICE_KEY 或 SUPABASE_ANON_KEY 或 PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProducts() {
  console.log('========================================');
  console.log('🔍 检查产品数据状态');
  console.log('========================================\n');
  
  console.log(`📡 连接到: ${supabaseUrl}`);
  
  // 检查产品总数
  const { count: totalCount, error: countError } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true });
  
  if (countError) {
    console.error(`❌ 查询失败: ${countError.message}`);
    return;
  }
  
  console.log(`\n📦 产品总数: ${totalCount}`);
  
  // 检查有图片的产品
  const { count: withImageCount } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .not('main_image_url', 'is', null)
    .neq('main_image_url', '');
  
  console.log(`📷 有图片的产品: ${withImageCount}`);
  console.log(`🚫 无图片的产品: ${totalCount - withImageCount}`);
  
  // 获取前5个产品示例
  const { data: sampleProducts } = await supabase
    .from('products')
    .select('name, main_image_url, brand_id, category_id')
    .limit(5);
  
  if (sampleProducts && sampleProducts.length > 0) {
    console.log('\n📋 产品示例:');
    sampleProducts.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.name}`);
      console.log(`     图片: ${p.main_image_url || '❌ 无'}`);
      console.log(`     品牌ID: ${p.brand_id}, 分类ID: ${p.category_id}`);
    });
  }
  
  // 检查品牌
  const { data: brands } = await supabase
    .from('brands')
    .select('name, slug');
  
  console.log(`\n🏷️ 品牌列表 (${brands?.length || 0}个):`);
  brands?.forEach(b => console.log(`  - ${b.name} (${b.slug})`));
  
  console.log('\n========================================');
}

checkProducts().catch(console.error);
