---
sidebar_position: 6
sidebar_label: Concurrency & Lifecycle Contract
---

# Concurrency & Lifecycle Contract

This page defines the intended concurrency, lifecycle, backpressure, and error-observation semantics of `go-pipeline`.

## Design goal

`go-pipeline` is a lightweight batching primitive for sustained high-throughput processing of large data streams. Independent batches should not be serialized merely to simplify lifecycle accounting.

```text
continuous input
      ↓
accumulate batch A
      ↓
dispatch A ─────────────→ flush A
      ↓
accumulate batch B
      ↓
dispatch B ─────────────→ flush B
      ↓
continue receiving data
```

Core priorities:

1. high steady-state throughput;
2. batch isolation;
3. concurrent batch flush execution;
4. bounded concurrency and explicit backpressure;
5. non-blocking error observation.

## `AsyncPerform`

`AsyncPerform(ctx)` does **not** mean the call itself returns immediately. It runs the receive/batch loop in the caller goroutine.

`Async` refers to batch flush execution: a ready batch may be dispatched to another goroutine while the pipeline continues accumulating later batches.

Use `Start(ctx)` when the caller needs a non-blocking launch:

```go
done, errs := pipeline.Start(ctx)
```

`Start` is a goroutine wrapper around the asynchronous-flush model; it does not strengthen completion semantics.

## `Done`

`Done()` and the `done` channel returned by `Start(ctx)` signal that the current pipeline **run loop** has ended.

In `AsyncPerform` mode, `done` is intentionally **not** a global join barrier for every asynchronous flush that was already dispatched before the run loop exited. The core implementation does not add per-batch completion bookkeeping solely to make `Done` a worker barrier.

If an application needs a strict “all side effects are durably complete” barrier, that barrier belongs in the processor or an upper-layer runtime that explicitly owns durable completion.

## Error semantics

A processor `flush` returns a batch/flush-level `error`.

The standard implementation forwards that error to `ErrorChan` using non-blocking, best-effort delivery. If the buffer is full, an error event may be dropped rather than blocking the data-processing hot path. `MetricsHook.ErrorDropped()` reports that condition.

```text
ErrorChan
    = logging / metrics / alerting / best-effort observation

ErrorChan
    ≠ durable failure queue
    ≠ complete failure ledger
    ≠ per-item result collector
```

If every failure must be retained, persist failed batches/items in a database, Kafka topic, retry queue, file, or another durable sink owned by the processor or upper layer.

## Backpressure is intentional

`BufferSize` bounds queued input. `MaxConcurrentFlushes` bounds in-flight asynchronous flushes. When capacity is exhausted, the pipeline intentionally propagates backpressure upstream instead of allowing unbounded goroutine or memory growth.

> The goal is not “nothing ever blocks.” The goal is to avoid unnecessary serialization between independent batches while applying explicit, bounded backpressure at capacity limits.

## Contract regression tests

`pipeline_concurrency_contract_test.go` locks three performance-sensitive guarantees:

1. independent full batches can enter async flush concurrently while capacity remains available;
2. `Done` remains a run-loop completion signal rather than silently becoming a global async-flush join barrier;
3. a saturated `ErrorChan` does not block the hot path, and dropped observations are exposed through `MetricsHook.ErrorDropped()`.

A future failure of these tests should trigger an explicit contract review rather than a routine test rewrite.

## Non-goals

The core package is not a durable task queue, transactional workflow engine, exactly-once runtime, complete result collector, or durable retry ledger.

Authoritative source contract: [`CONCURRENCY_CONTRACT.md`](https://github.com/rushairer/go-pipeline/blob/main/CONCURRENCY_CONTRACT.md).
