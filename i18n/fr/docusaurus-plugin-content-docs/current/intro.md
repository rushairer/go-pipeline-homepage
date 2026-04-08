---
sidebar_position: 1
---

# Introduction à Go Pipeline v2

Go Pipeline v2 est un framework Go haute performance pour le traitement par lots, avec génériques, sécurité concurrente, flush par taille ou intervalle, arrêt propre et modes standard / déduplication.

## Capacités principales

- Génériques Go 1.20+
- Flush automatique par taille et fenêtre temporelle
- API pratiques `Start()` et `Run()`
- `DrainOnCancel`, `FinalFlushOnCloseTimeout`, `MaxConcurrentFlushes`
- Hooks Logger et Metrics

## Installation

```bash
go get github.com/rushairer/go-pipeline/v2@latest
```

## Sémantique d'exécution

- Attendez `done` renvoyé par `Start(ctx)`.
- Consommer `errs` / `ErrorChan()` est recommandé, mais non obligatoire.
- Le premier appel à `ErrorChan(size)` fixe la taille du buffer.
- `MaxConcurrentFlushes` agit aussi comme mécanisme de contre-pression volontaire.

## Nouveautés 2.2.4

- Réutilisation des conteneurs de batch sur les chemins synchrones
- Mesure de durée de flush uniquement si `MetricsHook` est activé
- Clarification de la contre-pression dure de `MaxConcurrentFlushes`
- Correction de la documentation autour de `done`, `ErrorChan` et des benchmarks
