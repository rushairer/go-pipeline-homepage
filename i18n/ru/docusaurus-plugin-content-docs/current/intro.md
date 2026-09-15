---
sidebar_position: 1
---

# Введение в Go Pipeline v2

Go Pipeline v2 — высокопроизводительный Go-фреймворк пакетной обработки: generics, batching по размеру/времени, конкурентный flush, явный backpressure, динамическая настройка и hooks наблюдаемости.

## Ключевая семантика

- `AsyncPerform(ctx)` выполняет receive/batch loop в вызывающей goroutine; `Async` относится к конкурентному flush batches.
- Для неблокирующего запуска вызывающей стороны используйте `Start(ctx)`.
- `done` от `Start` означает завершение **run loop**, а не глобальный join уже отправленных async flush.
- `ErrorChan()` работает non-blocking / best-effort; при полном буфере события могут быть отброшены. Это видно через `MetricsHook.ErrorDropped()`.
- Если ни одна ошибка не может быть потеряна, сохраняйте failures в processor или верхнем слое.
- `MaxConcurrentFlushes` также является намеренной границей hard backpressure.

## Интерфейсы

- `PipelineChannel[T]`: `DataChan`, `ErrorChan`
- `Performer[T]`: `AsyncPerform`, `SyncPerform`
- `Pipeline[T]`: объединяет их с `DataProcessor`

Конкретные типы дополнительно предоставляют `Start`, `Run` и `Done`.

## Установка

```bash
go get github.com/rushairer/go-pipeline/v2@latest
```

## Далее

- [Контракт конкурентности и жизненного цикла](./concurrency-contract)
- [Стандартный пайплайн](./standard-pipeline)
- [Конфигурация](./configuration)
- [Справочник API](./api-reference)
