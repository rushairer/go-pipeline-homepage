---
sidebar_position: 3
---

# Standard Pipeline

`StandardPipeline[T]` is designed for sustained high-throughput ordered input with batched processing, including bulk database writes, API batching, logs, and ETL.

## Recommended: non-blocking launch

```go
done, errs := pipeline.Start(ctx)

// Produce data through pipeline.DataChan().
// The writer closes DataChan when input ends.

<-done
```

`Start(ctx)` returns immediately and internally uses the concurrent-flush `AsyncPerform` model.

:::important
`done` signals that the pipeline **run loop has ended**. It is not a global join barrier for every async flush already dispatched. If you need a strong “all side effects complete” guarantee, own that barrier in the processor or upper-layer runtime.
:::

## `AsyncPerform` vs `SyncPerform`

```go
// Occupies this goroutine; batch flushes may run concurrently.
err := pipeline.AsyncPerform(ctx)

// Batch flushes execute serially.
err = pipeline.SyncPerform(ctx)
```

Use `Start(ctx)` or wrap `AsyncPerform` in a goroutine when the caller itself must not block.

## Error handling

- `flush` returns a batch/flush-level error.
- `ErrorChan` uses non-blocking, best-effort delivery.
- A full error buffer may drop new error observations rather than stall the data hot path.
- `MetricsHook.ErrorDropped()` reports dropped observations.
- Persist failures in a durable processor-owned sink when no failure may be lost.

## Close semantics

- The writer closes `DataChan()`.
- The close path synchronously flushes the current partial tail batch.
- `FinalFlushOnCloseTimeout` applies to that final partial flush.
- `done` may close while async flushes dispatched earlier are still in flight.

## Backpressure

`MaxConcurrentFlushes` limits in-flight async flushes. Once the limit is full, dispatch blocks, intake slows, and backpressure eventually reaches producers. This is intentional protection against unbounded goroutine or memory growth.

See [Concurrency & Lifecycle Contract](./concurrency-contract).
