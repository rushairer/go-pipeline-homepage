---
sidebar_position: 1
---

# Go Pipeline v2 介绍

Go Pipeline v2 是一个面向 Go 的高性能批处理管道框架，基于泛型与并发安全，内置按批大小与时间窗口的攒批、显式背压、错误与指标钩子、可限流的异步 flush 与动态调参，提供标准与去重两种管道模式。

## 核心能力

- 泛型支持，基于 Go 1.20+，类型安全
- 按批大小和时间窗口自动 flush
- `AsyncPerform` 支持 batch flush 并发执行
- `Start()` 提供调用方非阻塞启动封装，`Run()` 提供同步便捷入口
- 支持 `DrainOnCancel`、`FinalFlushOnCloseTimeout`、`MaxConcurrentFlushes`
- `ErrorChan` 为 non-blocking / best-effort 错误观测
- 支持 Logger / Metrics hooks
- 标准管道与去重管道共用一致的配置和并发语义

## 安装

```bash
go get github.com/rushairer/go-pipeline/v2@latest
```

## 快速开始

```go
package main

import (
	"context"
	"fmt"
	"log"
	"time"

	gopipeline "github.com/rushairer/go-pipeline/v2"
)

func main() {
	pipeline := gopipeline.NewDefaultStandardPipeline(
		func(ctx context.Context, batch []int) error {
			fmt.Printf("flush batch: %v\n", batch)
			return nil
		},
	)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	done, errs := pipeline.Start(ctx)

	go func() {
		for {
			select {
			case err := <-errs:
				log.Printf("pipeline error: %v", err)
			case <-done:
				return
			}
		}
	}()

	dataChan := pipeline.DataChan()
	go func() {
		defer close(dataChan)
		for i := 0; i < 100; i++ {
			select {
			case dataChan <- i:
			case <-ctx.Done():
				return
			}
		}
	}()

	<-done
}
```

## 运行语义

- `AsyncPerform(ctx)` 会在调用方 goroutine 中运行接收/攒批循环；“Async”指 batch flush 可并发执行。
- 需要调用方立即返回时，推荐使用 `Start(ctx)`。
- `Start(ctx)` 返回的 `done` 表示当前 **run loop** 已结束，不是此前已派发 async flush 的全局 join barrier。
- `errs` / `ErrorChan()` 是 best-effort 错误观测；缓冲满时错误事件可能被丢弃，可通过 `MetricsHook.ErrorDropped()` 观测。
- 任何失败都不能丢的场景，应由 processor 或上层系统持久化失败数据。
- 正常收尾时由生产方关闭 `DataChan()`；框架会同步处理当前未满的尾批次并结束 run loop。
- `MaxConcurrentFlushes` 不只是并发上限，也是硬背压机制；容量打满时会把压力传回上游。

## 架构概览

```text
Producer -> DataChan -> Batch Accumulator -> Async Flush Workers
                |               |                  |
                |               +---- Timer -------+
                |                                  |
                +-------- explicit backpressure ---+
                                                   |
                                                   v
                                         best-effort ErrorChan
```

## 核心组件

### 接口

- `PipelineChannel[T]`：`DataChan`、`ErrorChan`
- `Performer[T]`：`AsyncPerform`、`SyncPerform`
- `Pipeline[T]`：组合 `PipelineChannel`、`Performer`、`DataProcessor`

### 具体类型辅助方法

- `Start(ctx)`：非阻塞启动 `AsyncPerform`
- `Run(ctx, errBuf)`：同步便捷入口
- `Done()`：获取当前 run loop 的完成信号

### 实现

- `StandardPipeline[T]`：标准批处理
- `DeduplicationPipeline[T]`：基于唯一键去重的批处理
- `PipelineImpl[T]`：通用基础实现

## 配置概览

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

## 下一步

- [并发与生命周期契约](./concurrency-contract)
- [标准管道](./standard-pipeline)
- [去重管道](./deduplication-pipeline)
- [配置指南](./configuration)
- [API 参考](./api-reference)
