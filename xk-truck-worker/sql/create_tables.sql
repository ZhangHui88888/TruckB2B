-- =====================================================
-- XKTRUCK 数据库表 - AI 客服和询盘功能
-- 在 Supabase SQL Editor 中执行
-- =====================================================

-- 启用 pgvector 扩展（用于向量搜索）
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. 询盘表（Inquiries）
-- 存储网站询盘表单提交
CREATE TABLE IF NOT EXISTS inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  phone TEXT,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  product_id UUID,
  product_name TEXT,
  source TEXT DEFAULT 'website',  -- 来源：website, product_page, whatsapp
  status TEXT DEFAULT 'new',       -- 状态：new, contacted, quoted, closed
  notes TEXT,                      -- 内部备注
  assigned_to TEXT,                -- 分配给谁处理
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 询盘表索引
CREATE INDEX IF NOT EXISTS idx_inquiries_email ON inquiries(email);
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status);
CREATE INDEX IF NOT EXISTS idx_inquiries_created_at ON inquiries(created_at DESC);

-- 2. 对话记录表（Conversations）
-- 存储 AI 客服对话历史
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,        -- 会话 ID（前端生成）
  role TEXT NOT NULL,              -- 角色：user, assistant
  message TEXT NOT NULL,           -- 消息内容
  is_ai BOOLEAN DEFAULT false,     -- 是否为 AI 生成
  metadata JSONB,                  -- 额外元数据
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 对话表索引
CREATE INDEX IF NOT EXISTS idx_conversations_session_id ON conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at DESC);

-- 3. 系统设置表（Settings）
-- 存储系统配置，如 AI 开关
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,        -- 设置键名
  value JSONB NOT NULL,            -- 设置值（JSON 格式）
  description TEXT,                -- 设置说明
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 知识库表（Knowledge Base）
-- 用于 AI 客服 RAG 检索
CREATE TABLE IF NOT EXISTS knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  content TEXT NOT NULL,
  category TEXT,                   -- 分类：faq, product, policy, etc.
  embedding VECTOR(1536),          -- 向量嵌入（可选，用于语义搜索）
  metadata JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 知识库索引
CREATE INDEX IF NOT EXISTS idx_knowledge_base_category ON knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_content_search ON knowledge_base USING gin(to_tsvector('english', content));

-- =====================================================
-- 插入默认数据
-- =====================================================

-- 插入默认 AI 设置（AI 默认关闭）
INSERT INTO settings (key, value, description)
VALUES (
  'ai_config',
  '{
    "ai_enabled": false,
    "welcome_message": "Hello! Welcome to XKTRUCK. How can I help you today?",
    "system_prompt": "You are a professional customer service assistant for XKTRUCK, a leading manufacturer of heavy truck parts for VOLVO, SCANIA, MERCEDES-BENZ, MAN, IVECO, RENAULT, DAF, and FORD. Be helpful, professional, and concise."
  }'::jsonb,
  'AI 客服配置：开关、欢迎语、系统提示词'
)
ON CONFLICT (key) DO NOTHING;

-- 插入初始知识库内容（FAQ）
INSERT INTO knowledge_base (title, content, category, metadata) VALUES
(
  'Company Introduction',
  'XKTRUCK (XKLAMP) is a leading manufacturer of heavy truck parts including headlamps, mirrors, and exterior parts. We have a 35,000㎡ manufacturing facility in China and supply parts for VOLVO, SCANIA, MERCEDES-BENZ, MAN, IVECO, RENAULT, DAF, and FORD trucks. All products are ADB-certified with OEM quality standards.',
  'company',
  '{"priority": 1}'::jsonb
),
(
  'Minimum Order Quantity',
  'Our MOQ (Minimum Order Quantity) varies by product. For most items, we can accommodate small trial orders starting from 5-10 pieces. For larger wholesale orders, we offer better pricing. Please contact us with your specific requirements for a detailed quote.',
  'faq',
  '{"priority": 2}'::jsonb
),
(
  'Sample Policy',
  'Yes, we provide samples for quality evaluation. Sample costs and shipping are typically charged but can be credited against future orders. Sample delivery usually takes 5-7 business days via express shipping.',
  'faq',
  '{"priority": 3}'::jsonb
),
(
  'Payment Methods',
  'We accept multiple payment methods: T/T (bank transfer), PayPal, and Western Union. For large orders, we can discuss flexible payment terms such as 30% deposit and 70% before shipping. L/C is also available for orders over $10,000.',
  'faq',
  '{"priority": 4}'::jsonb
),
(
  'Delivery Time',
  'Standard delivery time is 15-30 days depending on order size and destination. For in-stock items, we can ship within 3-5 days. Express shipping options (DHL, FedEx, UPS) are available for urgent orders at additional cost.',
  'faq',
  '{"priority": 5}'::jsonb
),
(
  'Quality Assurance',
  'All our products undergo strict quality control. We are ADB-certified and follow OEM quality standards. Each product is inspected before shipping. We offer a 12-month warranty on all parts against manufacturing defects.',
  'faq',
  '{"priority": 6}'::jsonb
),
(
  'Shipping Methods',
  'We offer multiple shipping options: Sea freight (most economical for large orders), Air freight (faster, suitable for urgent orders), and Express courier (DHL, FedEx, UPS for small packages). We can ship to any port or address worldwide.',
  'faq',
  '{"priority": 7}'::jsonb
),
(
  'Contact Information',
  'You can reach us via: WhatsApp: +86 130-6287-0118, Email: harry.zhang592802@gmail.com. Our business hours are Monday-Friday 9:00 AM - 6:00 PM (China Standard Time). We typically respond within 24 hours.',
  'contact',
  '{"priority": 8}'::jsonb
)
ON CONFLICT DO NOTHING;

-- =====================================================
-- Row Level Security (RLS) 策略
-- =====================================================

-- 启用 RLS
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;

-- 允许 service_role 完全访问（Worker 使用）
CREATE POLICY "Service role full access on inquiries" ON inquiries
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on conversations" ON conversations
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on settings" ON settings
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on knowledge_base" ON knowledge_base
  FOR ALL USING (auth.role() = 'service_role');

-- 允许匿名用户读取知识库（用于前端展示 FAQ）
CREATE POLICY "Public read access on knowledge_base" ON knowledge_base
  FOR SELECT USING (is_active = true);

-- 允许匿名用户读取设置（仅 AI 开关状态）
CREATE POLICY "Public read access on settings" ON settings
  FOR SELECT USING (key = 'ai_config');

-- =====================================================
-- 触发器：自动更新 updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_inquiries_updated_at
  BEFORE UPDATE ON inquiries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_knowledge_base_updated_at
  BEFORE UPDATE ON knowledge_base
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
