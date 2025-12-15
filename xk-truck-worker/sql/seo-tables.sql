-- =====================================================
-- SEO 自动化相关表
-- =====================================================
-- 用于 SEO 自动更新功能
-- 执行方式：在 Supabase SQL Editor 中运行此脚本
-- =====================================================

-- 1. 页面 SEO 配置表 (page_seo)
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

-- 更新时间触发器（需要先创建 update_updated_at 函数）
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_page_seo_updated_at ON page_seo;
CREATE TRIGGER trigger_page_seo_updated_at
  BEFORE UPDATE ON page_seo
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 2. 关键词表现追踪表 (keyword_performance)
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

-- 3. AI 爬虫访问日志表 (ai_bot_visits)
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

-- 4. SEO 更新日志表 (seo_update_logs)
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

-- 启用 RLS（行级安全）
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

-- =====================================================
-- 完成提示
-- =====================================================
-- 执行成功后，你应该看到以下 4 张表：
-- 1. page_seo
-- 2. keyword_performance
-- 3. ai_bot_visits
-- 4. seo_update_logs
--
-- 以及 1 个视图：
-- - keyword_trends
-- =====================================================
