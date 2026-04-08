---
sidebar_position: 5
---

# 配置指南

2.2.4 之后，文档将配置说明统一为“吞吐、延迟、内存、背压”四个维度来理解。

## PipelineConfig

```go
type PipelineConfig struct {
	BufferSize               uint32
	FlushSize                uint32
	FlushInterval            time.Duration
	DrainOnCancel            bool
	DrainGracePeriod         time.Duration
	FinalFlushOnCloseTimeout time.Duration
	MaxConcurrentFlushes     uint32
}
```

默认值：

- `BufferSize: 100`
- `FlushSize: 50`
- `FlushInterval: 50ms`

## 链式配置

```go
config := gopipeline.NewPipelineConfig().
	WithBufferSize(200).
	WithFlushSize(50).
	WithFlushInterval(50 * time.Millisecond).
	WithDrainOnCancel(true).
	WithDrainGracePeriod(150 * time.Millisecond).
	WithFinalFlushOnCloseTimeout(500 * time.Millisecond).
	WithMaxConcurrentFlushes(4).
	ValidateOrDefault()
```

## 参数详解

### BufferSize

- 控制生产者在阻塞前最多可以排队多少数据。
- 过小会让更多 flush 走超时路径，形成小批次。
- 过大可以缓冲突发流量，但会提高内存占用。

### FlushSize

- 达到该值时触发一次 flush。
- 值越大，越偏吞吐；值越小，越偏延迟。

### FlushInterval

- 未满批次时的尾延迟上限。
- 值越小，越容易出现小批次；值越大，尾延迟越高。

### DrainOnCancel / DrainGracePeriod

- `DrainOnCancel=false`：取消即停，不再对当前半批做最终 flush。
- `DrainOnCancel=true`：取消时在 `DrainGracePeriod` 时间窗内尽力 flush 当前半批。

### FinalFlushOnCloseTimeout

- 用于 `DataChan()` 被关闭后的最终 flush 超时控制。
- `0` 表示禁用；大于 `0` 时会创建一个带超时的新上下文执行最终 flush。

### MaxConcurrentFlushes

- `0` 表示不限制异步 flush 并发。
- 非零时表示允许同时运行的异步 flush 数量。
- 该参数还承担硬背压作用：打满后主循环会停止继续推进 intake，让上游写入方感知阻塞。

## FlushSize 与 BufferSize 的关系

推荐关系：

- `BufferSize >= 4 * FlushSize`：更适合有突发的生产流量
- `BufferSize ~= 2 * FlushSize`：可以工作，但更容易受峰值影响
- `BufferSize < FlushSize`：会更频繁地产生小批次，不建议作为默认配置

## 调参速查表

### 吞吐优先

- `FlushSize: 64-128`
- `BufferSize: 4x-10x FlushSize`
- `FlushInterval: 50-100ms`

### 延迟优先

- `FlushSize: 8-32`
- `BufferSize: >= 4x FlushSize`
- `FlushInterval: 1-10ms`

### 内存受限

- `FlushSize: 16-32`
- `BufferSize: 2x-4x FlushSize`
- `FlushInterval: 50-200ms`

### 多生产者

- `BufferSize >= (4-10) * FlushSize * ceil(N / NumCPU)`

## 基于成本的估算方法

设：

- `t_item`：单个元素平均处理时间
- `t_batch`：每批固定开销
- `alpha`：允许分摊比例，例如 `0.1`

则：

```text
FlushSize >= ceil(t_batch / (alpha * t_item))
BufferSize = k * FlushSize, k ∈ [4, 10]
```

实务上，如果算出来的值极大：

- 关注延迟时，可把 `FlushSize` 夹在 `32-128`
- 纯吞吐场景，可保留更大值并同步增大 `BufferSize`

## 数据类型语义

通过 `DataChan() chan<- T` 发送时，`T` 的形态会直接影响内存与性能：

- `int` / `int64`：按值拷贝，成本低
- `string`：只拷贝字符串头，不拷贝底层字节
- `[N]T`：发送时拷贝整个数组
- `[]T`：只拷贝 slice header，底层数组共享
- `*T`：只拷贝指针值，共享同一对象
- 大结构体：按值拷贝，成本可能偏高

建议：

- 发送后保持数据不可变
- 若发送的是切片或指针，务必确认下游读到的数据不会被生产者继续复用/修改
- 异步 flush 场景不要复用仍可能被并发 goroutine 读取的底层容器

## Benchmark 建议

2.2.4 不再在站内放置容易过期的性能快照，改为推荐可复现 benchmark：

```bash
go test -run ^$ -bench . -benchmem ./...
go test -run ^$ -bench BenchmarkStandardPipeline -benchmem ./tests/...
go test -run ^$ -bench BenchmarkDeduplicationPipeline -benchmem ./tests/...
```

参考环境：

- 日期：2026-04-08
- 平台：darwin/arm64
- CPU：Apple M4
