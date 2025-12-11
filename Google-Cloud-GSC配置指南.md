# Google Cloud 服务账号配置指南

本指南说明如何配置 Google Cloud 服务账号以访问 Google Search Console API，实现自动化 SEO 更新。

---

## 一、前提条件

- [x] Google Search Console 已验证网站 (xk-truck.cn)
- [ ] Google Cloud 账号（可使用现有 Google 账号）

---

## 二、创建 Google Cloud 项目

### 1. 访问 Google Cloud Console

打开 https://console.cloud.google.com

### 2. 创建新项目

1. 点击顶部的项目选择器
2. 点击 **新建项目**
3. 填写项目信息：
   - **项目名称**: `xktruck-seo`
   - **组织**: 留空或选择你的组织
4. 点击 **创建**

### 3. 等待项目创建完成

通常需要 30 秒到 1 分钟。

---

## 三、启用 Search Console API

### 1. 进入 API 库

1. 在左侧菜单选择 **API 和服务** → **库**
2. 或直接访问: https://console.cloud.google.com/apis/library

### 2. 搜索并启用 API

1. 在搜索框输入 `Search Console API`
2. 点击 **Google Search Console API**
3. 点击 **启用**

---

## 四、创建服务账号

### 1. 进入服务账号页面

1. 左侧菜单选择 **API 和服务** → **凭据**
2. 或直接访问: https://console.cloud.google.com/iam-admin/serviceaccounts

### 2. 创建服务账号

1. 点击 **+ 创建服务账号**
2. 填写信息：
   - **服务账号名称**: `seo-automation`
   - **服务账号 ID**: `seo-automation`（自动生成）
   - **描述**: `Service account for SEO automation`
3. 点击 **创建并继续**
4. **角色**部分可跳过（不需要项目级别权限）
5. 点击 **完成**

### 3. 创建密钥

1. 在服务账号列表中，点击刚创建的 `seo-automation`
2. 切换到 **密钥** 标签页
3. 点击 **添加密钥** → **创建新密钥**
4. 选择 **JSON** 格式
5. 点击 **创建**
6. **⚠️ 重要**: JSON 密钥文件会自动下载，请妥善保存！

### 4. 记录服务账号邮箱

服务账号邮箱格式类似：
```
seo-automation@xktruck-seo.iam.gserviceaccount.com
```

---

## 五、在 GSC 中添加服务账号

### 1. 打开 Google Search Console

访问 https://search.google.com/search-console

### 2. 选择网站

选择 `xk-truck.cn`

### 3. 添加用户

1. 点击左下角 **设置** ⚙️
2. 选择 **用户和权限**
3. 点击 **添加用户**
4. 填写信息：
   - **邮箱**: 粘贴服务账号邮箱（如 `seo-automation@xktruck-seo.iam.gserviceaccount.com`）
   - **权限**: 选择 **完整** 或 **受限**（只读查询数据选受限即可）
5. 点击 **添加**

---

## 六、配置 GitHub Secrets

### 1. 进入仓库设置

1. 打开 GitHub 仓库: https://github.com/ZhangHui88888/TruckB2B
2. 点击 **Settings** → **Secrets and variables** → **Actions**

### 2. 添加 Secrets

点击 **New repository secret** 添加以下密钥：

| Secret 名称 | 值 | 说明 |
|-------------|-----|------|
| `GSC_CREDENTIALS` | JSON 密钥文件的完整内容 | 服务账号密钥 |
| `GSC_SITE_URL` | `https://xk-truck.cn` | 网站 URL |
| `SUPABASE_URL` | `https://xktruck.supabase.co` | Supabase 项目 URL |
| `SUPABASE_KEY` | Supabase service_role key | Supabase 服务密钥 |
| `DEEPSEEK_API_KEY` | DeepSeek API Key | AI 分析用 |
| `RESEND_API_KEY` | Resend API Key | 邮件发送用 |
| `NOTIFY_EMAIL` | `harry.zhang592802@gmail.com` | 接收报告的邮箱 |
| `CF_DEPLOY_HOOK` | Cloudflare Deploy Hook URL | 触发重新部署（可选） |

### 3. GSC_CREDENTIALS 格式

将下载的 JSON 文件内容完整粘贴，格式类似：

```json
{
  "type": "service_account",
  "project_id": "xktruck-seo",
  "private_key_id": "xxx",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "seo-automation@xktruck-seo.iam.gserviceaccount.com",
  "client_id": "xxx",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/..."
}
```

---

## 七、手动提交 Sitemap

### 方法 A：通过 GSC 网页界面

1. 打开 https://search.google.com/search-console
2. 选择 `xk-truck.cn`
3. 左侧菜单选择 **站点地图**
4. 在 **添加新的站点地图** 输入框中输入: `sitemap-index.xml`
5. 点击 **提交**

### 方法 B：通过脚本提交

配置好环境变量后，运行：

```bash
cd xk-truck-frontend
node scripts/submit-sitemap.js
```

---

## 八、验证配置

### 1. 手动触发工作流

1. 进入 GitHub 仓库 → **Actions**
2. 选择 **SEO Auto Update** 工作流
3. 点击 **Run workflow**
4. 选择 `main` 分支
5. 点击 **Run workflow**

### 2. 检查运行结果

- 工作流应该成功完成（绿色 ✓）
- 检查邮箱是否收到 SEO 报告

### 3. 常见错误

| 错误 | 原因 | 解决方案 |
|------|------|----------|
| `403 Forbidden` | 服务账号没有 GSC 权限 | 在 GSC 中添加服务账号为用户 |
| `404 Not Found` | 网站未验证或 URL 错误 | 检查 GSC_SITE_URL 是否正确 |
| `Invalid credentials` | JSON 格式错误 | 确保完整粘贴 JSON 内容 |

---

## 九、自动化运行

配置完成后，GitHub Actions 会：

- **每周一 9:00（北京时间）** 自动运行
- 获取过去 7 天的搜索数据
- AI 分析优化建议
- 更新 Supabase SEO 配置
- 发送周报到指定邮箱

也可以随时在 GitHub Actions 页面手动触发。

---

## 十、安全提醒

⚠️ **重要安全事项**：

1. **不要**将 JSON 密钥文件提交到 Git 仓库
2. **不要**在代码中硬编码密钥
3. 定期轮换服务账号密钥（建议每 90 天）
4. 只授予必要的最小权限

---

## 相关链接

- [Google Cloud Console](https://console.cloud.google.com)
- [Google Search Console](https://search.google.com/search-console)
- [Search Console API 文档](https://developers.google.com/webmaster-tools/v1/api_reference_index)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
