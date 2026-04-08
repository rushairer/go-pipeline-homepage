---
sidebar_position: 4
---

# Pipeline de déduplication

`DeduplicationPipeline[T]` déduplique les éléments à l'intérieur d'un batch. Le type `T` doit implémenter `UniqueKeyData`.

```go
type UniqueKeyData interface {
	GetKey() string
}
```

- Les clés dupliquées écrasent les valeurs précédentes dans le même batch
- La fonction de flush reçoit `map[string]T`
- Les sémantiques de `done`, `errs` et de contre-pression sont identiques au pipeline standard
