---
sidebar_position: 4
---

# API Reference

Complete API documentation for Go Pipeline v2.

## Core Interfaces

### PipelineChannel[T]

Defines pipeline channel access interface.

```go
type PipelineChannel[T any] interface {
    DataChan() chan<- T
    ErrorChan(capacity uint32) <-chan error
}
```

**Methods**:
- `DataChan()`: Returns write-only data channel
- `ErrorChan(capacity uint32)`: Returns read-only error channel with specified capacity

### Performer

Defines interface for executing pipeline operations.

```go
type Performer interface {
    AsyncPerform(ctx context.Context) error
}
```

**Methods**:
- `AsyncPerform(ctx context.Context)`: Start asynchronous pipeline execution

### DataProcessor[T]

Defines core interface for batch processing data.

```go
type DataProcessor[T any] interface {
    ProcessBatch(ctx context.Context, batchData []T) error
}
```

**Methods**:
- `ProcessBatch(ctx context.Context, batchData []T)`: Process batch data

### Pipeline[T]

Combines all pipeline functionality into a universal interface.

```go
type Pipeline[T any] interface {
    PipelineChannel[T]
    Performer
    DataProcessor[T]
    
    // Convenient API methods
    Start(ctx context.Context) (<-chan struct{}, <-chan error)
    Run(ctx context.Context, errorChanCapacity uint32) error
    
    // Dynamic parameter adjustment
    SetFlushSize(n uint32)
    SetFlushInterval(d time.Duration)
    SetMaxConcurrentFlushes(n uint32)
}
```

## Implementation Types

### StandardPipeline[T]

Standard batch processing pipeline, data is batch processed in order.

```go
type StandardPipeline[T any] struct {
    // Internal implementation details
}
```

**Constructor**:
```go
func NewStandardPipeline[T any](
    config PipelineConfig,
    flushFunc func(ctx context.Context, batchData []T) error,
) *StandardPipeline[T]
```

**Default Constructor**:
```go
func NewDefaultStandardPipeline[T any](
    flushFunc func(ctx context.Context, batchData []T) error,
) *StandardPipeline[T]
```

### DeduplicationPipeline[T, K]

Deduplication batch processing pipeline, deduplicates based on unique keys.

```go
type DeduplicationPipeline[T any, K comparable] struct {
    // Internal implementation details
}
```

**Constructor**:
```go
func NewDeduplicationPipeline[T any, K comparable](
    config PipelineConfig,
    keyFunc func(T) K,
    flushFunc func(ctx context.Context, batchData []T) error,
) *DeduplicationPipeline[T, K]
```

**Default Constructor**:
```go
func NewDefaultDeduplicationPipeline[T any, K comparable](
    keyFunc func(T) K,
    flushFunc func(ctx context.Context, batchData []T) error,
) *DeduplicationPipeline[T, K]
```

## Configuration

### PipelineConfig

Pipeline configuration structure.

```go
type PipelineConfig struct {
    BufferSize               uint32        // Buffer channel capacity (default: 100)
    FlushSize                uint32        // Maximum capacity for batch processing data (default: 50)
    FlushInterval            time.Duration // Time interval for timed refresh (default: 50ms)
    DrainOnCancel            bool          // Whether to perform limited-time cleanup flush on cancellation (default false)
    DrainGracePeriod         time.Duration // Maximum time window for cleanup flush
    FinalFlushOnCloseTimeout time.Duration // Final flush timeout for channel close path (0 means disabled)
    MaxConcurrentFlushes     uint32        // Maximum concurrent async flushes (0 means unlimited)
}
```

### Configuration Constructor

```go
func NewPipelineConfig() PipelineConfig
```

Returns a new configuration with optimized default values.

### Configuration Methods

```go
func (c PipelineConfig) WithBufferSize(size uint32) PipelineConfig
func (c PipelineConfig) WithFlushSize(size uint32) PipelineConfig
func (c PipelineConfig) WithFlushInterval(interval time.Duration) PipelineConfig
func (c PipelineConfig) WithDrainOnCancel(enabled bool) PipelineConfig
func (c PipelineConfig) WithDrainGracePeriod(d time.Duration) PipelineConfig
func (c PipelineConfig) WithFinalFlushOnCloseTimeout(d time.Duration) PipelineConfig
func (c PipelineConfig) WithMaxConcurrentFlushes(n uint32) PipelineConfig
```

## Method Details

### Start Method

Convenient API for asynchronous execution.

```go
func (p *Pipeline[T]) Start(ctx context.Context) (<-chan struct{}, <-chan error)
```

**Parameters**:
- `ctx`: Context for controlling pipeline lifecycle

**Returns**:
- `<-chan struct{}`: Done channel, closed when pipeline completes
- `<-chan error`: Error channel for receiving processing errors

**Usage Example**:
```go
pipeline := gopipeline.NewDefaultStandardPipeline(flushFunc)
done, errs := pipeline.Start(ctx)

// Listen for errors
go func() {
    for err := range errs {
        log.Printf("Processing error: %v", err)
    }
}()

// Add data
dataChan := pipeline.DataChan()
go func() {
    defer close(dataChan)
    for i := 0; i < 100; i++ {
        dataChan <- i
    }
}()

// Wait for completion
<-done
```

### Run Method

Convenient API for synchronous execution.

```go
func (p *Pipeline[T]) Run(ctx context.Context, errorChanCapacity uint32) error
```

**Parameters**:
- `ctx`: Context for controlling pipeline lifecycle
- `errorChanCapacity`: Error channel capacity

**Returns**:
- `error`: First error encountered during execution, or nil if successful

**Usage Example**:
```go
pipeline := gopipeline.NewDefaultStandardPipeline(flushFunc)

// Add data
dataChan := pipeline.DataChan()
go func() {
    defer close(dataChan)
    for i := 0; i < 100; i++ {
        dataChan <- i
    }
}()

// Synchronous execution
if err := pipeline.Run(ctx, 128); err != nil {
    log.Printf("Pipeline execution error: %v", err)
}
```

### AsyncPerform Method

Traditional asynchronous execution API.

```go
func (p *Pipeline[T]) AsyncPerform(ctx context.Context) error
```

**Parameters**:
- `ctx`: Context for controlling pipeline lifecycle

**Returns**:
- `error`: Error if startup fails

**Usage Example**:
```go
pipeline := gopipeline.NewDefaultStandardPipeline(flushFunc)

// Start pipeline
if err := pipeline.AsyncPerform(ctx); err != nil {
    log.Fatalf("Failed to start pipeline: %v", err)
}

// Handle errors
go func() {
    for err := range pipeline.ErrorChan(100) {
        log.Printf("Processing error: %v", err)
    }
}()

// Add data
dataChan := pipeline.DataChan()
for i := 0; i < 100; i++ {
    dataChan <- i
}
close(dataChan)
```

### Dynamic Parameter Adjustment

#### SetFlushSize

Dynamically adjust batch size at runtime.

```go
func (p *Pipeline[T]) SetFlushSize(n uint32)
```

**Parameters**:
- `n`: New batch size

**Notes**:
- Changes do not affect batches currently being built
- Thread-safe operation

#### SetFlushInterval

Dynamically adjust flush interval at runtime.

```go
func (p *Pipeline[T]) SetFlushInterval(d time.Duration)
```

**Parameters**:
- `d`: New flush interval

**Notes**:
- Changes take effect on next timer reset
- Thread-safe operation

#### SetMaxConcurrentFlushes

Dynamically adjust maximum concurrent flushes at runtime.

```go
func (p *Pipeline[T]) SetMaxConcurrentFlushes(n uint32)
```

**Parameters**:
- `n`: Maximum concurrent flushes (0 means unlimited)

**Notes**:
- Changes take effect immediately
- Thread-safe operation

## Usage Patterns

### Basic Usage Pattern

```go
// 1. Create pipeline
pipeline := gopipeline.NewDefaultStandardPipeline(
    func(ctx context.Context, batchData []int) error {
        // Process batch data
        fmt.Printf("Processing %d items: %v\n", len(batchData), batchData)
        return nil
    },
)

// 2. Start pipeline
ctx, cancel := context.WithTimeout(context.Background(), time.Second*10)
defer cancel()

done, errs := pipeline.Start(ctx)

// 3. Handle errors
go func() {
    for err := range errs {
        log.Printf("Error: %v", err)
    }
}()

// 4. Add data
dataChan := pipeline.DataChan()
go func() {
    defer close(dataChan) // Who writes, who closes
    for i := 0; i < 100; i++ {
        select {
        case dataChan <- i:
        case <-ctx.Done():
            return
        }
    }
}()

// 5. Wait for completion
<-done
```

### Custom Configuration Pattern

```go
// Create custom configuration
config := gopipeline.NewPipelineConfig().
    WithBufferSize(200).
    WithFlushSize(100).
    WithFlushInterval(time.Millisecond * 100).
    WithDrainOnCancel(true).
    WithDrainGracePeriod(time.Second * 5)

// Create pipeline with custom configuration
pipeline := gopipeline.NewStandardPipeline(config, flushFunc)

// Use pipeline...
```

### Deduplication Pattern

```go
type User struct {
    ID   int
    Name string
}

// Create deduplication pipeline
pipeline := gopipeline.NewDefaultDeduplicationPipeline(
    func(user User) int { return user.ID }, // Key function
    func(ctx context.Context, users []User) error {
        // Process deduplicated users
        fmt.Printf("Processing %d unique users\n", len(users))
        return nil
    },
)

// Use pipeline...
```

### Error Handling Pattern

```go
pipeline := gopipeline.NewDefaultStandardPipeline(flushFunc)

// Start pipeline
done, errs := pipeline.Start(ctx)

// Comprehensive error handling
go func() {
    for err := range errs {
        // Log error
        log.Printf("Pipeline error: %v", err)
        
        // Implement retry logic or alerting
        if isRetryableError(err) {
            // Implement retry logic
        } else {
            // Send alert
            sendAlert(err)
        }
    }
}()

// Add data and wait for completion
// ...
```

### Dynamic Adjustment Pattern

```go
pipeline := gopipeline.NewDefaultStandardPipeline(flushFunc)

// Start monitoring and adjustment goroutine
go func() {
    ticker := time.NewTicker(time.Second * 30)
    defer ticker.Stop()
    
    for range ticker.C {
        load := getSystemLoad()
        memUsage := getMemoryUsage()
        
        switch {
        case load > 0.8:
            // High load: reduce batch size, increase frequency
            pipeline.SetFlushSize(25)
            pipeline.SetFlushInterval(25 * time.Millisecond)
            
        case memUsage > 0.7:
            // High memory usage: reduce batch size
            pipeline.SetFlushSize(30)
            pipeline.SetFlushInterval(50 * time.Millisecond)
            
        default:
            // Normal situation: use standard configuration
            pipeline.SetFlushSize(50)
            pipeline.SetFlushInterval(50 * time.Millisecond)
        }
    }
}()

// Use pipeline...
```

## Error Types

### Common Error Scenarios

1. **Context Cancellation**: When context is cancelled during processing
2. **Flush Function Errors**: Errors returned by user-provided flush function
3. **Channel Closure**: Errors related to improper channel management
4. **Configuration Errors**: Invalid configuration parameters

### Error Handling Best Practices

```go
func handlePipelineError(err error) {
    switch {
    case errors.Is(err, context.Canceled):
        log.Println("Pipeline cancelled")
    case errors.Is(err, context.DeadlineExceeded):
        log.Println("Pipeline timeout")
    default:
        log.Printf("Pipeline error: %v", err)
    }
}
```

## Performance Considerations

### Memory Usage

- **BufferSize**: Affects memory usage of internal channels
- **FlushSize**: Affects memory usage of batch data
- **Error Channel**: Unbounded error channels can cause memory leaks

### CPU Usage

- **FlushInterval**: Too small intervals increase CPU usage
- **MaxConcurrentFlushes**: Balance between parallelism and resource usage

### Throughput Optimization

```go
// High throughput configuration
config := gopipeline.NewPipelineConfig().
    WithBufferSize(1000).
    WithFlushSize(200).
    WithFlushInterval(time.Millisecond * 200).
    WithMaxConcurrentFlushes(10)
```

### Latency Optimization

```go
// Low latency configuration
config := gopipeline.NewPipelineConfig().
    WithBufferSize(50).
    WithFlushSize(10).
    WithFlushInterval(time.Millisecond * 10).
    WithMaxConcurrentFlushes(1)
```

## Thread Safety

All pipeline operations are thread-safe:

- **Data Channel**: Safe for concurrent writes
- **Error Channel**: Safe for concurrent reads
- **Dynamic Adjustments**: All SetXxx methods are thread-safe
- **Pipeline Methods**: All public methods are thread-safe

## Lifecycle Management

### Startup Sequence

1. Create pipeline with configuration
2. Start pipeline using `Start()` or `AsyncPerform()`
3. Set up error handling
4. Begin data production

### Shutdown Sequence

1. Stop data production
2. Close data channel (following "who writes, who closes" principle)
3. Wait for pipeline completion
4. Handle any remaining errors

### Graceful Shutdown

```go
// Enable graceful shutdown
config := gopipeline.NewPipelineConfig().
    WithDrainOnCancel(true).
    WithDrainGracePeriod(time.Second * 5).
    WithFinalFlushOnCloseTimeout(time.Second * 10)

pipeline := gopipeline.NewStandardPipeline(config, flushFunc)

// Use context with timeout for controlled shutdown
ctx, cancel := context.WithTimeout(context.Background(), time.Minute)
defer cancel()

done, errs := pipeline.Start(ctx)

// Handle shutdown signal
c := make(chan os.Signal, 1)
signal.Notify(c, os.Interrupt, syscall.SIGTERM)

select {
case <-c:
    log.Println("Received shutdown signal, initiating graceful shutdown...")
    cancel() // This will trigger drain if DrainOnCancel is true
case <-done:
    log.Println("Pipeline completed normally")
}
```

## Migration Guide

### From v1 to v2

Key changes when migrating from v1:

1. **Generic Support**: Update type declarations to use generics
2. **New Configuration**: Use new `PipelineConfig` structure
3. **Convenient API**: Consider using new `Start()` and `Run()` methods
4. **Dynamic Adjustment**: Utilize new runtime parameter adjustment features

### Example Migration

**v1 Code**:
```go
// v1 style (pseudo-code)
pipeline := oldpipeline.New(config, flushFunc)
pipeline.Start()
```

**v2 Code**:
```go
// v2 style
pipeline := gopipeline.NewDefaultStandardPipeline(flushFunc)
done, errs := pipeline.Start(ctx)
```

## Debugging and Monitoring

### Enable Debug Logging

```go
// Add debug logging to flush function
flushFunc := func(ctx context.Context, batchData []Data) error {
    log.Printf("Processing batch of %d items", len(batchData))
    
    start := time.Now()
    err := actualProcessing(batchData)
    duration := time.Since(start)
    
    log.Printf("Batch processing took %v", duration)
    return err
}
```

### Metrics Collection

```go
type PipelineMetrics struct {
    TotalBatches    int64
    TotalItems      int64
    TotalErrors     int64
    AverageLatency  time.Duration
    LastBatchSize   int
}

func collectMetrics(pipeline Pipeline[Data]) PipelineMetrics {
    // Implement metrics collection logic
    return PipelineMetrics{}
}
```

## Best Practices Summary

1. **Use Default Configuration**: Start with defaults and adjust as needed
2. **Handle Errors**: Always consume error channel to prevent goroutine leaks
3. **Follow Channel Rules**: "Who writes, who closes" principle
4. **Monitor Performance**: Track key metrics and adjust configuration
5. **Graceful Shutdown**: Use context cancellation and drain settings
6. **Test Under Load**: Validate configuration with realistic workloads
7. **Document Configuration**: Record configuration choices and test results