---
sidebar_position: 3
---

# Стандартный пайплайн

`StandardPipeline[T]` предназначен для непрерывной высокопроизводительной обработки упорядоченного входного потока batches.

## Рекомендуемый запуск

```go
done, errs := pipeline.Start(ctx)
// producer пишет в pipeline.DataChan()
<-done
```

`Start(ctx)` возвращается сразу и внутри использует модель конкурентных flush из `AsyncPerform`.

:::important
`done` означает, что **run loop завершён**. Это не глобальный join-барьер для всех ранее отправленных async flush. Строгая гарантия «все побочные эффекты завершены» должна принадлежать processor или верхнему runtime.
:::

## Ошибки

`ErrorChan` работает non-blocking / best-effort. При полном буфере новые наблюдения ошибок могут быть отброшены вместо блокировки hot path. Используйте `MetricsHook.ErrorDropped()` для наблюдения и durable sink, если потери failures недопустимы.

## Закрытие и backpressure

Writer закрывает `DataChan()`. Текущий неполный хвостовой batch flush-ится синхронно. `MaxConcurrentFlushes` ограничивает число flush в полёте и намеренно передаёт backpressure вверх по потоку при достижении лимита.

См. [Контракт конкурентности и жизненного цикла](./concurrency-contract).
