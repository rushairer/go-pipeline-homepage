---
sidebar_position: 5
---

# API Reference

This document provides complete API reference for Go Pipeline v2.

## Core Interfaces

### Pipeline[T any]

Main pipeline interface that combines all pipeline functionality.

```go
type Pipeline[T any] interface {
    PipelineChannel[T]
    Performer[T]
    DataProcessor[T]
}
```

### PipelineChannel[T any]

Defines pipeline channel access interface.

```go
type PipelineChannel[T any] interface {
    // DataChan returns a writable channel for adding data to the pipeline
    DataChan() chan<- T
    
    // ErrorChan returns a read-only channel for receiving error information from the pipeline
    ErrorChan(size int) <-chan error
}
```

#### DataChan()

Returns data input channel.

**Return Value**: `chan<- T` - Write-only channel for adding data

**Usage Example**:
```go
dataChan := pipeline.DataChan()
dataChan <- "some data"
close(dataChan) // Close channel when done
```

#### ErrorChan(size int)

Returns error output channel.

**Parameters**:
- `size int` - Buffer size of error channel

**Return Value**: `<-chan error` - Read-only channel for receiving errors

**Usage Example**:
```go
errorChan := pipeline.ErrorChan(10)
go func() {
    for err := range errorChan {
        log.Printf("Pipeline error: %v", err)
    }
}()
```

### Performer[T any]

Defines interface for executing pipeline operations.

```go
type Performer[T any] interface {
    // AsyncPerform executes pipeline operations asynchronously
    AsyncPerform(ctx context.Context) error
    
    // SyncPerform executes pipeline operations synchronously
    SyncPerform(ctx context.Context) error
}
```

#### AsyncPerform(ctx context.Context)

Executes pipeline operations asynchronously, doesn't block calling thread.

**Parameters**:
- `ctx context.Context` - Context object for controlling operation lifecycle

**Return Value**: `error` - Returns error if ctx is canceled

**Usage Example**:
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

Executes pipeline operations synchronously, blocks until completion or cancellation.

**Parameters**:
- `ctx context.Context` - Context object

**Return Value**: `error` - Execution error or cancellation error

**Usage Example**:
```go
ctx, cancel := context.WithTimeout(context.Background(), time.Minute)
defer cancel()

if err := pipeline.SyncPerform(ctx); err != nil {
    log.Printf("Pipeline execution error: %v", err)
}
```

### DataProcessor[T any]

Defines core interface for batch processing data (mainly for internal implementation).

```go
type DataProcessor[T any] interface {
    initBatchData() any
    addToBatch(batchData any, data T) any
    flush(ctx context.Context, batchData any) error
    isBatchFull(batchData any) bool
    isBatchEmpty(batchData any) bool
}
```

## Configuration Types

### PipelineConfig

Pipeline configuration struct.

```go
type PipelineConfig struct {
    BufferSize    uint32        // Buffer channel capacity (default: 100)
    FlushSize     uint32        // Maximum capacity of batch processing data (default: 50)
    FlushInterval time.Duration // Time interval for timed refresh (default: 50ms)
}
```

**Field Descriptions**:
- `BufferSize`: Buffer size of internal data channel
- `FlushSize`: Maximum amount of data per batch processing
- `FlushInterval`: Time interval for triggering batch processing

## Standard Pipeline API

### Type Definitions

```go
type FlushStandardFunc[T any] func(ctx context.Context, batchData []T) error

type StandardPipeline[T any] struct {
    *PipelineImpl[T]
    flushFunc FlushStandardFunc[T]
}
```

### Constructors

#### NewDefaultStandardPipeline[T any]

Creates standard pipeline with default configuration.

```go
func NewDefaultStandardPipeline[T any](
    flushFunc FlushStandardFunc[T],
) *StandardPipeline[T]
```

**Parameters**:
- `flushFunc FlushStandardFunc[T]` - Batch processing function

**Return Value**: `*StandardPipeline[T]` - Standard pipeline instance

**Usage Example**:
```go
pipeline := gopipeline.NewDefaultStandardPipeline(
    func(ctx context.Context, batchData []string) error {
        fmt.Printf("Processing %d items: %v\n", len(batchData), batchData)
        return nil
    },
)
```

#### NewStandardPipeline[T any]

Creates standard pipeline with custom configuration.

```go
func NewStandardPipeline[T any](
    config PipelineConfig,
    flushFunc FlushStandardFunc[T],
) *StandardPipeline[T]
```

**Parameters**:
- `config PipelineConfig` - Custom configuration
- `flushFunc FlushStandardFunc[T]` - Batch processing function

**Return Value**: `*StandardPipeline[T]` - Standard pipeline instance

**Usage Example**:
```go
standardConfig := gopipeline.PipelineConfig{
    BufferSize:    200,
    FlushSize:     100,
    FlushInterval: time.Millisecond * 100,
}

pipeline := gopipeline.NewStandardPipeline(standardConfig,
    func(ctx context.Context, batchData []string) error {
        return processData(batchData)
    },
)
```

## Deduplication Pipeline API

### Type Definitions

```go
type KeyFunc[T any] func(T) string
type FlushDeduplicationFunc[T any] func(ctx context.Context, batchData []T) error

type DeduplicationPipeline[T any] struct {
    *PipelineImpl[T]
    keyFunc   KeyFunc[T]
    flushFunc FlushDeduplicationFunc[T]
}
```

### Constructors

#### NewDefaultDeduplicationPipeline[T any]

Creates deduplication pipeline with default configuration.

```go
func NewDefaultDeduplicationPipeline[T any](
    keyFunc KeyFunc[T],
    flushFunc FlushDeduplicationFunc[T],
) *DeduplicationPipeline[T]
```

**Parameters**:
- `keyFunc KeyFunc[T]` - Unique key generation function
- `flushFunc FlushDeduplicationFunc[T]` - Batch processing function

**Return Value**: `*DeduplicationPipeline[T]` - Deduplication pipeline instance

**Usage Example**:
```go
pipeline := gopipeline.NewDefaultDeduplicationPipeline(
    func(user User) string {
        return user.Email // Use email as unique key
    },
    func(ctx context.Context, users []User) error {
        return processUsers(users)
    },
)
```

#### NewDeduplicationPipeline[T any]

Creates deduplication pipeline with custom configuration.

```go
func NewDeduplicationPipeline[T any](
    config PipelineConfig,
    keyFunc KeyFunc[T],
    flushFunc FlushDeduplicationFunc[T],
) *DeduplicationPipeline[T]
```

**Parameters**:
- `config PipelineConfig` - Custom configuration
- `keyFunc KeyFunc[T]` - Unique key generation function
- `flushFunc FlushDeduplicationFunc[T]` - Batch processing function

**Return Value**: `*DeduplicationPipeline[T]` - Deduplication pipeline instance

**Usage Example**:
```go
deduplicationConfig := gopipeline.PipelineConfig{
    BufferSize:    100,
    FlushSize:     50,
    FlushInterval: time.Millisecond * 100,
}

pipeline := gopipeline.NewDeduplicationPipeline(deduplicationConfig,
    func(product Product) string {
        return fmt.Sprintf("%s-%s", product.SKU, product.Version)
    },
    func(ctx context.Context, products []Product) error {
        return updateProducts(products)
    },
)
```

## Error Types

### PipelineError

Base type for pipeline-related errors.

```go
type PipelineError struct {
    Op  string // Operation name
    Err error  // Original error
}

func (e *PipelineError) Error() string {
    return fmt.Sprintf("pipeline %s: %v", e.Op, e.Err)
}

func (e *PipelineError) Unwrap() error {
    return e.Err
}
```

### Common Errors

- `ErrPipelineClosed`: Pipeline is closed
- `ErrContextCanceled`: Context was canceled
- `ErrFlushTimeout`: Flush operation timeout

## Usage Patterns

### Basic Usage Pattern

```go
// 1. Create pipeline
pipeline := gopipeline.NewDefaultStandardPipeline(flushFunc)

// 2. Start async processing
ctx, cancel := context.WithCancel(context.Background())
defer cancel()

go func() {
    if err := pipeline.AsyncPerform(ctx); err != nil {
        log.Printf("Pipeline error: %v", err)
    }
}()

// 3. Listen for errors
go func() {
    for err := range pipeline.ErrorChan(10) {
        log.Printf("Processing error: %v", err)
    }
}()

// 4. Add data
dataChan := pipeline.DataChan()
for _, data := range inputData {
    dataChan <- data
}

// 5. Close and wait for completion
close(dataChan)
time.Sleep(time.Second) // Wait for processing to complete
```

### Graceful Shutdown Pattern

```go
func gracefulShutdown(pipeline Pipeline[Data]) {
    // 1. Stop adding new data
    close(pipeline.DataChan())
    
    // 2. Wait for processing to complete
    ctx, cancel := context.WithTimeout(context.Background(), time.Second*30)
    defer cancel()
    
    done := make(chan struct{})
    go func() {
        defer close(done)
        // Wait for error channel to close (indicates processing complete)
        for range pipeline.ErrorChan(1) {
            // Consume remaining errors
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

### Error Handling Pattern

```go
func handlePipelineErrors(pipeline Pipeline[Data]) {
    errorChan := pipeline.ErrorChan(100)
    
    for err := range errorChan {
        switch e := err.(type) {
        case *PipelineError:
            log.Printf("Pipeline operation %s failed: %v", e.Op, e.Err)
            
        case *net.OpError:
            log.Printf("Network error: %v", e)
            // May need retry or fallback processing
            
        default:
            log.Printf("Unknown error: %v", err)
        }
    }
}
```

## Performance Considerations

### Memory Usage

- Standard pipeline: Memory usage proportional to `BufferSize`
- Deduplication pipeline: Memory usage proportional to `FlushSize` (needs to store map)

### Concurrent Safety

- All public APIs are concurrency-safe
- Can write data from multiple goroutines simultaneously to `DataChan()`
- Error channel can be consumed by multiple goroutines

### Resource Cleanup

- Must consume error channel, otherwise may cause goroutine leaks
- Should close data channel when done
- Recommended to use context to control pipeline lifecycle

## Version Compatibility

Go Pipeline v2 requires:
- Go 1.18+ (generics support)
- Backward compatible with Go 1.18-1.21

## Next Steps

- [Standard Pipeline](./standard-pipeline) - Detailed standard pipeline usage guide
- [Deduplication Pipeline](./deduplication-pipeline) - Detailed deduplication pipeline usage guide
- [Configuration Guide](./configuration) - Detailed configuration parameter instructions