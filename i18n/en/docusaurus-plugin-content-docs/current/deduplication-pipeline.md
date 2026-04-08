---
sidebar_position: 4
---

# Deduplication Pipeline

`DeduplicationPipeline[T]` deduplicates items inside each batch. `T` must implement `UniqueKeyData`.

## Unique Key Interface

```go
type UniqueKeyData interface {
	GetKey() string
}
```

## Example

```go
type User struct {
	Email string
	Name  string
}

func (u User) GetKey() string { return u.Email }

pipeline := gopipeline.NewDefaultDeduplicationPipeline(
	func(ctx context.Context, batch map[string]User) error {
		return processUsers(batch)
	},
)
```

## Behavior

- Duplicate keys overwrite previous items inside the same batch.
- The flush callback receives `map[string]T`.
- `done`, `errs`, shutdown, and backpressure semantics are the same as in the standard pipeline.

## Tuning

- Effective batch size is usually smaller than `FlushSize` when duplication is high.
- With low uniqueness ratio, a larger `FlushInterval` may help accumulate enough distinct items.
- Keep `BufferSize` at roughly `4x-10x FlushSize` under bursty traffic.
