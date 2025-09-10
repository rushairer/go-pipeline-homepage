---
sidebar_position: 5
---

# Справочник API

Этот документ предоставляет полный справочник API для Go Pipeline v2.

## Основные интерфейсы

### Pipeline[T any]

Основной интерфейс пайплайна, который объединяет всю функциональность пайплайна.

```go
type Pipeline[T any] interface {
    PipelineChannel[T]
    Performer[T]
    DataProcessor[T]
}
```

### PipelineChannel[T any]

Определяет интерфейс доступа к каналу пайплайна.

```go
type PipelineChannel[T any] interface {
    // DataChan возвращает канал для записи для добавления данных в пайплайн
    DataChan() chan<- T
    
    // ErrorChan возвращает канал только для чтения для получения информации об ошибках из пайплайна
    ErrorChan(size int) <-chan error
}
```

#### DataChan()

Возвращает канал ввода данных.

**Возвращаемое значение**: `chan<- T` - Канал только для записи для добавления данных

**Пример использования**:
```go
dataChan := pipeline.DataChan()
dataChan <- "some data"
close(dataChan) // Закрыть канал по завершении
```

#### ErrorChan(size int)

Возвращает канал вывода ошибок.

**Параметры**:
- `size int` - Размер буфера канала ошибок

**Возвращаемое значение**: `<-chan error` - Канал только для чтения для получения ошибок

**Пример использования**:
```go
errorChan := pipeline.ErrorChan(10)
go func() {
    for err := range errorChan {
        log.Printf("Ошибка пайплайна: %v", err)
    }
}()
```

### Performer[T any]

Определяет интерфейс для выполнения операций пайплайна.

```go
type Performer[T any] interface {
    // AsyncPerform выполняет операции пайплайна асинхронно
    AsyncPerform(ctx context.Context) error
    
    // SyncPerform выполняет операции пайплайна синхронно
    SyncPerform(ctx context.Context) error
}
```

#### AsyncPerform(ctx context.Context)

Выполняет операции пайплайна асинхронно, не блокирует вызывающий поток.

**Параметры**:
- `ctx context.Context` - Объект контекста для контроля жизненного цикла операции

**Возвращаемое значение**: `error` - Возвращает ошибку, если ctx отменен

**Пример использования**:
```go
ctx, cancel := context.WithTimeout(context.Background(), time.Minute)
defer cancel()

go func() {
    if err := pipeline.AsyncPerform(ctx); err != nil {
        log.Printf("Ошибка выполнения пайплайна: %v", err)
    }
}()
```

#### SyncPerform(ctx context.Context)

Выполняет операции пайплайна синхронно, блокирует до завершения или отмены.

**Параметры**:
- `ctx context.Context` - Объект контекста

**Возвращаемое значение**: `error` - Ошибка выполнения или ошибка отмены

**Пример использования**:
```go
ctx, cancel := context.WithTimeout(context.Background(), time.Minute)
defer cancel()

if err := pipeline.SyncPerform(ctx); err != nil {
    log.Printf("Ошибка выполнения пайплайна: %v", err)
}
```

### DataProcessor[T any]

Определяет основной интерфейс для пакетной обработки данных (в основном для внутренней реализации).

```go
type DataProcessor[T any] interface {
    initBatchData() any
    addToBatch(batchData any, data T) any
    flush(ctx context.Context, batchData any) error
    isBatchFull(batchData any) bool
    isBatchEmpty(batchData any) bool
}
```

## Типы конфигурации

### PipelineConfig

Структура конфигурации пайплайна.

```go
type PipelineConfig struct {
    BufferSize    uint32        // Емкость канала буфера (по умолчанию: 100)
    FlushSize     uint32        // Максимальная емкость данных пакетной обработки (по умолчанию: 50)
    FlushInterval time.Duration // Временной интервал для запланированного обновления (по умолчанию: 50ms)
}
```

**Описания полей**:
- `BufferSize`: Размер буфера внутреннего канала данных
- `FlushSize`: Максимальное количество данных на пакетную обработку
- `FlushInterval`: Временной интервал для запуска пакетной обработки

## API стандартного пайплайна

### Определения типов

```go
type FlushStandardFunc[T any] func(ctx context.Context, batchData []T) error

type StandardPipeline[T any] struct {
    *PipelineImpl[T]
    flushFunc FlushStandardFunc[T]
}
```

### Конструкторы

#### NewDefaultStandardPipeline[T any]

Создает стандартный пайплайн с конфигурацией по умолчанию.

```go
func NewDefaultStandardPipeline[T any](
    flushFunc FlushStandardFunc[T],
) *StandardPipeline[T]
```

**Параметры**:
- `flushFunc FlushStandardFunc[T]` - Функция пакетной обработки

**Возвращаемое значение**: `*StandardPipeline[T]` - Экземпляр стандартного пайплайна

**Пример использования**:
```go
pipeline := gopipeline.NewDefaultStandardPipeline(
    func(ctx context.Context, batchData []string) error {
        fmt.Printf("Обработка %d элементов: %v\n", len(batchData), batchData)
        return nil
    },
)
```

#### NewStandardPipeline[T any]

Создает стандартный пайплайн с пользовательской конфигурацией.

```go
func NewStandardPipeline[T any](
    config PipelineConfig,
    flushFunc FlushStandardFunc[T],
) *StandardPipeline[T]
```

**Параметры**:
- `config PipelineConfig` - Пользовательская конфигурация
- `flushFunc FlushStandardFunc[T]` - Функция пакетной обработки

**Возвращаемое значение**: `*StandardPipeline[T]` - Экземпляр стандартного пайплайна

**Пример использования**:
```go
standardConfig := gopipeline.PipelineConfig{
    BufferSize:    200,
    FlushSize:     100,
    FlushInterval: time.Millisecond * 100,
}

pipeline := gopipeline.NewStandardPipeline(standardConfig,
    func(ctx context.Context, batchData []string) error {
        return processData(batchData)
    },
)
```

## API пайплайна дедупликации

### Определения типов

```go
type KeyFunc[T any] func(T) string
type FlushDeduplicationFunc[T any] func(ctx context.Context, batchData []T) error

type DeduplicationPipeline[T any] struct {
    *PipelineImpl[T]
    keyFunc   KeyFunc[T]
    flushFunc FlushDeduplicationFunc[T]
}
```

### Конструкторы

#### NewDefaultDeduplicationPipeline[T any]

Создает пайплайн дедупликации с конфигурацией по умолчанию.

```go
func NewDefaultDeduplicationPipeline[T any](
    keyFunc KeyFunc[T],
    flushFunc FlushDeduplicationFunc[T],
) *DeduplicationPipeline[T]
```

**Параметры**:
- `keyFunc KeyFunc[T]` - Функция генерации уникального ключа
- `flushFunc FlushDeduplicationFunc[T]` - Функция пакетной обработки

**Возвращаемое значение**: `*DeduplicationPipeline[T]` - Экземпляр пайплайна дедупликации

**Пример использования**:
```go
pipeline := gopipeline.NewDefaultDeduplicationPipeline(
    func(user User) string {
        return user.Email // Использовать email как уникальный ключ
    },
    func(ctx context.Context, users []User) error {
        return processUsers(users)
    },
)
```

#### NewDeduplicationPipeline[T any]

Создает пайплайн дедупликации с пользовательской конфигурацией.

```go
func NewDeduplicationPipeline[T any](
    config PipelineConfig,
    keyFunc KeyFunc[T],
    flushFunc FlushDeduplicationFunc[T],
) *DeduplicationPipeline[T]
```

**Параметры**:
- `config PipelineConfig` - Пользовательская конфигурация
- `keyFunc KeyFunc[T]` - Функция генерации уникального ключа
- `flushFunc FlushDeduplicationFunc[T]` - Функция пакетной обработки

**Возвращаемое значение**: `*DeduplicationPipeline[T]` - Экземпляр пайплайна дедупликации

**Пример использования**:
```go
deduplicationConfig := gopipeline.PipelineConfig{
    BufferSize:    100,
    FlushSize:     50,
    FlushInterval: time.Millisecond * 100,
}

pipeline := gopipeline.NewDeduplicationPipeline(deduplicationConfig,
    func(product Product) string {
        return fmt.Sprintf("%s-%s", product.SKU, product.Version)
    },
    func(ctx context.Context, products []Product) error {
        return updateProducts(products)
    },
)
```

## Типы ошибок

### PipelineError

Базовый тип для ошибок, связанных с пайплайном.

```go
type PipelineError struct {
    Op  string // Имя операции
    Err error  // Исходная ошибка
}

func (e *PipelineError) Error() string {
    return fmt.Sprintf("pipeline %s: %v", e.Op, e.Err)
}

func (e *PipelineError) Unwrap() error {
    return e.Err
}
```

### Общие ошибки

- `ErrPipelineClosed`: Пайплайн закрыт
- `ErrContextCanceled`: Контекст был отменен
- `ErrFlushTimeout`: Таймаут операции сброса

## Шаблоны использования

### Базовый шаблон использования

```go
// 1. Создать пайплайн
pipeline := gopipeline.NewDefaultStandardPipeline(flushFunc)

// 2. Запустить асинхронную обработку
ctx, cancel := context.WithCancel(context.Background())
defer cancel()

go func() {
    if err := pipeline.AsyncPerform(ctx); err != nil {
        log.Printf("Ошибка пайплайна: %v", err)
    }
}()

// 3. Слушать ошибки
go func() {
    for err := range pipeline.ErrorChan(10) {
        log.Printf("Ошибка обработки: %v", err)
    }
}()

// 4. Добавить данные
dataChan := pipeline.DataChan()
for _, data := range inputData {
    dataChan <- data
}

// 5. Закрыть и дождаться завершения
close(dataChan)
time.Sleep(time.Second) // Дождаться завершения обработки
```

### Шаблон корректного завершения

```go
func gracefulShutdown(pipeline Pipeline[Data]) {
    // 1. Прекратить добавление новых данных
    close(pipeline.DataChan())
    
    // 2. Дождаться завершения обработки
    ctx, cancel := context.WithTimeout(context.Background(), time.Second*30)
    defer cancel()
    
    done := make(chan struct{})
    go func() {
        defer close(done)
        // Дождаться закрытия канала ошибок (указывает на завершение обработки)
        for range pipeline.ErrorChan(1) {
            // Потребить оставшиеся ошибки
        }
    }()
    
    select {
    case <-done:
        log.Println("Завершение пайплайна выполнено")
    case <-ctx.Done():
        log.Println("Таймаут завершения пайплайна")
    }
}
```

### Шаблон обработки ошибок

```go
func handlePipelineErrors(pipeline Pipeline[Data]) {
    errorChan := pipeline.ErrorChan(100)
    
    for err := range errorChan {
        switch e := err.(type) {
        case *PipelineError:
            log.Printf("Сбой операции пайплайна %s: %v", e.Op, e.Err)
            
        case *net.OpError:
            log.Printf("Сетевая ошибка: %v", e)
            // Может потребоваться повтор или резервная обработка
            
        default:
            log.Printf("Неизвестная ошибка: %v", err)
        }
    }
}
```

## Соображения производительности

### Использование памяти

- Стандартный пайплайн: Использование памяти пропорционально `BufferSize`
- Пайплайн дедупликации: Использование памяти пропорционально `FlushSize` (нужно хранить map)

### Безопасность конкурентности

- Все публичные API безопасны для конкурентности
- Можно записывать данные из нескольких горутин одновременно в `DataChan()`
- Канал ошибок может потребляться несколькими горутинами

### Очистка ресурсов

- Должен потреблять канал ошибок, иначе может вызвать утечки горутин
- Следует закрывать канал данных по завершении
- Рекомендуется использовать контекст для контроля жизненного цикла пайплайна

## Совместимость версий

Go Pipeline v2 требует:
- Go 1.18+ (поддержка дженериков)
- Обратная совместимость с Go 1.18-1.21

## Следующие шаги

- [Стандартный пайплайн](./standard-pipeline) - Подробное руководство по использованию стандартного пайплайна
- [Пайплайн дедупликации](./deduplication-pipeline) - Подробное руководство по использованию пайплайна дедупликации
- [Руководство по конфигурации](./configuration) - Подробные инструкции по параметрам конфигурации