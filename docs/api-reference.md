---
sidebar_position: 5
---

# API 参考

本文档提供 Go Pipeline v2 的完整 API 参考。

## 核心接口

### Pipeline[T any]

主要的管道接口，组合了所有管道功能。

```go
type Pipeline[T any] interface {
    PipelineChannel[T]
    Performer[T]
    DataProcessor[T]
}
```

### PipelineChannel[T any]

定义管道通道访问接口。

```go
type PipelineChannel[T any] interface {
    // DataChan 返回一个可写的通道，用于将数据添加到管道中
    DataChan() chan<- T
    
    // ErrorChan 返回一个只读的通道，用于接收管道中的错误信息
    ErrorChan(size int) <-chan error
}
```

#### DataChan()

返回数据输入通道。

**返回值**: `chan<- T` - 只写通道，用于添加数据

**使用示例**:
```go
dataChan := pipeline.DataChan()
dataChan <- "some data"
close(dataChan) // 完成后关闭通道
```

#### ErrorChan(size int)

返回错误输出通道。

**参数**:
- `size int` - 错误通道的缓冲区大小

**返回值**: `<-chan error` - 只读通道，用于接收错误

**使用示例**:
```go
errorChan := pipeline.ErrorChan(10)
go func() {
    for err := range errorChan {
        log.Printf("Pipeline error: %v", err)
    }
}()
```

### Performer[T any]

定义执行管道操作的接口。

```go
type Performer[T any] interface {
    // AsyncPerform 异步执行管道操作
    AsyncPerform(ctx context.Context) error
    
    // SyncPerform 同步执行管道操作
    SyncPerform(ctx context.Context) error
}
```

#### AsyncPerform(ctx context.Context)

异步执行管道操作，不阻塞调用线程。

**参数**:
- `ctx context.Context` - 上下文对象，用于控制操作生命周期

**返回值**: `error` - 如果ctx被取消则返回error

**使用示例**:
```go
ctx, cancel := context.WithTimeout(context.Background(), time.Minute)
defer cancel()

go func() {
    if err := pipeline.AsyncPerform(ctx); err != nil {
        log.Printf("Pipeline execution error: %v", err)
    }
}()
```

#### SyncPerform(ctx context.Context)

同步执行管道操作，阻塞直到完成或取消。

**参数**:
- `ctx context.Context` - 上下文对象

**返回值**: `error` - 执行错误或取消错误

**使用示例**:
```go
ctx, cancel := context.WithTimeout(context.Background(), time.Minute)
defer cancel()

if err := pipeline.SyncPerform(ctx); err != nil {
    log.Printf("Pipeline execution error: %v", err)
}
```

### DataProcessor[T any]

定义批处理数据的核心接口（主要用于内部实现）。

```go
type DataProcessor[T any] interface {
    initBatchData() any
    addToBatch(batchData any, data T) any
    flush(ctx context.Context, batchData any) error
    isBatchFull(batchData any) bool
    isBatchEmpty(batchData any) bool
}
```

## 配置类型

### PipelineConfig

管道配置结构体。

```go
type PipelineConfig struct {
    BufferSize    uint32        // 缓冲通道的容量 (默认: 100)
    FlushSize     uint32        // 批处理数据的最大容量 (默认: 50)
    FlushInterval time.Duration // 定时刷新的时间间隔 (默认: 50ms)
}
```

**字段说明**:
- `BufferSize`: 内部数据通道的缓冲区大小
- `FlushSize`: 每次批处理的最大数据量
- `FlushInterval`: 定时触发批处理的时间间隔

## 标准管道 API

### 类型定义

```go
type FlushStandardFunc[T any] func(ctx context.Context, batchData []T) error

type StandardPipeline[T any] struct {
    *PipelineImpl[T]
    flushFunc FlushStandardFunc[T]
}
```

### 构造函数

#### NewDefaultStandardPipeline[T any]

使用默认配置创建标准管道。

```go
func NewDefaultStandardPipeline[T any](
    flushFunc FlushStandardFunc[T],
) *StandardPipeline[T]
```

**参数**:
- `flushFunc FlushStandardFunc[T]` - 批处理函数

**返回值**: `*StandardPipeline[T]` - 标准管道实例

**使用示例**:
```go
pipeline := gopipeline.NewDefaultStandardPipeline(
    func(ctx context.Context, batchData []string) error {
        fmt.Printf("Processing %d items: %v\n", len(batchData), batchData)
        return nil
    },
)
```

#### NewStandardPipeline[T any]

使用自定义配置创建标准管道。

```go
func NewStandardPipeline[T any](
    config PipelineConfig,
    flushFunc FlushStandardFunc[T],
) *StandardPipeline[T]
```

**参数**:
- `config PipelineConfig` - 自定义配置
- `flushFunc FlushStandardFunc[T]` - 批处理函数

**返回值**: `*StandardPipeline[T]` - 标准管道实例

**使用示例**:
```go
config := gopipeline.PipelineConfig{
    BufferSize:    200,
    FlushSize:     100,
    FlushInterval: time.Millisecond * 100,
}

pipeline := gopipeline.NewStandardPipeline(config,
    func(ctx context.Context, batchData []string) error {
        return processData(batchData)
    },
)
```

## 去重管道 API

### 类型定义

```go
type KeyFunc[T any] func(T) string
type FlushDeduplicationFunc[T any] func(ctx context.Context, batchData []T) error

type DeduplicationPipeline[T any] struct {
    *PipelineImpl[T]
    keyFunc   KeyFunc[T]
    flushFunc FlushDeduplicationFunc[T]
}
```

### 构造函数

#### NewDefaultDeduplicationPipeline[T any]

使用默认配置创建去重管道。

```go
func NewDefaultDeduplicationPipeline[T any](
    keyFunc KeyFunc[T],
    flushFunc FlushDeduplicationFunc[T],
) *DeduplicationPipeline[T]
```

**参数**:
- `keyFunc KeyFunc[T]` - 唯一键生成函数
- `flushFunc FlushDeduplicationFunc[T]` - 批处理函数

**返回值**: `*DeduplicationPipeline[T]` - 去重管道实例

**使用示例**:
```go
pipeline := gopipeline.NewDefaultDeduplicationPipeline(
    func(user User) string {
        return user.Email // 使用邮箱作为唯一键
    },
    func(ctx context.Context, users []User) error {
        return processUsers(users)
    },
)
```

#### NewDeduplicationPipeline[T any]

使用自定义配置创建去重管道。

```go
func NewDeduplicationPipeline[T any](
    config PipelineConfig,
    keyFunc KeyFunc[T],
    flushFunc FlushDeduplicationFunc[T],
) *DeduplicationPipeline[T]
```

**参数**:
- `config PipelineConfig` - 自定义配置
- `keyFunc KeyFunc[T]` - 唯一键生成函数
- `flushFunc FlushDeduplicationFunc[T]` - 批处理函数

**返回值**: `*DeduplicationPipeline[T]` - 去重管道实例

**使用示例**:
```go
config := gopipeline.PipelineConfig{
    FlushSize:     50,
    FlushInterval: time.Millisecond * 100,
}

pipeline := gopipeline.NewDeduplicationPipeline(config,
    func(product Product) string {
        return fmt.Sprintf("%s-%s", product.SKU, product.Version)
    },
    func(ctx context.Context, products []Product) error {
        return updateProducts(products)
    },
)
```

## 错误类型

### PipelineError

管道相关错误的基础类型。

```go
type PipelineError struct {
    Op  string // 操作名称
    Err error  // 原始错误
}

func (e *PipelineError) Error() string {
    return fmt.Sprintf("pipeline %s: %v", e.Op, e.Err)
}

func (e *PipelineError) Unwrap() error {
    return e.Err
}
```

### 常见错误

- `ErrPipelineClosed`: 管道已关闭
- `ErrContextCanceled`: 上下文被取消
- `ErrFlushTimeout`: 刷新操作超时

## 使用模式

### 基本使用模式

```go
// 1. 创建管道
pipeline := gopipeline.NewDefaultStandardPipeline(flushFunc)

// 2. 启动异步处理
ctx, cancel := context.WithCancel(context.Background())
defer cancel()

go func() {
    if err := pipeline.AsyncPerform(ctx); err != nil {
        log.Printf("Pipeline error: %v", err)
    }
}()

// 3. 监听错误
go func() {
    for err := range pipeline.ErrorChan(10) {
        log.Printf("Processing error: %v", err)
    }
}()

// 4. 添加数据
dataChan := pipeline.DataChan()
for _, data := range inputData {
    dataChan <- data
}

// 5. 关闭并等待完成
close(dataChan)
time.Sleep(time.Second) // 等待处理完成
```

### 优雅关闭模式

```go
func gracefulShutdown(pipeline Pipeline[Data]) {
    // 1. 停止添加新数据
    close(pipeline.DataChan())
    
    // 2. 等待处理完成
    ctx, cancel := context.WithTimeout(context.Background(), time.Second*30)
    defer cancel()
    
    done := make(chan struct{})
    go func() {
        defer close(done)
        // 等待错误通道关闭（表示处理完成）
        for range pipeline.ErrorChan(1) {
            // 消费剩余错误
        }
    }()
    
    select {
    case <-done:
        log.Println("Pipeline shutdown completed")
    case <-ctx.Done():
        log.Println("Pipeline shutdown timeout")
    }
}
```

### 错误处理模式

```go
func handlePipelineErrors(pipeline Pipeline[Data]) {
    errorChan := pipeline.ErrorChan(100)
    
    for err := range errorChan {
        switch e := err.(type) {
        case *PipelineError:
            log.Printf("Pipeline operation %s failed: %v", e.Op, e.Err)
            
        case *net.OpError:
            log.Printf("Network error: %v", e)
            // 可能需要重试或降级处理
            
        default:
            log.Printf("Unknown error: %v", err)
        }
    }
}
```

## 性能注意事项

### 内存使用

- 标准管道：内存使用与 `BufferSize` 成正比
- 去重管道：内存使用与 `FlushSize` 成正比（需要存储map）

### 并发安全

- 所有公共API都是并发安全的
- 可以从多个goroutine同时调用 `DataChan()` 写入数据
- 错误通道可以被多个goroutine消费

### 资源清理

- 必须消费错误通道，否则可能导致goroutine泄漏
- 使用完成后应该关闭数据通道
- 建议使用context控制管道生命周期

## 版本兼容性

Go Pipeline v2 要求：
- Go 1.18+ (泛型支持)
- 向后兼容 Go 1.18-1.21

## 下一步

- [标准管道](./standard-pipeline) - 标准管道详细使用指南
- [去重管道](./deduplication-pipeline) - 去重管道详细使用指南
- [配置指南](./configuration) - 配置参数详细说明