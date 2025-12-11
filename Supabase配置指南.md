# Supabase 配置指南

本指南记录了为外贸独立站配置 Supabase 数据库的完整流程。

## 1. 创建 Supabase 项目

1. 访问 [supabase.com](https://supabase.com) 并登录
2. 点击 **New Project**
3. 填写项目名称（如 XKTRUCK）
4. 设置数据库密码（记住这个密码）
5. 选择区域（推荐选择离目标用户近的区域）
6. 点击 **Create new project**

## 2. 获取 API Keys

进入项目后，点击 **Settings → API** 或 **Data API**：

### 需要的 Keys

| Key 名称 | 位置 | 用途 |
|---------|------|------|
| **Project URL** | Data API → URL | 数据库连接地址 |
| **anon key** | API Keys → Legacy → anon public | 前端使用，受 RLS 限制 |
| **service_role key** | API Keys → Legacy → service_role | 后端使用，绕过 RLS |

### ⚠️ 注意事项

- **Project URL** 格式：`https://xxxxxx.supabase.co`（注意准确复制，容易看错字母）
- **service_role key** 以 `eyJ` 开头，是一个很长的 JWT token
- **不要混淆** `service_role key` 和 `Secret key`（`sb_secret_...` 格式的是管理 key，不能用于数据库访问）

## 3. 执行数据库 Schema

1. 进入 Supabase Dashboard → **SQL Editor**
2. 复制 `scripts/supabase-schema.sql` 的内容
3. 粘贴到 SQL Editor 并点击 **Run**
4. 确认创建了以下表：
   - `brands` - 品牌表
   - `categories` - 分类表
   - `products` - 产品表
   - `sync_logs` - 同步日志表

## 4. 配置 GitHub Secrets

进入 GitHub 仓库 → **Settings → Secrets and variables → Actions → Secrets**

添加以下 Secrets：

| Secret 名称 | 值 |
|------------|---|
| `SUPABASE_URL` | `https://xxxxxx.supabase.co` |
| `SUPABASE_SERVICE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`（service_role key） |

### ⚠️ 常见错误

1. **URL 拼写错误** - 仔细核对每个字母，`l` 和 `1`、`t` 和 `f` 容易混淆
2. **用错 Key** - 必须用 `service_role key`（以 `eyJ` 开头），不是 `Secret key`（以 `sb_secret_` 开头）
3. **放错位置** - 要放在 **Secrets** 里，不是 **Variables** 里

## 5. 配置 Cloudflare Pages 环境变量

进入 Cloudflare Dashboard → Pages → 你的项目 → **Settings → Environment variables**

添加以下变量（用于前端）：

| 变量名 | 值 |
|-------|---|
| `PUBLIC_SUPABASE_URL` | `https://xxxxxx.supabase.co` |
| `PUBLIC_SUPABASE_ANON_KEY` | `eyJ...`（anon key，不是 service_role） |

## 6. RLS (Row Level Security) 策略

### 什么是 RLS

RLS 是数据库的行级安全策略，控制谁能访问哪些数据。

### 两种 Key 的区别

| Key | RLS 行为 | 使用场景 |
|-----|---------|---------|
| `anon key` | 受 RLS 限制 | 前端浏览器 |
| `service_role key` | 绕过 RLS | 后端脚本、GitHub Actions |

### 如果遇到权限问题

在 SQL Editor 运行以下命令暂时禁用 RLS：

```sql
ALTER TABLE brands DISABLE ROW LEVEL SECURITY;
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs DISABLE ROW LEVEL SECURITY;
```

## 7. 免费版注意事项

### 项目暂停问题

Supabase 免费版会在 **7 天不活动** 后自动暂停项目。

**解决方案：**

1. **升级 Pro 版**（$25/月）- 推荐正式上线后使用
2. **定时保活** - 添加 GitHub Actions 定时访问数据库：

```yaml
# .github/workflows/keep-alive.yml
name: Keep Supabase Alive
on:
  schedule:
    - cron: '0 0 */3 * *'  # 每3天运行一次
jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - run: curl -s "${{ secrets.SUPABASE_URL }}/rest/v1/" -H "apikey: ${{ secrets.SUPABASE_ANON_KEY }}"
```

### 恢复暂停的项目

1. 进入 Supabase Dashboard
2. 点击 **Settings → General**
3. 点击 **Restart project**
4. 等待 2-5 分钟

## 8. 调试技巧

### 测试数据库连接

```bash
curl https://你的项目ID.supabase.co/rest/v1/
```

如果返回 `Could not resolve host`，说明 URL 错误或项目已暂停。

### 检查 GitHub Actions 日志

1. 进入 GitHub → Actions
2. 点击失败的 workflow
3. 查看详细日志，常见错误：
   - `ENOTFOUND` - URL 错误
   - `未找到品牌` - Key 错误或 RLS 问题
   - `fetch failed` - 网络问题或项目暂停

## 9. 完整配置清单

- [ ] Supabase 项目已创建
- [ ] 数据库 Schema 已执行
- [ ] GitHub Secrets 已配置（SUPABASE_URL, SUPABASE_SERVICE_KEY）
- [ ] Cloudflare Pages 环境变量已配置（PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY）
- [ ] RLS 策略已配置或禁用
- [ ] 产品同步脚本测试通过
