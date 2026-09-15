---
sidebar_position: 7
---

# Référence API

Cette page reflète l’API publique du `main` actuel et le contrat de concurrence durci.

## Interfaces principales

```go
type PipelineChannel[T any] interface {
	DataChan() chan<- T
	ErrorChan(size int) <-chan error
}

type Performer[T any] interface {
	AsyncPerform(ctx context.Context) error
	SyncPerform(ctx context.Context) error
}
```

- `DataChan()` est l’entrée producteur et peut bloquer lorsque la capacité/backpressure est atteinte.
- `ErrorChan(size)` prend sa capacité au premier appel et fournit une observation non bloquante / best-effort.
- `AsyncPerform(ctx)` occupe la goroutine appelante ; `Async` signifie que les flush de batches peuvent être concurrents.
- `SyncPerform(ctx)` exécute les flush de manière séquentielle.

## Méthodes utilitaires de `PipelineImpl`

`Start`, `Run` et `Done` sont des helpers concrets et ne font pas partie des interfaces `Performer` / `PipelineChannel`.

### Start

```go
done, errs := pipeline.Start(ctx)
```

`Start` lance `AsyncPerform` dans une goroutine. `done` indique la fin de la **run loop**, pas le join de tous les flush asynchrones déjà dispatchés. `errs` est un canal d’observation best-effort.

### Done

`Done()` permet d’obtenir le signal de fin de la run courante. Après `Start`, préférez le `done` renvoyé par cet appel.

### Run

`Run(ctx, errBuf)` initialise la capacité d’erreur puis exécute `SyncPerform` de façon synchrone.

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

## Metrics

`MetricsHook.ErrorDropped()` signale qu’une observation d’erreur a été abandonnée parce que `ErrorChan` était plein.

## Erreurs publiques

- `ErrAlreadyRunning`
- `ErrContextIsClosed`
- `ErrContextDrained`

`MaxConcurrentFlushes` est à la fois une limite de concurrence et une frontière de backpressure. La fermeture de `DataChan()` flush de façon synchrone le batch final partiel avant la fin de la run loop, mais ce signal ne joint pas les flush asynchrones dispatchés plus tôt.

Voir [Contrat de concurrence et de cycle de vie](./concurrency-contract).
