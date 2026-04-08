---
sidebar_position: 4
---

# Пайплайн дедупликации

`DeduplicationPipeline[T]` удаляет дубликаты внутри batch. Тип `T` должен реализовывать `UniqueKeyData`.

```go
type UniqueKeyData interface {
	GetKey() string
}
```

- Повторяющиеся ключи перезаписывают предыдущие значения внутри того же batch
- Flush-функция получает `map[string]T`
- Семантика `done`, `errs` и backpressure такая же, как у standard pipeline
