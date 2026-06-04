# 本地依赖缓存

这个项目现在支持把常用开发依赖缓存到仓库内，方便重新拉代码后快速恢复环境。

## 当前缓存范围

- Node 依赖：`pnpm` store 打包并切分到 `vendor/pnpm/store-v10.tar.gz.part-*`
- Python 依赖：文档解析链路需要的 CPU 精简版 `docling-slim[format-office,format-pdf]` wheels 缓存到 `vendor/python/wheels/`，并额外切分归档到 `vendor/python/wheels.tar.gz.part-*`

## 生成缓存

首次在已经可用的环境里执行：

```bash
bash scripts/cache-deps.sh
```

这会完成两件事：

- 打包当前 `pnpm store` 并自动切分成多个小于 100 MB 的分片
- 下载 CPU 精简版 `docling-slim[format-office,format-pdf]` 及其依赖 wheels，并把 `vendor/python/wheels/` 打包切分为多个小于 100 MB 的分片

## 恢复依赖

在新的本地代码目录中执行：

```bash
bash scripts/restore-deps.sh
```

恢复步骤：

- 自动拼接并解压项目内 `pnpm store` 分片缓存到当前用户的 `pnpm store` 路径
- 如 `vendor/python/wheels/` 当前缺失，自动拼接并解压 `vendor/python/wheels.tar.gz.part-*`
- 执行 `pnpm install --offline --frozen-lockfile`
- 执行 Python 本地 wheel 安装

## 说明

- Python 当前只缓存项目真实使用到的文档解析依赖链：`docling-slim[format-office,format-pdf]`
- 如果后续 worker 新增其他 Python 包，补充到 `vendor/python/requirements-docling.txt` 后重新执行缓存脚本
- 当前方案刻意排除了 `torch` 与 CUDA/GPU 依赖，优先保证 DOCX 和基础 PDF 解析可离线恢复
- `pnpm store` 体积可能较大，适合本地目录复用或内网共享，不适合频繁提交到远端仓库
