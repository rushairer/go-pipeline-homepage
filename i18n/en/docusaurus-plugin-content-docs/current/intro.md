---
sidebar_position: 1
---

# Go Pipeline v2 Introduction

Go Pipeline v2 is a high-performance Go batching framework with generics, size/time-window batching, explicit backpressure, concurrent flush execution, dynamic tuning, and observability hooks.

## Core capabilities

- Go 1.20+ generics and type safety
- size- and time-based batching
- concurrent batch flushes with `AsyncPerform`
- non-blocking caller launch with `Start()` and synchronous convenience with `Run()`
- `DrainOnCancel`, `FinalFlushOnCloseTimeout`, and `MaxConcurrentFlushes`
- non-blocking / best-effort `ErrorChan` observation
- Logger and Metrics hooks
- standard and deduplication pipelines

## Installation

```bash
go get github.com/rushairer/go-pipeline/v2@latest
```

## Quick start

```go
ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
defer cancel()

done, errs := pipeline.Start(ctx)

go func() {
	for {
		select {
		case err := <-errs:
			log.Printf("pipeline error: %v", err)
		case <-done:
			return
		}
	}
}()

ch := pipeline.DataChan()
go func() {
	defer close(ch)
	for _, item := range items {
		select {
		case ch <- item:
		case <-ctx.Done():
			return
		}
	}
}()

<-done
```

## Runtime semantics

- `AsyncPerform(ctx)` runs the receive/batch loop in the caller goroutine; `Async` means batch flushes may execute concurrently.
- Use `Start(ctx)` when the caller should return immediately.
- `done` returned by `Start` signals **run-loop completion**, not a global join of previously dispatched async flushes.
- `errs` / `ErrorChan()` is best-effort observability. Events may be dropped when the buffer is full; observe this with `MetricsHook.ErrorDropped()`.
- Persist failures in the processor or an upper layer when none may be lost.
- `MaxConcurrentFlushes` is also an intentional hard-backpressure boundary.

## Core interfaces

- `PipelineChannel[T]`: `DataChan`, `ErrorChan`
- `Performer[T]`: `AsyncPerform`, `SyncPerform`
- `Pipeline[T]`: combines `PipelineChannel`, `Performer`, and `DataProcessor`

Concrete pipeline types additionally expose `Start`, `Run`, and `Done` helpers.

## Next

- [Concurrency & Lifecycle Contract](./concurrency-contract)
- [Standard Pipeline](./standard-pipeline)
- [Configuration](./configuration)
- [API Reference](./api-reference)
