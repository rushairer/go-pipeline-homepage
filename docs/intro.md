---
sidebar_position: 1
---

# Go Pipeline v2 介绍

Go Pipeline v2 是一个面向 Go 的高性能批处理管道框架，基于泛型与并发安全，内置按批大小与时间窗口的攒批、背压与优雅关闭、错误与指标、可限流的异步 flush 与动态调参，提供标准与去重两种管道模式。

## 🚀 核心特性

- **泛型支持**: 基于Go 1.20+泛型，类型安全
- **批处理机制**: 支持按大小和时间间隔自动批处理
- **并发安全**: 内置goroutine安全机制
- **灵活配置**: 可自定义缓冲区大小、批处理大小和刷新间隔
- **错误处理**: 完善的错误处理和传播机制
- **两种模式**: 标准批处理和去重批处理
- **同步/异步**: 支持同步和异步执行模式
- **遵循Go惯例**: 采用"谁写谁关闭"的通道管理原则
- **便捷API**: 新增 Start() 和 Run() 方法，减少样板代码
- **动态调参**: 支持运行时安全调整关键参数
- **优雅关闭**: 支持取消时的限时收尾和最终flush超时保护

## 📋 系统要求

- Go 1.20+ (支持泛型)
- 支持 Linux、macOS、Windows

## 📦 安装

```bash
go get github.com/rushairer/go-pipeline/v2@latest
```

## 🏗️ 架构设计

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Data Input    │───▶│   Buffer Channel │───▶│  Batch Processor│
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                       ┌──────────────────┐    ┌─────────────────┐
                       │   Timer Ticker   │    │   Flush Handler │
                       └──────────────────┘    └─────────────────┘
                                │                        │
                                └────────┬───────────────┘
                                         ▼
                                ┌─────────────────┐
                                │  Error Channel  │
                                └─────────────────┘
```

## 📦 核心组件

### 接口定义

- **`PipelineChannel[T]`**: 定义管道通道访问接口
- **`Performer`**: 定义执行管道操作的接口
- **`DataProcessor[T]`**: 定义批处理数据的核心接口
- **`Pipeline[T]`**: 组合所有管道功能的通用接口

### 实现类型

- **`StandardPipeline[T]`**: 标准批处理管道，数据按顺序批处理
- **`DeduplicationPipeline[T]`**: 去重批处理管道，基于唯一键去重
- **`PipelineImpl[T]`**: 通用管道实现，提供基础功能

## 💡 快速开始

### 使用便捷API（推荐）

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
    // 创建标准管道
    pipeline := gopipeline.NewDefaultStandardPipeline(
        func(ctx context.Context, batchData []int) error {
            fmt.Printf("处理批次数据: %v\n", batchData)
            return nil
        },
    )
    
    ctx, cancel := context.WithTimeout(context.Background(), time.Second*10)
    defer cancel()
    
    // 使用便捷API启动
    done, errs := pipeline.Start(ctx)
    
    // 监听错误
    go func() {
        for err := range errs {
            log.Printf("处理错误: %v", err)
        }
    }()
    
    // 添加数据
    dataChan := pipeline.DataChan()
    go func() {
        defer close(dataChan) // 谁写谁关闭
        for i := 0; i < 100; i++ {
            select {
            case dataChan <- i:
            case <-ctx.Done():
                return
            }
        }
    }()
    
    // 等待处理完成
    <-done
}
```

### 同步运行示例

```go
func syncExample() {
    pipeline := gopipeline.NewDefaultStandardPipeline(
        func(ctx context.Context, batchData []int) error {
            fmt.Printf("处理批次数据: %v\n", batchData)
            return nil
        },
    )
    
    ctx, cancel := context.WithTimeout(context.Background(), time.Second*10)
    defer cancel()
    
    // 同步运行，设置错误通道容量为128
    if err := pipeline.Run(ctx, 128); err != nil {
        log.Printf("管道执行错误: %v", err)
    }
}
```

## 📋 配置参数

```go
type PipelineConfig struct {
    BufferSize               uint32        // 缓冲通道的容量 (默认: 100)
    FlushSize                uint32        // 批处理数据的最大容量 (默认: 50)
    FlushInterval            time.Duration // 定时刷新的时间间隔 (默认: 50ms)
    DrainOnCancel            bool          // 取消时是否进行限时收尾刷新（默认 false）
    DrainGracePeriod         time.Duration // 收尾刷新最长时间窗口
    FinalFlushOnCloseTimeout time.Duration // 通道关闭路径的最终 flush 超时（0 表示禁用）
    MaxConcurrentFlushes     uint32        // 异步 flush 的最大并发数（0 表示不限制）
}
```

### 🎯 性能优化的默认值

基于性能基准测试，v2.2.2 版本采用了优化的默认配置：

- **BufferSize: 100** - 缓冲区大小，应该 >= FlushSize * 2 以避免阻塞
- **FlushSize: 50** - 批处理大小，性能测试显示 50 左右为最优
- **FlushInterval: 50ms** - 刷新间隔，平衡延迟和吞吐量

### 🔧 便捷配置方法

```go
// 使用链式方法创建配置
config := gopipeline.NewPipelineConfig().
    WithFlushInterval(time.Millisecond * 10).
    WithBufferSize(200).
    WithDrainOnCancel(true).
    WithDrainGracePeriod(150 * time.Millisecond)

pipeline := gopipeline.NewStandardPipeline(config, flushFunc)
```

## 下一步

- [标准管道](./standard-pipeline) - 了解标准批处理管道的使用
- [去重管道](./deduplication-pipeline) - 了解去重批处理管道的使用
- [配置指南](./configuration) - 详细的配置参数说明
- [API 参考](./api-reference) - 完整的API文档