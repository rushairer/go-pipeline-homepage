---
sidebar_position: 7
---

# Справочник API

Эта страница соответствует публичному API текущего `main` и зафиксированному контракту конкурентности.

## Основные интерфейсы

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

- `DataChan()` — вход производителя; запись может блокироваться при исчерпании ёмкости/backpressure.
- `ErrorChan(size)` выбирает размер буфера при первом вызове и работает non-blocking / best-effort.
- `AsyncPerform(ctx)` занимает вызывающую goroutine; `Async` означает, что flush batches могут выполняться параллельно.
- `SyncPerform(ctx)` выполняет flush последовательно.

## Вспомогательные методы `PipelineImpl`

`Start`, `Run` и `Done` — методы конкретных типов и не входят в `Performer` / `PipelineChannel`.

### Start

```go
done, errs := pipeline.Start(ctx)
```

`Start` запускает `AsyncPerform` в goroutine. `done` сигнализирует завершение **run loop**, а не join всех ранее отправленных async flush. `errs` — best-effort канал наблюдения.

### Done

`Done()` возвращает сигнал завершения текущего run. После `Start` предпочтительнее использовать `done`, возвращённый именно этим вызовом.

### Run

`Run(ctx, errBuf)` инициализирует ёмкость канала ошибок и синхронно выполняет `SyncPerform`.

## Конфигурация

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

`MetricsHook.ErrorDropped()` сообщает, что событие ошибки было отброшено из-за заполненного `ErrorChan`.

## Публичные ошибки

- `ErrAlreadyRunning`
- `ErrContextIsClosed`
- `ErrContextDrained`

`MaxConcurrentFlushes` одновременно является лимитом конкурентности и границей hard backpressure. Закрытие `DataChan()` синхронно flush-ит текущий неполный хвостовой batch перед завершением run loop, но этот сигнал не join-ит ранее отправленные async flush.

См. [Контракт конкурентности и жизненного цикла](./concurrency-contract).
