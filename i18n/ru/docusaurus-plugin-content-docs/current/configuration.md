---
sidebar_position: 5
---

# Конфигурация

## PipelineConfig

```go
type PipelineConfig struct {
	BufferSize               uint32
	FlushSize                uint32
	FlushInterval            time.Duration
	DrainOnCancel            bool
	DrainGracePeriod         time.Duration
	FinalFlushOnCloseTimeout time.Duration
	MaxConcurrentFlushes     uint32
}
```

Значения по умолчанию:

- `BufferSize: 100`
- `FlushSize: 50`
- `FlushInterval: 50ms`

## Практические правила

- Сбалансировано: `BufferSize ~= 2x FlushSize`
- При burst-нагрузке: `BufferSize >= 4x FlushSize`
- Низкая задержка: `FlushSize 8-32`, `FlushInterval 1-10ms`
- Высокий throughput: `FlushSize 64-128`, `FlushInterval 50-100ms`

`MaxConcurrentFlushes` ограничивает асинхронный flush и одновременно вводит жесткий backpressure.
