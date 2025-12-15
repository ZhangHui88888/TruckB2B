# SEO 自动化配置指南

本文档详细说明如何配置 SEO 自动化功能，让系统每周自动优化网站的 SEO。

---

## 📋 前置条件

- ✅ Supabase SEO 表已创建（`page_seo`, `keyword_performance` 等）
- ✅ Google Search Console 已验证网站
- ✅ GitHub 仓库已创建
- ✅ 已有 DeepSeek API Key
- ✅ 已有 Resend API Key

---

## 🔧 配置步骤

### 第一步：创建 Google Cloud 服务账号

#### 1.1 创建 Google Cloud 项目

1. **访问 Google Cloud Console**
   - 地址：https://console.cloud.google.com
   - 使用你的 Google 账号登录（harry.zhang592802@gmail.com）

2. **创建新项目**
   - 点击顶部项目选择器
   - 点击 **"新建项目"**
   - 项目名称：`xktruck-seo`
   - 位置：无组织
   - 点击 **"创建"**

3. **等待项目创建完成**（约 10-30 秒）

#### 1.2 启用 Search Console API

1. **打开 API 库**
   - 左侧菜单 → **API 和服务** → **库**
   - 或直接访问：https://console.cloud.google.com/apis/library

2. **搜索并启用 API**
   - 搜索框输入：`Search Console API`
   - 点击 **Google Search Console API**
   - 点击 **"启用"** 按钮
   - 等待启用完成（约 5-10 秒）

#### 1.3 创建服务账号

1. **打开服务账号页面**
   - 左侧菜单 → **API 和服务** → **凭据**
   - 或直接访问：https://console.cloud.google.com/apis/credentials

2. **创建服务账号**
   - 点击顶部 **"+ 创建凭据"**
   - 选择 **"服务账号"**

3. **填写服务账号详情**
   - **服务账号名称**：`xktruck-seo-bot`
   - **服务账号 ID**：自动生成（如 `xktruck-seo-bot@xktruck-seo.iam.gserviceaccount.com`）
   - **服务账号说明**：`SEO automation service account for xk-truck.cn`
   - 点击 **"创建并继续"**

4. **授予权限（可选）**
   - 直接点击 **"继续"**（不需要授予项目权限）

5. **完成创建**
   - 点击 **"完成"**

#### 1.4 创建并下载密钥

1. **找到刚创建的服务账号**
   - 在服务账号列表中找到 `xktruck-seo-bot@xktruck-seo.iam.gserviceaccount.com`
   - 点击服务账号名称进入详情页

2. **创建密钥**
   - 切换到 **"密钥"** 标签页
   - 点击 **"添加密钥"** → **"创建新密钥"**
   - 选择密钥类型：**JSON**
   - 点击 **"创建"**

3. **保存密钥文件**
   - 浏览器会自动下载一个 JSON 文件
   - 文件名类似：`xktruck-seo-xxxxxx.json`
   - ⚠️ **妥善保管此文件，不要泄露！**

4. **复制服务账号邮箱**
   - 复制服务账号邮箱地址（如 `xktruck-seo-bot@xktruck-seo.iam.gserviceaccount.com`）
   - 下一步需要用到

---

### 第二步：在 Google Search Console 添加服务账号

#### 2.1 打开 GSC 设置

1. **访问 Google Search Console**
   - 地址：https://search.google.com/search-console
   - 选择资源：`xk-truck.cn`

2. **打开用户和权限设置**
   - 左侧菜单 → **设置** → **用户和权限**
   - 或直接访问：https://search.google.com/search-console/settings/users

#### 2.2 添加服务账号为用户

1. **添加用户**
   - 点击右上角 **"添加用户"** 按钮

2. **填写信息**
   - **电子邮件地址**：粘贴服务账号邮箱
     - 例如：`xktruck-seo-bot@xktruck-seo.iam.gserviceaccount.com`
   - **权限级别**：选择 **"完全"** 或 **"受限"**
     - 建议选择 **"受限"**（只读权限足够）

3. **确认添加**
   - 点击 **"添加"**
   - 服务账号会立即获得访问权限（无需确认邮件）

---

### 第三步：配置 GitHub Secrets

#### 3.1 打开 GitHub 仓库设置

1. **访问你的 GitHub 仓库**
   - 地址：https://github.com/ZhangHui88888/TruckB2B

2. **打开 Secrets 设置**
   - 点击顶部 **Settings** 标签
   - 左侧菜单 → **Secrets and variables** → **Actions**
   - 或直接访问：https://github.com/ZhangHui88888/TruckB2B/settings/secrets/actions

#### 3.2 添加所需的 Secrets

点击 **"New repository secret"** 按钮，逐个添加以下 8 个 Secrets：

---

**1. GSC_CREDENTIALS**

- **Name**: `GSC_CREDENTIALS`
- **Value**: 打开下载的 JSON 密钥文件，复制全部内容
  ```json
  {
    "type": "service_account",
    "project_id": "xktruck-seo",
    "private_key_id": "xxxxx",
    "private_key": "-----BEGIN PRIVATE KEY-----\nxxxxx\n-----END PRIVATE KEY-----\n",
    "client_email": "xktruck-seo-bot@xktruck-seo.iam.gserviceaccount.com",
    "client_id": "xxxxx",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": "xxxxx"
  }
  ```
- ⚠️ **注意**：复制整个 JSON 内容，包括花括号

---

**2. GSC_SITE_URL**

- **Name**: `GSC_SITE_URL`
- **Value**: `https://xk-truck.cn`
- 说明：你在 GSC 中验证的网站 URL

---

**3. SUPABASE_URL**

- **Name**: `SUPABASE_URL`
- **Value**: `https://ltqnikmoeroelfrwcfqr.supabase.co`
- 说明：Supabase 项目 URL

---

**4. SUPABASE_KEY**

- **Name**: `SUPABASE_KEY`
- **Value**: `sb_secret_CUSHbAvZlq7M-4OJgXby6g_cEV5aYHd`
- 说明：Supabase Service Role Key（不是 Anon Key）

---

**5. DEEPSEEK_API_KEY**

- **Name**: `DEEPSEEK_API_KEY`
- **Value**: `sk-e1cb78491f84483fbf9e550f7321603b`
- 说明：DeepSeek API Key（用于 AI 分析）

---

**6. RESEND_API_KEY**

- **Name**: `RESEND_API_KEY`
- **Value**: `re_jf9cgopc_LXyEDqAR7tPjxmEYRti8nazh`
- 说明：Resend API Key（用于发送周报邮件）

---

**7. NOTIFY_EMAIL**

- **Name**: `NOTIFY_EMAIL`
- **Value**: `harry.zhang592802@gmail.com`
- 说明：接收 SEO 周报的邮箱地址

---

**8. CF_DEPLOY_HOOK**（可选）

- **Name**: `CF_DEPLOY_HOOK`
- **Value**: 获取方式见下方
- 说明：Cloudflare Pages 部署钩子 URL

**如何获取 Cloudflare Deploy Hook：**

1. 访问 Cloudflare Pages Dashboard
   - https://dash.cloudflare.com → Pages → xk-truck-frontend

2. 点击 **Settings** → **Builds & deployments**

3. 找到 **Deploy hooks** 部分
   - 点击 **"Add deploy hook"**
   - Hook name: `SEO Auto Update`
   - Branch: `main`
   - 点击 **"Save"**

4. 复制生成的 Webhook URL
   - 格式：`https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/xxxxx`
   - 粘贴到 GitHub Secret

---

### 第四步：验证配置

#### 4.1 检查 Secrets

在 GitHub Secrets 页面，你应该看到 8 个 Secrets：

- ✅ GSC_CREDENTIALS
- ✅ GSC_SITE_URL
- ✅ SUPABASE_URL
- ✅ SUPABASE_KEY
- ✅ DEEPSEEK_API_KEY
- ✅ RESEND_API_KEY
- ✅ NOTIFY_EMAIL
- ✅ CF_DEPLOY_HOOK（可选）

#### 4.2 手动触发工作流测试

1. **打开 Actions 页面**
   - GitHub 仓库 → **Actions** 标签
   - 左侧找到 **"SEO Auto Update"** 工作流

2. **手动运行**
   - 点击工作流名称
   - 点击右侧 **"Run workflow"** 按钮
   - 选择分支：`main`
   - 点击 **"Run workflow"**

3. **查看运行结果**
   - 等待 2-5 分钟
   - 查看运行日志
   - 检查是否有错误

#### 4.3 检查结果

**成功标志：**
- ✅ 工作流状态：绿色勾号
- ✅ 收到 SEO 周报邮件
- ✅ Supabase `keyword_performance` 表有数据
- ✅ Cloudflare Pages 触发了新的构建（如果配置了 Deploy Hook）

**如果失败：**
- 查看 Actions 日志中的错误信息
- 常见问题见下方故障排查

---

## 🐛 故障排查

### 问题 1：GSC API 权限错误

**错误信息**：`403 Permission denied`

**解决方法**：
1. 确认服务账号已添加到 GSC
2. 确认权限级别至少是"受限"
3. 等待 5-10 分钟让权限生效

---

### 问题 2：JSON 密钥格式错误

**错误信息**：`Invalid JSON` 或 `Parse error`

**解决方法**：
1. 重新复制 JSON 文件内容
2. 确保包含完整的花括号 `{ ... }`
3. 不要有多余的空格或换行

---

### 问题 3：GSC 没有数据

**错误信息**：`No search data available`

**原因**：网站刚上线，Google 还没有收集到搜索数据

**解决方法**：
- 这是正常的！新网站需要 1-4 周才有数据
- 工作流会发送提示邮件
- 等待 Google 索引和收集数据

---

### 问题 4：Supabase 写入失败

**错误信息**：`Permission denied` 或 `RLS policy`

**解决方法**：
1. 确认使用的是 Service Role Key（不是 Anon Key）
2. 确认 SEO 表的 RLS 策略已正确配置
3. 重新执行 `seo-tables.sql`

---

### 问题 5：邮件发送失败

**错误信息**：`Resend API error`

**解决方法**：
1. 确认 Resend API Key 正确
2. 确认邮箱地址格式正确
3. 检查 Resend 免费额度（100 封/天）

---

## 📅 自动运行时间

工作流配置为每周一 01:00 UTC（北京时间 09:00）自动运行。

**修改运行时间**：
编辑 `.github/workflows/seo-auto-update.yml`：
```yaml
on:
  schedule:
    # 每周一 01:00 UTC
    - cron: '0 1 * * 1'
```

**Cron 表达式说明**：
- `0 1 * * 1` = 每周一 01:00 UTC
- `0 1 * * *` = 每天 01:00 UTC
- `0 */6 * * *` = 每 6 小时一次

---

## 📊 查看 SEO 数据

### 在 Supabase 中查看

1. **关键词表现**
   ```sql
   SELECT * FROM keyword_performance 
   ORDER BY recorded_at DESC, impressions DESC 
   LIMIT 50;
   ```

2. **关键词趋势**
   ```sql
   SELECT * FROM keyword_trends 
   WHERE keyword = 'volvo headlamp';
   ```

3. **页面 SEO 优化**
   ```sql
   SELECT * FROM page_seo 
   ORDER BY updated_at DESC;
   ```

4. **运行日志**
   ```sql
   SELECT * FROM seo_update_logs 
   ORDER BY created_at DESC;
   ```

---

## 🎯 下一步

配置完成后：

1. **等待首次运行**
   - 下周一自动运行
   - 或手动触发测试

2. **查看周报邮件**
   - 检查 AI 分析结果
   - 查看优化建议

3. **监控效果**
   - 每周对比关键词排名
   - 观察流量变化

4. **持续优化**
   - 根据 AI 建议调整内容
   - 添加新的博客文章
   - 优化产品描述

---

## 📚 相关文档

- [DEPLOYMENT.md](./DEPLOYMENT.md) - 部署指南
- [README.md](./README.md) - 项目总览
- [SEO-IMPROVEMENTS.md](./SEO-IMPROVEMENTS.md) - SEO 优化建议

---

*最后更新: 2025-12-15*
