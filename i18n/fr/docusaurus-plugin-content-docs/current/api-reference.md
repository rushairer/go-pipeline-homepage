---
sidebar_position: 5
---

# Référence API

Documentation complète de l'API Go Pipeline v2, incluant tous les types, méthodes et interfaces disponibles.

## Types principaux

### PipelineConfig

Structure de configuration pour personnaliser le comportement du pipeline.

```go
type PipelineConfig struct {
    FlushSize     int           // Taille du lot (par défaut : 50)
    FlushInterval time.Duration // Intervalle de vidage (par défaut : 1s)
    MaxWorkers    int           // Nombre de workers (par défaut : runtime.NumCPU())
    ChannelSize   int           // Taille du canal (par défaut : 100)
}
```

**Méthodes** :

#### NewPipelineConfig()

```go
func NewPipelineConfig() *PipelineConfig
```

Crée une nouvelle configuration avec les valeurs par défaut.

**Exemple d'utilisation** :
```go
config := gopipeline.NewPipelineConfig()
```

#### SetFlushSize(size int)

```go
func (c *PipelineConfig) SetFlushSize(size int) *PipelineConfig
```

Définit la taille du lot et retourne la configuration pour le chaînage.

**Paramètres** :
- `size` : Nombre d'éléments par lot (doit être > 0)

**Retour** : `*PipelineConfig` pour le chaînage des méthodes

**Exemple d'utilisation** :
```go
config := gopipeline.NewPipelineConfig().SetFlushSize(100)
```

#### SetFlushInterval(interval time.Duration)

```go
func (c *PipelineConfig) SetFlushInterval(interval time.Duration) *PipelineConfig
```

Définit l'intervalle de vidage maximum.

**Paramètres** :
- `interval` : Durée maximum entre les traitements

**Retour** : `*PipelineConfig`

**Exemple d'utilisation** :
```go
config := gopipeline.NewPipelineConfig().
    SetFlushInterval(5 * time.Second)
```

#### SetMaxWorkers(workers int)

```go
func (c *PipelineConfig) SetMaxWorkers(workers int) *PipelineConfig
```

Définit le nombre de workers de traitement concurrent.

**Paramètres** :
- `workers` : Nombre de goroutines de traitement (doit être > 0)

**Retour** : `*PipelineConfig`

**Exemple d'utilisation** :
```go
config := gopipeline.NewPipelineConfig().
    SetMaxWorkers(runtime.NumCPU() * 2)
```

#### SetChannelSize(size int)

```go
func (c *PipelineConfig) SetChannelSize(size int) *PipelineConfig
```

Définit la taille du buffer du canal interne.

**Paramètres** :
- `size` : Taille du buffer (doit être > 0)

**Retour** : `*PipelineConfig`

**Exemple d'utilisation** :
```go
config := gopipeline.NewPipelineConfig().
    SetChannelSize(1000)
```

### StandardPipeline[T]

Pipeline standard pour le traitement par lots générique.

```go
type StandardPipeline[T any] struct {
    // Champs internes (non exportés)
}
```

#### NewStandardPipeline[T](processor func([]T) error)

```go
func NewStandardPipeline[T any](processor func([]T) error) *StandardPipeline[T]
```

Crée un nouveau pipeline standard avec la configuration par défaut.

**Paramètres** :
- `processor` : Fonction de traitement des lots

**Retour** : `*StandardPipeline[T]`

**Exemple d'utilisation** :
```go
pipeline := gopipeline.NewStandardPipeline[int](func(items []int) error {
    fmt.Printf("Traitement : %v\n", items)
    return nil
})
```

#### NewStandardPipelineWithConfig[T](processor func([]T) error, config *PipelineConfig)

```go
func NewStandardPipelineWithConfig[T any](
    processor func([]T) error, 
    config *PipelineConfig,
) *StandardPipeline[T]
```

Crée un nouveau pipeline standard avec une configuration personnalisée.

**Paramètres** :
- `processor` : Fonction de traitement des lots
- `config` : Configuration personnalisée

**Retour** : `*StandardPipeline[T]`

**Exemple d'utilisation** :
```go
config := gopipeline.NewPipelineConfig().SetFlushSize(100)
pipeline := gopipeline.NewStandardPipelineWithConfig[string](processor, config)
```

#### Add(item T)

```go
func (p *StandardPipeline[T]) Add(item T)
```

Ajoute un élément au pipeline pour traitement.

**Paramètres** :
- `item` : Élément à traiter

**Exemple d'utilisation** :
```go
pipeline.Add(42)
pipeline.Add("hello")
```

#### Close()

```go
func (p *StandardPipeline[T]) Close()
```

Ferme le pipeline et traite tous les éléments restants.

**Exemple d'utilisation** :
```go
pipeline.Close()
```

#### Wait()

```go
func (p *StandardPipeline[T]) Wait()
```

Attend que tous les traitements en cours se terminent.

**Exemple d'utilisation** :
```go
pipeline.Close()
pipeline.Wait() // Attendre la fin complète
```

#### GetMetrics()

```go
func (p *StandardPipeline[T]) GetMetrics() PipelineMetrics
```

Retourne les métriques actuelles du pipeline.

**Retour** : `PipelineMetrics`

**Exemple d'utilisation** :
```go
metrics := pipeline.GetMetrics()
fmt.Printf("Éléments traités : %d\n", metrics.ProcessedCount)
```

### DeduplicationPipeline[T]

Pipeline spécialisé avec déduplication automatique.

```go
type DeduplicationPipeline[T any] struct {
    // Champs internes (non exportés)
}
```

#### NewDeduplicationPipeline[T](processor func([]T) error, keyFunc func(T) string)

```go
func NewDeduplicationPipeline[T any](
    processor func([]T) error,
    keyFunc func(T) string,
) *DeduplicationPipeline[T]
```

Crée un nouveau pipeline de déduplication avec la configuration par défaut.

**Paramètres** :
- `processor` : Fonction de traitement des lots
- `keyFunc` : Fonction de génération de clé pour la déduplication

**Retour** : `*DeduplicationPipeline[T]`

**Exemple d'utilisation** :
```go
pipeline := gopipeline.NewDeduplicationPipeline[int](
    func(items []int) error {
        fmt.Printf("Éléments uniques : %v\n", items)
        return nil
    },
    func(item int) string {
        return fmt.Sprintf("key_%d", item)
    },
)
```

#### NewDeduplicationPipelineWithConfig[T](processor func([]T) error, keyFunc func(T) string, config *PipelineConfig)

```go
func NewDeduplicationPipelineWithConfig[T any](
    processor func([]T) error,
    keyFunc func(T) string,
    config *PipelineConfig,
) *DeduplicationPipeline[T]
```

Crée un nouveau pipeline de déduplication avec une configuration personnalisée.

**Paramètres** :
- `processor` : Fonction de traitement des lots
- `keyFunc` : Fonction de génération de clé
- `config` : Configuration personnalisée

**Retour** : `*DeduplicationPipeline[T]`

**Exemple d'utilisation** :
```go
config := gopipeline.NewPipelineConfig().SetFlushSize(50)
pipeline := gopipeline.NewDeduplicationPipelineWithConfig[User](
    processor, keyFunc, config)
```

Les méthodes `Add()`, `Close()`, `Wait()`, et `GetMetrics()` sont identiques à celles du StandardPipeline.

### PipelineMetrics

Structure contenant les métriques de performance du pipeline.

```go
type PipelineMetrics struct {
    ProcessedCount     int64         // Nombre total d'éléments traités
    BatchCount         int64         // Nombre total de lots traités
    ErrorCount         int64         // Nombre d'erreurs rencontrées
    DroppedCount       int64         // Nombre d'éléments supprimés (déduplication)
    PendingCount       int64         // Nombre d'éléments en attente
    AvgProcessingTime  time.Duration // Temps de traitement moyen par lot
    LastProcessedTime  time.Time     // Timestamp du dernier traitement
}
```

**Champs** :

- `ProcessedCount` : Nombre total d'éléments traités avec succès
- `BatchCount` : Nombre de lots traités
- `ErrorCount` : Nombre d'erreurs de traitement
- `DroppedCount` : Éléments supprimés (uniquement pour DeduplicationPipeline)
- `PendingCount` : Éléments en attente de traitement
- `AvgProcessingTime` : Temps moyen de traitement par lot
- `LastProcessedTime` : Timestamp du dernier traitement réussi

## Interfaces

### Pipeline[T]

Interface commune pour tous les types de pipeline.

```go
type Pipeline[T any] interface {
    Add(item T)
    Close()
    Wait()
    GetMetrics() PipelineMetrics
}
```

Cette interface permet l'utilisation polymorphe des différents types de pipeline.

**Exemple d'utilisation** :
```go
func processPipeline[T any](p Pipeline[T], items []T) {
    for _, item := range items {
        p.Add(item)
    }
    p.Close()
    p.Wait()
}
```

## Fonctions utilitaires

### GetDefaultConfig()

```go
func GetDefaultConfig() *PipelineConfig
```

Retourne une nouvelle instance de la configuration par défaut.

**Retour** : `*PipelineConfig` avec les valeurs par défaut

**Exemple d'utilisation** :
```go
defaultConfig := gopipeline.GetDefaultConfig()
fmt.Printf("Taille par défaut : %d\n", defaultConfig.FlushSize)
```

### ValidateConfig(config *PipelineConfig)

```go
func ValidateConfig(config *PipelineConfig) error
```

Valide une configuration et retourne une erreur si elle est invalide.

**Paramètres** :
- `config` : Configuration à valider

**Retour** : `error` si la configuration est invalide, `nil` sinon

**Exemple d'utilisation** :
```go
config := &PipelineConfig{FlushSize: -1} // Configuration invalide
if err := gopipeline.ValidateConfig(config); err != nil {
    log.Printf("Configuration invalide : %v", err)
}
```

## Types d'erreur

### ErrPipelineClosed

```go
var ErrPipelineClosed = errors.New("pipeline is closed")
```

Erreur retournée lors de tentative d'ajout d'éléments à un pipeline fermé.

### ErrInvalidConfig

```go
var ErrInvalidConfig = errors.New("invalid pipeline configuration")
```

Erreur retournée pour une configuration invalide.

### ErrProcessingFailed

```go
var ErrProcessingFailed = errors.New("batch processing failed")
```

Erreur retournée lors d'échec du traitement d'un lot.

## Constantes

### Valeurs par défaut

```go
const (
    DefaultFlushSize     = 50                    // Taille de lot par défaut
    DefaultFlushInterval = 1 * time.Second       // Intervalle par défaut
    DefaultChannelSize   = 100                   // Taille de canal par défaut
    MaxFlushSize         = 10000                 // Taille de lot maximum
    MinFlushSize         = 1                     // Taille de lot minimum
    MaxChannelSize       = 100000                // Taille de canal maximum
    MinChannelSize       = 1                     // Taille de canal minimum
)
```

## Exemples d'utilisation complète

### Pipeline standard avec gestion d'erreur

```go
package main

import (
    "fmt"
    "log"
    "time"
    
    "github.com/rushairer/go-pipeline/v2"
)

func main() {
    // Configuration personnalisée
    config := gopipeline.NewPipelineConfig().
        SetFlushSize(10).
        SetFlushInterval(2 * time.Second).
        SetMaxWorkers(2)
    
    // Créer le pipeline
    pipeline := gopipeline.NewStandardPipelineWithConfig[int](
        func(items []int) error {
            fmt.Printf("Traitement de %d éléments : %v\n", len(items), items)
            
            // Simuler un traitement qui peut échouer
            for _, item := range items {
                if item < 0 {
                    return fmt.Errorf("valeur négative non autorisée : %d", item)
                }
            }
            return nil
        },
        config,
    )
    
    // Ajouter des données
    for i := 1; i <= 25; i++ {
        pipeline.Add(i)
    }
    
    // Fermer et attendre
    pipeline.Close()
    pipeline.Wait()
    
    // Afficher les métriques finales
    metrics := pipeline.GetMetrics()
    fmt.Printf("\nMétriques finales :\n")
    fmt.Printf("  Éléments traités : %d\n", metrics.ProcessedCount)
    fmt.Printf("  Lots traités : %d\n", metrics.BatchCount)
    fmt.Printf("  Erreurs : %d\n", metrics.ErrorCount)
    fmt.Printf("  Temps moyen : %v\n", metrics.AvgProcessingTime)
}
```

### Pipeline de déduplication avec métriques

```go
package main

import (
    "fmt"
    "time"
    
    "github.com/rushairer/go-pipeline/v2"
)

type User struct {
    ID   int
    Name string
}

func main() {
    pipeline := gopipeline.NewDeduplicationPipeline[User](
        func(users []User) error {
            fmt.Printf("Traitement de %d utilisateurs uniques\n", len(users))
            for _, user := range users {
                fmt.Printf("  - %s (ID: %d)\n", user.Name, user.ID)
            }
            return nil
        },
        func(user User) string {
            return fmt.Sprintf("user_%d", user.ID)
        },
    )
    
    // Ajouter des utilisateurs (avec doublons)
    users := []User{
        {1, "Alice"},
        {2, "Bob"},
        {1, "Alice"}, // Doublon
        {3, "Charlie"},
        {2, "Bob"},   // Doublon
    }
    
    for _, user := range users {
        pipeline.Add(user)
    }
    
    pipeline.Close()
    pipeline.Wait()
    
    // Afficher les métriques
    metrics := pipeline.GetMetrics()
    fmt.Printf("\nMétriques :\n")
    fmt.Printf("  Éléments traités : %d\n", metrics.ProcessedCount)
    fmt.Printf("  Éléments supprimés : %d\n", metrics.DroppedCount)
    fmt.Printf("  Taux de déduplication : %.1f%%\n", 
        float64(metrics.DroppedCount)/float64(len(users))*100)
}