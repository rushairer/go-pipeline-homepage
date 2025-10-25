---
sidebar_position: 3
---

# Руководство по Конфигурации

Это руководство подробно описывает все доступные параметры конфигурации в Go Pipeline v2 и их случаи использования.

## Структура Конфигурации

```go
type PipelineConfig struct {
    BufferSize               uint32        // Емкость буферного канала (по умолчанию: 100)
    FlushSize                uint32        // Максимальная емкость для данных пакетной обработки (по умолчанию: 50)
    FlushInterval            time.Duration // Временной интервал для запланированного обновления (по умолчанию: 50ms)
    DrainOnCancel            bool          // Выполнять ли ограниченную по времени очистку при отмене (по умолчанию false)
    DrainGracePeriod         time.Duration // Максимальное временное окно для очистки
    FinalFlushOnCloseTimeout time.Duration // Таймаут финального сброса для пути закрытия канала (0 означает отключено)
    MaxConcurrentFlushes     uint32        // Максимальное количество одновременных асинхронных сбросов (0 означает неограниченно)
}
```

## Подробные Параметры

### BufferSize (Размер Буфера)

**Тип**: `uint32`  
**По умолчанию**: `100`  
**Описание**: Емкость внутреннего буферного канала

```go
config := gopipeline.NewPipelineConfig().
    WithBufferSize(200) // Установить размер буфера в 200
```

**Рекомендации**:
- Должен быть >= `FlushSize * 2` для избежания блокировки
- Для высокой пропускной способности: увеличить до 500-1000
- Для низкого использования памяти: уменьшить до 50-100
- Мониторить использование памяти при настройке

### FlushSize (Размер Пакета)

**Тип**: `uint32`  
**По умолчанию**: `50`  
**Описание**: Максимальное количество элементов в каждом пакете

```go
config := gopipeline.NewPipelineConfig().
    WithFlushSize(100) // Обрабатывать 100 элементов за раз
```

**Рекомендации**:
- Большие пакеты = лучшая пропускная способность, более высокая задержка
- Меньшие пакеты = более низкая задержка, сниженная пропускная способность
- Для операций с базой данных: 50-200
- Для API вызовов: 10-50
- Тестировать с вашей конкретной рабочей нагрузкой

### FlushInterval (Интервал Сброса)

**Тип**: `time.Duration`  
**По умолчанию**: `50ms`  
**Описание**: Максимальный временной интервал перед принудительным сбросом

```go
config := gopipeline.NewPipelineConfig().
    WithFlushInterval(time.Millisecond * 100) // Сброс каждые 100ms
```

**Рекомендации**:
- Приложения реального времени: 10-50ms
- Пакетная обработка: 100-1000ms
- Балансировать задержку против пропускной способности
- Учитывать требования SLA

### DrainOnCancel (Очистка при Отмене)

**Тип**: `bool`  
**По умолчанию**: `false`  
**Описание**: Выполнять ограниченную по времени очистку при отмене контекста

```go
config := gopipeline.NewPipelineConfig().
    WithDrainOnCancel(true).
    WithDrainGracePeriod(time.Second * 5) // 5-секундный период отсрочки
```

**Случаи использования**:
- Включить для критических данных
- Отключить для быстрого завершения
- Использовать с `DrainGracePeriod` для контроля таймаута

### DrainGracePeriod (Период Отсрочки Очистки)

**Тип**: `time.Duration`  
**По умолчанию**: `0` (без ограничений)  
**Описание**: Максимальное время, выделенное для очистки при отмене

```go
config := gopipeline.NewPipelineConfig().
    WithDrainOnCancel(true).
    WithDrainGracePeriod(time.Second * 10) // Максимум 10 секунд для очистки
```

### FinalFlushOnCloseTimeout (Таймаут Финального Сброса)

**Тип**: `time.Duration`  
**По умолчанию**: `0` (отключено)  
**Описание**: Таймаут для финального сброса при закрытии канала

```go
config := gopipeline.NewPipelineConfig().
    WithFinalFlushOnCloseTimeout(time.Second * 30) // 30-секундный таймаут
```

### MaxConcurrentFlushes (Максимальные Одновременные Сбросы)

**Тип**: `uint32`  
**По умолчанию**: `0` (неограниченно)  
**Описание**: Ограничивает количество одновременных асинхронных сбросов

```go
config := gopipeline.NewPipelineConfig().
    WithMaxConcurrentFlushes(5) // Максимум 5 одновременных сбросов
```

## Удобные Методы Конфигурации

### Цепочечные Методы

```go
config := gopipeline.NewPipelineConfig().
    WithBufferSize(200).
    WithFlushSize(100).
    WithFlushInterval(time.Millisecond * 100).
    WithDrainOnCancel(true).
    WithDrainGracePeriod(time.Second * 5).
    WithFinalFlushOnCloseTimeout(time.Second * 30).
    WithMaxConcurrentFlushes(3)
```

### Конфигурация через Структуру

```go
config := gopipeline.PipelineConfig{
    BufferSize:               200,
    FlushSize:                100,
    FlushInterval:            time.Millisecond * 100,
    DrainOnCancel:            true,
    DrainGracePeriod:         time.Second * 5,
    FinalFlushOnCloseTimeout: time.Second * 30,
    MaxConcurrentFlushes:     3,
}
```

## Предустановленные Конфигурации

### Конфигурация Высокой Производительности

```go
// Оптимизировано для максимальной пропускной способности
highThroughputConfig := gopipeline.NewPipelineConfig().
    WithBufferSize(1000).
    WithFlushSize(200).
    WithFlushInterval(time.Millisecond * 200).
    WithMaxConcurrentFlushes(10)
```

### Конфигурация Низкой Задержки

```go
// Оптимизировано для минимальной задержки
lowLatencyConfig := gopipeline.NewPipelineConfig().
    WithBufferSize(50).
    WithFlushSize(10).
    WithFlushInterval(time.Millisecond * 10).
    WithMaxConcurrentFlushes(1)
```

### Сбалансированная Конфигурация

```go
// Баланс между пропускной способностью и задержкой
balancedConfig := gopipeline.NewPipelineConfig().
    WithBufferSize(100).
    WithFlushSize(50).
    WithFlushInterval(time.Millisecond * 50).
    WithMaxConcurrentFlushes(3)
```

### Надежная Конфигурация

```go
// С очисткой и таймаутами для надежности
robustConfig := gopipeline.NewPipelineConfig().
    WithBufferSize(200).
    WithFlushSize(50).
    WithFlushInterval(time.Millisecond * 100).
    WithDrainOnCancel(true).
    WithDrainGracePeriod(time.Second * 10).
    WithFinalFlushOnCloseTimeout(time.Second * 30).
    WithMaxConcurrentFlushes(5)
```

## Динамическая Настройка Параметров

Go Pipeline v2 поддерживает безопасную настройку ключевых параметров во время выполнения:

```go
// Настроить размер пакета во время выполнения
pipeline.SetFlushSize(100)

// Настроить интервал сброса во время выполнения
pipeline.SetFlushInterval(time.Millisecond * 200)

// Настроить максимальное количество одновременных сбросов
pipeline.SetMaxConcurrentFlushes(8)
```

## Соображения Производительности

### Соотношение BufferSize и FlushSize

```go
// Рекомендуется: BufferSize >= FlushSize * 2
config := gopipeline.NewPipelineConfig().
    WithBufferSize(200).  // 200 >= 100 * 2
    WithFlushSize(100)
```

### Оптимизация Памяти против Производительности

```go
// Высокое использование памяти, высокая производительность
config := gopipeline.NewPipelineConfig().
    WithBufferSize(1000).
    WithFlushSize(200)

// Низкое использование памяти, умеренная производительность
config := gopipeline.NewPipelineConfig().
    WithBufferSize(100).
    WithFlushSize(25)
```

## Обработка Ошибок и Мониторинг

### Конфигурация с Обработкой Ошибок

```go
config := gopipeline.NewPipelineConfig().
    WithBufferSize(200).
    WithFlushSize(50).
    WithDrainOnCancel(true).
    WithDrainGracePeriod(time.Second * 5)

pipeline := gopipeline.NewStandardPipeline(config, flushFunc)

// Мониторить ошибки
go func() {
    for err := range pipeline.ErrorChan(100) {
        log.Printf("Ошибка конвейера: %v", err)
        // Реализовать логику повтора или оповещения
    }
}()
```

## Лучшие Практики

1. **Начинать с Значений по Умолчанию**: Использовать конфигурацию по умолчанию и настраивать по мере необходимости
2. **Тестировать под Нагрузкой**: Валидировать конфигурацию с реалистичными рабочими нагрузками
3. **Мониторить Метрики**: Отслеживать пропускную способность, задержку и использование памяти
4. **Постепенная Настройка**: Изменять один параметр за раз и измерять воздействие
5. **Учитывать Ограничения**: Балансировать производительность, память и бизнес-требования

## Устранение Неполадок

### Общие Проблемы

**Медленный Конвейер**:
- Увеличить `FlushSize`
- Уменьшить `FlushInterval`
- Увеличить `MaxConcurrentFlushes`

**Высокое Использование Памяти**:
- Уменьшить `BufferSize`
- Уменьшить `FlushSize`
- Реализовать противодавление

**Потеря Данных при Завершении**:
- Включить `DrainOnCancel`
- Установить подходящий `DrainGracePeriod`
- Использовать `FinalFlushOnCloseTimeout`

## Примеры Конфигурации по Случаям Использования

### Вставка в База Данных

```go
dbConfig := gopipeline.NewPipelineConfig().
    WithBufferSize(500).
    WithFlushSize(100).
    WithFlushInterval(time.Millisecond * 200).
    WithDrainOnCancel(true).
    WithDrainGracePeriod(time.Second * 10)
```

### API Вызовы

```go
apiConfig := gopipeline.NewPipelineConfig().
    WithBufferSize(100).
    WithFlushSize(20).
    WithFlushInterval(time.Millisecond * 100).
    WithMaxConcurrentFlushes(5)
```

### Обработка Логов

```go
logConfig := gopipeline.NewPipelineConfig().
    WithBufferSize(1000).
    WithFlushSize(200).
    WithFlushInterval(time.Second * 1).
    WithMaxConcurrentFlushes(3)
```

### Обработка в Реальном Времени

```go
realtimeConfig := gopipeline.NewPipelineConfig().
    WithBufferSize(50).
    WithFlushSize(10).
    WithFlushInterval(time.Millisecond * 10).
    WithMaxConcurrentFlushes(1)
```