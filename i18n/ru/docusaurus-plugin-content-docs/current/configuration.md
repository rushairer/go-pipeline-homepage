---
sidebar_position: 4
---

# Руководство по конфигурации

Этот документ предоставляет подробную информацию о параметрах конфигурации Go Pipeline v2 и лучших практиках.

## Структура конфигурации

```go
type PipelineConfig struct {
    BufferSize    uint32        // Емкость канала буфера
    FlushSize     uint32        // Максимальная емкость данных пакетной обработки
    FlushInterval time.Duration // Временной интервал для запланированного обновления
}
```

## Конфигурация по умолчанию

На основе бенчмарков производительности, Go Pipeline v2 предоставляет оптимизированную конфигурацию по умолчанию:

```go
const (
    defaultBufferSize    = 100                   // Размер буфера
    defaultFlushSize     = 50                    // Размер пакета
    defaultFlushInterval = time.Millisecond * 50 // Интервал сброса
)
```

### Использование конфигурации по умолчанию

Вы можете использовать функцию `NewPipelineConfig()` для создания конфигурации со значениями по умолчанию, затем настроить конкретные параметры:

```go
// Создать конфигурацию со значениями по умолчанию
config := gopipeline.NewPipelineConfig()

// Использовать значения по умолчанию напрямую
pipeline := gopipeline.NewStandardPipeline(config, flushFunc)

// Или использовать цепочечные методы для настройки конкретных параметров
config = gopipeline.NewPipelineConfig().
    WithFlushInterval(time.Millisecond * 10).
    WithBufferSize(200)

pipeline = gopipeline.NewStandardPipeline(config, flushFunc)
```

Доступные методы конфигурации:
- `NewPipelineConfig()` - Создать конфигурацию со значениями по умолчанию
- `WithBufferSize(size uint32)` - Установить размер буфера
- `WithFlushSize(size uint32)` - Установить размер пакета
- `WithFlushInterval(interval time.Duration)` - Установить интервал сброса

## Детали параметров конфигурации

### BufferSize (Размер буфера)

**Назначение**: Контролирует размер буфера внутреннего канала данных

**Значение по умолчанию**: 100

**Рекомендуемые значения**: 
- Должно быть >= FlushSize * 2 для избежания блокировки
- Может быть соответственно увеличено для сценариев высокой конкурентности

```go
standardConfig := gopipeline.PipelineConfig{
    BufferSize:    200,                   // Рекомендуется 2-4 раза FlushSize
    FlushSize:     50,                    // Стандартный размер пакета
    FlushInterval: time.Millisecond * 50, // Стандартный интервал сброса
}
```

**Влияние**:
- Слишком мало: Может вызвать блокировку записи
- Слишком много: Увеличивает использование памяти и задерживает время остановки

### FlushSize (Размер пакета)

**Назначение**: Контролирует количество данных в каждой пакетной обработке

**Значение по умолчанию**: 50

**Рекомендуемые значения**:
- Общие сценарии: 20-100
- Сценарии высокой пропускной способности: 100-500
- Сценарии низкой задержки: 10-50

```go
// Примеры конфигурации для разных сценариев
// Сценарий высокой пропускной способности
configВысокойПропускнойСпособности := gopipeline.PipelineConfig{
    BufferSize:    400,                   // Размер буфера 2x FlushSize
    FlushSize:     200,                   // Большая пакетная обработка
    FlushInterval: time.Millisecond * 100, // Умеренный интервал
}

// Сценарий низкой задержки
configНизкойЗадержки := gopipeline.PipelineConfig{
    BufferSize:    50,                    // Маленький буфер
    FlushSize:     20,                    // Маленькая пакетная обработка
    FlushInterval: time.Millisecond * 10, // Короткий интервал
}
```

**Влияние**:
- Слишком мало: Увеличивает частоту обработки, снижает пропускную способность
- Слишком много: Увеличивает задержку и использование памяти

### FlushInterval (Интервал сброса)

**Назначение**: Контролирует временной интервал для запланированного обновления

**Значение по умолчанию**: 50ms

**Рекомендуемые значения**:
- Сценарии низкой задержки: 10-50ms
- Сбалансированные сценарии: 50-200ms
- Сценарии высокой пропускной способности: 200ms-1s

```go
// Примеры конфигурации для разных сценариев
// Сценарий низкой задержки
configНизкойЗадержки := gopipeline.PipelineConfig{
    BufferSize:    50,                    // Маленький буфер
    FlushSize:     10,                    // Маленький пакет
    FlushInterval: time.Millisecond * 10, // Очень короткий интервал
}

// Сценарий высокой пропускной способности
configВысокойПропускнойСпособности := gopipeline.PipelineConfig{
    BufferSize:    1000,              // Большой буфер
    FlushSize:     500,               // Большой пакет
    FlushInterval: time.Second,       // Длинный интервал
}
```

**Влияние**:
- Слишком мало: Увеличивает использование CPU, может вызвать частую обработку маленькими пакетами
- Слишком много: Увеличивает задержку обработки данных

## Конфигурация на основе сценариев

### Пакетная вставка в базу данных

```go
// Оптимизированная конфигурация для пакетной вставки в базу данных
dbConfig := gopipeline.PipelineConfig{
    BufferSize:    500,                    // Больший буфер
    FlushSize:     100,                    // Умеренный размер пакета
    FlushInterval: time.Millisecond * 200, // Умеренная задержка
}

pipeline := gopipeline.NewStandardPipeline(dbConfig,
    func(ctx context.Context, records []Record) error {
        return db.CreateInBatches(records, len(records)).Error
    },
)
```

### Пакетная обработка API-вызовов

```go
// Конфигурация для пакетной обработки API-вызовов
apiConfig := gopipeline.PipelineConfig{
    BufferSize:    100,                   // Умеренный буфер
    FlushSize:     20,                    // Меньший пакет (избежать лимитов API)
    FlushInterval: time.Millisecond * 50, // Низкая задержка
}

pipeline := gopipeline.NewStandardPipeline(apiConfig,
    func(ctx context.Context, requests []APIRequest) error {
        return batchCallAPI(requests)
    },
)
```

### Пакетная запись логов

```go
// Конфигурация для пакетной записи логов
logConfig := gopipeline.PipelineConfig{
    BufferSize:    1000,               // Большой буфер (высокий объем логов)
    FlushSize:     200,                // Большой пакет
    FlushInterval: time.Millisecond * 100, // Умеренная задержка
}

pipeline := gopipeline.NewStandardPipeline(logConfig,
    func(ctx context.Context, logs []LogEntry) error {
        return writeLogsToFile(logs)
    },
)
```

### Обработка данных в реальном времени

```go
// Конфигурация для обработки данных в реальном времени
realtimeConfig := gopipeline.PipelineConfig{
    BufferSize:    50,                    // Маленький буфер
    FlushSize:     10,                    // Маленький пакет
    FlushInterval: time.Millisecond * 10, // Очень низкая задержка
}

pipeline := gopipeline.NewStandardPipeline(realtimeConfig,
    func(ctx context.Context, events []Event) error {
        return processRealTimeEvents(events)
    },
)
```

## Руководство по настройке производительности

### 1. Определить цели производительности

Сначала уточните ваши цели производительности:

- **Приоритет пропускной способности**: Увеличить FlushSize и FlushInterval
- **Приоритет задержки**: Уменьшить FlushSize и FlushInterval
- **Приоритет памяти**: Уменьшить BufferSize и FlushSize

### 2. Бенчмаркинг

Используйте бенчмарки для проверки эффективности конфигурации:

```go
func BenchmarkPipelineConfig(b *testing.B) {
    configs := []gopipeline.PipelineConfig{
        {BufferSize: 50, FlushSize: 25, FlushInterval: time.Millisecond * 25},
        {BufferSize: 100, FlushSize: 50, FlushInterval: time.Millisecond * 50},
        {BufferSize: 200, FlushSize: 100, FlushInterval: time.Millisecond * 100},
    }
    
    for i, config := range configs {
        b.Run(fmt.Sprintf("Config%d", i), func(b *testing.B) {
            pipeline := gopipeline.NewStandardPipeline(config, 
                func(ctx context.Context, data []int) error {
                    // Симулировать обработку
                    time.Sleep(time.Microsecond * 100)
                    return nil
                })
            
            // Логика бенчмарка...
        })
    }
}
```

### 3. Мониторинг метрик

Мониторьте ключевые метрики для оптимизации конфигурации:

```go
type PipelineMetrics struct {
    TotalProcessed   int64
    BatchCount       int64
    AverageLatency   time.Duration
    ErrorCount       int64
    MemoryUsage      int64
}

func monitorPipeline(pipeline Pipeline[Data]) {
    ticker := time.NewTicker(time.Second * 10)
    defer ticker.Stop()
    
    for range ticker.C {
        // Собрать и записать метрики
        metrics := collectMetrics(pipeline)
        log.Printf("Метрики пайплайна: %+v", metrics)
        
        // Настроить конфигурацию на основе метрик
        if metrics.AverageLatency > time.Millisecond*100 {
            // Рассмотреть уменьшение размера пакета или интервала
        }
    }
}
```

## Валидация конфигурации

### Проверка разумности конфигурации

```go
func validateConfig(config gopipeline.PipelineConfig) error {
    if config.BufferSize < config.FlushSize*2 {
        return fmt.Errorf("BufferSize (%d) должен быть как минимум 2x FlushSize (%d)", 
            config.BufferSize, config.FlushSize)
    }
    
    if config.FlushSize == 0 {
        return fmt.Errorf("FlushSize не может быть нулевым")
    }
    
    if config.FlushInterval <= 0 {
        return fmt.Errorf("FlushInterval должен быть положительным")
    }
    
    return nil
}
```

### Динамическая настройка конфигурации

```go
type DynamicPipeline struct {
    pipeline Pipeline[Data]
    config   gopipeline.PipelineConfig
    mutex    sync.RWMutex
}

func (dp *DynamicPipeline) UpdateConfig(newConfig gopipeline.PipelineConfig) error {
    if err := validateConfig(newConfig); err != nil {
        return err
    }
    
    dp.mutex.Lock()
    defer dp.mutex.Unlock()
    
    // Пересоздать пайплайн (фактическая реализация может потребовать более сложной логики)
    dp.config = newConfig
    // dp.pipeline = recreatePipeline(newConfig)
    
    return nil
}
```

## Общие проблемы и решения

### Проблема 1: Высокая задержка обработки данных

**Симптомы**: Время от добавления данных до завершения обработки слишком долгое

**Возможные причины**:
- FlushInterval установлен слишком большим
- FlushSize установлен слишком большим
- Время выполнения функции обработки слишком долгое

**Решения**:
```go
// Уменьшить интервал сброса и размер пакета
configНизкойЗадержки := gopipeline.PipelineConfig{
    BufferSize:    50,                    // Буфер адаптирован к маленьким пакетам
    FlushSize:     20,                    // Уменьшить размер пакета
    FlushInterval: time.Millisecond * 10, // Уменьшить интервал
}
```

### Проблема 2: Высокое использование памяти

**Симптомы**: Использование памяти программой продолжает расти

**Возможные причины**:
- BufferSize установлен слишком большим
- FlushSize установлен слишком большим (особенно для пайплайна дедупликации)
- Канал ошибок не потребляется

**Решения**:
```go
// Уменьшить размер буфера и пакета
configОптимизированныйПоПамяти := gopipeline.PipelineConfig{
    BufferSize:    50,                    // Уменьшить буфер
    FlushSize:     25,                    // Уменьшить размер пакета
    FlushInterval: time.Millisecond * 50, // Сохранить умеренный интервал
}

// Обеспечить потребление канала ошибок
errorChan := pipeline.ErrorChan(10)
go func() {
    for {
        select {
        case err, ok := <-errorChan:
            if !ok {
                return
            }
            log.Printf("Ошибка: %v", err)
        case <-ctx.Done():
            return
        }
    }
}()
```

### Проблема 3: Недостаточная пропускная способность

**Симптомы**: Скорость обработки данных не может поспевать за скоростью генерации данных

**Возможные причины**:
- FlushSize установлен слишком маленьким
- FlushInterval установлен слишком маленьким
- BufferSize установлен слишком маленьким, вызывая блокировку

**Решения**:
```go
// Увеличить размер пакета и буфера
configВысокойПропускнойСпособности := gopipeline.PipelineConfig{
    BufferSize:    500,                    // Увеличить буфер
    FlushSize:     100,                    // Увеличить размер пакета
    FlushInterval: time.Millisecond * 100, // Умеренный интервал
}
```

## Резюме лучших практик

1. **Начать с конфигурации по умолчанию**: Конфигурация по умолчанию подходит для большинства сценариев
2. **Настраивать в соответствии с фактическими потребностями**: Настраивать согласно требованиям задержки, пропускной способности, памяти
3. **Проводить бенчмаркинг**: Использовать реальные данные для тестирования производительности
4. **Мониторить ключевые метрики**: Непрерывно мониторить метрики производительности
5. **Валидация конфигурации**: Обеспечить разумность параметров конфигурации
6. **Документировать конфигурацию**: Записывать причины выбора конфигурации и результаты тестов

## Следующие шаги

- [Справочник API](./api-reference) - Полная документация API
- [Стандартный пайплайн](./standard-pipeline) - Руководство по использованию стандартного пайплайна
- [Пайплайн дедупликации](./deduplication-pipeline) - Руководство по использованию пайплайна дедупликации