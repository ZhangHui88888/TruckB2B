# 外贸独立站开发 - 对话提示词

每次新开对话时，复制对应的提示词发送给 AI。

---

## 对话 1：创建前端项目骨架

```
我正在开发外贸独立站 xk-truck.cn（卡车配件B2B网站）。

准备工作已完成，详见：
- @部署准备清单.md - API Keys、账号配置
- @外贸独立站技术方案.md - 技术架构

本次任务：创建前端项目骨架并部署

要求：
1. 使用 Astro 框架（SSG，SEO 友好）
2. TailwindCSS 样式
3. 创建基础页面结构：首页、产品列表、产品详情、关于我们、联系我们
4. 部署到 Cloudflare Pages
5. 绑定域名 xk-truck.cn

请先阅读两个文档了解项目背景，然后开始创建项目。
```

---

## 对话 2：产品展示 + 数据同步

```
继续外贸独立站 xk-truck.cn 开发。

参考文档：
- @部署准备清单.md
- @外贸独立站技术方案.md（查看"产品数据同步功能"章节）

本次任务：实现产品展示和数据同步

要求：
1. 创建 Supabase 产品表（products, categories, brands）
2. 创建 Cloudflare R2 存储桶用于产品图片
3. 实现产品同步脚本（从 xklamp.com 爬取数据）
4. 前端产品列表页（按品牌分类：VOLVO、BENZ、SCANIA 等）
5. 前端产品详情页（图片、描述、OE编号、适配车型）

数据源：https://xklamp.com（公司现有网站）
```

---

## 对话 3：AI 客服 + 询盘功能

```
继续外贸独立站 xk-truck.cn 开发。

参考文档：
- @部署准备清单.md
- @外贸独立站技术方案.md（查看"WhatsApp AI 客服"和"AI开关"章节）

本次任务：实现 AI 客服和询盘功能

要求：
1. 创建 Cloudflare Worker 处理 API 请求
2. 实现网站询盘表单（产品咨询、报价请求）
3. 询盘邮件通知（使用 Resend）
4. 创建对话记录表（conversations）和设置表（settings）
5. AI 客服支持开关控制（默认关闭）
6. 使用 DeepSeek API 作为大模型

注意：WhatsApp Business API 暂未配置，先实现网站内的询盘功能。
```

---

## 对话 4：管理后台

```
继续外贸独立站 xk-truck.cn 开发。

参考文档：
- @部署准备清单.md
- @外贸独立站技术方案.md

本次任务：实现管理后台

要求：
1. 后台路由：/admin（需登录验证）
2. 仪表盘：询盘统计、访问概览
3. 产品管理：产品列表 + 一键同步按钮
4. 询盘列表：查看客户询盘记录
5. 系统设置：AI 客服开关、通知邮箱配置
6. 对话记录：查看 WhatsApp/网站对话（为后续知识库训练准备）

管理员验证使用简单的密码验证即可。
```

---

## 对话 5：SEO 优化 + 自动化

```
继续外贸独立站 xk-truck.cn 开发。

参考文档：
- @部署准备清单.md
- @外贸独立站技术方案.md（查看"SEO + GEO 优化策略"章节）

本次任务：SEO 优化和自动化配置

要求：
1. 生成 sitemap.xml 和 robots.txt
2. 添加页面 Meta 标签和 Open Graph
3. 添加 Schema.org 结构化数据（Product、Organization、FAQ）
4. 配置 Google Cloud 服务账号（用于 GSC API）
5. 创建 GitHub Actions 自动 SEO 更新工作流
6. 提交 sitemap 到 Google Search Console

Google Search Console 已验证，网站：xk-truck.cn
```

---

## 对话 6：WhatsApp 集成（可选，需海外手机）

```
继续外贸独立站 xk-truck.cn 开发。

参考文档：
- @部署准备清单.md
- @外贸独立站技术方案.md

本次任务：集成 WhatsApp Business API

前提：已完成 Meta 开发者账户验证

要求：
1. 创建 Meta Business App
2. 配置 WhatsApp Business API
3. 实现 Webhook 接收消息
4. 集成 AI 自动回复（使用 DeepSeek）
5. 网站添加 WhatsApp 浮动按钮

注意：需要先完成 Meta 开发者账户的手机验证。
```

---

## 使用说明

1. 按顺序完成对话 1-5
2. 对话 6 可选（需要海外手机验证 Meta 账户）
3. 每次对话开始时，@ 引用相关文档让 AI 读取上下文
4. 如果某个对话任务太大，可以拆分成多次
