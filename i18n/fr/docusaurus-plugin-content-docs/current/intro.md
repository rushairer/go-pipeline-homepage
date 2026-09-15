---
sidebar_position: 1
---

# Introduction à Go Pipeline v2

Go Pipeline v2 est un framework Go de traitement par batch à haut débit : génériques, batching taille/temps, flush concurrents, backpressure explicite, réglage dynamique et hooks d’observabilité.

## Sémantique essentielle

- `AsyncPerform(ctx)` exécute la boucle réception/batching dans la goroutine appelante ; `Async` concerne les flush de batches concurrents.
- Utilisez `Start(ctx)` pour un démarrage non bloquant côté appelant.
- Le `done` de `Start` indique la fin de la **run loop**, pas un join global des flush asynchrones déjà dispatchés.
- `ErrorChan()` est non bloquant / best-effort ; des événements peuvent être perdus si le buffer est plein. `MetricsHook.ErrorDropped()` permet de l’observer.
- Si aucun échec ne peut être perdu, persistez les échecs dans le processor ou une couche supérieure.
- `MaxConcurrentFlushes` est aussi une frontière de backpressure intentionnelle.

## Interfaces

- `PipelineChannel[T]` : `DataChan`, `ErrorChan`
- `Performer[T]` : `AsyncPerform`, `SyncPerform`
- `Pipeline[T]` : composition avec `DataProcessor`

Les types concrets exposent également `Start`, `Run` et `Done`.

## Installation

```bash
go get github.com/rushairer/go-pipeline/v2@latest
```

## Suite

- [Contrat de concurrence et de cycle de vie](./concurrency-contract)
- [Pipeline Standard](./standard-pipeline)
- [Configuration](./configuration)
- [Référence API](./api-reference)
