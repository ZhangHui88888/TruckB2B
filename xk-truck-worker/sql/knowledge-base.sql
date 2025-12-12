-- =====================================================
-- AI 知识库表结构和示例数据
-- 在 Supabase Dashboard → SQL Editor 中执行
-- =====================================================

-- 创建知识库表
CREATE TABLE IF NOT EXISTS knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(50),
  metadata JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建全文搜索索引（提高搜索性能）
CREATE INDEX IF NOT EXISTS knowledge_base_content_idx 
ON knowledge_base USING GIN (to_tsvector('english', content));

-- 创建分类索引
CREATE INDEX IF NOT EXISTS knowledge_base_category_idx ON knowledge_base(category);

-- =====================================================
-- 示例知识库内容（根据实际情况修改）
-- =====================================================

-- 公司介绍
INSERT INTO knowledge_base (title, content, category) VALUES (
  'Company Introduction',
  'XKTRUCK (also known as XKLAMP) is a professional manufacturer of heavy truck parts located in China. We have a 35,000 square meter factory and produce headlamps, mirrors, and exterior parts for VOLVO, SCANIA, MERCEDES-BENZ, MAN, IVECO, RENAULT, DAF, and FORD trucks. All products are ADB certified and meet OEM quality standards. We have been in business since 2010 and serve customers in over 50 countries worldwide.',
  'company'
);

INSERT INTO knowledge_base (title, content, category) VALUES (
  'Factory and Production',
  'Our factory covers 35,000 square meters with modern production lines and strict quality control. We have over 200 employees including experienced engineers and quality inspectors. Our annual production capacity exceeds 500,000 units of truck parts. We use advanced equipment imported from Germany and Japan.',
  'company'
);

INSERT INTO knowledge_base (title, content, category) VALUES (
  'Certifications and Quality',
  'XKTRUCK products are certified by ADB (Automotive Lighting Division) and carry E-Mark approval for European markets. Our factory is ISO 9001:2015 and IATF 16949 certified. Every product undergoes rigorous testing including light output test, vibration test, water resistance test, and temperature cycling test.',
  'company'
);

-- 产品信息
INSERT INTO knowledge_base (title, content, category) VALUES (
  'VOLVO Truck Parts',
  'We offer a complete range of parts for VOLVO trucks including FH, FM, FMX, and FE series. Our VOLVO product line includes: LED headlamps (OE: 21221129, 21221130), halogen headlamps, fog lamps, tail lamps, side mirrors, mirror covers, front grilles, bumpers, and body panels. All parts are designed as direct fit replacements for original equipment.',
  'product'
);

INSERT INTO knowledge_base (title, content, category) VALUES (
  'SCANIA Truck Parts',
  'We manufacture parts for SCANIA R, S, P, and G series trucks. Our SCANIA product range includes: headlamps, fog lamps, tail lamps, mirror assemblies (OE: 1723519), mirror covers, front grilles, bumper parts, and step panels. Parts are compatible with both Euro 5 and Euro 6 models.',
  'product'
);

INSERT INTO knowledge_base (title, content, category) VALUES (
  'MERCEDES-BENZ Truck Parts',
  'Our MERCEDES-BENZ product line covers Actros, Arocs, Antos, and Atego series. We offer: headlamps, fog lamps, tail lamps, mirrors, grilles (OE: 9437500918), bumpers, and body parts. All parts meet Mercedes-Benz OEM specifications.',
  'product'
);

INSERT INTO knowledge_base (title, content, category) VALUES (
  'MAN Truck Parts',
  'We supply parts for MAN TGX, TGS, TGM, and TGL series trucks. Product range includes: headlamps, fog lamps (OE: 81251016521), tail lamps, mirrors, grilles, bumpers, and exterior trim parts.',
  'product'
);

-- 常见问题
INSERT INTO knowledge_base (title, content, category) VALUES (
  'Minimum Order Quantity',
  'Our minimum order quantity (MOQ) varies by product. For most items, we can accommodate small trial orders starting from 5-10 pieces. For large quantity orders, we offer better pricing with discounts starting at 50 pieces. Please contact us for specific product MOQ and pricing.',
  'faq'
);

INSERT INTO knowledge_base (title, content, category) VALUES (
  'Shipping and Delivery',
  'We ship worldwide via sea freight, air freight, or express courier (DHL, FedEx, UPS). Standard delivery time is 15-30 days depending on destination. Sea freight to Europe takes about 30-35 days, to USA about 25-30 days. Express shipping (3-7 days) is available for urgent orders at additional cost. We handle all export documentation including commercial invoice, packing list, and certificate of origin.',
  'faq'
);

INSERT INTO knowledge_base (title, content, category) VALUES (
  'Payment Methods',
  'We accept T/T (bank transfer), PayPal, and Western Union. For new customers, we typically require 30% deposit before production and 70% balance before shipment. For established customers with good payment history, we can discuss flexible payment terms including 30-day credit. All prices are quoted in USD.',
  'faq'
);

INSERT INTO knowledge_base (title, content, category) VALUES (
  'Quality and Warranty',
  'All our products are ADB certified and manufactured to OEM specifications. We provide a 12-month warranty on all products from the date of delivery. If any quality issues arise within the warranty period, we will replace the defective parts free of charge. We also offer free technical support and installation guidance.',
  'faq'
);

INSERT INTO knowledge_base (title, content, category) VALUES (
  'Sample Orders',
  'Yes, we provide samples for quality evaluation before placing bulk orders. Sample cost is the same as regular unit price. Shipping cost for samples is paid by the customer. Sample cost can be credited against future bulk orders over $1000. Sample delivery time is typically 3-5 days via express courier.',
  'faq'
);

INSERT INTO knowledge_base (title, content, category) VALUES (
  'OEM and ODM Services',
  'Yes, we offer full OEM and ODM services. We can produce parts with your own brand logo and packaging. We can also develop new products based on your specifications. MOQ for OEM orders is typically 100-500 pieces depending on the product. Lead time for OEM orders is 30-45 days.',
  'faq'
);

INSERT INTO knowledge_base (title, content, category) VALUES (
  'Return and Refund Policy',
  'We accept returns within 30 days of delivery for products with manufacturing defects. Products must be unused and in original packaging. Customer is responsible for return shipping cost unless the defect is our fault. Refund will be processed within 7 business days after we receive and inspect the returned items.',
  'policy'
);

-- 联系信息
INSERT INTO knowledge_base (title, content, category) VALUES (
  'Contact Information',
  'You can reach us through multiple channels: WhatsApp: +86 130-6287-0118 (fastest response), Email: harry.zhang592802@gmail.com, Website: https://xk-truck.cn. Our business hours are Monday to Friday 9:00 AM - 6:00 PM (China Standard Time), Saturday 9:00 AM - 12:00 PM. WhatsApp messages are monitored outside business hours for urgent inquiries.',
  'contact'
);
