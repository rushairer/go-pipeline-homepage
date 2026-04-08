---
sidebar_position: 1
---

# Go Pipeline v2 Introduction

Go Pipeline v2 is a high-performance, concurrency-safe Go batching framework with generics, size/time-window flushing, graceful shutdown, hooks, dynamic tuning, and both standard and dedup modes.

## Core Capabilities

- Go 1.20+ generics with type safety
- Automatic flush by batch size and time window
- Sync and async execution models
- `Start()` and `Run()` convenience APIs
- `DrainOnCancel`, `FinalFlushOnCloseTimeout`, `MaxConcurrentFlushes`
- Logger and Metrics hooks

## Installation

```bash
go get github.com/rushairer/go-pipeline/v2@latest
```

## Quick Start

```go
pipeline := gopipeline.NewDefaultStandardPipeline(
	func(ctx context.Context, batch []int) error {
		return flush(batch)
	},
)

done, errs := pipeline.Start(ctx)

go func() {
	for err := range errs {
		log.Printf("pipeline error: %v", err)
	}
}()

go func() {
	defer close(pipeline.DataChan())
	for _, item := range items {
		pipeline.DataChan() <- item
	}
}()

<-done
```

## Runtime Semantics

- Prefer waiting on `done` from `Start(ctx)`.
- Consuming `errs` / `ErrorChan()` is recommended, but not mandatory.
- The first `ErrorChan(size)` call decides the buffer size.
- Producers should close `DataChan()`.
- `MaxConcurrentFlushes` is an intentional hard-backpressure mechanism.

## Configuration

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

## New in 2.2.4

- Reuse batch containers on sync flush paths
- Measure flush duration only when `MetricsHook` is enabled
- Clarify hard-backpressure semantics of `MaxConcurrentFlushes`
- Fix docs around `done`, `ErrorChan`, and benchmarks

## Next Steps

- [What is new in v2.2.4](./whats-new-v2.2.4)
- [Standard Pipeline](./standard-pipeline)
- [Deduplication Pipeline](./deduplication-pipeline)
- [Configuration](./configuration)
- [API Reference](./api-reference)
