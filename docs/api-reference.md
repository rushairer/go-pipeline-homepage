---
sidebar_position: 6
---

# API 参考

本文档聚焦公开 API 以及 2.2.4 已统一的语义说明。

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
	Done() <-chan struct{}
}
```

语义：

- `DataChan()`：生产者写入数据的唯一入口
- `ErrorChan(size)`：首次调用决定缓冲区大小；后续 `size` 被忽略
- `Done()`：管道完全退出时关闭

### Performer[T any]

```go
type Performer[T any] interface {
	AsyncPerform(ctx context.Context) error
	SyncPerform(ctx context.Context) error
	Start(ctx context.Context) (<-chan struct{}, <-chan error)
	Run(ctx context.Context, errBuf int) error
}
```

语义：

- `Start(ctx)`：推荐的异步入口，返回 `done` 和 `errs`
- `Run(ctx, errBuf)`：推荐的同步入口
- 同一实例不能并发启动，多次同时启动会返回 `ErrAlreadyRunning`

## 便捷 API

### Start

```go
done, errs := pipeline.Start(ctx)

go func() {
	for err := range errs {
		log.Printf("pipeline error: %v", err)
	}
}()

<-done
```

要点：

- 判断完成应等待 `done`，而不是等待错误通道关闭
- 推荐消费 `errs`，但不是强制要求
- 若错误通道已满，后续错误可能被丢弃

### Run

```go
if err := pipeline.Run(ctx, 128); err != nil {
	if errors.Is(err, gopipeline.ErrContextIsClosed) {
		log.Println("pipeline canceled")
	}
}
```

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

func NewDefaultStandardPipeline[T any](
	flushFunc FlushStandardFunc[T],
) *StandardPipeline[T]

func NewStandardPipeline[T any](
	config PipelineConfig,
	flushFunc FlushStandardFunc[T],
) *StandardPipeline[T]
```

## 去重管道

```go
type UniqueKeyData interface {
	GetKey() string
}

type FlushDeduplicationFunc[T UniqueKeyData] func(ctx context.Context, batchData map[string]T) error

func NewDefaultDeduplicationPipeline[T UniqueKeyData](
	flushFunc FlushDeduplicationFunc[T],
) *DeduplicationPipeline[T]

func NewDeduplicationPipeline[T UniqueKeyData](
	config PipelineConfig,
	flushFunc FlushDeduplicationFunc[T],
) *DeduplicationPipeline[T]
```

## Metrics 与 Logger Hooks

```go
type MetricsHook interface {
	Flush(items int, duration time.Duration)
	Error(err error)
	ErrorDropped()
}
```

- 2.2.4 起，只有在配置了 `MetricsHook` 时才会记录 flush 耗时，避免热路径无意义开销。
- 错误通道满导致错误被丢弃时，会通过 `ErrorDropped()` 上报。
- `WithLogger()` / `WithMetrics()` 适合接入现有日志和 Prometheus 指标体系。

## 公开错误与行为约束

- `ErrAlreadyRunning`：同一 pipeline 实例被并发启动
- `ErrContextIsClosed`：上下文已取消或提前结束
- `ErrContextDrained`：取消时已完成限时 drain

## 关键行为说明

- `MaxConcurrentFlushes` 是公开配置，也是公开行为语义的一部分；它会把背压传回生产者。
- 关闭 `DataChan()` 后，框架会尝试 flush 当前剩余批次。
- 若设置了 `FinalFlushOnCloseTimeout`，最终 flush 使用带超时的上下文。
