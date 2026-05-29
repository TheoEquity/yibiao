# Docling 纯 Web 重构方案

## 目标

将当前 Electron 桌面客户端重构为纯 Web 应用，采用 `Docling` 作为统一文档解析引擎，构建新的前端、API 服务、任务 Worker、数据库与对象存储体系。

## 总体架构

### 应用层

- `apps/web`: Web 前端，负责工作区交互、文件上传、任务展示、Markdown 编辑和导出入口。
- `apps/api`: Node API 服务，负责鉴权、业务资源、文件记录、任务调度和权限控制。
- `apps/worker`: Python Worker，负责 `Docling` 解析、长任务执行、导出和文档后处理。

### 共享层

- `packages/shared-types`: 前后端共享类型。
- `packages/shared-schema`: API schema 和校验模型。
- `packages/shared-prompts`: 技术方案、知识库、查重、废标项检查等 Prompt。
- `packages/task-protocol`: 任务事件协议和状态机定义。

### 基础设施

- `PostgreSQL`: 业务数据和任务状态。
- `Redis`: 队列、任务调度和短期缓存。
- `S3 / MinIO`: 原始文件、解析资产和导出文件。

## 核心业务域

### 技术方案

- 工作区创建
- 招标文件上传
- `Docling` 解析
- 招标分析
- 目录生成
- 正文生成
- 正文编辑
- Word 导出

### 知识库

- 文件夹管理
- 文档上传
- `Docling` 解析
- 分块和条目抽取
- 匹配分析

### 标书查重

- 多文件上传
- 文本解析
- 元数据提取
- 目录、正文、图片多维比对

### 废标项检查

- 招标/投标文件上传
- 文档解析
- 废标项提取
- 风险、错别字、逻辑问题检查

## 统一文档解析模型

所有业务模块统一消费 `ParsedDocument`。

### 标准输出

- `markdown`
- `plainText`
- `outline`
- `tables`
- `assets`
- `metadata`
- `warnings`

### 解析策略

- `md/txt/markdown`: 直接读取。
- `pdf/docx`: `Docling` 主解析。
- `doc/wps`: 先服务端转换，再交给 `Docling`。
- OCR 默认自动模式，支持关闭和强制开启。

## 统一任务系统

### 通用状态

- `pending`
- `queued`
- `running`
- `success`
- `error`
- `canceled`

### 任务类型

- `document-parse`
- `bid-analysis`
- `outline-generation`
- `content-generation`
- `knowledge-item-extraction`
- `knowledge-match`
- `duplicate-check-run`
- `rejection-item-extraction`
- `rejection-check-run`
- `word-export`

### 事件流

采用 SSE 推送：

- `task.created`
- `task.progress`
- `task.log`
- `task.success`
- `task.error`
- `resource.updated`

## 技术方案模块页面骨架

### 页面结构

- 顶部栏：标题、保存状态、任务入口、导出按钮。
- 左侧步骤栏：招标文件、招标分析、目录生成、正文生成、正文编辑、导出。
- 中间工作区：按步骤切换主体内容。
- 右侧辅助栏：任务日志、warning、知识库引用、节状态。

### 关键步骤

1. 招标文件上传并触发 `document-parse`
2. 招标分析触发 `bid-analysis`
3. 目录生成触发 `outline-generation`
4. 正文生成触发 `content-generation`
5. 正文编辑按 section 保存
6. 导出触发 `word-export`

## 仓库结构

```text
yibiao-web/
├── apps/
│   ├── web/
│   ├── api/
│   └── worker/
├── packages/
│   ├── shared-types/
│   ├── shared-schema/
│   ├── shared-prompts/
│   └── task-protocol/
├── docs/
├── infra/
└── migrations/
```

## 分阶段实施

### M1 基础设施

- monorepo 初始化
- 鉴权
- 文件上传
- 任务系统
- `Docling` 解析打通

### M2 技术方案闭环

- 解析
- 分析
- 目录
- 正文
- 编辑
- 导出

### M3 知识库闭环

- 入库
- 条目抽取
- 匹配分析

### M4 查重闭环

- 多文件比对
- 结果报告

### M5 废标项检查闭环

- 提取检查项
- 风险报告

## 当前改造原则

- 不修改现有 `client/` 业务代码，作为参考实现保留。
- 新系统在 `apps/` 和 `packages/` 下独立建设。
- 文档解析统一收敛到 `Docling`。
- 所有业务能力统一基于“文件 + 解析结果 + 任务 + 工作区”模型。
