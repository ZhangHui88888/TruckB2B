-- WhatsApp Business API 相关表
-- 在 Supabase SQL Editor 中执行

-- WhatsApp 对话表
CREATE TABLE IF NOT EXISTS whatsapp_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number VARCHAR(20) NOT NULL UNIQUE,
  contact_name VARCHAR(100),
  status VARCHAR(20) DEFAULT 'active', -- active, archived, blocked
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  tags TEXT[], -- 标签，如 ['potential', 'vip', 'volvo']
  notes TEXT, -- 内部备注
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- WhatsApp 消息表
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
  message_id VARCHAR(100), -- WhatsApp 消息 ID
  direction VARCHAR(10) NOT NULL, -- incoming, outgoing
  content TEXT,
  message_type VARCHAR(20) DEFAULT 'text', -- text, image, document, etc.
  media_url TEXT, -- 媒体文件 URL
  whatsapp_timestamp TIMESTAMPTZ, -- WhatsApp 原始时间戳
  status VARCHAR(20) DEFAULT 'delivered', -- sent, delivered, read, failed
  is_ai_response BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_phone ON whatsapp_conversations(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_status ON whatsapp_conversations(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_last_message ON whatsapp_conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_conversation ON whatsapp_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_created ON whatsapp_messages(created_at DESC);

-- 更新时间触发器
CREATE OR REPLACE FUNCTION update_whatsapp_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS whatsapp_conversation_updated ON whatsapp_conversations;
CREATE TRIGGER whatsapp_conversation_updated
  BEFORE UPDATE ON whatsapp_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_whatsapp_conversation_timestamp();

-- RLS 策略（可选，如果需要行级安全）
-- ALTER TABLE whatsapp_conversations ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- 统计视图
CREATE OR REPLACE VIEW whatsapp_stats AS
SELECT 
  COUNT(DISTINCT c.id) as total_conversations,
  COUNT(DISTINCT CASE WHEN c.status = 'active' THEN c.id END) as active_conversations,
  COUNT(m.id) as total_messages,
  COUNT(CASE WHEN m.direction = 'incoming' THEN 1 END) as incoming_messages,
  COUNT(CASE WHEN m.direction = 'outgoing' THEN 1 END) as outgoing_messages,
  COUNT(CASE WHEN m.is_ai_response = true THEN 1 END) as ai_responses,
  COUNT(DISTINCT CASE WHEN c.last_message_at > NOW() - INTERVAL '24 hours' THEN c.id END) as conversations_24h
FROM whatsapp_conversations c
LEFT JOIN whatsapp_messages m ON c.id = m.conversation_id;

-- 注释
COMMENT ON TABLE whatsapp_conversations IS 'WhatsApp 对话记录';
COMMENT ON TABLE whatsapp_messages IS 'WhatsApp 消息记录';
COMMENT ON COLUMN whatsapp_conversations.phone_number IS '客户 WhatsApp 手机号（含国家代码）';
COMMENT ON COLUMN whatsapp_messages.direction IS '消息方向：incoming=收到，outgoing=发出';
