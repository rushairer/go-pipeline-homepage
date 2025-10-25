---
sidebar_position: 6
---

# v2.2.2 新功能

Go Pipeline v2.2.2 专注于开发者体验和关闭稳健性的提升，引入了多项重要功能。

## 🚀 主要亮点

### 便捷API

新增 `Start()` 和 `Run()` 方法，大幅减少样板代码：

```go
// 异步启动 - 新方式
done, errs := pipeline.Start(ctx)
go func() {
    for err := range errs {
        log.Printf("错误: %v", err)
    }
}()
<-done

// 同步运行 - 新方式
if err := pipeline.Run(ctx, 128); err != nil {
    log.Printf("执行错误: %v", err)
}
```

### 动态参数调整

支持运行时安全调整关键参数：

```go
// 根据系统负载动态调整
if systemLoad > 0.8 {
    pipeline.UpdateFlushSize(25)        // 减小批次大小
    pipeline.UpdateFlushInterval(25 * time.Millisecond) // 增加刷新频率
} else {
    pipeline.UpdateFlushSize(50)        // 标准批次大小
    pipeline.UpdateFlushInterval(50 * time.Millisecond) // 标准刷新间隔
}
```

### 优雅关闭增强

#### 取消时限时收尾

```go
config := gopipeline.NewPipelineConfig().
    WithDrainOnCancel(true).                   // 启用取消收尾
    WithDrainGracePeriod(150 * time.Millisecond) // 收尾时间窗口

pipeline := gopipeline.NewStandardPipeline(config, flushFunc)

// 当上下文取消时，管道会在限定时间内尽力flush当前批次
```

#### 最终flush超时保护

```go
config := gopipeline.NewPipelineConfig().
    WithFinalFlushOnCloseTimeout(500 * time.Millisecond) // 最终flush超时

// 当数据通道关闭时，最终flush会受到超时保护
```

### 并发控制

限制异步flush的并发数：

```go
config := gopipeline.NewPipelineConfig().
    WithMaxConcurrentFlushes(uint32(runtime.NumCPU())) // 限制并发数

// 防止过多并发flush导致资源耗尽
```

## 🔄 去重管道保持稳定

去重管道在 v2.2.2 中保持了原有的设计，继续使用 `UniqueKeyData` 接口：

```go
type User struct {
    ID    int
    Name  string
    Email string
}

func (u User) GetKey() string {
    return u.Email
}

pipeline := gopipeline.NewDefaultDeduplicationPipeline(
    func(ctx context.Context, users map[string]User) error {
        // 处理去重后的用户数据
        fmt.Printf("处理 %d 个去重用户:\n", len(users))
        for key, user := range users {
            fmt.Printf("  %s: %s\n", key, user.Name)
        }
        return processUsers(users)
    },
)
```

### 去重管道特点

- 数据类型必须实现 `UniqueKeyData` 接口
- 批处理函数接收 `map[string]T` 类型参数
- 自动根据 `GetKey()` 方法进行去重
- 支持所有新增的配置参数和便捷API

## 📋 配置增强

### 链式配置方法

```go
config := gopipeline.NewPipelineConfig().
    WithBufferSize(200).
    WithFlushSize(100).
    WithFlushInterval(time.Millisecond * 50).
    WithDrainOnCancel(true).
    WithDrainGracePeriod(150 * time.Millisecond).
    WithFinalFlushOnCloseTimeout(500 * time.Millisecond).
    WithMaxConcurrentFlushes(4).
    ValidateOrDefault() // 验证并应用默认值
```

### 新增配置参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `DrainOnCancel` | `bool` | `false` | 取消时是否进行限时收尾 |
| `DrainGracePeriod` | `time.Duration` | `100ms` | 收尾刷新时间窗口 |
| `FinalFlushOnCloseTimeout` | `time.Duration` | `0` | 最终flush超时（0表示禁用） |
| `MaxConcurrentFlushes` | `uint32` | `0` | 异步flush并发限制（0表示不限制） |

## 🔧 错误处理改进

### 新增错误类型

- `ErrAlreadyRunning`: 管道已在运行中（禁止并发启动）
- `ErrContextDrained`: 取消时已执行限时收尾flush

### 错误通道语义

- 首次调用 `ErrorChan(size)` 决定缓冲区大小
- 后续调用的 `size` 参数将被忽略
- 支持非阻塞错误发送，缓冲区满时丢弃新错误

## 📈 性能优化

### 内存使用优化

- 优化了批次容器的内存分配策略
- 改进了去重管道的map使用效率

### 并发性能

- 异步flush支持并发限制，防止资源耗尽
- 动态参数调整采用无锁设计，性能开销极小

## 🔄 迁移指南

### 从传统API迁移到便捷API

```go
// 旧方式
go func() {
    if err := pipeline.AsyncPerform(ctx); err != nil {
        log.Printf("错误: %v", err)
    }
}()

errorChan := pipeline.ErrorChan(10)
go func() {
    for err := range errorChan {
        log.Printf("处理错误: %v", err)
    }
}()

// 新方式
done, errs := pipeline.Start(ctx)
go func() {
    for err := range errs {
        log.Printf("错误: %v", err)
    }
}()
<-done
```

### 去重管道使用

去重管道在 v2.2.2 中保持了原有设计，无需迁移：

```go
type User struct {
    Email string
    Name  string
}

// 实现UniqueKeyData接口
func (u User) GetKey() string {
    return u.Email
}

// 创建去重管道（一直是这种方式）
pipeline := gopipeline.NewDefaultDeduplicationPipeline(
    func(ctx context.Context, users map[string]User) error {
        return processUsers(users)
    },
)
```

## ⚠️ 注意事项

1. **Go版本要求**: 最低要求从 Go 1.18 提升到 Go 1.20
2. **错误通道**: 首次调用决定容量的语义需要注意
4. **并发启动**: 同一实例不允许并发启动多次

## 🎯 最佳实践

1. **优先使用便捷API**: `Start()` 和 `Run()` 方法更简洁
2. **合理配置收尾策略**: 根据数据重要性选择合适的关闭策略
3. **监控动态调参**: 结合系统监控实现智能参数调整
4. **错误处理**: 始终消费错误通道，避免资源泄漏

## 下一步

- [配置指南](./configuration) - 了解新增配置参数
- [API 参考](./api-reference) - 查看完整API文档
- [标准管道](./standard-pipeline) - 标准管道使用指南
- [去重管道](./deduplication-pipeline) - 去重管道使用指南