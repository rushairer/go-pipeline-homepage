---
sidebar_position: 6
---

# API Reference

This page summarizes the public API and the semantics clarified in 2.2.4.

## Core Interfaces

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
	Done() <-chan struct{}
}
```

```go
type Performer[T any] interface {
	AsyncPerform(ctx context.Context) error
	SyncPerform(ctx context.Context) error
	Start(ctx context.Context) (<-chan struct{}, <-chan error)
	Run(ctx context.Context, errBuf int) error
}
```

## Convenience APIs

- `Start(ctx)`: preferred async entrypoint
- `Run(ctx, errBuf)`: preferred sync entrypoint
- Wait for `done`, not for error-channel closure
- Consuming `errs` is recommended, not mandatory

## Configuration

```go
func NewPipelineConfig() PipelineConfig
func (c PipelineConfig) WithBufferSize(size uint32) PipelineConfig
func (c PipelineConfig) WithFlushSize(size uint32) PipelineConfig
func (c PipelineConfig) WithFlushInterval(interval time.Duration) PipelineConfig
func (c PipelineConfig) WithDrainOnCancel(enabled bool) PipelineConfig
func (c PipelineConfig) WithDrainGracePeriod(d time.Duration) PipelineConfig
func (c PipelineConfig) WithFinalFlushOnCloseTimeout(d time.Duration) PipelineConfig
func (c PipelineConfig) WithMaxConcurrentFlushes(n uint32) PipelineConfig
func (c PipelineConfig) ValidateOrDefault() PipelineConfig
```

## Standard Pipeline

```go
type FlushStandardFunc[T any] func(ctx context.Context, batchData []T) error
func NewDefaultStandardPipeline[T any](flushFunc FlushStandardFunc[T]) *StandardPipeline[T]
func NewStandardPipeline[T any](config PipelineConfig, flushFunc FlushStandardFunc[T]) *StandardPipeline[T]
```

## Deduplication Pipeline

```go
type UniqueKeyData interface {
	GetKey() string
}

type FlushDeduplicationFunc[T UniqueKeyData] func(ctx context.Context, batchData map[string]T) error
func NewDefaultDeduplicationPipeline[T UniqueKeyData](flushFunc FlushDeduplicationFunc[T]) *DeduplicationPipeline[T]
func NewDeduplicationPipeline[T UniqueKeyData](config PipelineConfig, flushFunc FlushDeduplicationFunc[T]) *DeduplicationPipeline[T]
```

## Hooks

```go
type MetricsHook interface {
	Flush(items int, duration time.Duration)
	Error(err error)
	ErrorDropped()
}
```

- Flush duration is only measured when a `MetricsHook` is installed.
- `ErrorDropped()` reports overflow on the error channel.

## Public Errors

- `ErrAlreadyRunning`
- `ErrContextIsClosed`
- `ErrContextDrained`
