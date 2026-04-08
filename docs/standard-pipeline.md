---
sidebar_position: 3
---

# 标准管道

`StandardPipeline[T]` 适用于按写入顺序批量处理数据的场景，例如批量写数据库、批量调用 API、日志聚合等。

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
	WithDrainOnCancel(true).
	WithDrainGracePeriod(150 * time.Millisecond).
	WithFinalFlushOnCloseTimeout(500 * time.Millisecond)

pipeline := gopipeline.NewStandardPipeline(config, flushFunc)
```

## 推荐运行方式

```go
ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()

done, errs := pipeline.Start(ctx)

go func() {
	for err := range errs {
		log.Printf("flush error: %v", err)
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

## 同步运行

```go
if err := pipeline.Run(ctx, 128); err != nil {
	log.Printf("pipeline stopped: %v", err)
}
```

## 传统 API

```go
go func() {
	if err := pipeline.AsyncPerform(ctx); err != nil {
		log.Printf("async perform: %v", err)
	}
}()

if err := pipeline.SyncPerform(ctx); err != nil {
	log.Printf("sync perform: %v", err)
}
```

## 关闭与错误处理

- 推荐消费 `errs`，但不消费并不会阻止管道运行；代价是错误通道满时可能丢错。
- 不要通过“等待错误通道关闭”来判断结束，应等待 `done` 或 `Done()`。
- 由写入方关闭 `DataChan()`，框架会在通道关闭后对剩余数据执行最终 flush。
- 如果设置了 `FinalFlushOnCloseTimeout`，最终 flush 会在带超时的上下文中执行，flush 函数必须尊重传入的 `ctx`。

## 背压说明

```go
config := gopipeline.NewPipelineConfig().
	WithMaxConcurrentFlushes(uint32(runtime.NumCPU()))
```

- `MaxConcurrentFlushes = 0` 表示不限制异步 flush 并发数。
- 非零时，达到上限会阻塞主聚合循环，新的 flush 不再继续派发。
- 当主循环因此停止继续消费 `DataChan()` 时，阻塞会向上游传播，这是 2.2.4 文档明确说明的既有设计，不是副作用。

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

## 2.2.4 相关变化

- 同步 flush 路径会复用批容器，减少分配。
- 异步路径仍保持 steal-and-replace 语义，不回退内存安全模型。
- 文档已统一为“等待 `done`，推荐消费错误通道，但非强制”。
