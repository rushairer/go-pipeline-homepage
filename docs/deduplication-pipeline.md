---
sidebar_position: 4
---

# 去重管道

`DeduplicationPipeline[T]` 适用于批内需要按唯一键去重的场景。数据类型必须实现 `UniqueKeyData` 接口。

## 唯一键接口

```go
type UniqueKeyData interface {
	GetKey() string
}
```

## 创建去重管道

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
	func(ctx context.Context, batch map[string]User) error {
		return processUsers(batch)
	},
)
```

## 运行示例

```go
ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()

done, errs := pipeline.Start(ctx)

go func() {
	for err := range errs {
		log.Printf("dedup error: %v", err)
	}
}()

dataChan := pipeline.DataChan()
go func() {
	defer close(dataChan)

	for _, user := range []User{
		{ID: 1, Name: "Alice", Email: "alice@example.com"},
		{ID: 2, Name: "Bob", Email: "bob@example.com"},
		{ID: 3, Name: "Alice v2", Email: "alice@example.com"},
	} {
		select {
		case dataChan <- user:
		case <-ctx.Done():
			return
		}
	}
}()

<-done
```

同一批内重复键会被覆盖，最终传给 flush 的是 `map[string]T`。

## 配置建议

- 去重后有效批次大小通常小于等于 `FlushSize`。
- 如果输入重复率很高，可以适当增加 `FlushInterval`，让时间窗内积累更多唯一项。
- `BufferSize` 仍建议按 `4x-10x FlushSize` 调整，以更平滑地吸收突发。
- 批内使用 `map` 存储唯一项，唯一键越多，额外内存占用越高。

## 去重场景下的调参思路

- 假设唯一性比例为 `u`，则有效批次大约为 `u * FlushSize`。
- 如果目标是“每次 flush 约 50 个唯一项”，而 `u = 0.2`，则 `FlushSize` 需要接近 `250`。
- 如果你更关注延迟，可以把更大的理论值夹在 `128` 或 `256` 一类更保守的区间。

## 关闭与语义

- `done` 仍然是判断完成的唯一可靠方式。
- 错误通道语义与标准管道一致：推荐消费，但不是强制。
- `MaxConcurrentFlushes` 在去重管道中同样会向上游传递硬背压。

## 适用场景

- 批量更新用户资料，以邮箱或用户 ID 去重
- 批量处理库存、商品、配置项，以业务主键去重
- 聚合日志、事件、告警，按业务指纹做批内覆盖
