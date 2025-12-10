# XK-TRUCK 产品展示功能部署指南

## 概述

本文档描述了产品展示和数据同步功能的部署步骤。

## 已完成的功能

### 1. Supabase 数据库表
- `brands` - 品牌表 (VOLVO, SCANIA, MERCEDES-BENZ 等)
- `categories` - 分类表 (Headlamps, Mirrors, Body Parts 等)
- `products` - 产品表 (名称、OE编号、图片、适配车型等)
- `sync_logs` - 同步日志表

### 2. 产品同步脚本
- 从 xklamp.com 爬取产品数据
- 上传图片到 Cloudflare R2
- 保存产品信息到 Supabase

### 3. 前端页面
- 产品列表页 (`/products`) - 支持品牌/分类筛选、搜索、分页
- 产品详情页 (`/products/[slug]`) - 展示图片、OE编号、适配车型、规格参数

## 部署步骤

### 步骤 1: 配置 Supabase

1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)
2. 进入项目 `xktruck`
3. 打开 SQL Editor
4. 执行 `scripts/supabase-schema.sql` 中的 SQL 语句创建表

### 步骤 2: 配置 Cloudflare R2

参考 `scripts/R2-SETUP.md` 文档:

1. 登录 Cloudflare Dashboard
2. 创建 R2 存储桶 `xktruck-images`
3. 配置公开访问域名 `images.xk-truck.cn`
4. 创建 API Token 用于上传

### 步骤 3: 配置环境变量

复制 `.env.example` 为 `.env` 并填写:

```bash
# Supabase (从 Supabase Dashboard > Settings > API 获取)
SUPABASE_URL=https://xktruck.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_role_key

# Cloudflare R2
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=xktruck-images
R2_PUBLIC_DOMAIN=images.xk-truck.cn

# 前端公开变量
PUBLIC_SUPABASE_URL=https://xktruck.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your_anon_key
PUBLIC_R2_PUBLIC_DOMAIN=images.xk-truck.cn
```

### 步骤 4: 运行产品同步

```bash
# 安装依赖
npm install

# 运行同步脚本
npm run sync:products
```

同步脚本会:
- 爬取 xklamp.com 的产品列表
- 下载产品图片并上传到 R2
- 将产品数据保存到 Supabase

### 步骤 5: 部署到 Cloudflare Pages

```bash
# 构建
npm run build

# 部署 (需要先配置 Cloudflare Pages)
npm run deploy
```

或者通过 GitHub 自动部署:
1. 推送代码到 GitHub
2. Cloudflare Pages 会自动构建和部署

## 环境变量配置 (Cloudflare Pages)

在 Cloudflare Pages 项目设置中添加以下环境变量:

| 变量名 | 说明 |
|--------|------|
| `PUBLIC_SUPABASE_URL` | Supabase 项目 URL |
| `PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名密钥 |
| `PUBLIC_R2_PUBLIC_DOMAIN` | R2 公开域名 |

## 文件结构

```
xk-truck-frontend/
├── src/
│   ├── lib/
│   │   └── supabase.ts          # Supabase 客户端和数据获取函数
│   └── pages/
│       └── products/
│           ├── index.astro      # 产品列表页
│           └── [id].astro       # 产品详情页
├── scripts/
│   ├── supabase-schema.sql      # 数据库表结构
│   ├── sync-products.js         # 产品同步脚本
│   └── R2-SETUP.md              # R2 配置指南
├── .env.example                 # 环境变量模板
└── DEPLOYMENT.md                # 本文档
```

## 注意事项

1. **同步脚本选择器**: `sync-products.js` 中的 CSS 选择器可能需要根据 xklamp.com 的实际 HTML 结构调整
2. **RLS 策略**: Supabase 表已配置 RLS 策略，只允许读取 `is_active = true` 的数据
3. **图片优化**: 考虑在 R2 前配置 Cloudflare Images 进行图片优化
4. **缓存**: 产品数据在构建时获取，更新产品后需要重新构建

## 后续优化

- [ ] 添加产品搜索 API (Supabase Edge Functions)
- [ ] 实现产品增量同步
- [ ] 添加产品图片懒加载
- [ ] 实现相关产品推荐
- [ ] 添加产品 sitemap 生成
