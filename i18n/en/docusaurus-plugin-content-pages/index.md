---
title: Go Pipeline - High-Performance Pipeline Processing Library
description: Go Pipeline is a production-ready, high-performance pipeline processing library for Go, designed for efficient batch data processing with built-in error handling and monitoring.
---

# Go Pipeline

**Go Pipeline** is a high-performance, production-ready pipeline processing library for Go, designed to handle batch data processing efficiently with built-in error handling and monitoring capabilities.

## 🚀 Quick Start

```bash
go get github.com/rushairer/go-pipeline/v2
```

```go
package main

import (
    "context"
    "fmt"
    "time"
    
    "github.com/rushairer/go-pipeline/v2"
)

func main() {
    // Create pipeline with default configuration
    pipeline := gopipeline.NewStandardPipeline(
        gopipeline.NewPipelineConfig(),
        func(ctx context.Context, items []string) error {
            fmt.Printf("Processing batch: %v\n", items)
            return nil
        },
    )
    
    // Start the pipeline
    ctx := context.Background()
    if err := pipeline.Start(ctx); err != nil {
        panic(err)
    }
    defer pipeline.Stop()
    
    // Add items to pipeline
    pipeline.Add("item1")
    pipeline.Add("item2")
    pipeline.Add("item3")
    
    // Wait for processing
    time.Sleep(time.Second)
}
```

## ✨ Key Features

- **🚀 High Performance**: Optimized batch processing with configurable buffer sizes
- **🛡️ Error Handling**: Built-in retry mechanisms and error recovery
- **📊 Monitoring**: Real-time metrics and performance monitoring
- **🔧 Easy to Use**: Simple API with sensible defaults
- **🎯 Type Safe**: Full generic type support
- **🔄 Flexible**: Support for standard and deduplication pipelines

## 📚 Documentation

- [Quick Start Guide](./docs/intro) - Get started in minutes
- [Configuration](./docs/configuration) - Detailed configuration options
- [Standard Pipeline](./docs/standard-pipeline) - Basic pipeline usage
- [Deduplication Pipeline](./docs/deduplication-pipeline) - Advanced deduplication features
- [API Reference](./docs/api-reference) - Complete API documentation

## 🎯 Use Cases

### Database Batch Operations
Perfect for batch inserting, updating, or deleting database records with optimal performance.

### Log Aggregation
Collect and batch process log entries before sending to storage or analysis systems.

### API Rate Limiting
Batch API calls to respect rate limits while maintaining high throughput.

### Real-time Data Processing
Process streaming data in configurable batches with low latency.

## 🔧 Performance

Go Pipeline v2 delivers exceptional performance:

- **Throughput**: 100K+ items/second
- **Latency**: Sub-millisecond processing
- **Memory**: Efficient memory usage with configurable buffers
- **Concurrency**: Thread-safe operations

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](https://github.com/rushairer/go-pipeline/blob/main/CONTRIBUTING.md) for details.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](https://github.com/rushairer/go-pipeline/blob/main/LICENSE) file for details.