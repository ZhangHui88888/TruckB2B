/**
 * 从 xklamp.com 获取产品图片URL并生成SQL更新语句
 * 不需要连接数据库，只生成SQL文件
 * 
 * 使用方法:
 *   node scripts/generate-image-sql.js > update-images.sql
 *   然后在 Supabase SQL Editor 中执行生成的 SQL
 */

const BRANDS = [
  { collection: 'volvo', dbSlug: 'volvo' },
  { collection: 'scania', dbSlug: 'scania' },
  { collection: 'benz', dbSlug: 'mercedes-benz' },
  { collection: 'man', dbSlug: 'man' },
  { collection: 'iveco', dbSlug: 'iveco' },
  { collection: 'renault', dbSlug: 'renault' },
  { collection: 'daf', dbSlug: 'daf' },
  { collection: 'ford', dbSlug: 'ford' },
];

function generateSlug(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 100);
}

function escapeSQL(str) {
  return str.replace(/'/g, "''");
}

async function fetchProducts(collectionSlug) {
  const url = `https://xklamp.com/zh/collections/${collectionSlug}/products.json`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0',
      },
    });
    
    if (!response.ok) {
      console.error(`-- ❌ HTTP ${response.status} for ${collectionSlug}`);
      return [];
    }
    
    const data = await response.json();
    return data.products || [];
  } catch (error) {
    console.error(`-- ❌ Error fetching ${collectionSlug}: ${error.message}`);
    return [];
  }
}

async function main() {
  console.log('-- ========================================');
  console.log('-- 产品图片更新SQL');
  console.log('-- 生成时间:', new Date().toISOString());
  console.log('-- ========================================\n');
  
  let totalProducts = 0;
  
  for (const brand of BRANDS) {
    console.log(`\n-- 品牌: ${brand.dbSlug.toUpperCase()}`);
    
    const products = await fetchProducts(brand.collection);
    console.log(`-- 找到 ${products.length} 个产品\n`);
    
    for (const product of products) {
      const slug = product.handle || generateSlug(product.title);
      const images = (product.images || []).map(img => img.src);
      const mainImage = images[0] || '';
      
      if (!mainImage) continue;
      
      // 生成 UPDATE 语句
      console.log(`-- ${product.title}`);
      console.log(`UPDATE products SET`);
      console.log(`  main_image_url = '${escapeSQL(mainImage)}',`);
      console.log(`  images = ARRAY[${images.map(img => `'${escapeSQL(img)}'`).join(', ')}]`);
      console.log(`WHERE slug = '${escapeSQL(slug)}';`);
      console.log('');
      
      totalProducts++;
    }
    
    // 延迟避免请求过快
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log(`\n-- ========================================`);
  console.log(`-- 总计: ${totalProducts} 个产品`);
  console.log(`-- ========================================`);
}

main().catch(console.error);
