---
sidebar_position: 3
---

# Стандартный пайплайн

`StandardPipeline[T]` обрабатывает элементы в порядке записи и подходит для пакетной записи в БД, batch API-вызовов и агрегации логов.

## Создание

```go
pipeline := gopipeline.NewDefaultStandardPipeline(
	func(ctx context.Context, batch []string) error {
		return process(batch)
	},
)
```

## Важные моменты

- Используйте `Start(ctx)` и ожидайте `done`
- Закрывайте `DataChan()` со стороны продьюсера
- `FinalFlushOnCloseTimeout` ограничивает финальный flush
- `MaxConcurrentFlushes` может намеренно передавать backpressure наверх
