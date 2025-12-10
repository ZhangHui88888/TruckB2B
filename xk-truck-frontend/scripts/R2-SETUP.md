# Cloudflare R2 存储桶配置指南

## 1. 创建 R2 存储桶

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 左侧菜单选择 **R2 Object Storage**
3. 点击 **Create bucket**
4. 输入存储桶名称：`xktruck-images`
5. 选择区域：**Automatic** (推荐)
6. 点击 **Create bucket**

## 2. 配置公开访问

### 方式 A：使用自定义域名（推荐）

1. 进入存储桶设置 → **Settings**
2. 找到 **Public access** 部分
3. 点击 **Connect Domain**
4. 输入子域名：`images.xk-truck.cn`
5. 确认 DNS 记录自动添加

### 方式 B：使用 R2.dev 域名

1. 进入存储桶设置 → **Settings**
2. 找到 **R2.dev subdomain**
3. 点击 **Allow Access**
4. 记录生成的 URL：`https://pub-xxx.r2.dev`

## 3. 创建 API Token

1. 进入 R2 → **Manage R2 API Tokens**
2. 点击 **Create API token**
3. 配置权限：
   - **Permissions**: Object Read & Write
   - **Specify bucket(s)**: 选择 `xktruck-images`
4. 点击 **Create API Token**
5. **立即保存**以下信息：
   - Access Key ID
   - Secret Access Key

## 4. 配置环境变量

在 `.env` 文件中添加：

```env
R2_ACCOUNT_ID=4f2c0fb4069b0066d6158069fd309fb3
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key
R2_BUCKET_NAME=xktruck-images
R2_PUBLIC_DOMAIN=images.xk-truck.cn
```

## 5. 配置 CORS（可选）

如果需要从浏览器直接上传，需配置 CORS：

1. 进入存储桶设置 → **Settings**
2. 找到 **CORS Policy**
3. 添加规则：

```json
[
  {
    "AllowedOrigins": ["https://xk-truck.cn", "http://localhost:4321"],
    "AllowedMethods": ["GET", "PUT", "POST"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

## 6. 测试上传

```bash
# 设置环境变量
export R2_ACCOUNT_ID=xxx
export R2_ACCESS_KEY_ID=xxx
export R2_SECRET_ACCESS_KEY=xxx
export R2_BUCKET_NAME=xktruck-images

# 运行同步脚本
npm run sync:products
```

## 7. 费用说明

R2 免费额度（每月）：
- 存储：10 GB
- Class A 操作（写入）：100 万次
- Class B 操作（读取）：1000 万次
- 出站流量：**免费**

预估使用量：
- 350 张产品图片 × 500KB = 175 MB
- 远低于免费额度限制

## 8. 目录结构

上传的图片将按以下结构存储：

```
xktruck-images/
├── products/
│   ├── volvo-fh4-led-headlamp-abc123.jpg
│   ├── scania-r-series-mirror-def456.jpg
│   └── ...
├── brands/
│   ├── volvo.svg
│   ├── scania.svg
│   └── ...
└── categories/
    ├── headlamps.jpg
    └── ...
```
