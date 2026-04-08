---
sidebar_position: 1
---

# Введение в Go Pipeline v2

Go Pipeline v2 — высокопроизводительный Go-фреймворк для пакетной обработки с дженериками, безопасной конкурентностью, flush по размеру и времени, корректным завершением и режимами standard / deduplication.

## Основные возможности

- Дженерики Go 1.20+
- Автоматический flush по размеру и интервалу
- Удобные API `Start()` и `Run()`
- `DrainOnCancel`, `FinalFlushOnCloseTimeout`, `MaxConcurrentFlushes`
- Hooks для логов и метрик

## Установка

```bash
go get github.com/rushairer/go-pipeline/v2@latest
```

## Семантика выполнения

- Ожидайте `done`, который возвращает `Start(ctx)`.
- Чтение `errs` / `ErrorChan()` рекомендуется, но не обязательно.
- Первый вызов `ErrorChan(size)` определяет размер буфера.
- `MaxConcurrentFlushes` также является механизмом жесткого backpressure.

## Что изменилось в 2.2.4

- Повторное использование контейнеров batch на синхронных путях
- Измерение длительности flush только при включенном `MetricsHook`
- Явное описание жесткого backpressure у `MaxConcurrentFlushes`
- Исправления документации по `done`, `ErrorChan` и benchmark-командам
