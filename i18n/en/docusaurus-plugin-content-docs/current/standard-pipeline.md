---
sidebar_position: 3
---

# Standard Pipeline

`StandardPipeline[T]` processes items in write order and is the default choice for batch writes, API aggregation, and log shipping.

## Construction

```go
pipeline := gopipeline.NewDefaultStandardPipeline(
	func(ctx context.Context, batch []string) error {
		return process(batch)
	},
)
```

```go
config := gopipeline.NewPipelineConfig().
	WithBufferSize(400).
	WithFlushSize(100).
	WithFlushInterval(100 * time.Millisecond).
	WithDrainOnCancel(true).
	WithDrainGracePeriod(150 * time.Millisecond).
	WithFinalFlushOnCloseTimeout(500 * time.Millisecond)

pipeline := gopipeline.NewStandardPipeline(config, flushFunc)
```

## Recommended Execution

```go
done, errs := pipeline.Start(ctx)

go func() {
	for err := range errs {
		log.Printf("flush error: %v", err)
	}
}()

go func() {
	defer close(pipeline.DataChan())
	for _, item := range items {
		select {
		case pipeline.DataChan() <- item:
		case <-ctx.Done():
			return
		}
	}
}()

<-done
```

## Shutdown and Errors

- Wait on `done`, not on error-channel closure.
- Consuming `errs` is recommended but not mandatory.
- Closing `DataChan()` triggers the final flush path.
- If `FinalFlushOnCloseTimeout` is set, your flush function must respect the provided context.

## Backpressure

```go
config := gopipeline.NewPipelineConfig().
	WithMaxConcurrentFlushes(uint32(runtime.NumCPU()))
```

- `0` means unlimited async flush concurrency.
- A non-zero limit intentionally propagates backpressure upstream once saturated.
- This is useful when protecting downstream systems matters more than keeping producers unblocked.

## 2.2.4 Notes

- Sync flush paths now reuse batch containers.
- Async flush keeps steal-and-replace semantics for memory safety.
