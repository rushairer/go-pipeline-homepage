---
sidebar_position: 6
---

# Référence API

## Interfaces principales

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

- Attendez `done`, pas la fermeture du canal d'erreurs
- `Start(ctx)` est l'entrée asynchrone recommandée
- `Run(ctx, errBuf)` est l'entrée synchrone recommandée
- `ErrAlreadyRunning`, `ErrContextIsClosed` et `ErrContextDrained` font partie des erreurs publiques
