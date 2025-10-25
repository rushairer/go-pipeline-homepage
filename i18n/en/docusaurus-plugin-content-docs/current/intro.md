---
sidebar_position: 1
---

# Go Pipeline v2 Introduction

Go Pipeline v2 is a high-performance batch processing pipeline framework for Go, based on generics and concurrency safety, with built-in batching by batch size and time window, backpressure and graceful shutdown, error and metrics, rate-limited asynchronous flush and dynamic parameter adjustment, providing standard and deduplication pipeline modes.

## 🚀 Core Features

- **Generic Support**: Based on Go 1.20+ generics, type-safe
- **Batch Processing**: Supports automatic batching by size and time interval
- **Concurrency Safety**: Built-in goroutine safety mechanisms
- **Flexible Configuration**: Customizable buffer size, batch size, and flush interval
- **Error Handling**: Comprehensive error handling and propagation mechanisms
- **Two Modes**: Standard batch processing and deduplication batch processing
- **Sync/Async**: Supports both synchronous and asynchronous execution modes
- **Go Conventions**: Follows "who writes, who closes" channel management principles
- **Convenient API**: New Start() and Run() methods to reduce boilerplate code
- **Dynamic Parameter Adjustment**: Supports runtime safe adjustment of key parameters
- **Graceful Shutdown**: Supports limited-time cleanup on cancellation and final flush timeout protection

## 📋 System Requirements

- Go 1.20+ (generic support)
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
- **`PipelineImpl[T]`**: Universal pipeline implementation, provides basic functionality

## 💡 Quick Start

### Using Convenient API (Recommended)

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
    
    // Start using convenient API
    done, errs := pipeline.Start(ctx)
    
    // Listen for errors
    go func() {
        for err := range errs {
            log.Printf("Processing error: %v", err)
        }
    }()
    
    // Add data
    dataChan := pipeline.DataChan()
    go func() {
        defer close(dataChan) // Who writes, who closes
        for i := 0; i < 100; i++ {
            select {
            case dataChan <- i:
            case <-ctx.Done():
                return
            }
        }
    }()
    
    // Wait for completion
    <-done
}
```

### Synchronous Execution Example

```go
func syncExample() {
    pipeline := gopipeline.NewDefaultStandardPipeline(
        func(ctx context.Context, batchData []int) error {
            fmt.Printf("Processing batch data: %v\n", batchData)
            return nil
        },
    )
    
    ctx, cancel := context.WithTimeout(context.Background(), time.Second*10)
    defer cancel()
    
    // Synchronous run, set error channel capacity to 128
    if err := pipeline.Run(ctx, 128); err != nil {
        log.Printf("Pipeline execution error: %v", err)
    }
}
```

## 📋 Configuration Parameters

```go
type PipelineConfig struct {
    BufferSize               uint32        // Buffer channel capacity (default: 100)
    FlushSize                uint32        // Maximum capacity for batch processing data (default: 50)
    FlushInterval            time.Duration // Time interval for timed refresh (default: 50ms)
    DrainOnCancel            bool          // Whether to perform limited-time cleanup flush on cancellation (default false)
    DrainGracePeriod         time.Duration // Maximum time window for cleanup flush
    FinalFlushOnCloseTimeout time.Duration // Final flush timeout for channel close path (0 means disabled)
    MaxConcurrentFlushes     uint32        // Maximum concurrent async flushes (0 means unlimited)
}
```

### 🎯 Performance-Optimized Default Values

Based on performance benchmarks, v2.2.2 uses optimized default configuration:

- **BufferSize: 100** - Buffer size, should be >= FlushSize * 2 to avoid blocking
- **FlushSize: 50** - Batch size, performance tests show around 50 is optimal
- **FlushInterval: 50ms** - Flush interval, balances latency and throughput

### 🔧 Convenient Configuration Methods

```go
// Create configuration using chain methods
config := gopipeline.NewPipelineConfig().
    WithFlushInterval(time.Millisecond * 10).
    WithBufferSize(200).
    WithDrainOnCancel(true).
    WithDrainGracePeriod(150 * time.Millisecond)

pipeline := gopipeline.NewStandardPipeline(config, flushFunc)
```

## Next Steps

- [Standard Pipeline](./standard-pipeline) - Learn about using standard batch processing pipelines
- [Deduplication Pipeline](./deduplication-pipeline) - Learn about using deduplication batch processing pipelines
- [Configuration Guide](./configuration) - Detailed configuration parameter descriptions
- [API Reference](./api-reference) - Complete API documentation