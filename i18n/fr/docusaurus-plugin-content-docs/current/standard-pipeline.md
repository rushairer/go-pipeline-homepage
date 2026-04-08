---
sidebar_position: 3
---

# Pipeline standard

`StandardPipeline[T]` traite les donnees dans l'ordre d'ecriture. Il convient aux ecritures groupees en base, aux appels API par lots et a l'agregation de logs.

## Création

```go
pipeline := gopipeline.NewDefaultStandardPipeline(
	func(ctx context.Context, batch []string) error {
		return process(batch)
	},
)
```

## Points importants

- Utilisez `Start(ctx)` puis attendez `done`
- Fermez `DataChan()` côté producteur
- `FinalFlushOnCloseTimeout` borne le flush final lors de la fermeture du canal
- `MaxConcurrentFlushes` peut renvoyer la contre-pression vers l'amont
