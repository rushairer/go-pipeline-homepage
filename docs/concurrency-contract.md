---
sidebar_position: 6
---

# 并发与生命周期契约

本文固定 `go-pipeline` 的并发、生命周期、背压和错误观测语义。核心目标不是提供事务型任务系统，而是面向持续高并发、海量数据处理，尽量避免独立批次之间不必要的串行等待。

## 设计目标

推荐执行模型：

```text
持续输入
   ↓
累计 Batch A
   ↓
派发 A ─────────────→ flush A
   ↓
累计 Batch B
   ↓
派发 B ─────────────→ flush B
   ↓
继续接收数据
```

核心优先级：

1. 持续高吞吐；
2. 批次隔离；
3. batch flush 可并发执行；
4. 通过有限并发和明确背压保护下游；
5. 错误观测不能反向拖慢数据热路径。

## `AsyncPerform` 的准确含义

`AsyncPerform(ctx)` **不是**“函数调用立即返回”。它会在调用方 goroutine 中运行 pipeline 的接收/攒批循环。

这里的 `Async` 指的是 batch flush：批次达到条件后，可以派发到独立 goroutine 中执行，后续批次无需串行等待前一批 flush 完成。

如果调用方需要非阻塞启动，应使用：

```go
done, errs := pipeline.Start(ctx)
```

`Start` 是 `AsyncPerform` 的 goroutine 封装，不改变底层 completion semantics。

## `Done` 的准确含义

`Done()` 以及 `Start(ctx)` 返回的 `done` 表示**当前 pipeline run loop 已结束**。

在 `AsyncPerform` 模式下，`done` 有意不承诺“此前所有已经派发的异步 flush 都已经 join 完成”。核心实现不会仅为了把 `Done` 变成全局 worker barrier，而给 steady-state 热路径增加每批 completion bookkeeping。

如果业务必须确认“所有副作用都已经持久化完成”，应由 processor 或更上层 runtime 显式实现自己的 durable completion barrier。

## 错误语义

processor 的 `flush` 返回 batch/flush 级 `error`。

标准实现会以 non-blocking / best-effort 方式把错误写入 `ErrorChan`。当错误通道缓冲区已满时，新错误事件可以被丢弃，避免慢错误消费者把高吞吐 pipeline 卡住；可通过 `MetricsHook.ErrorDropped()` 观测这种情况。

```text
ErrorChan
    = 日志 / 指标 / 告警 / best-effort 错误观测

ErrorChan
    ≠ 持久化失败队列
    ≠ 完整失败账本
    ≠ 单条数据结果收集器
```

如果业务要求任何失败都不能丢，应由 processor 或上层系统把失败批次/数据写入数据库、Kafka、retry queue、文件等可靠介质。

## 背压是设计的一部分

`go-pipeline` 不承诺生产者永远不会阻塞。

- `BufferSize` 限制输入排队量；
- `MaxConcurrentFlushes` 限制在飞异步 flush 数；
- 当容量耗尽时，pipeline 会把背压传回上游，而不是无限增长 goroutine 或内存。

正确目标不是“任何地方都不阻塞”，而是：

> 独立批次之间不做不必要的串行等待；达到容量边界时，通过明确、有限的背压保护系统。

## 契约回归测试

源码仓库中的 `pipeline_concurrency_contract_test.go` 专门锁定三个性能敏感保证：

1. 并发容量未耗尽时，独立满批次可以同时进入异步 flush；
2. `Done` 表示 run loop 完成，不会在普通重构中被悄悄加强成所有 async flush 的全局 join barrier；
3. `ErrorChan` 饱和不会阻塞数据处理热路径，丢弃通过 `MetricsHook.ErrorDropped()` 暴露。

这些是 contract tests，而不是偶然的实现细节测试。未来如果某项测试失败，应先重新审视并发契约，而不是直接修改测试去适配新的实现。

## 非目标

`go-pipeline` 核心包不负责：

- durable task queue；
- transactional workflow engine；
- exactly-once runtime；
- 完整结果收集；
- durable retry ledger。

这些能力应由真正拥有持久化和恢复语义的上层系统构建。

源码中的权威契约见 [`CONCURRENCY_CONTRACT.md`](https://github.com/rushairer/go-pipeline/blob/main/CONCURRENCY_CONTRACT.md)。
