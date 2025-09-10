---
sidebar_position: 2
---

# Pipeline Standard

Le pipeline standard est le type de pipeline le plus couramment utilisé dans Go Pipeline, adapté à la plupart des scénarios de traitement par lots. Il offre un traitement par lots efficace avec une configuration flexible.

## Utilisation de base

### Création avec configuration par défaut

```go
package main

import (
    "fmt"
    "github.com/rushairer/go-pipeline/v2"
)

func main() {
    // Créer un pipeline standard avec configuration par défaut
    pipeline := gopipeline.NewStandardPipeline[int](func(items []int) error {
        fmt.Printf("Traitement du lot : %v\n", items)
        return nil
    })
    
    // Ajouter des données
    for i := 1; i <= 10; i++ {
        pipeline.Add(i)
    }
    
    // Fermer et attendre la fin
    pipeline.Close()
    pipeline.Wait()
}
```

### Utilisation avec configuration personnalisée

```go
customConfig := gopipeline.NewPipelineConfig().
    SetFlushSize(100).
    SetFlushInterval(2 * time.Second).
    SetMaxWorkers(4).
    SetChannelSize(500)

pipeline := gopipeline.NewStandardPipelineWithConfig[string](
    func(items []string) error {
        // Traiter le lot de chaînes
        for _, item := range items {
            fmt.Printf("Traitement : %s\n", item)
        }
        return nil
    },
    customConfig,
)
```

## Gestion des erreurs

### Gestion d'erreur de base

```go
pipeline := gopipeline.NewStandardPipeline[int](func(items []int) error {
    for _, item := range items {
        if item < 0 {
            return fmt.Errorf("valeur négative non autorisée : %d", item)
        }
        // Traiter l'élément valide
        fmt.Printf("Traitement : %d\n", item)
    }
    return nil
})
```

### Gestion d'erreur avancée avec retry

```go
pipeline := gopipeline.NewStandardPipeline[string](func(items []string) error {
    const maxRetries = 3
    
    for attempt := 1; attempt <= maxRetries; attempt++ {
        err := processItems(items)
        if err == nil {
            return nil // Succès
        }
        
        if attempt == maxRetries {
            return fmt.Errorf("échec après %d tentatives : %w", maxRetries, err)
        }
        
        // Attendre avant de réessayer
        time.Sleep(time.Duration(attempt) * time.Second)
    }
    return nil
})
```

## Utilisation avancée

### Traitement avec contexte

```go
func createPipelineWithContext(ctx context.Context) *gopipeline.StandardPipeline[int] {
    return gopipeline.NewStandardPipeline[int](func(items []int) error {
        select {
        case <-ctx.Done():
            return ctx.Err() // Annulation détectée
        default:
            // Traitement normal
            return processItems(items)
        }
    })
}
```

### Traitement avec métriques

```go
pipeline := gopipeline.NewStandardPipeline[int](func(items []int) error {
    start := time.Now()
    defer func() {
        duration := time.Since(start)
        fmt.Printf("Lot de %d éléments traité en %v\n", len(items), duration)
    }()
    
    // Logique de traitement
    return processItems(items)
})
```

## Optimisation des performances

### 1. Ajustement de la taille des lots

```go
// Selon la capacité de traitement, ajuster la taille des lots
highCapacityConfig := gopipeline.NewPipelineConfig().
    SetFlushSize(200)  // Lots plus importants pour haute capacité

lowCapacityConfig := gopipeline.NewPipelineConfig().
    SetFlushSize(20)   // Lots plus petits pour faible capacité
```

### 2. Optimisation de la concurrence

```go
// Traitement intensif CPU
cpuConfig := gopipeline.NewPipelineConfig().
    SetMaxWorkers(runtime.NumCPU())

// Traitement intensif I/O
ioConfig := gopipeline.NewPipelineConfig().
    SetMaxWorkers(runtime.NumCPU() * 2)
```

### 3. Gestion de la mémoire

```go
// Configuration économe en mémoire
memoryEfficientConfig := gopipeline.NewPipelineConfig().
    SetFlushSize(50).
    SetChannelSize(100).
    SetMaxWorkers(2)
```

## Surveillance et débogage

### Obtention des métriques

```go
// Obtenir les métriques du pipeline
metrics := pipeline.GetMetrics()
fmt.Printf("Éléments traités : %d\n", metrics.ProcessedCount)
fmt.Printf("Lots traités : %d\n", metrics.BatchCount)
fmt.Printf("Erreurs : %d\n", metrics.ErrorCount)
fmt.Printf("Temps de traitement moyen : %v\n", metrics.AvgProcessingTime)
```

### Logging détaillé

```go
pipeline := gopipeline.NewStandardPipeline[string](func(items []string) error {
    log.Printf("Début du traitement du lot de %d éléments", len(items))
    
    for i, item := range items {
        log.Printf("Traitement de l'élément %d/%d : %s", i+1, len(items), item)
        // Logique de traitement
    }
    
    log.Printf("Fin du traitement du lot")
    return nil
})
```

## Cas d'usage courants

### 1. Insertion en base de données

```go
pipeline := gopipeline.NewStandardPipeline[User](func(users []User) error {
    // Insertion en lot pour optimiser les performances
    return db.CreateUsersInBatch(users)
})

// Ajouter des utilisateurs
for _, user := range userList {
    pipeline.Add(user)
}
```

### 2. Traitement de fichiers

```go
pipeline := gopipeline.NewStandardPipeline[string](func(filePaths []string) error {
    for _, path := range filePaths {
        if err := processFile(path); err != nil {
            log.Printf("Erreur lors du traitement de %s : %v", path, err)
            // Continuer avec les autres fichiers
        }
    }
    return nil
})
```

### 3. Appels d'API

```go
pipeline := gopipeline.NewStandardPipeline[APIRequest](func(requests []APIRequest) error {
    // Traitement par lots des requêtes API
    return apiClient.ProcessBatch(requests)
})
```

### 4. Traitement de logs

```go
pipeline := gopipeline.NewStandardPipeline[LogEntry](func(logs []LogEntry) error {
    // Agrégation et traitement des logs
    return logProcessor.ProcessBatch(logs)
})
```

## Bonnes pratiques

### 1. Gestion du cycle de vie

```go
func main() {
    pipeline := gopipeline.NewStandardPipeline[int](processor)
    
    // Gestion gracieuse de l'arrêt
    c := make(chan os.Signal, 1)
    signal.Notify(c, os.Interrupt, syscall.SIGTERM)
    
    go func() {
        <-c
        log.Println("Arrêt gracieux du pipeline...")
        pipeline.Close()
    }()
    
    // Ajouter des données
    // ...
    
    // Attendre la fin
    pipeline.Wait()
    log.Println("Pipeline arrêté")
}
```

### 2. Gestion des ressources

```go
pipeline := gopipeline.NewStandardPipeline[*os.File](func(files []*os.File) error {
    // S'assurer que les ressources sont libérées
    defer func() {
        for _, file := range files {
            if file != nil {
                file.Close()
            }
        }
    }()
    
    // Traitement des fichiers
    return processFiles(files)
})
```

### 3. Tests unitaires

```go
func TestStandardPipeline(t *testing.T) {
    var processedItems []int
    var mu sync.Mutex
    
    pipeline := gopipeline.NewStandardPipeline[int](func(items []int) error {
        mu.Lock()
        defer mu.Unlock()
        processedItems = append(processedItems, items...)
        return nil
    })
    
    // Ajouter des données de test
    for i := 1; i <= 5; i++ {
        pipeline.Add(i)
    }
    
    pipeline.Close()
    pipeline.Wait()
    
    // Vérifier les résultats
    assert.Equal(t, []int{1, 2, 3, 4, 5}, processedItems)
}
```

## Dépannage

### Problèmes courants

1. **Fuite mémoire** : Vérifier que `Close()` et `Wait()` sont appelés
2. **Performances lentes** : Ajuster `FlushSize` et `MaxWorkers`
3. **Blocage** : Vérifier la logique de traitement pour les blocages potentiels
4. **Perte de données** : S'assurer que `Wait()` est appelé avant la fin du programme

### Débogage

```go
// Activer le logging détaillé
pipeline := gopipeline.NewStandardPipelineWithConfig[int](
    func(items []int) error {
        log.Printf("Traitement de %d éléments", len(items))
        return nil
    },
    gopipeline.NewPipelineConfig().SetDebug(true),
)