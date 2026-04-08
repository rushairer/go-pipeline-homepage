---
sidebar_position: 2
---

# v2.2.4 更新说明

2.2.4 是一个补丁版本，重点在于保守性能优化和文档准确性修正，没有公开 API 破坏性变化。

## 亮点

### 性能

- 同步 flush 路径复用批容器，减少不必要分配
- 仅在启用 `MetricsHook` 时统计 flush 耗时，降低热路径开销
- 指标路径改为类型化批大小计算，移除反射开销
- 异步 flush 仍然保持 steal-and-replace 语义，不改变并发内存安全模型

### 文档

- 明确 `MaxConcurrentFlushes` 是有意设计的硬背压机制
- 修正文档里关于错误通道消费的冲突表述，统一为“推荐，但不是强制”
- 修正优雅关闭示例，统一为等待 `Start(ctx)` 返回的 `done`
- 移除过时 benchmark 快照，改为可复现的 benchmark 命令与参考环境

### 兼容性

- 无公开 API 变更
- 现有集成可以直接升级到 `v2.2.4`
- 若你依赖 `MaxConcurrentFlushes`，仅文档语义更清晰，运行行为没有变化

## 升级建议

- 同步内部文档和示例，统一等待 `done`
- 检查是否错误地把 `ErrorChan` 当成“完成信号”
- 如果业务依赖上游不被阻塞，重新评估 `MaxConcurrentFlushes` 是否适合当前链路

## 参考 benchmark 环境

- 日期：2026-04-08
- 平台：darwin/arm64
- CPU：Apple M4

## 推荐 benchmark 命令

```bash
go test -run ^$ -bench . -benchmem ./...
go test -run ^$ -bench BenchmarkStandardPipeline -benchmem ./tests/...
go test -run ^$ -bench BenchmarkDeduplicationPipeline -benchmem ./tests/...
```
