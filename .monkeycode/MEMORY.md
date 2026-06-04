# 用户指令记忆

本文件记录了用户的指令、偏好和教导，用于在未来的交互中提供参考。

## 格式

### 用户指令条目
用户指令条目应遵循以下格式：

[用户指令摘要]
- Date: [YYYY-MM-DD]
- Context: [提及的场景或时间]
- Instructions:
  - [用户教导或指示的内容，逐行描述]

### 项目知识条目
Agent 在任务执行过程中发现的条目应遵循以下格式：

[项目知识摘要]
- Date: [YYYY-MM-DD]
- Context: Agent 在执行 [具体任务描述] 时发现
- Category: [运维部署|构建方法|测试方法|排错调试|工作流协作|环境配置]
- Instructions:
  - [具体的知识点，逐行描述]

## 去重策略
- 添加新条目前，检查是否存在相似或相同的指令
- 若发现重复，跳过新条目或与已有条目合并
- 合并时，更新上下文或日期信息
- 这有助于避免冗余条目，保持记忆文件整洁

## 条目

[项目工作目录与启动方式]
- Date: 2026-06-04
- Context: Agent 在执行本地部署与技术方案链路修复时发现
- Category: 构建方法
- Instructions:
  - 当前有效工作目录是 `/workspace`
  - 项目使用 `pnpm` workspace，常用启动命令是 `pnpm dev:api` 和 `pnpm dev:web`

[Next 开发与构建缓存隔离]
- Date: 2026-06-04
- Context: Agent 在执行前端空白页排查时发现
- Category: 排错调试
- Instructions:
  - `apps/web` 的 `next dev` 与 `next build` 需要使用不同 dist 目录，当前约定分别是 `.next-dev` 和 `.next-build`
  - 排查 Next 随机 500 或 vendor chunk 丢失时，优先检查是否再次混用了 dev/build 输出目录
