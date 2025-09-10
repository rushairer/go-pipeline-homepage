---
sidebar_position: 4
---

# Guide de configuration

Ce document fournit des informations détaillées sur les paramètres de configuration de Go Pipeline v2 et les meilleures pratiques.

## Structure de configuration

```go
type PipelineConfig struct {
    BufferSize    uint32        // Capacité du canal tampon
    FlushSize     uint32        // Capacité maximale des données de traitement par lots
    FlushInterval time.Duration // Intervalle de temps pour l'actualisation programmée
}
```

## Configuration par défaut

Basé sur les benchmarks de performance, Go Pipeline v2 fournit une configuration par défaut optimisée :

```go
const (
    defaultBufferSize    = 100                   // Taille du tampon
    defaultFlushSize     = 50                    // Taille du lot
    defaultFlushInterval = time.Millisecond * 50 // Intervalle de vidage
)
```

### Utilisation de la configuration par défaut

Vous pouvez utiliser la fonction `NewPipelineConfig()` pour créer une configuration avec des valeurs par défaut, puis personnaliser des paramètres spécifiques :

```go
// Créer une configuration avec des valeurs par défaut
config := gopipeline.NewPipelineConfig()

// Utiliser directement les valeurs par défaut
pipeline := gopipeline.NewStandardPipeline(config, flushFunc)

// Ou utiliser des méthodes en chaîne pour personnaliser des paramètres spécifiques
config = gopipeline.NewPipelineConfig().
    WithFlushInterval(time.Millisecond * 10).
    WithBufferSize(200)

pipeline = gopipeline.NewStandardPipeline(config, flushFunc)
```

Méthodes de configuration disponibles :
- `NewPipelineConfig()` - Créer une configuration avec des valeurs par défaut
- `WithBufferSize(size uint32)` - Définir la taille du tampon
- `WithFlushSize(size uint32)` - Définir la taille du lot
- `WithFlushInterval(interval time.Duration)` - Définir l'intervalle de vidage

## Détails des paramètres de configuration

### BufferSize (Taille du tampon)

**Objectif** : Contrôle la taille du tampon du canal de données interne

**Valeur par défaut** : 100

**Valeurs recommandées** : 
- Devrait être >= FlushSize * 2 pour éviter le blocage
- Peut être augmentée de manière appropriée pour les scénarios de haute concurrence

```go
standardConfig := gopipeline.PipelineConfig{
    BufferSize:    200,                   // Recommandé 2-4 fois FlushSize
    FlushSize:     50,                    // Taille de lot standard
    FlushInterval: time.Millisecond * 50, // Intervalle de vidage standard
}
```

**Impact** :
- Trop petit : Peut causer un blocage d'écriture
- Trop grand : Augmente l'utilisation mémoire et retarde le temps d'arrêt

### FlushSize (Taille du lot)

**Objectif** : Contrôle la quantité de données dans chaque traitement par lots

**Valeur par défaut** : 50

**Valeurs recommandées** :
- Scénarios généraux : 20-100
- Scénarios de haut débit : 100-500
- Scénarios de faible latence : 10-50

```go
// Exemples de configuration pour différents scénarios
// Scénario de haut débit
configHautDebit := gopipeline.PipelineConfig{
    BufferSize:    400,                   // Taille de tampon 2x FlushSize
    FlushSize:     200,                   // Traitement par gros lots
    FlushInterval: time.Millisecond * 100, // Intervalle modéré
}

// Scénario de faible latence
configFaibleLatence := gopipeline.PipelineConfig{
    BufferSize:    50,                    // Petit tampon
    FlushSize:     20,                    // Traitement par petits lots
    FlushInterval: time.Millisecond * 10, // Intervalle court
}
```

**Impact** :
- Trop petit : Augmente la fréquence de traitement, réduit le débit
- Trop grand : Augmente la latence et l'utilisation mémoire

### FlushInterval (Intervalle de vidage)

**Objectif** : Contrôle l'intervalle de temps pour l'actualisation programmée

**Valeur par défaut** : 50ms

**Valeurs recommandées** :
- Scénarios de faible latence : 10-50ms
- Scénarios équilibrés : 50-200ms
- Scénarios de haut débit : 200ms-1s

```go
// Exemples de configuration pour différents scénarios
// Scénario de faible latence
configFaibleLatence := gopipeline.PipelineConfig{
    BufferSize:    50,                    // Petit tampon
    FlushSize:     10,                    // Petit lot
    FlushInterval: time.Millisecond * 10, // Intervalle très court
}

// Scénario de haut débit
configHautDebit := gopipeline.PipelineConfig{
    BufferSize:    1000,              // Grand tampon
    FlushSize:     500,               // Grand lot
    FlushInterval: time.Second,       // Long intervalle
}
```

**Impact** :
- Trop petit : Augmente l'utilisation CPU, peut causer un traitement fréquent par petits lots
- Trop grand : Augmente la latence de traitement des données

## Configuration basée sur les scénarios

### Insertion par lots en base de données

```go
// Configuration optimisée pour l'insertion par lots en base de données
configDB := gopipeline.PipelineConfig{
    BufferSize:    500,                    // Tampon plus grand
    FlushSize:     100,                    // Taille de lot modérée
    FlushInterval: time.Millisecond * 200, // Latence modérée
}

pipeline := gopipeline.NewStandardPipeline(configDB,
    func(ctx context.Context, records []Record) error {
        return db.CreateInBatches(records, len(records)).Error
    },
)
```

### Traitement par lots d'appels API

```go
// Configuration pour le traitement par lots d'appels API
configAPI := gopipeline.PipelineConfig{
    BufferSize:    100,                   // Tampon modéré
    FlushSize:     20,                    // Lot plus petit (éviter les limites API)
    FlushInterval: time.Millisecond * 50, // Faible latence
}

pipeline := gopipeline.NewStandardPipeline(configAPI,
    func(ctx context.Context, requests []APIRequest) error {
        return batchCallAPI(requests)
    },
)
```

### Écriture par lots de logs

```go
// Configuration pour l'écriture par lots de logs
configLog := gopipeline.PipelineConfig{
    BufferSize:    1000,               // Grand tampon (volume élevé de logs)
    FlushSize:     200,                // Grand lot
    FlushInterval: time.Millisecond * 100, // Latence modérée
}

pipeline := gopipeline.NewStandardPipeline(configLog,
    func(ctx context.Context, logs []LogEntry) error {
        return writeLogsToFile(logs)
    },
)
```

### Traitement de données en temps réel

```go
// Configuration pour le traitement de données en temps réel
configTempsReel := gopipeline.PipelineConfig{
    BufferSize:    50,                    // Petit tampon
    FlushSize:     10,                    // Petit lot
    FlushInterval: time.Millisecond * 10, // Très faible latence
}

pipeline := gopipeline.NewStandardPipeline(configTempsReel,
    func(ctx context.Context, events []Event) error {
        return processRealTimeEvents(events)
    },
)
```

## Guide d'optimisation des performances

### 1. Déterminer les objectifs de performance

Clarifiez d'abord vos objectifs de performance :

- **Priorité débit** : Augmenter FlushSize et FlushInterval
- **Priorité latence** : Diminuer FlushSize et FlushInterval
- **Priorité mémoire** : Diminuer BufferSize et FlushSize

### 2. Benchmarking

Utilisez des benchmarks pour vérifier l'efficacité de la configuration :

```go
func BenchmarkPipelineConfig(b *testing.B) {
    configs := []gopipeline.PipelineConfig{
        {BufferSize: 50, FlushSize: 25, FlushInterval: time.Millisecond * 25},
        {BufferSize: 100, FlushSize: 50, FlushInterval: time.Millisecond * 50},
        {BufferSize: 200, FlushSize: 100, FlushInterval: time.Millisecond * 100},
    }
    
    for i, config := range configs {
        b.Run(fmt.Sprintf("Config%d", i), func(b *testing.B) {
            pipeline := gopipeline.NewStandardPipeline(config, 
                func(ctx context.Context, data []int) error {
                    // Simuler le traitement
                    time.Sleep(time.Microsecond * 100)
                    return nil
                })
            
            // Logique de benchmark...
        })
    }
}
```

### 3. Surveiller les métriques

Surveillez les métriques clés pour optimiser la configuration :

```go
type PipelineMetrics struct {
    TotalProcessed   int64
    BatchCount       int64
    AverageLatency   time.Duration
    ErrorCount       int64
    MemoryUsage      int64
}

func monitorPipeline(pipeline Pipeline[Data]) {
    ticker := time.NewTicker(time.Second * 10)
    defer ticker.Stop()
    
    for range ticker.C {
        // Collecter et enregistrer les métriques
        metrics := collectMetrics(pipeline)
        log.Printf("Métriques du pipeline : %+v", metrics)
        
        // Ajuster la configuration basée sur les métriques
        if metrics.AverageLatency > time.Millisecond*100 {
            // Considérer réduire la taille du lot ou l'intervalle
        }
    }
}
```

## Validation de configuration

### Vérification de la cohérence de la configuration

```go
func validateConfig(config gopipeline.PipelineConfig) error {
    if config.BufferSize < config.FlushSize*2 {
        return fmt.Errorf("BufferSize (%d) devrait être au moins 2x FlushSize (%d)", 
            config.BufferSize, config.FlushSize)
    }
    
    if config.FlushSize == 0 {
        return fmt.Errorf("FlushSize ne peut pas être zéro")
    }
    
    if config.FlushInterval <= 0 {
        return fmt.Errorf("FlushInterval doit être positif")
    }
    
    return nil
}
```

### Ajustement dynamique de la configuration

```go
type DynamicPipeline struct {
    pipeline Pipeline[Data]
    config   gopipeline.PipelineConfig
    mutex    sync.RWMutex
}

func (dp *DynamicPipeline) UpdateConfig(newConfig gopipeline.PipelineConfig) error {
    if err := validateConfig(newConfig); err != nil {
        return err
    }
    
    dp.mutex.Lock()
    defer dp.mutex.Unlock()
    
    // Recréer le pipeline (l'implémentation réelle peut nécessiter une logique plus complexe)
    dp.config = newConfig
    // dp.pipeline = recreatePipeline(newConfig)
    
    return nil
}
```

## Problèmes courants et solutions

### Problème 1 : Latence élevée de traitement des données

**Symptômes** : Le temps entre l'ajout de données et la fin du traitement est trop long

**Causes possibles** :
- FlushInterval défini trop grand
- FlushSize défini trop grand
- Temps d'exécution de la fonction de traitement trop long

**Solutions** :
```go
// Réduire l'intervalle de vidage et la taille du lot
configFaibleLatence := gopipeline.PipelineConfig{
    BufferSize:    50,                    // Tampon adapté aux petits lots
    FlushSize:     20,                    // Réduire la taille du lot
    FlushInterval: time.Millisecond * 10, // Réduire l'intervalle
}
```

### Problème 2 : Utilisation mémoire élevée

**Symptômes** : L'utilisation mémoire du programme continue de croître

**Causes possibles** :
- BufferSize défini trop grand
- FlushSize défini trop grand (surtout pour le pipeline de déduplication)
- Canal d'erreur non consommé

**Solutions** :
```go
// Réduire la taille du tampon et du lot
configOptimiseMemoire := gopipeline.PipelineConfig{
    BufferSize:    50,                    // Réduire le tampon
    FlushSize:     25,                    // Réduire la taille du lot
    FlushInterval: time.Millisecond * 50, // Garder un intervalle modéré
}

// S'assurer de la consommation du canal d'erreur
errorChan := pipeline.ErrorChan(10)
go func() {
    for {
        select {
        case err, ok := <-errorChan:
            if !ok {
                return
            }
            log.Printf("Erreur : %v", err)
        case <-ctx.Done():
            return
        }
    }
}()
```

### Problème 3 : Débit insuffisant

**Symptômes** : La vitesse de traitement des données ne peut pas suivre la vitesse de génération des données

**Causes possibles** :
- FlushSize défini trop petit
- FlushInterval défini trop petit
- BufferSize défini trop petit causant un blocage

**Solutions** :
```go
// Augmenter la taille du lot et du tampon
configHautDebit := gopipeline.PipelineConfig{
    BufferSize:    500,                    // Augmenter le tampon
    FlushSize:     100,                    // Augmenter la taille du lot
    FlushInterval: time.Millisecond * 100, // Intervalle modéré
}
```

## Résumé des meilleures pratiques

1. **Commencer avec la configuration par défaut** : La configuration par défaut convient à la plupart des scénarios
2. **Ajuster selon les besoins réels** : Ajuster selon les exigences de latence, débit, mémoire
3. **Effectuer des benchmarks** : Utiliser des données réelles pour les tests de performance
4. **Surveiller les métriques clés** : Surveiller continuellement les métriques de performance
5. **Validation de configuration** : S'assurer de la cohérence des paramètres de configuration
6. **Documenter la configuration** : Enregistrer les raisons des choix de configuration et les résultats des tests

## Étapes suivantes

- [Référence API](./api-reference) - Documentation API complète
- [Pipeline standard](./standard-pipeline) - Guide d'utilisation du pipeline standard
- [Pipeline de déduplication](./deduplication-pipeline) - Guide d'utilisation du pipeline de déduplication