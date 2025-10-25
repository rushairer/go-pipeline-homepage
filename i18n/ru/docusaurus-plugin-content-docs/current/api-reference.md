---
sidebar_position: 4
---

# Справочник API

Полная документация API для Go Pipeline v2.

## Основные Интерфейсы

### PipelineChannel[T]

Определяет интерфейс доступа к каналу конвейера.

```go
type PipelineChannel[T any] interface {
    DataChan() chan<- T
    ErrorChan(capacity uint32) <-chan error
}
```

**Методы**:
- `DataChan()`: Возвращает канал данных только для записи
- `ErrorChan(capacity uint32)`: Возвращает канал ошибок только для чтения с указанной емкостью

### Performer

Определяет интерфейс для выполнения операций конвейера.

```go
type Performer interface {
    AsyncPerform(ctx context.Context) error
}
```

**Методы**:
- `AsyncPerform(ctx context.Context)`: Запускает асинхронное выполнение конвейера

### DataProcessor[T]

Определяет основной интерфейс для пакетной обработки данных.

```go
type DataProcessor[T any] interface {
    ProcessBatch(ctx context.Context, batchData []T) error
}
```

**Методы**:
- `ProcessBatch(ctx context.Context, batchData []T)`: Обрабатывает пакетные данные

### Pipeline[T]

Объединяет всю функциональность конвейера в универсальный интерфейс.

```go
type Pipeline[T any] interface {
    PipelineChannel[T]
    Performer
    DataProcessor[T]
    
    // Удобные методы API
    Start(ctx context.Context) (<-chan struct{}, <-chan error)
    Run(ctx context.Context, errorChanCapacity uint32) error
    
    // Динамическая настройка параметров
    SetFlushSize(n uint32)
    SetFlushInterval(d time.Duration)
    SetMaxConcurrentFlushes(n uint32)
}
```

## Типы Реализации

### StandardPipeline[T]

Стандартный конвейер пакетной обработки, данные обрабатываются пакетами по порядку.

```go
type StandardPipeline[T any] struct {
    // Детали внутренней реализации
}
```

**Конструктор**:
```go
func NewStandardPipeline[T any](
    config PipelineConfig,
    flushFunc func(ctx context.Context, batchData []T) error,
) *StandardPipeline[T]
```

**Конструктор по Умолчанию**:
```go
func NewDefaultStandardPipeline[T any](
    flushFunc func(ctx context.Context, batchData []T) error,
) *StandardPipeline[T]
```

### DeduplicationPipeline[T, K]

Конвейер пакетной обработки с дедупликацией, дедуплицирует на основе уникальных ключей.

```go
type DeduplicationPipeline[T any, K comparable] struct {
    // Детали внутренней реализации
}
```

**Конструктор**:
```go
func NewDeduplicationPipeline[T any, K comparable](
    config PipelineConfig,
    keyFunc func(T) K,
    flushFunc func(ctx context.Context, batchData []T) error,
) *DeduplicationPipeline[T, K]
```

**Конструктор по Умолчанию**:
```go
func NewDefaultDeduplicationPipeline[T any, K comparable](
    keyFunc func(T) K,
    flushFunc func(ctx context.Context, batchData []T) error,
) *DeduplicationPipeline[T, K]
```

## Конфигурация

### PipelineConfig

Структура конфигурации конвейера.

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

### Конструктор Конфигурации

```go
func NewPipelineConfig() PipelineConfig
```

Возвращает новую конфигурацию с оптимизированными значениями по умолчанию.

### Методы Конфигурации

```go
func (c PipelineConfig) WithBufferSize(size uint32) PipelineConfig
func (c PipelineConfig) WithFlushSize(size uint32) PipelineConfig
func (c PipelineConfig) WithFlushInterval(interval time.Duration) PipelineConfig
func (c PipelineConfig) WithDrainOnCancel(enabled bool) PipelineConfig
func (c PipelineConfig) WithDrainGracePeriod(d time.Duration) PipelineConfig
func (c PipelineConfig) WithFinalFlushOnCloseTimeout(d time.Duration) PipelineConfig
func (c PipelineConfig) WithMaxConcurrentFlushes(n uint32) PipelineConfig
```

## Детали Методов

### Метод Start

Удобный API для асинхронного выполнения.

```go
func (p *Pipeline[T]) Start(ctx context.Context) (<-chan struct{}, <-chan error)
```

**Параметры**:
- `ctx`: Контекст для управления жизненным циклом конвейера

**Возвращает**:
- `<-chan struct{}`: Канал завершения, закрывается при завершении конвейера
- `<-chan error`: Канал ошибок для получения ошибок обработки

**Пример Использования**:
```go
pipeline := gopipeline.NewDefaultStandardPipeline(flushFunc)
done, errs := pipeline.Start(ctx)

// Прослушивание ошибок
go func() {
    for err := range errs {
        log.Printf("Ошибка обработки: %v", err)
    }
}()

// Добавление данных
dataChan := pipeline.DataChan()
go func() {
    defer close(dataChan)
    for i := 0; i < 100; i++ {
        dataChan <- i
    }
}()

// Ожидание завершения
<-done
```

### Метод Run

Удобный API для синхронного выполнения.

```go
func (p *Pipeline[T]) Run(ctx context.Context, errorChanCapacity uint32) error
```

**Параметры**:
- `ctx`: Контекст для управления жизненным циклом конвейера
- `errorChanCapacity`: Емкость канала ошибок

**Возвращает**:
- `error`: Первая ошибка, встреченная во время выполнения, или nil при успехе

**Пример Использования**:
```go
pipeline := gopipeline.NewDefaultStandardPipeline(flushFunc)

// Добавление данных
dataChan := pipeline.DataChan()
go func() {
    defer close(dataChan)
    for i := 0; i < 100; i++ {
        dataChan <- i
    }
}()

// Синхронное выполнение
if err := pipeline.Run(ctx, 128); err != nil {
    log.Printf("Ошибка выполнения конвейера: %v", err)
}
```

### Метод AsyncPerform

Традиционный API асинхронного выполнения.

```go
func (p *Pipeline[T]) AsyncPerform(ctx context.Context) error
```

**Параметры**:
- `ctx`: Контекст для управления жизненным циклом конвейера

**Возвращает**:
- `error`: Ошибка при неудачном запуске

**Пример Использования**:
```go
pipeline := gopipeline.NewDefaultStandardPipeline(flushFunc)

// Запуск конвейера
if err := pipeline.AsyncPerform(ctx); err != nil {
    log.Fatalf("Не удалось запустить конвейер: %v", err)
}

// Обработка ошибок
go func() {
    for err := range pipeline.ErrorChan(100) {
        log.Printf("Ошибка обработки: %v", err)
    }
}()

// Добавление данных
dataChan := pipeline.DataChan()
for i := 0; i < 100; i++ {
    dataChan <- i
}
close(dataChan)
```

### Динамическая Настройка Параметров

#### SetFlushSize

Динамически настроить размер пакета во время выполнения.

```go
func (p *Pipeline[T]) SetFlushSize(n uint32)
```

**Параметры**:
- `n`: Новый размер пакета

**Примечания**:
- Изменения не влияют на пакеты, которые в данный момент строятся
- Потокобезопасная операция

#### SetFlushInterval

Динамически настроить интервал сброса во время выполнения.

```go
func (p *Pipeline[T]) SetFlushInterval(d time.Duration)
```

**Параметры**:
- `d`: Новый интервал сброса

**Примечания**:
- Изменения вступают в силу при следующем сбросе таймера
- Потокобезопасная операция

#### SetMaxConcurrentFlushes

Динамически настроить максимальное количество одновременных сбросов во время выполнения.

```go
func (p *Pipeline[T]) SetMaxConcurrentFlushes(n uint32)
```

**Параметры**:
- `n`: Максимальное количество одновременных сбросов (0 означает неограниченно)

**Примечания**:
- Изменения вступают в силу немедленно
- Потокобезопасная операция

## Шаблоны Использования

### Базовый Шаблон Использования

```go
// 1. Создать конвейер
pipeline := gopipeline.NewDefaultStandardPipeline(
    func(ctx context.Context, batchData []int) error {
        // Обработать пакетные данные
        fmt.Printf("Обработка %d элементов: %v\n", len(batchData), batchData)
        return nil
    },
)

// 2. Запустить конвейер
ctx, cancel := context.WithTimeout(context.Background(), time.Second*10)
defer cancel()

done, errs := pipeline.Start(ctx)

// 3. Обработать ошибки
go func() {
    for err := range errs {
        log.Printf("Ошибка: %v", err)
    }
}()

// 4. Добавить данные
dataChan := pipeline.DataChan()
go func() {
    defer close(dataChan) // Кто пишет, тот закрывает
    for i := 0; i < 100; i++ {
        select {
        case dataChan <- i:
        case <-ctx.Done():
            return
        }
    }
}()

// 5. Ждать завершения
<-done
```

### Шаблон Пользовательской Конфигурации

```go
// Создать пользовательскую конфигурацию
config := gopipeline.NewPipelineConfig().
    WithBufferSize(200).
    WithFlushSize(100).
    WithFlushInterval(time.Millisecond * 100).
    WithDrainOnCancel(true).
    WithDrainGracePeriod(time.Second * 5)

// Создать конвейер с пользовательской конфигурацией
pipeline := gopipeline.NewStandardPipeline(config, flushFunc)

// Использовать конвейер...
```

### Шаблон Дедупликации

```go
type User struct {
    ID   int
    Name string
}

// Создать конвейер дедупликации
pipeline := gopipeline.NewDefaultDeduplicationPipeline(
    func(user User) int { return user.ID }, // Функция ключа
    func(ctx context.Context, users []User) error {
        // Обработать дедуплицированных пользователей
        fmt.Printf("Обработка %d уникальных пользователей\n", len(users))
        return nil
    },
)

// Использовать конвейер...
```

### Шаблон Обработки Ошибок

```go
pipeline := gopipeline.NewDefaultStandardPipeline(flushFunc)

// Запустить конвейер
done, errs := pipeline.Start(ctx)

// Комплексная обработка ошибок
go func() {
    for err := range errs {
        // Записать ошибку
        log.Printf("Ошибка конвейера: %v", err)
        
        // Реализовать логику повтора или оповещения
        if isRetryableError(err) {
            // Реализовать логику повтора
        } else {
            // Отправить оповещение
            sendAlert(err)
        }
    }
}()

// Добавить данные и ждать завершения
// ...
```

### Шаблон Динамической Настройки

```go
pipeline := gopipeline.NewDefaultStandardPipeline(flushFunc)

// Запустить горутину мониторинга и настройки
go func() {
    ticker := time.NewTicker(time.Second * 30)
    defer ticker.Stop()
    
    for range ticker.C {
        load := getSystemLoad()
        memUsage := getMemoryUsage()
        
        switch {
        case load > 0.8:
            // Высокая нагрузка: уменьшить размер пакета, увеличить частоту
            pipeline.SetFlushSize(25)
            pipeline.SetFlushInterval(25 * time.Millisecond)
            
        case memUsage > 0.7:
            // Высокое использование памяти: уменьшить размер пакета
            pipeline.SetFlushSize(30)
            pipeline.SetFlushInterval(50 * time.Millisecond)
            
        default:
            // Нормальная ситуация: использовать стандартную конфигурацию
            pipeline.SetFlushSize(50)
            pipeline.SetFlushInterval(50 * time.Millisecond)
        }
    }
}()

// Использовать конвейер...
```

## Типы Ошибок

### Распространенные Сценарии Ошибок

1. **Отмена Контекста**: Когда контекст отменяется во время обработки
2. **Ошибки Функции Сброса**: Ошибки, возвращаемые пользовательской функцией сброса
3. **Закрытие Канала**: Ошибки, связанные с неправильным управлением каналами
4. **Ошибки Конфигурации**: Недопустимые параметры конфигурации

### Лучшие Практики Обработки Ошибок

```go
func handlePipelineError(err error) {
    switch {
    case errors.Is(err, context.Canceled):
        log.Println("Конвейер отменен")
    case errors.Is(err, context.DeadlineExceeded):
        log.Println("Таймаут конвейера")
    default:
        log.Printf("Ошибка конвейера: %v", err)
    }
}
```

## Соображения Производительности

### Использование Памяти

- **BufferSize**: Влияет на использование памяти внутренних каналов
- **FlushSize**: Влияет на использование памяти пакетных данных
- **Канал Ошибок**: Неограниченные каналы ошибок могут вызвать утечки памяти

### Использование CPU

- **FlushInterval**: Слишком малые интервалы увеличивают использование CPU
- **MaxConcurrentFlushes**: Баланс между параллелизмом и использованием ресурсов

### Оптимизация Пропускной Способности

```go
// Конфигурация высокой производительности
config := gopipeline.NewPipelineConfig().
    WithBufferSize(1000).
    WithFlushSize(200).
    WithFlushInterval(time.Millisecond * 200).
    WithMaxConcurrentFlushes(10)
```

### Оптимизация Задержки

```go
// Конфигурация низкой задержки
config := gopipeline.NewPipelineConfig().
    WithBufferSize(50).
    WithFlushSize(10).
    WithFlushInterval(time.Millisecond * 10).
    WithMaxConcurrentFlushes(1)
```

## Потокобезопасность

Все операции конвейера являются потокобезопасными:

- **Канал Данных**: Безопасен для одновременных записей
- **Канал Ошибок**: Безопасен для одновременных чтений
- **Динамические Настройки**: Все методы SetXxx являются потокобезопасными
- **Методы Конвейера**: Все публичные методы являются потокобезопасными

## Управление Жизненным Циклом

### Последовательность Запуска

1. Создать конвейер с конфигурацией
2. Запустить конвейер используя `Start()` или `AsyncPerform()`
3. Настроить обработку ошибок
4. Начать производство данных

### Последовательность Завершения

1. Остановить производство данных
2. Закрыть канал данных (следуя принципу "кто пишет, тот закрывает")
3. Ждать завершения конвейера
4. Обработать оставшиеся ошибки

### Корректное Завершение

```go
// Включить корректное завершение
config := gopipeline.NewPipelineConfig().
    WithDrainOnCancel(true).
    WithDrainGracePeriod(time.Second * 5).
    WithFinalFlushOnCloseTimeout(time.Second * 10)

pipeline := gopipeline.NewStandardPipeline(config, flushFunc)

// Использовать контекст с таймаутом для контролируемого завершения
ctx, cancel := context.WithTimeout(context.Background(), time.Minute)
defer cancel()

done, errs := pipeline.Start(ctx)

// Обработать сигнал завершения
c := make(chan os.Signal, 1)
signal.Notify(c, os.Interrupt, syscall.SIGTERM)

select {
case <-c:
    log.Println("Получен сигнал завершения, инициация корректного завершения...")
    cancel() // Это запустит очистку если DrainOnCancel равно true
case <-done:
    log.Println("Конвейер завершился нормально")
}
```

## Руководство по Миграции

### С v1 на v2

Ключевые изменения при миграции с v1:

1. **Поддержка Дженериков**: Обновить объявления типов для использования дженериков
2. **Новая Конфигурация**: Использовать новую структуру `PipelineConfig`
3. **Удобный API**: Рассмотреть использование новых методов `Start()` и `Run()`
4. **Динамическая Настройка**: Использовать новые функции настройки параметров во время выполнения

### Пример Миграции

**Код v1**:
```go
// Стиль v1 (псевдокод)
pipeline := oldpipeline.New(config, flushFunc)
pipeline.Start()
```

**Код v2**:
```go
// Стиль v2
pipeline := gopipeline.NewDefaultStandardPipeline(flushFunc)
done, errs := pipeline.Start(ctx)
```

## Отладка и Мониторинг

### Включить Отладочное Логирование

```go
// Добавить отладочное логирование в функцию сброса
flushFunc := func(ctx context.Context, batchData []Data) error {
    log.Printf("Обработка пакета из %d элементов", len(batchData))
    
    start := time.Now()
    err := actualProcessing(batchData)
    duration := time.Since(start)
    
    log.Printf("Обработка пакета заняла %v", duration)
    return err
}
```

### Сбор Метрик

```go
type PipelineMetrics struct {
    TotalBatches    int64
    TotalItems      int64
    TotalErrors     int64
    AverageLatency  time.Duration
    LastBatchSize   int
}

func collectMetrics(pipeline Pipeline[Data]) PipelineMetrics {
    // Реализовать логику сбора метрик
    return PipelineMetrics{}
}
```

## Резюме Лучших Практик

1. **Использовать Конфигурацию по Умолчанию**: Начинать с умолчаний и настраивать по мере необходимости
2. **Обрабатывать Ошибки**: Всегда потреблять канал ошибок для предотвращения утечек горутин
3. **Следовать Правилам Каналов**: Принцип "кто пишет, тот закрывает"
4. **Мониторить Производительность**: Отслеживать ключевые метрики и настраивать конфигурацию
5. **Корректное Завершение**: Использовать отмену контекста и настройки очистки
6. **Тестировать под Нагрузкой**: Валидировать конфигурацию с реалистичными рабочими нагрузками
7. **Документировать Конфигурацию**: Записывать выборы конфигурации и результаты тестов