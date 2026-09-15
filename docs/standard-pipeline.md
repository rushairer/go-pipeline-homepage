---
sidebar_position: 3
---

# 标准管道

`StandardPipeline[T]` 适用于持续高吞吐的顺序输入、分批处理场景，例如批量写数据库、批量调用 API、日志聚合和 ETL。

## 创建管道

### 默认配置

```go
pipeline := gopipeline.NewDefaultStandardPipeline(
	func(ctx context.Context, batch []string) error {
		return process(batch)
	},
)
```

### 自定义配置

```go
config := gopipeline.NewPipelineConfig().
	WithBufferSize(400).
	WithFlushSize(100).
	WithFlushInterval(100 * time.Millisecond).
	WithMaxConcurrentFlushes(8).
	WithDrainOnCancel(true).
	WithDrainGracePeriod(150 * time.Millisecond).
	WithFinalFlushOnCloseTimeout(500 * time.Millisecond)

pipeline := gopipeline.NewStandardPipeline(config, flushFunc)
```

## 推荐：非阻塞启动

```go
ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()

done, errs := pipeline.Start(ctx)

go func() {
	for {
		select {
		case err := <-errs:
			log.Printf("flush error: %v", err)
		case <-done:
			return
		}
	}
}()

dataChan := pipeline.DataChan()
go func() {
	defer close(dataChan)
	for _, item := range items {
		select {
		case dataChan <- item:
		case <-ctx.Done():
			return
		}
	}
}()

<-done
```

`Start(ctx)` 立即返回；内部使用 `AsyncPerform` 的并发 flush 模型。

:::important
`done` 表示 pipeline **run loop 已结束**，不是此前所有已派发 async flush 的全局 join barrier。需要“所有副作用都已完成”的强语义时，请在 processor 或上层 runtime 中实现自己的 completion barrier。
:::

## `AsyncPerform` 与 `SyncPerform`

```go
// 调用本身占用当前 goroutine；batch flush 可以并发。
if err := pipeline.AsyncPerform(ctx); err != nil {
	log.Printf("async perform: %v", err)
}

// batch flush 串行执行。
if err := pipeline.SyncPerform(ctx); err != nil {
	log.Printf("sync perform: %v", err)
}
```

需要 `AsyncPerform` 不阻塞调用方时，把它放进 goroutine，或更推荐直接使用 `Start(ctx)`。

## 错误处理

- `flush` 返回的是 batch/flush 级错误。
- `ErrorChan` 使用 non-blocking / best-effort 发送；错误通道满时允许丢弃错误事件。
- 慢错误消费者不会反向阻塞主数据处理链。
- `MetricsHook.ErrorDropped()` 可观测错误事件丢弃。
- 如果任何失败都不能丢，应由 processor / DB / Kafka / retry queue 等可靠介质保存失败数据。

## 关闭语义

- 由写入方关闭 `DataChan()`。
- 关闭路径会同步 flush 当前尚未满的尾批次。
- `FinalFlushOnCloseTimeout` 约束的是该最终尾批次 flush。
- run loop 结束后 `done` 关闭，但此前已派发的 async flush 可能仍在执行。

## 背压

```go
config := gopipeline.NewPipelineConfig().
	WithMaxConcurrentFlushes(uint32(runtime.NumCPU()))
```

- `MaxConcurrentFlushes = 0` 表示不限制异步 flush 并发数。
- 非零时，达到上限会阻塞主聚合循环继续派发新的 flush。
- 主循环放慢后会减少 `DataChan()` 消费，压力最终传回生产者。
- 这是保护下游和内存的显式设计，不是异常副作用。

## 典型场景

### 数据库批量写入

```go
pipeline := gopipeline.NewStandardPipeline(
	gopipeline.NewPipelineConfig().
		WithFlushSize(100).
		WithBufferSize(800).
		WithFlushInterval(200*time.Millisecond),
	func(ctx context.Context, rows []Record) error {
		return db.CreateInBatches(rows, len(rows)).Error
	},
)
```

### 外部 API 批调用

```go
pipeline := gopipeline.NewStandardPipeline(
	gopipeline.NewPipelineConfig().
		WithFlushSize(20).
		WithBufferSize(200).
		WithFlushInterval(50*time.Millisecond).
		WithMaxConcurrentFlushes(4),
	func(ctx context.Context, reqs []APIRequest) error {
		return callBatchAPI(ctx, reqs)
	},
)
```

参见 [并发与生命周期契约](./concurrency-contract)。
