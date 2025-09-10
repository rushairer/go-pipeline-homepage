---
sidebar_position: 4
---

# Configuration

Go Pipeline v2 provides flexible configuration options to optimize performance for different scenarios. This guide covers all available configuration parameters and best practices.

## Default Configuration

Based on performance benchmarks, Go Pipeline v2 provides optimized default values:

```go
config := gopipeline.NewPipelineConfig()
```

This creates a configuration with the following defaults:
- **BufferSize**: 100 (internal channel buffer)
- **FlushSize**: 50 (batch size for processing)
- **FlushInterval**: 100ms (maximum wait time)

## Configuration Parameters

### BufferSize

**Purpose**: Controls the size of the internal data channel buffer

**Default**: 100

**Range**: 10-10000

**Impact**:
- **Higher values**: Better throughput, higher memory usage
- **Lower values**: Lower memory usage, potential blocking

**Recommended values**:
- General use: 50-200
- High throughput: 500-2000
- Memory constrained: 10-50

```go
config := gopipeline.NewPipelineConfig().
    SetBufferSize(500)
```

### FlushSize

**Purpose**: Number of items to accumulate before triggering batch processing

**Default**: 50

**Range**: 1-1000

**Impact**:
- **Higher values**: Better throughput, higher latency
- **Lower values**: Lower latency, more frequent processing

**Recommended values**:
- General use: 20-100
- High throughput: 100-500
- Low latency: 1-20

```go
config := gopipeline.NewPipelineConfig().
    SetFlushSize(100)
```

### FlushInterval

**Purpose**: Maximum time to wait before processing accumulated items

**Default**: 100ms

**Range**: 1ms-60s

**Impact**:
- **Higher values**: Better batching efficiency, higher latency
- **Lower values**: Lower latency, more frequent processing

**Recommended values**:
- General use: 50ms-500ms
- Low latency: 1ms-50ms
- High throughput: 500ms-5s

```go
config := gopipeline.NewPipelineConfig().
    SetFlushInterval(time.Millisecond * 200)
```

## Scenario-based Configuration

### High Throughput Scenarios

For maximum throughput when latency is not critical:

```go
highThroughputConfig := gopipeline.NewPipelineConfig().
    SetBufferSize(2000).               // Large buffer
    SetFlushSize(200).                 // Large batches
    SetFlushInterval(time.Second * 2)  // Longer intervals

pipeline := gopipeline.NewStandardPipeline(highThroughputConfig,
    func(ctx context.Context, items []DataItem) error {
        return processBatch(items)
    },
)
```

### Low Latency Scenarios

For minimal processing delay:

```go
lowLatencyConfig := gopipeline.NewPipelineConfig().
    SetBufferSize(50).                    // Small buffer
    SetFlushSize(10).                     // Small batches
    SetFlushInterval(time.Millisecond * 10) // Very short intervals

pipeline := gopipeline.NewStandardPipeline(lowLatencyConfig,
    func(ctx context.Context, items []DataItem) error {
        return processRealTime(items)
    },
)
```

### Database Batch Operations

Optimized for database batch inserts:

```go
dbConfig := gopipeline.NewPipelineConfig().
    SetBufferSize(1000).               // Large buffer (database operations)
    SetFlushSize(100).                 // Optimal batch size for DB
    SetFlushInterval(time.Second)      // Reasonable interval

pipeline := gopipeline.NewStandardPipeline(dbConfig,
    func(ctx context.Context, records []Record) error {
        return db.BatchInsert(records)
    },
)
```

### API Call Batching

Configuration for batching API calls:

```go
apiConfig := gopipeline.NewPipelineConfig().
    SetBufferSize(100).                   // Moderate buffer
    SetFlushSize(20).                     // Small batches (avoid API limits)
    SetFlushInterval(time.Millisecond * 50) // Low latency

pipeline := gopipeline.NewStandardPipeline(apiConfig,
    func(ctx context.Context, requests []APIRequest) error {
        return sendBatchRequest(requests)
    },
)
```

### Log Batch Writing

Configuration for log aggregation:

```go
logConfig := gopipeline.NewPipelineConfig().
    SetBufferSize(1000).               // Large buffer (log volume)
    SetFlushSize(200).                 // Large batches (reduce I/O)
    SetFlushInterval(time.Millisecond * 100) // Moderate interval

pipeline := gopipeline.NewStandardPipeline(logConfig,
    func(ctx context.Context, logs []LogEntry) error {
        return writeLogsToFile(logs)
    },
)
```

### Real-time Data Processing

Configuration for real-time scenarios:

```go
realtimeConfig := gopipeline.NewPipelineConfig().
    SetBufferSize(50).                    // Small buffer
    SetFlushSize(10).                     // Small batches
    SetFlushInterval(time.Millisecond * 10) // Very low latency

pipeline := gopipeline.NewStandardPipeline(realtimeConfig,
    func(ctx context.Context, events []Event) error {
        return processRealTimeEvents(events)
    },
)
```

## Performance Tuning Guide

### 1. Determine Performance Goals

First, clarify your performance objectives:

- **Throughput priority**: Increase FlushSize and FlushInterval
- **Latency priority**: Decrease FlushSize and FlushInterval
- **Memory priority**: Decrease BufferSize and FlushSize

### 2. Benchmarking

Use benchmarks to validate configuration effectiveness:

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

### 3. Monitoring and Adjustment

Monitor pipeline performance and adjust configuration:

```go
stats := pipeline.GetStats()
if stats.AverageLatency > targetLatency {
    // Reduce FlushSize or FlushInterval
}
if stats.Throughput < targetThroughput {
    // Increase FlushSize or BufferSize
}
```

## Configuration Validation

Go Pipeline automatically validates configuration parameters:

```go
config := gopipeline.NewPipelineConfig().
    SetBufferSize(0) // This will be adjusted to minimum value (10)

// Get effective configuration
effectiveConfig := config.Validate()
fmt.Printf("Effective BufferSize: %d", effectiveConfig.BufferSize)
```

## Common Issues and Solutions

### Issue 1: High Processing Latency

**Symptoms**: Data takes too long from addition to processing

**Causes**:
- FlushSize too large
- FlushInterval too long
- Processor function too slow

**Solutions**:
```go
// Reduce batch size and interval
lowLatencyConfig := gopipeline.NewPipelineConfig().
    SetFlushSize(10).                     // Smaller batches
    SetFlushInterval(time.Millisecond * 10) // Shorter intervals
```

### Issue 2: High Memory Usage

**Symptoms**: Program memory usage continues to grow

**Causes**:
- BufferSize too large
- FlushSize too large
- Processing slower than input rate

**Solutions**:
```go
// Reduce buffer and batch sizes
memoryOptimizedConfig := gopipeline.NewPipelineConfig().
    SetBufferSize(50).   // Smaller buffer
    SetFlushSize(25)     // Smaller batches
```

### Issue 3: Insufficient Throughput

**Symptoms**: Processing speed can't keep up with data input rate

**Causes**:
- FlushSize too small
- FlushInterval too short
- Insufficient parallelism

**Solutions**:
```go
// Increase batch size and intervals
highThroughputConfig := gopipeline.NewPipelineConfig().
    SetBufferSize(1000).              // Larger buffer
    SetFlushSize(200).                // Larger batches
    SetFlushInterval(time.Second * 2) // Longer intervals
```

## Best Practices

1. **Start with defaults**: Begin with default configuration and adjust based on monitoring
2. **Measure performance**: Use benchmarks to validate configuration changes
3. **Consider trade-offs**: Balance between throughput, latency, and memory usage
4. **Monitor in production**: Continuously monitor and adjust based on real workload
5. **Test thoroughly**: Test configuration changes under realistic load conditions