---
sidebar_position: 5
---

# Référence API

Ce document fournit une référence API complète pour Go Pipeline v2.

## Interfaces principales

### Pipeline[T any]

Interface principale du pipeline qui combine toutes les fonctionnalités du pipeline.

```go
type Pipeline[T any] interface {
    PipelineChannel[T]
    Performer[T]
    DataProcessor[T]
}
```

### PipelineChannel[T any]

Définit l'interface d'accès au canal du pipeline.

```go
type PipelineChannel[T any] interface {
    // DataChan retourne un canal en écriture pour ajouter des données au pipeline
    DataChan() chan<- T
    
    // ErrorChan retourne un canal en lecture seule pour recevoir les informations d'erreur du pipeline
    ErrorChan(size int) <-chan error
}
```

#### DataChan()

Retourne le canal d'entrée de données.

**Valeur de retour** : `chan<- T` - Canal en écriture seule pour ajouter des données

**Exemple d'utilisation** :
```go
dataChan := pipeline.DataChan()
dataChan <- "some data"
close(dataChan) // Fermer le canal quand terminé
```

#### ErrorChan(size int)

Retourne le canal de sortie d'erreur.

**Paramètres** :
- `size int` - Taille du tampon du canal d'erreur

**Valeur de retour** : `<-chan error` - Canal en lecture seule pour recevoir les erreurs

**Exemple d'utilisation** :
```go
errorChan := pipeline.ErrorChan(10)
go func() {
    for err := range errorChan {
        log.Printf("Erreur du pipeline : %v", err)
    }
}()
```

### Performer[T any]

Définit l'interface pour exécuter les opérations du pipeline.

```go
type Performer[T any] interface {
    // AsyncPerform exécute les opérations du pipeline de manière asynchrone
    AsyncPerform(ctx context.Context) error
    
    // SyncPerform exécute les opérations du pipeline de manière synchrone
    SyncPerform(ctx context.Context) error
}
```

#### AsyncPerform(ctx context.Context)

Exécute les opérations du pipeline de manière asynchrone, ne bloque pas le thread appelant.

**Paramètres** :
- `ctx context.Context` - Objet contexte pour contrôler le cycle de vie de l'opération

**Valeur de retour** : `error` - Retourne une erreur si ctx est annulé

**Exemple d'utilisation** :
```go
ctx, cancel := context.WithTimeout(context.Background(), time.Minute)
defer cancel()

go func() {
    if err := pipeline.AsyncPerform(ctx); err != nil {
        log.Printf("Erreur d'exécution du pipeline : %v", err)
    }
}()
```

#### SyncPerform(ctx context.Context)

Exécute les opérations du pipeline de manière synchrone, bloque jusqu'à la fin ou l'annulation.

**Paramètres** :
- `ctx context.Context` - Objet contexte

**Valeur de retour** : `error` - Erreur d'exécution ou erreur d'annulation

**Exemple d'utilisation** :
```go
ctx, cancel := context.WithTimeout(context.Background(), time.Minute)
defer cancel()

if err := pipeline.SyncPerform(ctx); err != nil {
    log.Printf("Erreur d'exécution du pipeline : %v", err)
}
```

### DataProcessor[T any]

Définit l'interface principale pour le traitement par lots des données (principalement pour l'implémentation interne).

```go
type DataProcessor[T any] interface {
    initBatchData() any
    addToBatch(batchData any, data T) any
    flush(ctx context.Context, batchData any) error
    isBatchFull(batchData any) bool
    isBatchEmpty(batchData any) bool
}
```

## Types de configuration

### PipelineConfig

Structure de configuration du pipeline.

```go
type PipelineConfig struct {
    BufferSize    uint32        // Capacité du canal tampon (défaut : 100)
    FlushSize     uint32        // Capacité maximale des données de traitement par lots (défaut : 50)
    FlushInterval time.Duration // Intervalle de temps pour l'actualisation programmée (défaut : 50ms)
}
```

**Descriptions des champs** :
- `BufferSize` : Taille du tampon du canal de données interne
- `FlushSize` : Quantité maximale de données par traitement par lots
- `FlushInterval` : Intervalle de temps pour déclencher le traitement par lots

## API du pipeline standard

### Définitions de types

```go
type FlushStandardFunc[T any] func(ctx context.Context, batchData []T) error

type StandardPipeline[T any] struct {
    *PipelineImpl[T]
    flushFunc FlushStandardFunc[T]
}
```

### Constructeurs

#### NewDefaultStandardPipeline[T any]

Crée un pipeline standard avec la configuration par défaut.

```go
func NewDefaultStandardPipeline[T any](
    flushFunc FlushStandardFunc[T],
) *StandardPipeline[T]
```

**Paramètres** :
- `flushFunc FlushStandardFunc[T]` - Fonction de traitement par lots

**Valeur de retour** : `*StandardPipeline[T]` - Instance du pipeline standard

**Exemple d'utilisation** :
```go
pipeline := gopipeline.NewDefaultStandardPipeline(
    func(ctx context.Context, batchData []string) error {
        fmt.Printf("Traitement de %d éléments : %v\n", len(batchData), batchData)
        return nil
    },
)
```

#### NewStandardPipeline[T any]

Crée un pipeline standard avec une configuration personnalisée.

```go
func NewStandardPipeline[T any](
    config PipelineConfig,
    flushFunc FlushStandardFunc[T],
) *StandardPipeline[T]
```

**Paramètres** :
- `config PipelineConfig` - Configuration personnalisée
- `flushFunc FlushStandardFunc[T]` - Fonction de traitement par lots

**Valeur de retour** : `*StandardPipeline[T]` - Instance du pipeline standard

**Exemple d'utilisation** :
```go
standardConfig := gopipeline.PipelineConfig{
    BufferSize:    200,
    FlushSize:     100,
    FlushInterval: time.Millisecond * 100,
}

pipeline := gopipeline.NewStandardPipeline(standardConfig,
    func(ctx context.Context, batchData []string) error {
        return processData(batchData)
    },
)
```

## API du pipeline de déduplication

### Définitions de types

```go
type KeyFunc[T any] func(T) string
type FlushDeduplicationFunc[T any] func(ctx context.Context, batchData []T) error

type DeduplicationPipeline[T any] struct {
    *PipelineImpl[T]
    keyFunc   KeyFunc[T]
    flushFunc FlushDeduplicationFunc[T]
}
```

### Constructeurs

#### NewDefaultDeduplicationPipeline[T any]

Crée un pipeline de déduplication avec la configuration par défaut.

```go
func NewDefaultDeduplicationPipeline[T any](
    keyFunc KeyFunc[T],
    flushFunc FlushDeduplicationFunc[T],
) *DeduplicationPipeline[T]
```

**Paramètres** :
- `keyFunc KeyFunc[T]` - Fonction de génération de clé unique
- `flushFunc FlushDeduplicationFunc[T]` - Fonction de traitement par lots

**Valeur de retour** : `*DeduplicationPipeline[T]` - Instance du pipeline de déduplication

**Exemple d'utilisation** :
```go
pipeline := gopipeline.NewDefaultDeduplicationPipeline(
    func(user User) string {
        return user.Email // Utiliser l'email comme clé unique
    },
    func(ctx context.Context, users []User) error {
        return processUsers(users)
    },
)
```

#### NewDeduplicationPipeline[T any]

Crée un pipeline de déduplication avec une configuration personnalisée.

```go
func NewDeduplicationPipeline[T any](
    config PipelineConfig,
    keyFunc KeyFunc[T],
    flushFunc FlushDeduplicationFunc[T],
) *DeduplicationPipeline[T]
```

**Paramètres** :
- `config PipelineConfig` - Configuration personnalisée
- `keyFunc KeyFunc[T]` - Fonction de génération de clé unique
- `flushFunc FlushDeduplicationFunc[T]` - Fonction de traitement par lots

**Valeur de retour** : `*DeduplicationPipeline[T]` - Instance du pipeline de déduplication

**Exemple d'utilisation** :
```go
deduplicationConfig := gopipeline.PipelineConfig{
    BufferSize:    100,
    FlushSize:     50,
    FlushInterval: time.Millisecond * 100,
}

pipeline := gopipeline.NewDeduplicationPipeline(deduplicationConfig,
    func(product Product) string {
        return fmt.Sprintf("%s-%s", product.SKU, product.Version)
    },
    func(ctx context.Context, products []Product) error {
        return updateProducts(products)
    },
)
```

## Types d'erreurs

### PipelineError

Type de base pour les erreurs liées au pipeline.

```go
type PipelineError struct {
    Op  string // Nom de l'opération
    Err error  // Erreur originale
}

func (e *PipelineError) Error() string {
    return fmt.Sprintf("pipeline %s: %v", e.Op, e.Err)
}

func (e *PipelineError) Unwrap() error {
    return e.Err
}
```

### Erreurs communes

- `ErrPipelineClosed` : Le pipeline est fermé
- `ErrContextCanceled` : Le contexte a été annulé
- `ErrFlushTimeout` : Timeout de l'opération de vidage

## Modèles d'utilisation

### Modèle d'utilisation de base

```go
// 1. Créer le pipeline
pipeline := gopipeline.NewDefaultStandardPipeline(flushFunc)

// 2. Démarrer le traitement asynchrone
ctx, cancel := context.WithCancel(context.Background())
defer cancel()

go func() {
    if err := pipeline.AsyncPerform(ctx); err != nil {
        log.Printf("Erreur du pipeline : %v", err)
    }
}()

// 3. Écouter les erreurs
go func() {
    for err := range pipeline.ErrorChan(10) {
        log.Printf("Erreur de traitement : %v", err)
    }
}()

// 4. Ajouter des données
dataChan := pipeline.DataChan()
for _, data := range inputData {
    dataChan <- data
}

// 5. Fermer et attendre la fin
close(dataChan)
time.Sleep(time.Second) // Attendre la fin du traitement
```

### Modèle d'arrêt gracieux

```go
func gracefulShutdown(pipeline Pipeline[Data]) {
    // 1. Arrêter l'ajout de nouvelles données
    close(pipeline.DataChan())
    
    // 2. Attendre la fin du traitement
    ctx, cancel := context.WithTimeout(context.Background(), time.Second*30)
    defer cancel()
    
    done := make(chan struct{})
    go func() {
        defer close(done)
        // Attendre la fermeture du canal d'erreur (indique la fin du traitement)
        for range pipeline.ErrorChan(1) {
            // Consommer les erreurs restantes
        }
    }()
    
    select {
    case <-done:
        log.Println("Arrêt du pipeline terminé")
    case <-ctx.Done():
        log.Println("Timeout d'arrêt du pipeline")
    }
}
```

### Modèle de gestion d'erreurs

```go
func handlePipelineErrors(pipeline Pipeline[Data]) {
    errorChan := pipeline.ErrorChan(100)
    
    for err := range errorChan {
        switch e := err.(type) {
        case *PipelineError:
            log.Printf("Échec de l'opération pipeline %s : %v", e.Op, e.Err)
            
        case *net.OpError:
            log.Printf("Erreur réseau : %v", e)
            // Peut nécessiter un retry ou un traitement de fallback
            
        default:
            log.Printf("Erreur inconnue : %v", err)
        }
    }
}
```

## Considérations de performance

### Utilisation mémoire

- Pipeline standard : Utilisation mémoire proportionnelle à `BufferSize`
- Pipeline de déduplication : Utilisation mémoire proportionnelle à `FlushSize` (besoin de stocker la map)

### Sécurité concurrentielle

- Toutes les API publiques sont sûres pour la concurrence
- Peut écrire des données depuis plusieurs goroutines simultanément vers `DataChan()`
- Le canal d'erreur peut être consommé par plusieurs goroutines

### Nettoyage des ressources

- Doit consommer le canal d'erreur, sinon peut causer des fuites de goroutines
- Devrait fermer le canal de données quand terminé
- Recommandé d'utiliser le contexte pour contrôler le cycle de vie du pipeline

## Compatibilité des versions

Go Pipeline v2 nécessite :
- Go 1.18+ (support des génériques)
- Rétrocompatible avec Go 1.18-1.21

## Étapes suivantes

- [Pipeline standard](./standard-pipeline) - Guide détaillé d'utilisation du pipeline standard
- [Pipeline de déduplication](./deduplication-pipeline) - Guide détaillé d'utilisation du pipeline de déduplication
- [Guide de configuration](./configuration) - Instructions détaillées des paramètres de configuration