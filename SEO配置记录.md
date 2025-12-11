# SEO 配置记录

本文档记录 xk-truck.cn 网站的 SEO 配置进度和相关信息。

---

## 一、配置完成状态

### ✅ 已完成

| 项目 | 状态 | 完成日期 |
|------|------|----------|
| robots.txt | ✅ 已配置 | 2024-12-11 |
| sitemap.xml | ✅ 自动生成 | 2024-12-11 |
| Meta 标签 & Open Graph | ✅ 已配置 | 2024-12-11 |
| Schema.org 结构化数据 | ✅ 已配置 | 2024-12-11 |
| Google Search Console 验证 | ✅ 已验证 | 2024-12-11 |
| Sitemap 提交到 GSC | ✅ 已提交 | 2024-12-11 |
| GitHub Actions SEO 工作流 | ✅ 已创建 | 2024-12-11 |

### ⏳ 待完成（可选）

| 项目 | 状态 | 说明 |
|------|------|------|
| Google Cloud 服务账号 | ⏳ 待配置 | 用于 GSC API 自动化 |
| Supabase SEO 表 | ⏳ 待创建 | 运行 SQL 脚本 |
| GitHub Secrets | ⏳ 待配置 | SEO 自动化所需 |
| Bing Webmaster Tools | ⏳ 可选 | 可从 GSC 导入 |
| Google Analytics 4 | ⏳ 可选 | 流量分析 |

---

## 二、Google Search Console 配置

### 账号信息
- **Google 账号**: harry.zhang592802@gmail.com
- **GSC 地址**: https://search.google.com/search-console

### 已验证资源
1. **域名资源**: `xk-truck.cn`
   - 验证方式: DNS TXT 记录
   - 用途: 查看所有子域名数据

2. **URL 前缀资源**: `https://xk-truck.cn`
   - 验证方式: 自动（继承域名验证）
   - 用途: 提交 sitemap、查看详细数据

### Sitemap 提交
- **Sitemap URL**: https://xk-truck.cn/sitemap-index.xml
- **提交状态**: ✅ 已提交
- **包含页面**: 自动包含所有 Astro 生成的页面

---

## 三、Schema.org 结构化数据

### 全局 Schema（所有页面）
- **Organization**: 公司信息、联系方式
- **WebSite**: 网站基本信息

### 页面特定 Schema

| 页面 | Schema 类型 | 说明 |
|------|-------------|------|
| 首页 `/` | 继承全局 | Organization + WebSite |
| 关于页 `/about` | AboutPage | 公司介绍页 |
| 联系页 `/contact` | ContactPage + FAQPage | 包含 6 个常见问题 |
| 产品详情 `/products/[id]` | Product + BreadcrumbList | 产品信息 + 面包屑导航 |

### FAQ 内容（Contact 页面）
1. What is your minimum order quantity (MOQ)?
2. Do you offer samples?
3. What payment methods do you accept?
4. How long is the delivery time?
5. Do you provide OEM/ODM services?
6. What is your warranty policy?

---

## 四、robots.txt 配置

```
# robots.txt for xk-truck.cn
User-agent: *
Allow: /

# AI Search Engine Crawlers
User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Google-Extended
Allow: /

# Sitemap
Sitemap: https://xk-truck.cn/sitemap-index.xml
```

---

## 五、SEO 自动化工作流

### GitHub Actions 工作流
- **文件**: `.github/workflows/seo-auto-update.yml`
- **运行时间**: 每周一 9:00（北京时间）
- **功能**:
  1. 从 GSC API 获取搜索数据
  2. AI 分析优化建议
  3. 更新 Supabase SEO 配置
  4. 发送周报邮件
  5. 触发 Cloudflare Pages 重建

### 相关脚本
- `scripts/seo-auto-update.js` - SEO 自动分析更新
- `scripts/submit-sitemap.js` - 提交 sitemap 到 GSC

### 所需 GitHub Secrets
| Secret | 说明 | 状态 |
|--------|------|------|
| `GSC_CREDENTIALS` | Google Cloud 服务账号 JSON | ⏳ 待配置 |
| `GSC_SITE_URL` | `https://xk-truck.cn` | ⏳ 待配置 |
| `SUPABASE_URL` | Supabase 项目 URL | ⏳ 待配置 |
| `SUPABASE_KEY` | Supabase service_role key | ⏳ 待配置 |
| `DEEPSEEK_API_KEY` | DeepSeek API Key | ⏳ 待配置 |
| `RESEND_API_KEY` | Resend API Key | ⏳ 待配置 |
| `NOTIFY_EMAIL` | 接收报告邮箱 | ⏳ 待配置 |
| `CF_DEPLOY_HOOK` | Cloudflare 部署钩子 | ⏳ 待配置 |

---

## 六、Supabase SEO 相关表

需要在 Supabase 中创建以下表（SQL 在 `scripts/supabase-schema.sql`）：

### page_seo - 页面 SEO 配置
存储 AI 生成的 SEO 优化建议

### keyword_performance - 关键词表现
记录 GSC 关键词数据，追踪 SEO 效果

### ai_bot_visits - AI 爬虫日志
监控 AI 搜索引擎爬虫访问情况

### seo_update_logs - SEO 更新日志
记录每次自动更新的结果

---

## 七、预期时间线

| 时间 | 预期结果 |
|------|----------|
| 提交后 1-3 天 | GSC 开始显示索引状态 |
| 提交后 3-7 天 | 开始有搜索数据 |
| 2-4 周 | 排名逐步提升 |
| 持续 | GitHub Actions 每周自动优化 |

---

## 八、后续优化建议

1. **配置 Google Cloud 服务账号** - 启用 SEO 自动化
2. **添加 Google Analytics 4** - 追踪用户行为
3. **提交到 Bing Webmaster** - 覆盖更多搜索引擎
4. **定期检查 GSC** - 关注索引问题和搜索表现
5. **优化页面内容** - 根据搜索数据调整关键词

---

## 相关文档

- `部署准备清单.md` - 完整部署清单
- `外贸独立站技术方案.md` - SEO/GEO 策略详情
- `Google-Cloud-GSC配置指南.md` - GSC API 配置步骤
- `scripts/supabase-schema.sql` - 数据库表结构
