---
sidebar_position: 3
---

# Pipeline Standard

`StandardPipeline[T]` vise le traitement continu à haut débit avec exécution par batches.

## Démarrage recommandé

```go
done, errs := pipeline.Start(ctx)
// produire via pipeline.DataChan()
<-done
```

`Start(ctx)` retourne immédiatement et utilise le modèle de flush concurrents de `AsyncPerform`.

:::important
`done` signifie que la **run loop est terminée**. Ce n’est pas une barrière globale attendant tous les flush asynchrones déjà dispatchés. Une garantie forte de complétion doit être possédée par le processor ou une couche supérieure.
:::

## Erreurs

`ErrorChan` est non bloquant / best-effort. Un buffer plein peut entraîner l’abandon de nouvelles observations d’erreur plutôt que de bloquer le hot path. Utilisez `MetricsHook.ErrorDropped()` pour le mesurer et un sink durable si aucun échec ne peut être perdu.

## Fermeture et backpressure

Le writer ferme `DataChan()`. Le batch final partiel est flushé de façon synchrone. `MaxConcurrentFlushes` borne les flush en vol et propage volontairement la backpressure lorsque la capacité est atteinte.

Voir [Contrat de concurrence et de cycle de vie](./concurrency-contract).
