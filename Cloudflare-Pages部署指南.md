# Cloudflare Pages 部署指南

## 前提条件

- [x] Cloudflare 账号已注册（harry.zhang592802@gmail.com）
- [x] 域名 xk-truck.cn 已接入 Cloudflare DNS
- [x] GitHub 仓库 TruckB2B 已创建
- [x] 前端代码已推送到 `xk-truck-frontend` 目录

---

## 部署步骤

### 1. 进入 Cloudflare Pages

1. 登录 [Cloudflare 控制台](https://dash.cloudflare.com)
2. 左侧菜单：**Compute & AI** → **Workers & Pages**
3. 点击右上角 **Create application**
4. 在弹窗中选择 **Pages** 标签
5. 点击 **Connect to Git**

> ⚠️ 注意：不要选择 "Create a Worker"，我们需要的是 Pages

### 2. 连接 GitHub

1. 点击 **Continue with GitHub**
2. 授权 Cloudflare 访问 GitHub（可选择 All repositories 或仅 TruckB2B）
3. 点击 **Install & Authorize**
4. 选择 **TruckB2B** 仓库
5. 点击 **Next**

### 3. 配置构建设置

| 配置项 | 值 |
|--------|-----|
| **Project name** | `truckb2b`（或 `xk-truck`） |
| **Production branch** | `main` |
| **Framework preset** | `Astro` |
| **Build command** | `npm run build` |
| **Build output directory** | `dist` |
| **Root directory (advanced)** | `xk-truck-frontend` |

> ⚠️ **重要**：必须设置 Root directory 为 `xk-truck-frontend`，因为前端代码在子目录中

### 4. 部署

1. 点击 **Save and Deploy**
2. 等待构建完成（约 1-2 分钟）
3. 构建成功后会得到一个 `*.pages.dev` 的临时域名

---

## 绑定自定义域名

### 1. 添加域名

1. 进入项目设置：**Workers & Pages** → 点击项目名 → **Custom domains**
2. 点击 **Set up a custom domain**
3. 输入域名：`xk-truck.cn`
4. 点击 **Continue**
5. Cloudflare 会自动配置 DNS 记录

### 2. 添加 www 子域名（可选）

重复上述步骤，添加 `www.xk-truck.cn`

### 3. 等待 SSL 证书

- Cloudflare 会自动申请 SSL 证书
- 通常几分钟内完成
- 状态显示 "Active" 即可访问

---

## 验证部署

部署完成后访问：
- https://truckb2b.pages.dev（临时域名）
- https://xk-truck.cn（自定义域名，DNS 生效后）

---

## 后续更新

代码推送到 GitHub 后会自动触发重新部署：

```bash
git add .
git commit -m "update: 描述更改内容"
git push
```

---

## 项目结构

```
TruckB2B/                        # GitHub 仓库根目录
├── xk-truck-frontend/           # 前端项目（Cloudflare Pages 部署）
│   ├── src/
│   │   ├── components/
│   │   ├── layouts/
│   │   ├── pages/
│   │   └── styles/
│   ├── public/
│   ├── astro.config.mjs
│   └── package.json
├── 外贸独立站技术方案.md
├── 部署准备清单.md
├── 对话提示词.md
└── Cloudflare-Pages部署指南.md   # 本文档
```

---

## 常见问题

### Q: 构建失败怎么办？

查看构建日志，常见原因：
1. Root directory 未设置为 `xk-truck-frontend`
2. Node.js 版本不兼容（可在 Environment variables 中设置 `NODE_VERSION=20`）

### Q: 域名无法访问？

1. 检查 DNS 是否已切换到 Cloudflare
2. 等待 DNS 传播（最长 24 小时，通常几分钟）
3. 检查 SSL 证书状态

### Q: 如何查看部署日志？

**Workers & Pages** → 点击项目 → **Deployments** → 点击具体部署记录

---

## 相关链接

- [Cloudflare Pages 文档](https://developers.cloudflare.com/pages/)
- [Astro 部署到 Cloudflare](https://docs.astro.build/en/guides/deploy/cloudflare/)
- [项目 GitHub 仓库](https://github.com/ZhangHui88888/TruckB2B)
