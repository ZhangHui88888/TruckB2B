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

-- =====================================================
-- SEO 相关表
-- =====================================================

-- 11. 页面 SEO 配置表 (page_seo)
-- 用于存储 AI 生成的 SEO 优化建议
CREATE TABLE IF NOT EXISTS page_seo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_path TEXT UNIQUE NOT NULL,      -- 页面路径，如 /products/volvo-headlamp
  title TEXT,                          -- 优化后的标题
  description TEXT,                    -- 优化后的描述
  keywords TEXT[],                     -- 关键词数组
  og_image TEXT,                       -- Open Graph 图片
  h1_suggestion TEXT,                  -- H1 标题建议
  content_suggestions TEXT,            -- 内容优化建议
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_page_seo_path ON page_seo(page_path);

-- 更新时间触发器
DROP TRIGGER IF EXISTS trigger_page_seo_updated_at ON page_seo;
CREATE TRIGGER trigger_page_seo_updated_at
  BEFORE UPDATE ON page_seo
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 12. 关键词表现追踪表 (keyword_performance)
-- 用于记录 GSC 关键词数据，追踪 SEO 效果
CREATE TABLE IF NOT EXISTS keyword_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword TEXT NOT NULL,               -- 搜索关键词
  impressions INT DEFAULT 0,           -- 展示次数
  clicks INT DEFAULT 0,                -- 点击次数
  position DECIMAL(5,2),               -- 平均排名
  recorded_at DATE NOT NULL,           -- 记录日期
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(keyword, recorded_at)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_keyword_performance_keyword ON keyword_performance(keyword);
CREATE INDEX IF NOT EXISTS idx_keyword_performance_date ON keyword_performance(recorded_at);

-- 13. AI 爬虫访问日志表 (ai_bot_visits)
-- 用于监控 AI 搜索引擎爬虫访问情况
CREATE TABLE IF NOT EXISTS ai_bot_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot TEXT NOT NULL,                   -- 爬虫标识 (GPTBot, ClaudeBot, etc.)
  path TEXT NOT NULL,                  -- 访问路径
  user_agent TEXT,                     -- 完整 User-Agent
  ip_address TEXT,                     -- IP 地址
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_ai_bot_visits_bot ON ai_bot_visits(bot);
CREATE INDEX IF NOT EXISTS idx_ai_bot_visits_timestamp ON ai_bot_visits(timestamp);

-- 14. SEO 更新日志表 (seo_update_logs)
-- 记录每次 SEO 自动更新的结果
CREATE TABLE IF NOT EXISTS seo_update_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_date DATE NOT NULL,
  total_queries INT DEFAULT 0,         -- GSC 查询总数
  pages_updated INT DEFAULT 0,         -- 更新的页面数
  new_keywords INT DEFAULT 0,          -- 新发现的关键词数
  summary TEXT,                        -- AI 生成的摘要
  suggestions JSONB,                   -- 优化建议 JSON
  status TEXT DEFAULT 'completed',     -- running, completed, failed
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 启用 RLS
ALTER TABLE page_seo ENABLE ROW LEVEL SECURITY;
ALTER TABLE keyword_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_bot_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_update_logs ENABLE ROW LEVEL SECURITY;

-- 公开读取策略
CREATE POLICY "Allow public read access on page_seo" ON page_seo
  FOR SELECT USING (true);

-- 服务端完全访问策略
CREATE POLICY "Allow service role full access on page_seo" ON page_seo
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access on keyword_performance" ON keyword_performance
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access on ai_bot_visits" ON ai_bot_visits
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access on seo_update_logs" ON seo_update_logs
  FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- 视图：关键词表现趋势
-- =====================================================
CREATE OR REPLACE VIEW keyword_trends AS
SELECT 
  keyword,
  recorded_at,
  impressions,
  clicks,
  position,
  CASE WHEN impressions > 0 THEN ROUND(clicks::decimal / impressions * 100, 2) ELSE 0 END as ctr,
  LAG(position) OVER (PARTITION BY keyword ORDER BY recorded_at) as prev_position,
  position - LAG(position) OVER (PARTITION BY keyword ORDER BY recorded_at) as position_change
FROM keyword_performance
ORDER BY recorded_at DESC, impressions DESC;
