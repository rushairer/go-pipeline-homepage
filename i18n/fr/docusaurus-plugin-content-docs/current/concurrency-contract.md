---
sidebar_position: 6
sidebar_label: Contrat de concurrence et de cycle de vie
---

# Contrat de concurrence et de cycle de vie

Cette page fixe les sémantiques de concurrence, de cycle de vie, de backpressure et d’observation des erreurs de `go-pipeline`.

## Objectif de conception

`go-pipeline` est une primitive de batch légère destinée au traitement continu de très grands flux avec un débit élevé. Les batches indépendants ne doivent pas être sérialisés uniquement pour simplifier le suivi du cycle de vie.

Priorités : débit soutenu, isolation des batches, flush concurrents, concurrence bornée avec backpressure explicite, et observation des erreurs non bloquante.

## `AsyncPerform`

`AsyncPerform(ctx)` ne signifie **pas** que l’appel retourne immédiatement. La boucle de réception et d’agrégation s’exécute dans la goroutine appelante.

Le terme `Async` concerne le flush : un batch prêt peut être envoyé dans une autre goroutine pendant que le pipeline construit les batches suivants.

Pour un démarrage non bloquant côté appelant :

```go
done, errs := pipeline.Start(ctx)
```

`Start` encapsule `AsyncPerform` dans une goroutine sans renforcer la sémantique de complétion.

## `Done`

`Done()` et le canal `done` renvoyé par `Start(ctx)` indiquent que la **run loop** courante est terminée.

En mode `AsyncPerform`, `done` n’est volontairement **pas** une barrière globale qui attend tous les flush asynchrones déjà dispatchés. Le cœur n’ajoute pas de bookkeeping par batch uniquement pour transformer `Done` en join global.

Si l’application doit garantir que tous les effets de bord sont durablement terminés, cette barrière doit appartenir au processor ou à une couche supérieure.

## Erreurs

`flush` renvoie une erreur au niveau batch/flush. `ErrorChan` est non bloquant et best-effort : si le buffer est plein, une observation d’erreur peut être abandonnée afin de ne pas bloquer le hot path. `MetricsHook.ErrorDropped()` expose cette situation.

`ErrorChan` convient aux logs, métriques et alertes ; ce n’est ni une file durable d’échecs, ni un registre complet, ni un collecteur de résultats par élément.

Lorsque chaque échec doit être conservé, persistez les batches/éléments en échec dans une base, Kafka, une retry queue, un fichier ou un autre sink durable.

## Backpressure intentionnel

`BufferSize` borne la file d’entrée et `MaxConcurrentFlushes` borne les flush asynchrones en vol. Lorsque la capacité est atteinte, le pipeline propage volontairement la backpressure vers l’amont au lieu de laisser croître sans limite les goroutines ou la mémoire.

## Tests de contrat

`pipeline_concurrency_contract_test.go` verrouille trois garanties : flush concurrents tant que la capacité le permet, `Done` reste un signal de fin de run loop, et un `ErrorChan` saturé ne bloque pas le hot path.

## Non-objectifs

Le cœur n’est pas une durable task queue, un moteur de workflow transactionnel, un runtime exactly-once, un collecteur complet de résultats ou un durable retry ledger.

Contrat source : [`CONCURRENCY_CONTRACT.md`](https://github.com/rushairer/go-pipeline/blob/main/CONCURRENCY_CONTRACT.md).
