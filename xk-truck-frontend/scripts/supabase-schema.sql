-- =====================================================
-- XKTRUCK 产品数据库表结构
-- 用于 Supabase 数据库
-- =====================================================

-- 1. 品牌表 (brands)
CREATE TABLE IF NOT EXISTS brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  description TEXT,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 插入默认品牌
INSERT INTO brands (name, slug, sort_order) VALUES
  ('VOLVO', 'volvo', 1),
  ('SCANIA', 'scania', 2),
  ('MERCEDES-BENZ', 'mercedes-benz', 3),
  ('MAN', 'man', 4),
  ('IVECO', 'iveco', 5),
  ('RENAULT', 'renault', 6),
  ('DAF', 'daf', 7),
  ('FORD', 'ford', 8)
ON CONFLICT (slug) DO NOTHING;

-- 2. 分类表 (categories)
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  parent_id UUID REFERENCES categories(id),
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 插入默认分类
INSERT INTO categories (name, slug, sort_order) VALUES
  ('Headlamps', 'headlamps', 1),
  ('Mirrors', 'mirrors', 2),
  ('Body Parts', 'body-parts', 3),
  ('Lighting', 'lighting', 4),
  ('Grilles', 'grilles', 5),
  ('Bumpers', 'bumpers', 6),
  ('Fog Lamps', 'fog-lamps', 7),
  ('Tail Lamps', 'tail-lamps', 8),
  ('Corner Lamps', 'corner-lamps', 9),
  ('Side Markers', 'side-markers', 10)
ON CONFLICT (slug) DO NOTHING;

-- 3. 产品表 (products)
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 基本信息
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  short_description TEXT,
  
  -- 关联
  brand_id UUID REFERENCES brands(id),
  category_id UUID REFERENCES categories(id),
  
  -- 产品编号
  oe_number TEXT,                    -- OE 原厂编号
  cross_reference TEXT[],            -- 交叉参考编号
  sku TEXT,                          -- 内部 SKU
  
  -- 图片
  main_image_url TEXT,               -- 主图 URL
  images TEXT[],                     -- 图片数组
  
  -- 适配信息
  fitment TEXT[],                    -- 适配车型列表
  fitment_years TEXT,                -- 适配年份范围
  
  -- 规格参数 (JSON)
  specifications JSONB DEFAULT '{}',
  
  -- 特性
  features TEXT[],
  
  -- SEO
  meta_title TEXT,
  meta_description TEXT,
  meta_keywords TEXT[],
  
  -- 状态
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  
  -- 来源追踪
  source_url TEXT,                   -- 原始数据来源 URL
  source_id TEXT,                    -- 原始数据 ID
  
  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ              -- 最后同步时间
);

-- 4. 创建索引
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_oe_number ON products(oe_number);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_is_featured ON products(is_featured);

-- 5. 全文搜索索引
CREATE INDEX IF NOT EXISTS idx_products_search ON products 
  USING GIN (to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '') || ' ' || coalesce(oe_number, '')));

-- 6. 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_products_updated_at ON products;
CREATE TRIGGER trigger_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_brands_updated_at ON brands;
CREATE TRIGGER trigger_brands_updated_at
  BEFORE UPDATE ON brands
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_categories_updated_at ON categories;
CREATE TRIGGER trigger_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 7. 同步日志表 (sync_logs)
CREATE TABLE IF NOT EXISTS sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type TEXT NOT NULL,           -- 'products', 'images', 'full'
  status TEXT NOT NULL,              -- 'running', 'completed', 'failed'
  total_items INT DEFAULT 0,
  processed_items INT DEFAULT 0,
  failed_items INT DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'
);

-- 8. 启用 Row Level Security (RLS)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

-- 9. 创建公开读取策略 (前端可读)
CREATE POLICY "Allow public read access on products" ON products
  FOR SELECT USING (is_active = true);

CREATE POLICY "Allow public read access on brands" ON brands
  FOR SELECT USING (is_active = true);

CREATE POLICY "Allow public read access on categories" ON categories
  FOR SELECT USING (is_active = true);

-- 10. 创建服务端完全访问策略 (使用 service_role key)
CREATE POLICY "Allow service role full access on products" ON products
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access on brands" ON brands
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access on categories" ON categories
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access on sync_logs" ON sync_logs
  FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- 视图：产品列表视图（包含品牌和分类名称）
-- =====================================================
CREATE OR REPLACE VIEW products_view AS
SELECT 
  p.*,
  b.name as brand_name,
  b.slug as brand_slug,
  c.name as category_name,
  c.slug as category_slug
FROM products p
LEFT JOIN brands b ON p.brand_id = b.id
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.is_active = true;

-- =====================================================
-- 函数：搜索产品
-- =====================================================
CREATE OR REPLACE FUNCTION search_products(
  search_query TEXT DEFAULT NULL,
  brand_filter TEXT DEFAULT NULL,
  category_filter TEXT DEFAULT NULL,
  page_num INT DEFAULT 1,
  page_size INT DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT,
  description TEXT,
  brand_name TEXT,
  category_name TEXT,
  oe_number TEXT,
  main_image_url TEXT,
  total_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH filtered AS (
    SELECT 
      p.id,
      p.name,
      p.slug,
      p.short_description as description,
      b.name as brand_name,
      c.name as category_name,
      p.oe_number,
      p.main_image_url,
      COUNT(*) OVER() as total_count
    FROM products p
    LEFT JOIN brands b ON p.brand_id = b.id
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.is_active = true
      AND (search_query IS NULL OR 
           p.name ILIKE '%' || search_query || '%' OR
           p.oe_number ILIKE '%' || search_query || '%' OR
           p.description ILIKE '%' || search_query || '%')
      AND (brand_filter IS NULL OR b.slug = brand_filter)
      AND (category_filter IS NULL OR c.slug = category_filter)
    ORDER BY p.sort_order, p.created_at DESC
    LIMIT page_size
    OFFSET (page_num - 1) * page_size
  )
  SELECT * FROM filtered;
END;
$$ LANGUAGE plpgsql;
