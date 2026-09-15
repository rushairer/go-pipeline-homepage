---
sidebar_position: 6
sidebar_label: Контракт конкурентности и жизненного цикла
---

# Контракт конкурентности и жизненного цикла

Эта страница фиксирует семантику конкурентности, жизненного цикла, backpressure и наблюдения за ошибками в `go-pipeline`.

## Цель дизайна

`go-pipeline` — лёгкая batching-примитива для непрерывной высокопроизводительной обработки больших потоков данных. Независимые batches не должны сериализоваться только ради упрощения учёта жизненного цикла.

Приоритеты: высокий стабильный throughput, изоляция batches, параллельный flush, ограниченная конкурентность с явным backpressure и неблокирующее наблюдение за ошибками.

## `AsyncPerform`

`AsyncPerform(ctx)` **не** означает, что сам вызов немедленно возвращается. Цикл приёма и накопления batch выполняется в вызывающей goroutine.

`Async` относится к flush: готовый batch может быть отправлен в отдельную goroutine, пока pipeline продолжает формировать следующие batches.

Для неблокирующего запуска вызывающей стороны используйте:

```go
done, errs := pipeline.Start(ctx)
```

`Start` запускает `AsyncPerform` в goroutine, не усиливая семантику завершения.

## `Done`

`Done()` и канал `done`, возвращаемый `Start(ctx)`, сигнализируют, что текущий **run loop завершён**.

В режиме `AsyncPerform` `done` намеренно **не** является глобальным join-барьером для всех уже отправленных async flush. Ядро не добавляет bookkeeping для каждого batch только ради такого барьера.

Если приложению нужна строгая гарантия «все побочные эффекты устойчиво завершены», такой completion barrier должен принадлежать processor или верхнему runtime.

## Ошибки

`flush` возвращает ошибку уровня batch/flush. `ErrorChan` работает неблокирующе и best-effort: при полном буфере событие ошибки может быть отброшено, чтобы не останавливать hot path. Это наблюдается через `MetricsHook.ErrorDropped()`.

`ErrorChan` подходит для логов, метрик и алертов, но не является durable failure queue, полным журналом ошибок или per-item result collector.

Если каждую ошибку необходимо сохранить, записывайте сбои в БД, Kafka, retry queue, файл или другой durable sink.

## Backpressure — часть дизайна

`BufferSize` ограничивает очередь входа, а `MaxConcurrentFlushes` — число async flush в полёте. При исчерпании ёмкости pipeline передаёт backpressure вверх по потоку вместо неограниченного роста goroutines или памяти.

## Контрактные тесты

`pipeline_concurrency_contract_test.go` фиксирует три гарантии: параллельные flush при доступной ёмкости, `Done` как завершение run loop, и отсутствие блокировки hot path при насыщенном `ErrorChan`.

## Не является целью

Ядро не является durable task queue, транзакционным workflow engine, exactly-once runtime, полным result collector или durable retry ledger.

Исходный контракт: [`CONCURRENCY_CONTRACT.md`](https://github.com/rushairer/go-pipeline/blob/main/CONCURRENCY_CONTRACT.md).
