---
sidebar_position: 7
---

# API Reference

This page reflects the public API on current `main` and the hardened concurrency contract.

## Core interfaces

```go
type Pipeline[T any] interface {
	PipelineChannel[T]
	Performer[T]
	DataProcessor[T]
}
```

```go
type PipelineChannel[T any] interface {
	DataChan() chan<- T
	ErrorChan(size int) <-chan error
}
```

- `DataChan()` is the producer input. Writes may block when configured capacity and downstream backpressure are exhausted.
- `ErrorChan(size)` uses the first call to choose capacity. Standard delivery is non-blocking / best-effort; events may be dropped if the buffer is full.

```go
type Performer[T any] interface {
	AsyncPerform(ctx context.Context) error
	SyncPerform(ctx context.Context) error
}
```

- `AsyncPerform(ctx)` occupies the caller goroutine; `Async` means batch flushes may run concurrently.
- `SyncPerform(ctx)` executes batch flushes serially in the current execution path.
- Concurrent starts on the same instance return `ErrAlreadyRunning`.

## `PipelineImpl` convenience methods

`Start`, `Run`, and `Done` are concrete helper methods inherited by pipeline implementations; they are not members of `Performer` or `PipelineChannel`.

### Start

```go
done, errs := pipeline.Start(ctx)
```

- Non-blocking goroutine wrapper around `AsyncPerform`.
- `done` signals **run-loop completion**.
- `done` is not a global join barrier for previously dispatched async flushes.
- `errs` is best-effort observability, not durable failure storage.

### Done

```go
done := pipeline.Done()
```

Use the run-bound `done` returned by `Start` when possible. `Done()` is mainly for querying the current run from another location after the run has started.

Applications requiring “all side effects durably complete” must provide their own completion barrier in the processor or upper layer.

### Run

```go
err := pipeline.Run(ctx, 128)
```

`Run(ctx, errBuf)` initializes error-channel capacity and runs `SyncPerform` synchronously.

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

## Hooks

```go
type MetricsHook interface {
	Flush(items int, duration time.Duration)
	Error(err error)
	ErrorDropped()
}
```

- Flush timing is measured only when metrics are installed.
- `Error(err)` runs when an error observation is successfully queued.
- `ErrorDropped()` reports error-channel saturation.

## Public errors

- `ErrAlreadyRunning`
- `ErrContextIsClosed`
- `ErrContextDrained`

## Key behavior

- `MaxConcurrentFlushes` is both a concurrency cap and a hard-backpressure boundary.
- Closing `DataChan()` synchronously flushes the current partial tail batch before the run loop exits.
- Run-loop completion does not imply all previously dispatched async flushes have joined.
- `FinalFlushOnCloseTimeout` applies to the final partial close-path flush.

See [Concurrency & Lifecycle Contract](./concurrency-contract).
