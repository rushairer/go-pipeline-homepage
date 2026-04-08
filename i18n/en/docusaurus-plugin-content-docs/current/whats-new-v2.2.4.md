---
sidebar_position: 2
---

# What Is New in v2.2.4

v2.2.4 is a patch release focused on conservative performance improvements and documentation accuracy. There are no public API breaks.

## Highlights

- Reuse batch containers on synchronous flush paths
- Measure flush duration only when `MetricsHook` is enabled
- Clarify `MaxConcurrentFlushes` as intentional hard backpressure
- Fix documentation around `done`, `ErrorChan`, and reproducible benchmarks

## Compatibility

- No public API changes
- Existing integrations can upgrade directly to `v2.2.4`
- Async flush ordering and memory-safety semantics remain unchanged

## Reference Benchmark Environment

- Date: 2026-04-08
- Platform: darwin/arm64
- CPU: Apple M4
