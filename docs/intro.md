---
sidebar_position: 1
---

# Go Pipeline v2 介绍

Go Pipeline v2 是一个面向 Go 的高性能批处理管道框架，基于泛型与并发安全，内置按批大小与时间窗口的攒批、背压与优雅关闭、错误与指标钩子、可限流的异步 flush 与动态调参，提供标准与去重两种管道模式。

## 核心能力

- 泛型支持，基于 Go 1.20+，类型安全
- 按批大小和时间窗口自动 flush
- 支持同步和异步两种执行方式
- 支持 `Start()` / `Run()` 便捷 API
- 支持 `DrainOnCancel`、`FinalFlushOnCloseTimeout`、`MaxConcurrentFlushes`
- 支持 Logger / Metrics hooks
- 标准管道与去重管道共用一致的配置与关闭语义

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
		for err := range errs {
			log.Printf("pipeline error: %v", err)
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

- 推荐使用 `Start(ctx)` 启动异步管道，并等待返回的 `done` 通道完成。
- 推荐消费 `errs` / `ErrorChan()`，但这不是强制要求；如果错误通道满了，新错误可能被丢弃。
- `ErrorChan(size)` 首次调用会确定容量，后续调用的 `size` 会被忽略。
- 正常收尾时应由生产方关闭 `DataChan()`；框架会处理剩余批次并退出。
- `MaxConcurrentFlushes` 不只是并发上限，也是有意设计的硬背压机制。打满时，主循环会停止继续派发 flush，并把阻塞反馈给上游。

## 架构概览

```text
Data Input -> Buffer Channel -> Batch Processor -> Flush Handler
                      |                               |
                      +---------- Timer --------------+
                                      |
                                      v
                                Error Channel
```

## 核心组件

### 接口

- `PipelineChannel[T]`：访问 `DataChan`、`ErrorChan`、`Done`
- `Performer[T]`：执行 `AsyncPerform`、`SyncPerform`、`Start`、`Run`
- `Pipeline[T]`：组合完整能力的总接口

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

## 2.2.4 更新重点

- 同步 flush 路径复用批容器，减少分配
- 仅在启用 `MetricsHook` 时记录 flush 耗时，降低热路径开销
- 明确 `MaxConcurrentFlushes` 的硬背压语义
- 修正文档中 `done`、`ErrorChan` 和 benchmark 的推荐写法

## 下一步

- [v2.2.4 更新说明](./whats-new-v2.2.4)
- [标准管道](./standard-pipeline)
- [去重管道](./deduplication-pipeline)
- [配置指南](./configuration)
- [API 参考](./api-reference)
