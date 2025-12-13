/**
 * 检查数据库中产品的图片状态
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ltqnikmoeroelfrwcfqr.supabase.co';
const supabaseKey = 'sb_publishable_VjrbThKmSR4LvYEeotnMlw_d8IZqYs4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkImages() {
  console.log('🔍 检查数据库中的产品图片...\n');
  
  // 获取前10个产品
  const { data: products, error } = await supabase
    .from('products')
    .select('name, main_image_url, images')
    .limit(10);
  
  if (error) {
    console.error('❌ 查询失败:', error.message);
    return;
  }
  
  console.log(`📦 找到 ${products.length} 个产品\n`);
  
  products.forEach((p, i) => {
    console.log(`${i + 1}. ${p.name}`);
    console.log(`   主图: ${p.main_image_url ? '✅ 有' : '❌ 无'}`);
    if (p.main_image_url) {
      console.log(`   URL: ${p.main_image_url.substring(0, 60)}...`);
    }
    console.log(`   图片数: ${p.images?.length || 0}`);
    console.log('');
  });
  
  // 统计
  const withImage = products.filter(p => p.main_image_url).length;
  const withoutImage = products.length - withImage;
  
  console.log('📊 统计:');
  console.log(`   有图片: ${withImage}`);
  console.log(`   无图片: ${withoutImage}`);
}

checkImages().catch(console.error);
