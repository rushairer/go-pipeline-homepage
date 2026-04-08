---
sidebar_position: 5
---

# Configuration

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

Valeurs par défaut :

- `BufferSize: 100`
- `FlushSize: 50`
- `FlushInterval: 50ms`

## Règles pratiques

- Équilibré : `BufferSize ~= 2x FlushSize`
- Charge en rafales : `BufferSize >= 4x FlushSize`
- Faible latence : `FlushSize 8-32`, `FlushInterval 1-10ms`
- Haut débit : `FlushSize 64-128`, `FlushInterval 50-100ms`

`MaxConcurrentFlushes` limite la concurrence asynchrone et introduit volontairement une contre-pression dure.
