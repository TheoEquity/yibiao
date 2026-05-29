# Worker

`apps/worker` 用于承接 Docling 解析、长任务执行、导出和文档后处理。

## 规划中的模块

- `parsers/`: Docling 解析和文档转换
- `tasks/`: 技术方案、知识库、查重、废标项检查和导出任务
- `services/`: 存储、数据库、AI 调用和任务回写

## 下一步

1. 初始化 Python 项目与依赖管理
2. 接入 Docling
3. 定义统一解析结果模型
4. 打通 `document-parse` 任务

## 当前骨架

- `document_parse_task.py`: `document-parse` 任务占位实现。
