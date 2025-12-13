-- 为现有产品添加占位图片
-- 在 Supabase SQL Editor 中执行此脚本

-- 使用 Unsplash 的卡车配件图片作为占位图
UPDATE products 
SET 
  main_image_url = 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=800&h=800&fit=crop',
  images = ARRAY[
    'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=800&h=800&fit=crop',
    'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=800&h=800&fit=crop'
  ]
WHERE main_image_url IS NULL OR main_image_url = '';

-- 查看更新结果
SELECT 
  name, 
  main_image_url,
  array_length(images, 1) as image_count
FROM products
LIMIT 10;
