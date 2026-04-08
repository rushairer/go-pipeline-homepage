---
sidebar_position: 6
---

# Справочник API

## Основные интерфейсы

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

- Ждите `done`, а не закрытия error channel
- `Start(ctx)` — рекомендуемый асинхронный вход
- `Run(ctx, errBuf)` — рекомендуемый синхронный вход
- Публичные ошибки: `ErrAlreadyRunning`, `ErrContextIsClosed`, `ErrContextDrained`
