---
sidebar_position: 4
---

# 配置指南

本文档详细介绍 Go Pipeline v2 的配置参数和最佳实践。

## 配置结构

```go
type PipelineConfig struct {
    BufferSize    uint32        // 缓冲通道的容量
    FlushSize     uint32        // 批处理数据的最大容量
    FlushInterval time.Duration // 定时刷新的时间间隔
}
```

## 默认配置

基于性能基准测试，Go Pipeline v2 提供了优化的默认配置：

```go
const (
    defaultBufferSize    = 100                   // 缓冲区大小
    defaultFlushSize     = 50                    // 批处理大小
    defaultFlushInterval = time.Millisecond * 50 // 刷新间隔
)
```

## 配置参数详解

### BufferSize（缓冲区大小）

**作用**: 控制内部数据通道的缓冲区大小

**默认值**: 100

**建议值**: 
- 应该 >= FlushSize * 2 以避免阻塞
- 高并发场景可以适当增大

```go
config := gopipeline.PipelineConfig{
    BufferSize: 200, // 推荐为 FlushSize 的 2-4 倍
    FlushSize:  50,
}
```

**影响**:
- 过小：可能导致写入阻塞
- 过大：增加内存使用，延迟关闭时间

### FlushSize（批处理大小）

**作用**: 控制每次批处理的数据量

**默认值**: 50

**建议值**:
- 一般场景：20-100
- 高吞吐场景：100-500
- 低延迟场景：10-50

```go
// 不同场景的配置示例
// 高吞吐量场景
config := gopipeline.PipelineConfig{
    FlushSize: 200,
}

// 低延迟场景
config := gopipeline.PipelineConfig{
    FlushSize: 20,
}
```

**影响**:
- 过小：增加处理频率，降低吞吐量
- 过大：增加延迟和内存使用

### FlushInterval（刷新间隔）

**作用**: 控制定时刷新的时间间隔

**默认值**: 50ms

**建议值**:
- 低延迟场景：10-50ms
- 平衡场景：50-200ms
- 高吞吐场景：200ms-1s

```go
// 不同场景的配置示例
// 低延迟场景
config := gopipeline.PipelineConfig{
    FlushInterval: time.Millisecond * 10,
}

// 高吞吐量场景
config := gopipeline.PipelineConfig{
    FlushInterval: time.Second,
}
```

**影响**:
- 过小：增加CPU使用，可能导致频繁的小批次处理
- 过大：增加数据处理延迟

## 场景化配置

### 数据库批量写入

```go
// 数据库批量插入优化配置
config := gopipeline.PipelineConfig{
    BufferSize:    500,                    // 较大缓冲区
    FlushSize:     100,                    // 适中批次大小
    FlushInterval: time.Millisecond * 200, // 适中延迟
}

pipeline := gopipeline.NewStandardPipeline(config,
    func(ctx context.Context, records []Record) error {
        return db.CreateInBatches(records, len(records)).Error
    },
)
```

### API 调用批处理

```go
// API调用批处理配置
config := gopipeline.PipelineConfig{
    BufferSize:    100,                   // 适中缓冲区
    FlushSize:     20,                    // 较小批次（避免API限制）
    FlushInterval: time.Millisecond * 50, // 低延迟
}

pipeline := gopipeline.NewStandardPipeline(config,
    func(ctx context.Context, requests []APIRequest) error {
        return batchCallAPI(requests)
    },
)
```

### 日志批量写入

```go
// 日志批量写入配置
config := gopipeline.PipelineConfig{
    BufferSize:    1000,               // 大缓冲区（日志量大）
    FlushSize:     200,                // 大批次
    FlushInterval: time.Millisecond * 100, // 适中延迟
}

pipeline := gopipeline.NewStandardPipeline(config,
    func(ctx context.Context, logs []LogEntry) error {
        return writeLogsToFile(logs)
    },
)
```

### 实时数据处理

```go
// 实时数据处理配置
config := gopipeline.PipelineConfig{
    BufferSize:    50,                    // 小缓冲区
    FlushSize:     10,                    // 小批次
    FlushInterval: time.Millisecond * 10, // 极低延迟
}

pipeline := gopipeline.NewStandardPipeline(config,
    func(ctx context.Context, events []Event) error {
        return processRealTimeEvents(events)
    },
)
```

## 性能调优指南

### 1. 确定性能目标

首先明确你的性能目标：

- **吞吐量优先**: 增大 FlushSize 和 FlushInterval
- **延迟优先**: 减小 FlushSize 和 FlushInterval
- **内存优先**: 减小 BufferSize 和 FlushSize

### 2. 基准测试

使用基准测试来验证配置效果：

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
                    // 模拟处理
                    time.Sleep(time.Microsecond * 100)
                    return nil
                })
            
            // 基准测试逻辑...
        })
    }
}
```

### 3. 监控指标

监控关键指标来优化配置：

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
        // 收集和记录指标
        metrics := collectMetrics(pipeline)
        log.Printf("Pipeline Metrics: %+v", metrics)
        
        // 根据指标调整配置
        if metrics.AverageLatency > time.Millisecond*100 {
            // 考虑减小批次大小或间隔
        }
    }
}
```

## 配置验证

### 配置合理性检查

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

### 动态配置调整

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
    
    // 重新创建管道（实际实现可能需要更复杂的逻辑）
    dp.config = newConfig
    // dp.pipeline = recreatePipeline(newConfig)
    
    return nil
}
```

## 常见问题和解决方案

### 问题1: 数据处理延迟过高

**症状**: 数据从添加到处理完成的时间过长

**可能原因**:
- FlushInterval 设置过大
- FlushSize 设置过大
- 处理函数执行时间过长

**解决方案**:
```go
// 减小刷新间隔和批次大小
config := gopipeline.PipelineConfig{
    FlushSize:     20,                    // 减小批次
    FlushInterval: time.Millisecond * 10, // 减小间隔
}
```

### 问题2: 内存使用过高

**症状**: 程序内存使用持续增长

**可能原因**:
- BufferSize 设置过大
- FlushSize 设置过大（特别是去重管道）
- 错误通道未被消费

**解决方案**:
```go
// 减小缓冲区和批次大小
config := gopipeline.PipelineConfig{
    BufferSize: 50,  // 减小缓冲区
    FlushSize:  25,  // 减小批次
}

// 确保消费错误通道
go func() {
    for err := range pipeline.ErrorChan(10) {
        log.Printf("Error: %v", err)
    }
}()
```

### 问题3: 吞吐量不足

**症状**: 数据处理速度跟不上数据产生速度

**可能原因**:
- FlushSize 设置过小
- FlushInterval 设置过小
- BufferSize 设置过小导致阻塞

**解决方案**:
```go
// 增大批次大小和缓冲区
config := gopipeline.PipelineConfig{
    BufferSize:    500,                   // 增大缓冲区
    FlushSize:     100,                   // 增大批次
    FlushInterval: time.Millisecond * 100, // 适中间隔
}
```

## 最佳实践总结

1. **从默认配置开始**: 默认配置适用于大多数场景
2. **基于实际需求调整**: 根据延迟、吞吐量、内存要求调整
3. **进行基准测试**: 使用实际数据进行性能测试
4. **监控关键指标**: 持续监控性能指标
5. **配置验证**: 确保配置参数的合理性
6. **文档化配置**: 记录配置选择的原因和测试结果

## 下一步

- [API 参考](./api-reference) - 完整的API文档
- [标准管道](./standard-pipeline) - 标准管道使用指南
- [去重管道](./deduplication-pipeline) - 去重管道使用指南