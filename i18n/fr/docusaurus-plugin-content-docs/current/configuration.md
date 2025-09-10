---
sidebar_position: 4
---

# Configuration

Go Pipeline v2 offre un système de configuration riche et flexible pour s'adapter à différents scénarios d'utilisation. Ce guide détaille tous les paramètres de configuration disponibles et leurs cas d'usage.

## Configuration par défaut

Basé sur les tests de performance, Go Pipeline v2 fournit une configuration par défaut optimisée :

```go
config := gopipeline.NewPipelineConfig()
// Équivalent à :
// FlushSize: 50
// FlushInterval: 1 seconde
// MaxWorkers: runtime.NumCPU()
// ChannelSize: 100
```

## Création de configuration

### Méthode recommandée (chaînage)

```go
config := gopipeline.NewPipelineConfig().
    SetFlushSize(100).
    SetFlushInterval(5 * time.Second).
    SetMaxWorkers(4).
    SetChannelSize(1000)
```

### Méthode directe

```go
config := &gopipeline.PipelineConfig{
    FlushSize:     100,
    FlushInterval: 5 * time.Second,
    MaxWorkers:    4,
    ChannelSize:   1000,
}
```

## Paramètres de configuration

### FlushSize (Taille du lot)

**Fonction** : Contrôle le nombre d'éléments dans chaque lot de traitement

**Valeur par défaut** : 50

**Plage recommandée** : 10-1000

**Impact** :
- **Valeur élevée** : Améliore le débit, augmente l'utilisation mémoire, augmente la latence
- **Valeur faible** : Réduit la latence, diminue le débit, réduit l'utilisation mémoire

```go
// Scénario haute performance
highThroughputConfig := gopipeline.NewPipelineConfig().
    SetFlushSize(200)

// Scénario faible latence
lowLatencyConfig := gopipeline.NewPipelineConfig().
    SetFlushSize(20)
```

### FlushInterval (Intervalle de vidage)

**Fonction** : Contrôle l'intervalle de temps maximum entre les traitements par lots

**Valeur par défaut** : 1 seconde

**Plage recommandée** : 100ms-30s

**Impact** :
- **Intervalle long** : Améliore l'efficacité du traitement par lots, augmente la latence
- **Intervalle court** : Réduit la latence, peut diminuer l'efficacité

```go
// Traitement en temps réel
realtimeConfig := gopipeline.NewPipelineConfig().
    SetFlushInterval(100 * time.Millisecond)

// Traitement par lots
batchConfig := gopipeline.NewPipelineConfig().
    SetFlushInterval(10 * time.Second)
```

### MaxWorkers (Nombre de workers)

**Fonction** : Contrôle le nombre de goroutines de traitement concurrent

**Valeur par défaut** : `runtime.NumCPU()`

**Plage recommandée** : 1-20

**Impact** :
- **Valeur élevée** : Améliore la concurrence, augmente l'utilisation des ressources
- **Valeur faible** : Réduit l'utilisation des ressources, peut limiter les performances

```go
// Traitement intensif CPU
cpuIntensiveConfig := gopipeline.NewPipelineConfig().
    SetMaxWorkers(runtime.NumCPU() * 2)

// Traitement intensif I/O
ioIntensiveConfig := gopipeline.NewPipelineConfig().
    SetMaxWorkers(runtime.NumCPU() * 4)
```

### ChannelSize (Taille du canal)

**Fonction** : Contrôle la taille du buffer du canal de données interne

**Valeur par défaut** : 100

**Valeurs suggérées** :
- Scénario général : 20-100
- Scénario haute performance : 500-2000
- Scénario mémoire limitée : 10-50

```go
// Configuration haute performance
highPerfConfig := gopipeline.NewPipelineConfig().
    SetChannelSize(1000)
```

## Configuration par scénarios

### Insertion en lot en base de données

```go
dbConfig := gopipeline.NewPipelineConfig().
    SetFlushSize(500).                    // Lots importants pour l'efficacité DB
    SetFlushInterval(2 * time.Second).    // Intervalle modéré
    SetMaxWorkers(2).                     // Limiter la concurrence DB
    SetChannelSize(2000)                  // Buffer important pour les pics
```

### Traitement d'appels API

```go
apiConfig := gopipeline.NewPipelineConfig().
    SetFlushSize(10).                     // Lots petits pour respecter les limites API
    SetFlushInterval(500 * time.Millisecond). // Traitement fréquent
    SetMaxWorkers(3).                     // Concurrence modérée
    SetChannelSize(500)                   // Buffer modéré
```

### Agrégation de logs

```go
logConfig := gopipeline.NewPipelineConfig().
    SetFlushSize(1000).                   // Lots importants pour l'efficacité
    SetFlushInterval(5 * time.Second).    // Intervalle plus long acceptable
    SetMaxWorkers(1).                     // Traitement séquentiel des logs
    SetChannelSize(5000)                  // Buffer important pour les pics
```

### Traitement de données en temps réel

```go
realtimeConfig := gopipeline.NewPipelineConfig().
    SetFlushSize(1).                      // Traitement immédiat
    SetFlushInterval(10 * time.Millisecond). // Très faible latence
    SetMaxWorkers(runtime.NumCPU()).      // Utilisation complète du CPU
    SetChannelSize(100)                   // Buffer petit pour faible latence
```

## Validation de configuration

Go Pipeline valide automatiquement la configuration et applique des valeurs par défaut pour les paramètres invalides :

```go
config := &gopipeline.PipelineConfig{
    FlushSize:     0,    // Sera défini à 1
    FlushInterval: -1,   // Sera défini à 1 seconde
    MaxWorkers:    0,    // Sera défini à runtime.NumCPU()
    ChannelSize:   -1,   // Sera défini à 100
}
```

## Optimisation des performances

### Problème 1 : Latence de traitement élevée

**Symptômes** : Délai important entre l'ajout et le traitement des données

**Solutions** :
```go
lowLatencyConfig := gopipeline.NewPipelineConfig().
    SetFlushSize(10).                     // Réduire la taille des lots
    SetFlushInterval(50 * time.Millisecond). // Réduire l'intervalle
    SetMaxWorkers(runtime.NumCPU()).      // Augmenter la concurrence
    SetChannelSize(50)                    // Réduire le buffer
```

### Problème 2 : Utilisation mémoire élevée

**Symptômes** : Croissance continue de l'utilisation mémoire

**Solutions** :
```go
memoryOptimizedConfig := gopipeline.NewPipelineConfig().
    SetFlushSize(20).                     // Réduire la taille des lots
    SetFlushInterval(500 * time.Millisecond). // Traitement plus fréquent
    SetMaxWorkers(2).                     // Limiter la concurrence
    SetChannelSize(50)                    // Réduire le buffer
```

### Problème 3 : Débit insuffisant

**Symptômes** : Vitesse de traitement inférieure au taux d'arrivée des données

**Solutions** :
```go
highThroughputConfig := gopipeline.NewPipelineConfig().
    SetFlushSize(500).                    // Augmenter la taille des lots
    SetFlushInterval(2 * time.Second).    // Intervalle plus long
    SetMaxWorkers(runtime.NumCPU() * 2).  // Plus de workers
    SetChannelSize(2000)                  // Buffer plus important
```

## Surveillance de configuration

```go
// Obtenir la configuration actuelle
currentConfig := pipeline.GetConfig()
fmt.Printf("Taille du lot : %d\n", currentConfig.FlushSize)
fmt.Printf("Intervalle : %v\n", currentConfig.FlushInterval)

// Obtenir les métriques pour évaluer l'efficacité
metrics := pipeline.GetMetrics()
fmt.Printf("Débit moyen : %.2f éléments/sec\n", 
    float64(metrics.ProcessedCount) / time.Since(startTime).Seconds())
```

## Bonnes pratiques

1. **Commencer par la configuration par défaut** et ajuster selon les besoins
2. **Surveiller les métriques** pour évaluer l'impact des changements
3. **Tester en conditions réelles** avant le déploiement en production
4. **Considérer les ressources système** lors de la configuration
5. **Documenter les configurations spécifiques** pour la maintenance

## Configuration avancée

### Configuration dynamique

```go
// Ajuster la configuration en cours d'exécution (nécessite redémarrage)
newConfig := gopipeline.NewPipelineConfig().
    SetFlushSize(newFlushSize).
    SetMaxWorkers(newWorkerCount)

// Créer un nouveau pipeline avec la nouvelle configuration
newPipeline := gopipeline.NewStandardPipelineWithConfig[T](processor, newConfig)
```

### Configuration basée sur l'environnement

```go
func createConfig() *gopipeline.PipelineConfig {
    if os.Getenv("ENV") == "production" {
        return gopipeline.NewPipelineConfig().
            SetFlushSize(200).
            SetMaxWorkers(4)
    }
    return gopipeline.NewPipelineConfig().
        SetFlushSize(10).
        SetMaxWorkers(1)
}