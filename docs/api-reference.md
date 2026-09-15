---
sidebar_position: 7
---

# API 参考

本文以当前 `main` 的公开接口和已固化的并发契约为准。

## 核心接口

### Pipeline[T any]

```go
type Pipeline[T any] interface {
	PipelineChannel[T]
	Performer[T]
	DataProcessor[T]
}
```

### PipelineChannel[T any]

```go
type PipelineChannel[T any] interface {
	DataChan() chan<- T
	ErrorChan(size int) <-chan error
}
```

语义：

- `DataChan()`：生产者写入数据的入口；受 `BufferSize` 和下游背压影响，写入可能阻塞。
- `ErrorChan(size)`：首次调用决定缓冲区大小；后续 `size` 被忽略。标准实现为 non-blocking / best-effort 错误观测，缓冲满时允许丢弃错误事件。

### Performer[T any]

```go
type Performer[T any] interface {
	AsyncPerform(ctx context.Context) error
	SyncPerform(ctx context.Context) error
}
```

语义：

- `AsyncPerform(ctx)`：调用本身占用当前 goroutine；“Async”指 batch flush 可并发执行。
- `SyncPerform(ctx)`：batch flush 在当前执行路径串行完成。
- 同一实例不能并发启动，多次同时启动会返回 `ErrAlreadyRunning`。

## `PipelineImpl` 便捷方法

`Start`、`Run` 和 `Done` 是具体 pipeline 类型继承的辅助方法，不属于 `Performer` / `PipelineChannel` 接口本身。

### Start

```go
done, errs := pipeline.Start(ctx)
```

- `Start(ctx)` 是 `AsyncPerform` 的非阻塞 goroutine 封装。
- `done` 表示本次 **run loop** 已结束。
- `done` 不是此前已派发 async flush 的全局 join barrier。
- `errs` 与 `ErrorChan` 一样是 best-effort 观测通道，不是 durable failure queue。

### Done

```go
done := pipeline.Done()
```

`Done()` 主要用于 run 已经启动后，从其他位置获取当前运行的完成信号。通过 `Start(ctx)` 启动时，优先使用 `Start` 返回的 run-bound `done`。

如果业务需要“所有副作用都已持久化完成”的强完成语义，应由 processor 或上层 runtime 自己实现 completion barrier。

### Run

```go
if err := pipeline.Run(ctx, 128); err != nil {
	if errors.Is(err, gopipeline.ErrContextIsClosed) {
		log.Println("pipeline canceled")
	}
}
```

`Run(ctx, errBuf)` 初始化错误通道容量后同步执行 `SyncPerform`。

## 配置类型

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

链式方法：

```go
func NewPipelineConfig() PipelineConfig
func (c PipelineConfig) WithBufferSize(size uint32) PipelineConfig
func (c PipelineConfig) WithFlushSize(size uint32) PipelineConfig
func (c PipelineConfig) WithFlushInterval(interval time.Duration) PipelineConfig
func (c PipelineConfig) WithDrainOnCancel(enabled bool) PipelineConfig
func (c PipelineConfig) WithDrainGracePeriod(d time.Duration) PipelineConfig
func (c PipelineConfig) WithFinalFlushOnCloseTimeout(d time.Duration) PipelineConfig
func (c PipelineConfig) WithMaxConcurrentFlushes(n uint32) PipelineConfig
func (c PipelineConfig) ValidateOrDefault() PipelineConfig
```

## 标准管道

```go
type FlushStandardFunc[T any] func(ctx context.Context, batchData []T) error

func NewDefaultStandardPipeline[T any](flushFunc FlushStandardFunc[T]) *StandardPipeline[T]
func NewStandardPipeline[T any](config PipelineConfig, flushFunc FlushStandardFunc[T]) *StandardPipeline[T]
```

## 去重管道

```go
type UniqueKeyData interface {
	GetKey() string
}

type FlushDeduplicationFunc[T UniqueKeyData] func(ctx context.Context, batchData map[string]T) error

func NewDefaultDeduplicationPipeline[T UniqueKeyData](flushFunc FlushDeduplicationFunc[T]) *DeduplicationPipeline[T]
func NewDeduplicationPipeline[T UniqueKeyData](config PipelineConfig, flushFunc FlushDeduplicationFunc[T]) *DeduplicationPipeline[T]
```

## Metrics 与 Logger Hooks

```go
type MetricsHook interface {
	Flush(items int, duration time.Duration)
	Error(err error)
	ErrorDropped()
}
```

- 只有配置 `MetricsHook` 时才记录 flush 耗时，避免热路径无意义开销。
- 错误成功写入错误通道时触发 `Error(err)`。
- 错误通道满导致错误事件被丢弃时触发 `ErrorDropped()`。
- `WithLogger()` / `WithMetrics()` 可接入现有日志和 Prometheus 指标体系。

## 公开错误

- `ErrAlreadyRunning`：同一 pipeline 实例被并发启动。
- `ErrContextIsClosed`：上下文已取消或提前结束。
- `ErrContextDrained`：取消时执行过限时 drain。

## 关键行为

- `MaxConcurrentFlushes` 同时是并发上限和硬背压边界。
- 关闭 `DataChan()` 后，框架会同步 flush 当前尚未满的尾批次，然后结束 run loop。
- 该 run-loop 完成信号不等同于此前所有 async flush 已 join。
- `FinalFlushOnCloseTimeout` 只约束关闭路径上的最终尾批次 flush。

参见 [并发与生命周期契约](./concurrency-contract)。
