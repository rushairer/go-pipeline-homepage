---
sidebar_position: 5
---

# API Reference

Complete API reference for Go Pipeline v2, including all types, functions, and configuration options.

## Core Types

### PipelineConfig

Configuration structure for pipeline behavior.

```go
type PipelineConfig struct {
    BufferSize    int           // Internal channel buffer size
    FlushSize     int           // Batch size for processing
    FlushInterval time.Duration // Maximum wait time before processing
}
```

**Methods**:

#### NewPipelineConfig()

Creates a new configuration with default values.

**Signature**: `func NewPipelineConfig() *PipelineConfig`

**Returns**: `*PipelineConfig` with default settings

**Usage example**:
```go
config := gopipeline.NewPipelineConfig()
```

#### SetBufferSize(size int)

Sets the internal buffer size.

**Parameters**:
- `size`: Buffer size (10-10000)

**Returns**: `*PipelineConfig` for method chaining

**Usage example**:
```go
config := gopipeline.NewPipelineConfig().SetBufferSize(500)
```

#### SetFlushSize(size int)

Sets the batch size for processing.

**Parameters**:
- `size`: Batch size (1-1000)

**Returns**: `*PipelineConfig` for method chaining

**Usage example**:
```go
config := gopipeline.NewPipelineConfig().SetFlushSize(100)
```

#### SetFlushInterval(interval time.Duration)

Sets the maximum wait time before processing.

**Parameters**:
- `interval`: Time duration (1ms-60s)

**Returns**: `*PipelineConfig` for method chaining

**Usage example**:
```go
config := gopipeline.NewPipelineConfig().SetFlushInterval(time.Second)
```

### StandardPipeline[T]

Generic pipeline for batch processing.

```go
type StandardPipeline[T any] struct {
    // Internal fields
}
```

**Type Parameters**:
- `T`: Type of items to process

### DeduplicationPipeline[T]

Pipeline with built-in deduplication capabilities.

```go
type DeduplicationPipeline[T any] struct {
    // Internal fields
}
```

**Type Parameters**:
- `T`: Type of items to process

## Constructor Functions

### NewStandardPipeline[T]

Creates a new standard pipeline.

**Signature**: 
```go
func NewStandardPipeline[T any](
    config *PipelineConfig,
    processor func(context.Context, []T) error,
) *StandardPipeline[T]
```

**Parameters**:
- `config`: Pipeline configuration
- `processor`: Function to process batches

**Returns**: `*StandardPipeline[T]` instance

**Usage example**:
```go
standardConfig := gopipeline.NewPipelineConfig().
    SetBufferSize(200).
    SetFlushSize(50)

pipeline := gopipeline.NewStandardPipeline(standardConfig,
    func(ctx context.Context, items []string) error {
        return processItems(items)
    },
)
```

### NewDeduplicationPipeline[T]

Creates a new deduplication pipeline.

**Signature**: 
```go
func NewDeduplicationPipeline[T any](
    config *PipelineConfig,
    processor func(context.Context, []T) error,
    keyExtractor func(T) string,
) *DeduplicationPipeline[T]
```

**Parameters**:
- `config`: Pipeline configuration
- `processor`: Function to process batches
- `keyExtractor`: Function to extract deduplication key

**Returns**: `*DeduplicationPipeline[T]` instance

**Usage example**:
```go
dedupConfig := gopipeline.NewPipelineConfig().
    SetBufferSize(300).
    SetFlushSize(75)

pipeline := gopipeline.NewDeduplicationPipeline(dedupConfig,
    func(ctx context.Context, users []User) error {
        return saveUsers(users)
    },
    func(user User) string {
        return user.Email
    },
)
```

## Pipeline Methods

### Start(ctx context.Context)

Starts the pipeline processing.

**Parameters**:
- `ctx`: Context for cancellation and timeouts

**Returns**: `error` if startup fails

**Usage example**:
```go
ctx := context.Background()
if err := pipeline.Start(ctx); err != nil {
    log.Fatal(err)
}
```

### Stop()

Stops the pipeline and processes remaining items.

**Usage example**:
```go
defer pipeline.Stop()
```

### Add(item T)

Adds an item to the pipeline for processing.

**Parameters**:
- `item`: Item to add to the pipeline

**Usage example**:
```go
pipeline.Add("data item")
pipeline.Add(User{ID: 1, Name: "Alice"})
```

### AddBatch(items []T)

Adds multiple items to the pipeline at once.

**Parameters**:
- `items`: Slice of items to add

**Usage example**:
```go
items := []string{"item1", "item2", "item3"}
pipeline.AddBatch(items)
```

### GetStats()

Returns current pipeline statistics.

**Returns**: `PipelineStats` structure

**Usage example**:
```go
stats := pipeline.GetStats()
fmt.Printf("Processed: %d, Errors: %d", stats.ProcessedCount, stats.ErrorCount)
```

## Statistics Types

### PipelineStats

Contains pipeline performance metrics.

```go
type PipelineStats struct {
    ProcessedCount   int64         // Total items processed
    ErrorCount       int64         // Total processing errors
    AverageLatency   time.Duration // Average processing latency
    Throughput       float64       // Items per second
    BufferUtilization float64      // Buffer usage percentage
    LastProcessedAt  time.Time     // Last processing timestamp
}
```

### DeduplicationStats

Extended statistics for deduplication pipelines.

```go
type DeduplicationStats struct {
    PipelineStats                 // Embedded base stats
    UniqueItemCount    int64      // Unique items in current batch
    DuplicateCount     int64      // Total duplicates filtered
    DeduplicationRatio float64    // Percentage of duplicates
    EstimatedMemoryKB  int64      // Estimated memory usage
}
```

## Processor Function Types

### ProcessorFunc[T]

Standard processor function signature.

```go
type ProcessorFunc[T any] func(context.Context, []T) error
```

**Parameters**:
- `context.Context`: Context for cancellation and timeouts
- `[]T`: Batch of items to process

**Returns**: `error` if processing fails

### KeyExtractorFunc[T]

Key extraction function for deduplication.

```go
type KeyExtractorFunc[T any] func(T) string
```

**Parameters**:
- `T`: Item to extract key from

**Returns**: `string` unique identifier for the item

## Error Types

### PipelineError

Base error type for pipeline operations.

```go
type PipelineError struct {
    Op      string // Operation that failed
    Message string // Error message
    Cause   error  // Underlying error
}

func (e *PipelineError) Error() string
func (e *PipelineError) Unwrap() error
```

### ProcessingError

Error during batch processing.

```go
type ProcessingError struct {
    PipelineError
    BatchSize int   // Size of failed batch
    ItemCount int64 // Total items in batch
}
```

### ConfigurationError

Error in pipeline configuration.

```go
type ConfigurationError struct {
    PipelineError
    Field string      // Configuration field
    Value interface{} // Invalid value
}
```

## Configuration Validation

### Validate()

Validates and adjusts configuration parameters.

**Returns**: `*PipelineConfig` with validated values

**Usage example**:
```go
config := gopipeline.NewPipelineConfig().
    SetBufferSize(0) // Invalid value

validConfig := config.Validate() // Adjusts to minimum valid value
```

### IsValid()

Checks if configuration is valid.

**Returns**: `bool` indicating validity

**Usage example**:
```go
if !config.IsValid() {
    log.Fatal("Invalid configuration")
}
```

## Context Integration

### WithTimeout

Use context with timeout for processing.

**Usage example**:
```go
func processorWithTimeout(ctx context.Context, items []DataItem) error {
    processCtx, cancel := context.WithTimeout(ctx, time.Second*30)
    defer cancel()
    
    return processItems(processCtx, items)
}
```

### WithCancel

Use context with cancellation.

**Usage example**:
```go
ctx, cancel := context.WithCancel(context.Background())
defer cancel()

go func() {
    <-shutdownSignal
    cancel() // Cancel processing
}()

pipeline.Start(ctx)
```

## Advanced Configuration

### Custom Buffer Strategies

```go
// High-throughput configuration
highThroughputConfig := gopipeline.NewPipelineConfig().
    SetBufferSize(2000).
    SetFlushSize(500).
    SetFlushInterval(time.Second * 5)

// Low-latency configuration
lowLatencyConfig := gopipeline.NewPipelineConfig().
    SetBufferSize(50).
    SetFlushSize(10).
    SetFlushInterval(time.Millisecond * 10)

// Memory-optimized configuration
memoryOptimizedConfig := gopipeline.NewPipelineConfig().
    SetBufferSize(100).
    SetFlushSize(25).
    SetFlushInterval(time.Millisecond * 100)
```

## Thread Safety

All pipeline operations are thread-safe:

- `Add()` and `AddBatch()` can be called from multiple goroutines
- `GetStats()` provides consistent snapshots
- `Start()` and `Stop()` are safe to call multiple times

**Usage example**:
```go
// Safe concurrent usage
go func() {
    for i := 0; i < 1000; i++ {
        pipeline.Add(fmt.Sprintf("item-%d", i))
    }
}()

go func() {
    for i := 1000; i < 2000; i++ {
        pipeline.Add(fmt.Sprintf("item-%d", i))
    }
}()
```

## Performance Considerations

### Memory Usage

- Standard Pipeline: O(BufferSize + FlushSize)
- Deduplication Pipeline: O(BufferSize + FlushSize * UniqueRatio)

### CPU Usage

- Key extraction in deduplication pipelines affects performance
- Batch processing is more efficient than individual item processing
- Context switching overhead is minimized through batching

### Recommended Limits

- **BufferSize**: 10-10,000 (typically 100-1,000)
- **FlushSize**: 1-1,000 (typically 10-200)
- **FlushInterval**: 1ms-60s (typically 10ms-5s)

## Migration Guide

### From v1 to v2

```go
// v1 (deprecated)
pipeline := gopipeline.New(100, time.Second, processor)

// v2 (current)
config := gopipeline.NewPipelineConfig().
    SetBufferSize(100).
    SetFlushInterval(time.Second)
pipeline := gopipeline.NewStandardPipeline(config, processor)
```

### Configuration Changes

- `BufferSize` replaces `ChannelSize`
- `FlushSize` replaces `BatchSize`
- `FlushInterval` replaces `Timeout`
- Generic types provide better type safety