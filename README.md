<img src="./screenshots/banner.webp" alt="易标使用演示视频" width="100%">

# 易标投标工具箱 - AI智能标书写作助手

<p align="center">
  <strong>简体中文</strong> | <a href="./README.en.md">English</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-20+-339933.svg" alt="Node.js">
  <img src="https://img.shields.io/badge/Next.js-15.3+-000000.svg" alt="Next.js">
  <img src="https://img.shields.io/badge/React-19+-61dafb.svg" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-5.9+-3178c6.svg" alt="TypeScript">
  <a href="https://deepwiki.com/FB208/OpenBidKit_Yibiao"><img src="https://deepwiki.com/badge.svg" alt="Ask DeepWiki"></a>
</p>

<p align="left">
  <strong>🚀 开箱即用-开源免费AI标书编写工具</strong>
  <br>
  易标投标工具箱是一款面向招投标场景的智能标书制作工具，完全开源，包括AI生成技术方案、图文生成、商务标、企业知识库管理、标书查重、废标项检查、标讯等，更多功能还在开发中。
  <br>
  支持OpenAI like模式的所有AI api，目前已深度适配通义千问、DeepSeek、龙猫、火山方舟等多个平台。
  <br>
</p>

## 🌐 官方网站

**在线体验**: [https://yibiao.pro](https://yibiao.pro)

## 📋 目录

- [快速开始（开发环境）](#-快速开始开发环境)
- [生产部署](#-生产部署)
- [技术架构](#%EF%B8%8F-技术架构)
- [项目结构](#%EF%B8%8F-项目结构)
- [贡献指南](#-贡献指南)
- [许可证](#-许可证)
- [联系我们](#%E2%80%8D-联系我们)

---

## 🚀 快速开始（开发环境）

### 环境要求

- **Node.js** >= 20
- **pnpm** >= 10

### 1. 克隆仓库

```bash
git clone <仓库地址>
cd yibiao-simple
```

### 2. 安装依赖

```bash
pnpm install
```

### 3. 启动开发服务

需要同时启动两个服务：API 后端和 Web 前端。

**终端 1 - 启动 API 服务**（默认 `http://127.0.0.1:3001`）：

```bash
pnpm dev:api
```

**终端 2 - 启动 Web 前端**（默认 `http://127.0.0.1:3000`）：

```bash
pnpm dev:web
```

启动完成后，在浏览器访问 `http://127.0.0.1:3000` 即可。

### 4. 配置 AI 模型

首次使用需在 Web 界面进入 Settings 页面，填写 AI 接口的 Base URL 和 API Key。

---

## 🖥️ 生产部署

### 方式一：PM2 部署（推荐）

适用于自有服务器长期运行。

#### 前置准备

```bash
# 安装 Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt-get install -y nodejs

# 安装 pnpm 和 pm2
npm install -g pnpm pm2
```

#### 部署步骤

```bash
# 1. 克隆代码
git clone <仓库地址> yibiao-web
cd yibiao-web

# 2. 安装依赖
pnpm install

# 3. 构建 Web 前端
pnpm build:web

# 4. 通过 PM2 启动服务
pm2 start apps/api/src/main.js --name yibiao-api -- --port 3001
pm2 start apps/web/node_modules/next/dist/bin/next --name yibiao-web -- start -p 3000 --cwd apps/web

# 5. 保存 PM2 配置（开机自启）
pm2 save
pm2 startup
```

#### 创建 PM2 配置文件（可选）

在项目根目录创建 `ecosystem.config.js`：

```javascript
module.exports = {
  apps: [
    {
      name: 'yibiao-api',
      script: 'apps/api/src/main.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      }
    },
    {
      name: 'yibiao-web',
      cwd: 'apps/web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
```

启动：`pm2 start ecosystem.config.js`

### 方式二：Docker 部署

```dockerfile
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

FROM base AS deps
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/ packages/
RUN pnpm install

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY . .
RUN pnpm build:web

FROM base AS runner
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api ./apps/api
COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/package.json ./apps/web/
COPY --from=builder /app/packages ./packages

EXPOSE 3000 3001
CMD ["sh", "-c", "node apps/api/src/main.js & cd apps/web && npx next start -p 3000"]
```

### Nginx 反向代理配置

通过 Nginx 统一入口转发到前端和 API：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # API 接口
    location /api/ {
        proxy_pass http://127.0.0.1:3001/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Web 前端
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 验证部署

```bash
# 检查 API 健康状态
curl http://127.0.0.1:3001/health

# 检查 Web 是否正常运行
curl -I http://127.0.0.1:3000
```


<h2 align="center">✨ 核心功能与优势</h2>

<p align="center">
  <strong>AI写标书 · 标书AI · AI标书生成 · 技术标编写 · 投标文件生成</strong><br>
  <sub>不止生成标书初稿，更强调开源可控、本地工作区、素材复用、图文表达和流程可恢复。</sub>
</p>

<table>
  <tr>
    <td width="33%" valign="top">
      <strong>🧩 开源可控</strong><br>
      开源 AI标书 项目，可自行部署、二次开发和适配团队流程。
    </td>
    <td width="33%" valign="top">
      <strong>💻 本地桌面工作区</strong><br>
      配置、缓存和生成结果保存在本机，适合 Windows 标书文件处理。
    </td>
    <td width="33%" valign="top">
      <strong>📄 多方式文档解析</strong><br>
      支持本地解析与 MinerU 解析配置，兼顾常规文档和复杂文件。
    </td>
  </tr>
  <tr>
    <td width="33%" valign="top">
      <strong>📚 知识库复用</strong><br>
      沉淀企业资料、历史案例和方案素材，让标书AI更贴合业务。
    </td>
    <td width="33%" valign="top">
      <strong>🧩 图文与图表</strong><br>
      支持 Mermaid 预览、正文配图和图表转 Word，增强方案表达。
    </td>
    <td width="33%" valign="top">
      <strong>🔄 后台任务恢复</strong><br>
      解析、生成等耗时任务持续落盘，切换页面后仍可恢复进度。
    </td>
  </tr>
  <tr>
    <td width="33%" valign="top">
      <strong>🛡️ 风险检查入口</strong><br>
      预留标书查重、废标项检查工作区，聚焦重复表达和响应完整性。
    </td>
    <td width="33%" valign="top">
      <strong>⚙️ 自定义AI配置</strong><br>
      支持文本模型、生图模型和文件解析方式配置，适配团队习惯。
    </td>
    <td width="33%" valign="top">
      <strong>✏️ 可编辑工作流</strong><br>
      目录、正文和扩写结果可持续调整，方便 AI写标书 后人工定稿。
    </td>
  </tr>
</table>



## 📦 下载与使用

### ⬇️ 下载方式

从 [GitHub Releases](https://github.com/yibiaoai/yibiao-simple/releases) 下载最新版本，运行安装包或可执行文件即可启动。

### 🎬 使用方式

<a href="https://www.bilibili.com/video/BV1sC5i6SE74">
  <img src="./screenshots/new_home.png" alt="易标使用演示视频" width="100%">
</a>

[点击前往 Bilibili 观看使用演示视频](https://www.bilibili.com/video/BV1sC5i6SE74)

## 🛠️ 技术架构

本项目采用 Monorepo 架构，基于 pnpm workspace 管理。

- **Web 前端**：Next.js 15 (App Router) + React 19 + TypeScript，使用全局 CSS 和 Radix UI 组件
- **API 后端**：Node.js 原生 HTTP Server，路由处理模块化
- **共享模块**：`packages/` 下维护 shared-prompts、shared-schema、shared-types、task-protocol
- **后台任务**：`apps/worker` 提供异步任务处理能力

### 🏗️ 项目结构

```
yibiao-simple/
├── apps/
│   ├── api/              # API 后端服务（端口 3001）
│   │   └── src/
│   │       └── routes/   # 业务路由
│   ├── web/              # Web 前端（Next.js，端口 3000）
│   │   └── app/          # App Router 页面
│   └── worker/           # 后台任务 Worker
├── packages/
│   ├── shared-prompts/   # AI Prompt 模板
│   ├── shared-schema/    # 数据 Schema
│   ├── shared-types/     # 通用 TypeScript 类型
│   └── task-protocol/    # 任务通信协议
└── pnpm-lock.yaml        # 锁定依赖版本
```

### 本地开发命令

```bash
# 安装依赖
pnpm install

# 启动开发服务
pnpm dev:api       # API 服务 (3001)
pnpm dev:web       # Web 前端 (3000)

# 构建
pnpm build:api     # 验证 API 代码
pnpm build:web     # Next.js 生产构建

# 代码检查
pnpm check:api     # API 代码检查
pnpm check:web     # Web 代码检查
```

## 🤝 贡献指南

欢迎各种形式的贡献！

1. **🐛 问题反馈**: 在 [Issues](https://github.com/yibiaoai/yibiao-simple/issues) 中报告bug
2. **💡 功能建议**: 提出新功能需求和改进建议  
3. **🔧 代码贡献**: Fork项目，提交Pull Request
4. **📖 文档完善**: 帮助改进文档和使用说明


## 📄 许可证

本项目基于 [GNU Affero General Public License v3.0](LICENSE) 开源协议发布。

你可以自由使用、修改、分发和商用本项目，但修改版、分发版和通过网络提供服务的版本必须遵守 AGPL-3.0 的开源义务，并保留本项目的 [NOTICE](NOTICE) 归属声明、原始仓库链接和作者信息。

## 🙋‍♂️ 联系我们

<table>
  <tr>
    <td width="50%" valign="top">

- **官方网站**: [https://yibiao.pro](https://yibiao.pro)
- **问题反馈**: [GitHub Issues](https://github.com/yibiaoai/yibiao-simple/issues)
- **邮箱联系**: support@yibiao.pro

    </td>
    <td width="33%" valign="top">
      <p>
        <img src="./screenshots/企业微信.png" alt="企业微信二维码" width="180">
      </p>
    </td>
  </tr>
</table>



## Star History

<a href="https://www.star-history.com/?repos=FB208%2FOpenBidKit_Yibiao&type=timeline&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=FB208/OpenBidKit_Yibiao&type=timeline&theme=dark&legend=top-left" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=FB208/OpenBidKit_Yibiao&type=timeline&legend=top-left" />
   <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=FB208/OpenBidKit_Yibiao&type=timeline&legend=top-left" />
 </picture>
</a>

---

<p align="center">
  ⭐ 如果这个项目对您有帮助，请给我们一个Star支持！
</p>



<p align="center">
  Made with ❤️ by 易标团队 
</p>

`AI写标书` `标书AI` `AI标书生成` `免费标书工具`