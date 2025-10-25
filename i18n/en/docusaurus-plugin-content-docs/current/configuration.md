---
sidebar_position: 4
---

# Configuration Guide

This document provides detailed information about Go Pipeline v2 configuration parameters and best practices.

## Configuration Structure

```go
type PipelineConfig struct {
    BufferSize               uint32        // Buffer channel capacity
    FlushSize                uint32        // Maximum capacity for batch processing data
    FlushInterval            time.Duration // Time interval for timed refresh
    DrainOnCancel            bool          // Whether to perform limited-time cleanup flush on cancellation (default false)
    DrainGracePeriod         time.Duration // Maximum time window for cleanup flush
    FinalFlushOnCloseTimeout time.Duration // Final flush timeout for channel close path (0 means disabled)
    MaxConcurrentFlushes     uint32        // Maximum concurrent async flushes (0 means unlimited)
}
```

## Default Configuration

Based on performance benchmarks, Go Pipeline v2 provides optimized default configuration:

```go
const (
    defaultBufferSize    = 100                   // Buffer size
    defaultFlushSize     = 50                    // Batch size
    defaultFlushInterval = time.Millisecond * 50 // Flush interval
)
```

### Using Default Configuration

You can use the `NewPipelineConfig()` function to create configuration with default values, then customize specific parameters:

```go
// Create configuration with default values
config := gopipeline.NewPipelineConfig()

// Use default values directly
pipeline := gopipeline.NewStandardPipeline(config, flushFunc)

// Or use chain methods to customize specific parameters
config = gopipeline.NewPipelineConfig().
    WithFlushInterval(time.Millisecond * 10).
    WithBufferSize(200)

pipeline = gopipeline.NewStandardPipeline(config, flushFunc)
```

Available configuration methods:
- `NewPipelineConfig()` - Create configuration with default values
- `WithBufferSize(size uint32)` - Set buffer size
- `WithFlushSize(size uint32)` - Set batch size
- `WithFlushInterval(interval time.Duration)` - Set flush interval
- `WithDrainOnCancel(enabled bool)` - Enable limited-time cleanup on cancellation
- `WithDrainGracePeriod(d time.Duration)` - Set maximum time window for cleanup flush
- `WithFinalFlushOnCloseTimeout(d time.Duration)` - Set final flush timeout for channel close path
- `WithMaxConcurrentFlushes(n uint32)` - Limit async flush concurrency (0 means unlimited)
- `ValidateOrDefault()` - Validate and fallback to safe defaults

## Configuration Parameter Details

### BufferSize (Buffer Size)

**Purpose**: Controls the buffer size of internal data channels

**Default**: 100

**Recommended Values**: 
- Should be >= FlushSize * 2 to avoid blocking
- Can be increased appropriately for high concurrency scenarios

```go
standardConfig := gopipeline.PipelineConfig{
    BufferSize:    200,                   // Recommended 2-4 times FlushSize
    FlushSize:     50,                    // Standard batch size
    FlushInterval: time.Millisecond * 50, // Standard flush interval
}
```

**Impact**:
- Too small: May cause write blocking
- Too large: Increases memory usage and delays shutdown time

### FlushSize (Batch Size)

**Purpose**: Controls the amount of data in each batch processing

**Default**: 50

**Recommended Values**:
- General scenarios: 20-100
- High throughput scenarios: 100-500
- Low latency scenarios: 10-50

```go
// Configuration examples for different scenarios
// High throughput scenario
highThroughputConfig := gopipeline.PipelineConfig{
    BufferSize:    400,                   // Buffer size 2x FlushSize
    FlushSize:     200,                   // Large batch processing
    FlushInterval: time.Millisecond * 100, // Moderate interval
}

// Low latency scenario
lowLatencyConfig := gopipeline.PipelineConfig{
    BufferSize:    50,                    // Small buffer
    FlushSize:     20,                    // Small batch processing
    FlushInterval: time.Millisecond * 10, // Short interval
}
```

**Impact**:
- Too small: Increases processing frequency, reduces throughput
- Too large: Increases latency and memory usage

### DrainOnCancel (Cancellation Cleanup)

**Purpose**: Controls whether to perform limited-time cleanup flush when context is cancelled

**Default**: false

**Recommended Values**: 
- Data integrity priority: true
- Fast stop priority: false

```go
// Configuration enabling cancellation cleanup
gracefulConfig := gopipeline.NewPipelineConfig().
    WithDrainOnCancel(true).
    WithDrainGracePeriod(150 * time.Millisecond)
```

### DrainGracePeriod (Cleanup Time Window)

**Purpose**: Maximum time window for cleanup flush when DrainOnCancel is enabled

**Default**: 100ms (internal default)

**Recommended Values**: 50-200ms

### FinalFlushOnCloseTimeout (Final Flush Timeout)

**Purpose**: Final flush timeout protection for channel close path

**Default**: 0 (disabled)

**Recommended Values**: 
- Enable protection: 150ms-1s
- Disable protection: 0

```go
// Enable final flush timeout protection
config := gopipeline.NewPipelineConfig().
    WithFinalFlushOnCloseTimeout(500 * time.Millisecond)
```

### MaxConcurrentFlushes (Concurrency Limit)

**Purpose**: Limits the maximum number of concurrent async flushes

**Default**: 0 (unlimited)

**Recommended Values**:
- CPU-intensive: Number of CPU cores
- IO-intensive: CPU cores * 2-4
- Unlimited: 0

```go
// Limit concurrent flush count
config := gopipeline.NewPipelineConfig().
    WithMaxConcurrentFlushes(uint32(runtime.NumCPU()))
```

### FlushInterval (Flush Interval)

**Purpose**: Controls the time interval for timed refresh

**Default**: 50ms

**Recommended Values**:
- Low latency scenarios: 10-50ms
- Balanced scenarios: 50-200ms
- High throughput scenarios: 200ms-1s

```go
// Configuration examples for different scenarios
// Low latency scenario
lowLatencyConfig := gopipeline.PipelineConfig{
    BufferSize:    50,                    // Small buffer
    FlushSize:     10,                    // Small batch
    FlushInterval: time.Millisecond * 10, // Very short interval
}

// High throughput scenario
highThroughputConfig := gopipeline.PipelineConfig{
    BufferSize:    1000,              // Large buffer
    FlushSize:     500,               // Large batch
    FlushInterval: time.Second,       // Long interval
}
```

**Impact**:
- Too small: Increases CPU usage, may cause frequent small batch processing
- Too large: Increases data processing latency

## Scenario-based Configuration

### Database Batch Insert

```go
// Database batch insert optimized configuration
dbConfig := gopipeline.PipelineConfig{
    BufferSize:    500,                    // Larger buffer
    FlushSize:     100,                    // Moderate batch size
    FlushInterval: time.Millisecond * 200, // Moderate latency
}

pipeline := gopipeline.NewStandardPipeline(dbConfig,
    func(ctx context.Context, records []Record) error {
        return db.CreateInBatches(records, len(records)).Error
    },
)
```

### API Call Batch Processing

```go
// API call batch processing configuration
apiConfig := gopipeline.PipelineConfig{
    BufferSize:    100,                   // Moderate buffer
    FlushSize:     20,                    // Smaller batch (avoid API limits)
    FlushInterval: time.Millisecond * 50, // Low latency
}

pipeline := gopipeline.NewStandardPipeline(apiConfig,
    func(ctx context.Context, requests []APIRequest) error {
        return batchCallAPI(requests)
    },
)
```

### Log Batch Writing

```go
// Log batch writing configuration
logConfig := gopipeline.PipelineConfig{
    BufferSize:    1000,               // Large buffer (high log volume)
    FlushSize:     200,                // Large batch
    FlushInterval: time.Millisecond * 100, // Moderate latency
}

pipeline := gopipeline.NewStandardPipeline(logConfig,
    func(ctx context.Context, logs []LogEntry) error {
        return writeLogsToFile(logs)
    },
)
```

### Real-time Data Processing

```go
// Real-time data processing configuration
realtimeConfig := gopipeline.PipelineConfig{
    BufferSize:    50,                    // Small buffer
    FlushSize:     10,                    // Small batch
    FlushInterval: time.Millisecond * 10, // Very low latency
}

pipeline := gopipeline.NewStandardPipeline(realtimeConfig,
    func(ctx context.Context, events []Event) error {
        return processRealTimeEvents(events)
    },
)
```

## Performance Tuning Guide

### 1. Determine Performance Goals

First clarify your performance goals:

- **Throughput Priority**: Increase FlushSize and FlushInterval
- **Latency Priority**: Decrease FlushSize and FlushInterval
- **Memory Priority**: Decrease BufferSize and FlushSize

### 2. Benchmarking

Use benchmarks to verify configuration effectiveness:

```go
func BenchmarkPipelineConfig(b *testing.B) {
    configs := []gopipeline.PipelineConfig{
        {BufferSize: 50, FlushSize: 25, FlushInterval: time.Millisecond * 25},
        {BufferSize: 100, FlushSize: 50, FlushInterval: time.Millisecond * 50},
        {BufferSize: 200, FlushSize: 100, FlushInterval: time.Millisecond * 100},
    }
    
    for i, config := range configs {
        b.Run(fmt.Sprintf("Config%d", i), func(b *testing.B) {
            pipeline := gopipeline.NewStandardPipeline(config, 
                func(ctx context.Context, data []int) error {
                    // Simulate processing
                    time.Sleep(time.Microsecond * 100)
                    return nil
                })
            
            // Benchmark logic...
        })
    }
}
```

### 3. Monitor Metrics

Monitor key metrics to optimize configuration:

```go
type PipelineMetrics struct {
    TotalProcessed   int64
    BatchCount       int64
    AverageLatency   time.Duration
    ErrorCount       int64
    MemoryUsage      int64
}

func monitorPipeline(pipeline Pipeline[Data]) {
    ticker := time.NewTicker(time.Second * 10)
    defer ticker.Stop()
    
    for range ticker.C {
        // Collect and record metrics
        metrics := collectMetrics(pipeline)
        log.Printf("Pipeline Metrics: %+v", metrics)
        
        // Adjust configuration based on metrics
        if metrics.AverageLatency > time.Millisecond*100 {
            // Consider reducing batch size or interval
        }
    }
}
```

## Dynamic Parameter Adjustment

v2.2.2 adds runtime dynamic adjustment functionality, supporting safe adjustment of key parameters:

### Supported Dynamic Parameters

- `UpdateFlushSize(n uint32)` - Adjust batch size
- `UpdateFlushInterval(d time.Duration)` - Adjust flush interval

### Usage Examples

```go
// Basic dynamic adjustment
pipeline.UpdateFlushSize(128)
pipeline.UpdateFlushInterval(25 * time.Millisecond)

// Dynamic adjustment based on system load
func adaptiveConfig(pipeline *gopipeline.StandardPipeline[Data]) {
    ticker := time.NewTicker(time.Second * 30)
    defer ticker.Stop()
    
    for range ticker.C {
        load := getSystemLoad()
        memUsage := getMemoryUsage()
        
        switch {
        case load > 0.8:
            // High load: reduce batch, increase frequency
            pipeline.UpdateFlushSize(25)
            pipeline.UpdateFlushInterval(25 * time.Millisecond)
            
        case memUsage > 0.7:
            // High memory usage: reduce batch
            pipeline.UpdateFlushSize(30)
            pipeline.UpdateFlushInterval(50 * time.Millisecond)
            
        default:
            // Normal situation: use standard configuration
            pipeline.UpdateFlushSize(50)
            pipeline.UpdateFlushInterval(50 * time.Millisecond)
        }
    }
}
```

### Notes

- FlushSize changes do not affect batches currently being built
- FlushInterval updates take effect at the next timer reset
- All dynamic adjustments are thread-safe

## Configuration Validation

### Configuration Reasonableness Check

```go
func validateConfig(config gopipeline.PipelineConfig) error {
    if config.BufferSize < config.FlushSize*2 {
        return fmt.Errorf("BufferSize (%d) should be at least 2x FlushSize (%d)", 
            config.BufferSize, config.FlushSize)
    }
    
    if config.FlushSize == 0 {
        return fmt.Errorf("FlushSize cannot be zero")
    }
    
    if config.FlushInterval <= 0 {
        return fmt.Errorf("FlushInterval must be positive")
    }
    
    return nil
}
```

### Dynamic Configuration Adjustment

```go
type DynamicPipeline struct {
    pipeline Pipeline[Data]
    config   gopipeline.PipelineConfig
    mutex    sync.RWMutex
}

func (dp *DynamicPipeline) UpdateConfig(newConfig gopipeline.PipelineConfig) error {
    if err := validateConfig(newConfig); err != nil {
        return err
    }
    
    dp.mutex.Lock()
    defer dp.mutex.Unlock()
    
    // Recreate pipeline (actual implementation may need more complex logic)
    dp.config = newConfig
    // dp.pipeline = recreatePipeline(newConfig)
    
    return nil
}
```

## Common Issues and Solutions

### Issue 1: Data Processing Latency Too High

**Symptoms**: Time from data addition to processing completion is too long

**Possible Causes**:
- FlushInterval set too large
- FlushSize set too large
- Processing function execution time too long

**Solutions**:
```go
// Reduce flush interval and batch size
lowLatencyConfig := gopipeline.PipelineConfig{
    BufferSize:    50,                    // Buffer adapted for small batches
    FlushSize:     20,                    // Reduce batch
    FlushInterval: time.Millisecond * 10, // Reduce interval
}
```

### Issue 2: Memory Usage Too High

**Symptoms**: Program memory usage continues to grow

**Possible Causes**:
- BufferSize set too large
- FlushSize set too large (especially for deduplication pipelines)
- Error channel not being consumed

**Solutions**:
```go
// Reduce buffer and batch size
memoryOptimizedConfig := gopipeline.PipelineConfig{
    BufferSize:    50,                    // Reduce buffer
    FlushSize:     25,                    // Reduce batch
    FlushInterval: time.Millisecond * 50, // Keep moderate interval
}

// Ensure error channel consumption
errorChan := pipeline.ErrorChan(10)
go func() {
    for {
        select {
        case err, ok := <-errorChan:
            if !ok {
                return
            }
            log.Printf("Error: %v", err)
        case <-ctx.Done():
            return
        }
    }
}()
```

### Issue 3: Insufficient Throughput

**Symptoms**: Data processing speed cannot keep up with data generation speed

**Possible Causes**:
- FlushSize set too small
- FlushInterval set too small
- BufferSize set too small causing blocking

**Solutions**:
```go
// Increase batch size and buffer
highThroughputConfig := gopipeline.PipelineConfig{
    BufferSize:    500,                    // Increase buffer
    FlushSize:     100,                    // Increase batch
    FlushInterval: time.Millisecond * 100, // Moderate interval
}
```

## Best Practices Summary

1. **Start with Default Configuration**: Default configuration is suitable for most scenarios
2. **Adjust Based on Actual Needs**: Adjust according to latency, throughput, memory requirements
3. **Perform Benchmarking**: Use actual data for performance testing
4. **Monitor Key Metrics**: Continuously monitor performance metrics
5. **Configuration Validation**: Ensure configuration parameter reasonableness
6. **Document Configuration**: Record reasons for configuration choices and test results

## Next Steps

- [API Reference](./api-reference) - Complete API documentation
- [Standard Pipeline](./standard-pipeline) - Standard pipeline usage guide
- [Deduplication Pipeline](./deduplication-pipeline) - Deduplication pipeline usage guide