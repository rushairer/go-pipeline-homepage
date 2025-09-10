---
sidebar_position: 1
---

# Go Pipeline v2 Introduction

Go Pipeline v2 is a high-performance Go batch processing pipeline framework that supports generics, concurrent safety, and provides two modes: standard batch processing and deduplication batch processing.

## 🚀 Core Features

- **Generic Support**: Based on Go 1.18+ generics, type-safe
- **Batch Processing Mechanism**: Supports automatic batch processing by size and time interval
- **Concurrent Safety**: Built-in goroutine safety mechanism
- **Flexible Configuration**: Customizable buffer size, batch size, and flush interval
- **Error Handling**: Comprehensive error handling and propagation mechanism
- **Two Modes**: Standard batch processing and deduplication batch processing
- **Sync/Async**: Supports both synchronous and asynchronous execution modes
- **Go Conventions**: Adopts the "writer closes" channel management principle

## 📋 System Requirements

- Go 1.18+ (generics support)
- Supports Linux, macOS, Windows

## 📦 Installation

```bash
go get github.com/rushairer/go-pipeline/v2@latest
```

## 🏗️ Architecture Design

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Data Input    │───▶│   Buffer Channel │───▶│  Batch Processor│
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                       ┌──────────────────┐    ┌─────────────────┐
                       │   Timer Ticker   │    │   Flush Handler │
                       └──────────────────┘    └─────────────────┘
                                │                        │
                                └────────┬───────────────┘
                                         ▼
                                ┌─────────────────┐
                                │  Error Channel  │
                                └─────────────────┘
```

## 📦 Core Components

### Interface Definitions

- **`PipelineChannel[T]`**: Defines pipeline channel access interface
- **`Performer`**: Defines interface for executing pipeline operations
- **`DataProcessor[T]`**: Defines core interface for batch processing data
- **`Pipeline[T]`**: Combines all pipeline functionality into a universal interface

### Implementation Types

- **`StandardPipeline[T]`**: Standard batch processing pipeline, data is batch processed in order
- **`DeduplicationPipeline[T]`**: Deduplication batch processing pipeline, deduplicates based on unique keys
- **`PipelineImpl[T]`**: Generic pipeline implementation, provides basic functionality

## 💡 Quick Start

### Standard Pipeline Example

```go
package main

import (
    "context"
    "fmt"
    "log"
    "time"
    
    gopipeline "github.com/rushairer/go-pipeline/v2"
)

func main() {
    // Create standard pipeline
    pipeline := gopipeline.NewDefaultStandardPipeline(
        func(ctx context.Context, batchData []int) error {
            fmt.Printf("Processing batch data: %v\n", batchData)
            return nil
        },
    )
    
    ctx, cancel := context.WithTimeout(context.Background(), time.Second*10)
    defer cancel()
    
    // Start async processing
    go func() {
        if err := pipeline.AsyncPerform(ctx); err != nil {
            log.Printf("Pipeline execution error: %v", err)
        }
    }()
    
    // Listen for errors
    errorChan := pipeline.ErrorChan(10)
    go func() {
        for err := range errorChan {
            log.Printf("Processing error: %v", err)
        }
    }()
    
    // Add data
    dataChan := pipeline.DataChan()
    for i := 0; i < 100; i++ {
        dataChan <- i
    }
    
    // Close data channel
    close(dataChan)
    
    // Wait for processing to complete
    time.Sleep(time.Second * 2)
}
```

## 📋 Configuration Parameters

```go
type PipelineConfig struct {
    BufferSize    uint32        // Buffer channel capacity (default: 100)
    FlushSize     uint32        // Maximum capacity of batch processing data (default: 50)
    FlushInterval time.Duration // Time interval for timed refresh (default: 50ms)
}
```

### 🎯 Performance-Optimized Default Values

Based on performance benchmarks, v2 version adopts optimized default configuration:

- **BufferSize: 100** - Buffer size, should be >= FlushSize * 2 to avoid blocking
- **FlushSize: 50** - Batch size, performance tests show around 50 is optimal
- **FlushInterval: 50ms** - Flush interval, balances latency and throughput

## Next Steps

- [Standard Pipeline](./standard-pipeline) - Learn about using standard batch processing pipeline
- [Deduplication Pipeline](./deduplication-pipeline) - Learn about using deduplication batch processing pipeline
- [Configuration Guide](./configuration) - Detailed configuration parameter instructions
- [API Reference](./api-reference) - Complete API documentation