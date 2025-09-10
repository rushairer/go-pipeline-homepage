---
sidebar_position: 3
---

# Deduplication Pipeline

The Deduplication Pipeline extends the Standard Pipeline with built-in deduplication capabilities. It automatically removes duplicate items based on configurable key extraction, making it ideal for scenarios where data uniqueness is critical.

## Basic Usage

### Creating a Deduplication Pipeline

```go
package main

import (
    "context"
    "fmt"
    "time"
    
    "github.com/rushairer/go-pipeline/v2"
)

type User struct {
    ID   int
    Name string
    Email string
}

func main() {
    // Create deduplication pipeline
    pipeline := gopipeline.NewDeduplicationPipeline(
        gopipeline.NewPipelineConfig(),
        func(ctx context.Context, users []User) error {
            fmt.Printf("Processing unique users: %v\n", users)
            return nil
        },
        func(user User) string {
            return user.Email // Use email as deduplication key
        },
    )
    
    // Start the pipeline
    ctx := context.Background()
    if err := pipeline.Start(ctx); err != nil {
        panic(err)
    }
    defer pipeline.Stop()
    
    // Add users (duplicates will be removed)
    pipeline.Add(User{ID: 1, Name: "Alice", Email: "alice@example.com"})
    pipeline.Add(User{ID: 2, Name: "Bob", Email: "bob@example.com"})
    pipeline.Add(User{ID: 3, Name: "Alice Smith", Email: "alice@example.com"}) // Duplicate
    
    time.Sleep(time.Second)
}
```

### Using Custom Configuration

```go
dedupConfig := gopipeline.NewPipelineConfig().
    SetBufferSize(200).
    SetFlushSize(50).
    SetFlushInterval(time.Millisecond * 100)

pipeline := gopipeline.NewDeduplicationPipeline(dedupConfig, processor, keyExtractor)
```

## Key Extraction Function

The key extraction function determines how items are deduplicated. It should return a unique string identifier for each item:

### Simple Key Extraction

```go
// Use ID field as key
func extractUserID(user User) string {
    return fmt.Sprintf("%d", user.ID)
}

// Use email as key
func extractUserEmail(user User) string {
    return user.Email
}
```

### Composite Key Extraction

```go
// Use multiple fields as composite key
func extractCompositeKey(order Order) string {
    return fmt.Sprintf("%s:%s:%s", 
        order.CustomerID, 
        order.ProductID, 
        order.Date.Format("2006-01-02"))
}
```

### Hash-based Key Extraction

```go
import (
    "crypto/md5"
    "encoding/json"
    "fmt"
)

func extractHashKey(item interface{}) string {
    data, _ := json.Marshal(item)
    hash := md5.Sum(data)
    return fmt.Sprintf("%x", hash)
}
```

## Deduplication Strategies

### 1. Keep First (Default)

The first occurrence of each unique key is kept:

```go
pipeline := gopipeline.NewDeduplicationPipeline(config, processor, keyExtractor)
// First item with each key is processed
```

### 2. Keep Last

Keep the most recent occurrence:

```go
// Custom implementation to keep last occurrence
type LastKeepDeduplicator struct {
    items map[string]DataItem
    order []string
}

func (d *LastKeepDeduplicator) Add(item DataItem) {
    key := extractKey(item)
    if _, exists := d.items[key]; !exists {
        d.order = append(d.order, key)
    }
    d.items[key] = item // Overwrites previous value
}
```

### 3. Merge Duplicates

Combine duplicate items:

```go
func mergeProcessor(ctx context.Context, items []DataItem) error {
    merged := make(map[string]DataItem)
    
    for _, item := range items {
        key := extractKey(item)
        if existing, exists := merged[key]; exists {
            merged[key] = mergeItems(existing, item)
        } else {
            merged[key] = item
        }
    }
    
    // Process merged items
    var uniqueItems []DataItem
    for _, item := range merged {
        uniqueItems = append(uniqueItems, item)
    }
    
    return processUniqueItems(ctx, uniqueItems)
}
```

## Memory Management

Deduplication pipelines use maps to store data, so memory usage scales with batch size:

### Memory-Optimized Configuration

```go
// Smaller batch sizes reduce memory usage
memoryOptimizedConfig := gopipeline.NewPipelineConfig().
    SetBufferSize(100).               // Moderate buffer
    SetFlushSize(50).                 // Smaller batches
    SetFlushInterval(time.Millisecond * 100)
```

### Large Dataset Handling

```go
// For large datasets, use shorter intervals
largeDatasetConfig := gopipeline.NewPipelineConfig().
    SetBufferSize(500).
    SetFlushSize(200).
    SetFlushInterval(time.Millisecond * 50) // Frequent flushing
```

## Performance Considerations

### Key Extraction Performance

Optimize key extraction for better performance:

```go
// Fast: Use existing string field
func fastKeyExtractor(user User) string {
    return user.Email
}

// Slower: String formatting
func slowKeyExtractor(user User) string {
    return fmt.Sprintf("user_%d_%s", user.ID, user.Email)
}

// Optimized: Pre-computed key
type UserWithKey struct {
    User
    Key string // Pre-computed during creation
}

func optimizedKeyExtractor(user UserWithKey) string {
    return user.Key
}
```

### Memory Usage Monitoring

```go
func monitorMemoryUsage(pipeline *gopipeline.DeduplicationPipeline) {
    stats := pipeline.GetStats()
    fmt.Printf("Unique items in buffer: %d\n", stats.UniqueItemCount)
    fmt.Printf("Duplicate items filtered: %d\n", stats.DuplicateCount)
    fmt.Printf("Memory usage estimate: %d KB\n", stats.EstimatedMemoryKB)
}
```

## Advanced Usage Examples

### Event Deduplication

```go
type Event struct {
    ID        string
    Type      string
    Timestamp time.Time
    Data      map[string]interface{}
}

func processUniqueEvents() {
    pipeline := gopipeline.NewDeduplicationPipeline(
        gopipeline.NewPipelineConfig(),
        func(ctx context.Context, events []Event) error {
            return storeEvents(events)
        },
        func(event Event) string {
            return event.ID // Deduplicate by event ID
        },
    )
    
    // Events with same ID will be deduplicated
    pipeline.Add(Event{ID: "evt1", Type: "click"})
    pipeline.Add(Event{ID: "evt2", Type: "view"})
    pipeline.Add(Event{ID: "evt1", Type: "click"}) // Duplicate, will be filtered
}
```

### User Activity Deduplication

```go
type UserActivity struct {
    UserID    string
    Action    string
    Timestamp time.Time
    SessionID string
}

func deduplicateUserActivities() {
    pipeline := gopipeline.NewDeduplicationPipeline(
        gopipeline.NewPipelineConfig(),
        processActivities,
        func(activity UserActivity) string {
            // Deduplicate by user and action within same minute
            minute := activity.Timestamp.Truncate(time.Minute)
            return fmt.Sprintf("%s:%s:%d", 
                activity.UserID, 
                activity.Action, 
                minute.Unix())
        },
    )
}
```

### Product Catalog Deduplication

```go
type Product struct {
    SKU         string
    Name        string
    Price       float64
    LastUpdated time.Time
}

func deduplicateProducts() {
    pipeline := gopipeline.NewDeduplicationPipeline(
        gopipeline.NewPipelineConfig(),
        func(ctx context.Context, products []Product) error {
            return updateProductCatalog(products)
        },
        func(product Product) string {
            return product.SKU // Deduplicate by SKU
        },
    )
}
```

## Error Handling

### Deduplication-specific Errors

```go
func robustProcessor(ctx context.Context, items []DataItem) error {
    if len(items) == 0 {
        return nil // No items to process
    }
    
    // Validate deduplicated items
    seen := make(map[string]bool)
    for _, item := range items {
        key := extractKey(item)
        if seen[key] {
            return fmt.Errorf("deduplication failed: duplicate key %s found", key)
        }
        seen[key] = true
    }
    
    return processItems(ctx, items)
}
```

### Key Extraction Error Handling

```go
func safeKeyExtractor(item DataItem) string {
    defer func() {
        if r := recover(); r != nil {
            log.Printf("Key extraction panic for item %v: %v", item, r)
        }
    }()
    
    if item.ID == "" {
        return fmt.Sprintf("fallback_%d", time.Now().UnixNano())
    }
    
    return item.ID
}
```

## Monitoring and Metrics

### Deduplication Statistics

```go
func printDeduplicationStats(pipeline *gopipeline.DeduplicationPipeline) {
    stats := pipeline.GetStats()
    
    fmt.Printf("Total items added: %d\n", stats.TotalItemsAdded)
    fmt.Printf("Unique items processed: %d\n", stats.UniqueItemsProcessed)
    fmt.Printf("Duplicate items filtered: %d\n", stats.DuplicatesFiltered)
    fmt.Printf("Deduplication ratio: %.2f%%\n", 
        float64(stats.DuplicatesFiltered)/float64(stats.TotalItemsAdded)*100)
}
```

### Performance Monitoring

```go
func monitorDeduplicationPerformance() {
    ticker := time.NewTicker(time.Second * 10)
    defer ticker.Stop()
    
    for range ticker.C {
        stats := pipeline.GetStats()
        
        log.Printf("Deduplication performance:")
        log.Printf("  Items/sec: %.2f", stats.ItemsPerSecond)
        log.Printf("  Avg key extraction time: %v", stats.AvgKeyExtractionTime)
        log.Printf("  Memory usage: %d KB", stats.EstimatedMemoryKB)
    }
}
```

## Best Practices

1. **Choose efficient key extraction**: Use simple, fast key extraction functions
2. **Monitor memory usage**: Deduplication requires storing items in memory
3. **Use appropriate batch sizes**: Balance between deduplication effectiveness and memory usage
4. **Handle key extraction errors**: Implement fallback strategies for key extraction failures
5. **Consider data volume**: For high-volume scenarios, use frequent flushing
6. **Test deduplication logic**: Verify that your key extraction correctly identifies duplicates
7. **Monitor deduplication ratio**: Track how many duplicates are being filtered

## Common Pitfalls

1. **Memory leaks**: Not flushing frequently enough with high duplicate rates
2. **Inefficient key extraction**: Complex key generation affecting performance
3. **Incorrect key logic**: Keys that don't properly identify duplicates
4. **Large batch sizes**: Causing excessive memory usage with many unique items