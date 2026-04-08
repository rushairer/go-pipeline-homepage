---
sidebar_position: 5
---

# Configuration

2.2.4 aligns the docs around four dimensions: throughput, latency, memory, and backpressure.

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

Defaults:

- `BufferSize: 100`
- `FlushSize: 50`
- `FlushInterval: 50ms`

## Chainable Setup

```go
config := gopipeline.NewPipelineConfig().
	WithBufferSize(200).
	WithFlushSize(50).
	WithFlushInterval(50 * time.Millisecond).
	WithDrainOnCancel(true).
	WithDrainGracePeriod(150 * time.Millisecond).
	WithFinalFlushOnCloseTimeout(500 * time.Millisecond).
	WithMaxConcurrentFlushes(4).
	ValidateOrDefault()
```

## Parameter Notes

- `BufferSize`: queue depth before producers block
- `FlushSize`: batch threshold
- `FlushInterval`: tail-latency cap for partial batches
- `DrainOnCancel` / `DrainGracePeriod`: bounded best-effort flush on cancel
- `FinalFlushOnCloseTimeout`: timeout for final flush on channel close
- `MaxConcurrentFlushes`: async flush concurrency cap and hard-backpressure control

## Rules of Thumb

- Balanced: `BufferSize ~= 2x FlushSize`
- Bursty traffic: `BufferSize >= 4x FlushSize`
- High throughput: `FlushSize 64-128`, `FlushInterval 50-100ms`
- Low latency: `FlushSize 8-32`, `FlushInterval 1-10ms`

## Benchmark Guidance

```bash
go test -run ^$ -bench . -benchmem ./...
go test -run ^$ -bench BenchmarkStandardPipeline -benchmem ./tests/...
go test -run ^$ -bench BenchmarkDeduplicationPipeline -benchmem ./tests/...
```

Reference environment:

- Date: 2026-04-08
- Platform: darwin/arm64
- CPU: Apple M4
