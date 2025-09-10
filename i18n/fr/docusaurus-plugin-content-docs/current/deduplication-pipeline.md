---
sidebar_position: 3
---

# Pipeline de Déduplication

Le pipeline de déduplication est un type spécialisé de pipeline qui élimine automatiquement les éléments en double avant le traitement. Il est idéal pour les scénarios où les données peuvent contenir des doublons et où seuls les éléments uniques doivent être traités.

## Utilisation de base

### Création avec fonction de clé simple

```go
package main

import (
    "fmt"
    "github.com/rushairer/go-pipeline/v2"
)

func main() {
    // Créer un pipeline de déduplication
    pipeline := gopipeline.NewDeduplicationPipeline[int](
        func(items []int) error {
            fmt.Printf("Traitement des éléments uniques : %v\n", items)
            return nil
        },
        func(item int) string {
            // Fonction de génération de clé pour la déduplication
            return fmt.Sprintf("key_%d", item)
        },
    )
    
    // Ajouter des données (avec doublons)
    pipeline.Add(1)
    pipeline.Add(2)
    pipeline.Add(1) // Doublon - sera ignoré
    pipeline.Add(3)
    pipeline.Add(2) // Doublon - sera ignoré
    
    // Fermer et attendre
    pipeline.Close()
    pipeline.Wait()
    // Sortie : Traitement des éléments uniques : [1 2 3]
}
```

### Utilisation avec configuration personnalisée

```go
config := gopipeline.NewPipelineConfig().
    SetFlushSize(50).
    SetFlushInterval(2 * time.Second).
    SetMaxWorkers(2).
    SetChannelSize(200)

pipeline := gopipeline.NewDeduplicationPipelineWithConfig[string](
    func(items []string) error {
        fmt.Printf("Traitement de %d chaînes uniques\n", len(items))
        return nil
    },
    func(item string) string {
        // Utiliser la chaîne elle-même comme clé
        return item
    },
    config,
)
```

## Stratégies de déduplication

### 1. Déduplication par valeur

```go
// Pour les types simples, utiliser la valeur comme clé
pipeline := gopipeline.NewDeduplicationPipeline[string](
    processor,
    func(item string) string {
        return item // La chaîne elle-même est la clé
    },
)
```

### 2. Déduplication par champ

```go
type User struct {
    ID    int
    Name  string
    Email string
}

// Déduplication par ID utilisateur
pipeline := gopipeline.NewDeduplicationPipeline[User](
    func(users []User) error {
        // Traiter les utilisateurs uniques
        return processUsers(users)
    },
    func(user User) string {
        return fmt.Sprintf("user_%d", user.ID)
    },
)
```

### 3. Déduplication par champs multiples

```go
type Event struct {
    UserID    int
    EventType string
    Timestamp time.Time
}

// Déduplication par combinaison UserID + EventType
pipeline := gopipeline.NewDeduplicationPipeline[Event](
    processor,
    func(event Event) string {
        return fmt.Sprintf("%d_%s", event.UserID, event.EventType)
    },
)
```

### 4. Déduplication par hash

```go
import (
    "crypto/md5"
    "encoding/json"
)

// Déduplication par hash du contenu complet
pipeline := gopipeline.NewDeduplicationPipeline[ComplexStruct](
    processor,
    func(item ComplexStruct) string {
        data, _ := json.Marshal(item)
        hash := md5.Sum(data)
        return fmt.Sprintf("%x", hash)
    },
)
```

## Gestion de la mémoire

Le pipeline de déduplication utilise une map pour stocker les données, l'utilisation mémoire augmente avec la taille des lots.

### Configuration pour économiser la mémoire

```go
// Des lots plus petits peuvent réduire l'utilisation mémoire
memoryEfficientConfig := gopipeline.NewPipelineConfig().
    SetFlushSize(20).                     // Lots plus petits
    SetFlushInterval(500 * time.Millisecond). // Vidage plus fréquent
    SetChannelSize(50)                    // Buffer plus petit
```

### Surveillance de l'utilisation mémoire

```go
pipeline := gopipeline.NewDeduplicationPipeline[int](
    func(items []int) error {
        // Obtenir les métriques avant traitement
        metrics := pipeline.GetMetrics()
        fmt.Printf("Éléments en attente : %d\n", metrics.PendingCount)
        
        return processItems(items)
    },
    keyFunc,
)
```

## Cas d'usage avancés

### 1. Déduplication d'événements

```go
type ClickEvent struct {
    UserID    string
    PageURL   string
    Timestamp time.Time
}

// Déduplication des clics dans une fenêtre de temps
pipeline := gopipeline.NewDeduplicationPipeline[ClickEvent](
    func(events []ClickEvent) error {
        // Traiter les événements de clic uniques
        return analyticsService.ProcessClicks(events)
    },
    func(event ClickEvent) string {
        // Déduplication par utilisateur + page (ignorer le timestamp)
        return fmt.Sprintf("%s_%s", event.UserID, event.PageURL)
    },
)
```

### 2. Déduplication de données de capteurs

```go
type SensorReading struct {
    SensorID string
    Value    float64
    Location string
}

// Déduplication par capteur et localisation
pipeline := gopipeline.NewDeduplicationPipeline[SensorReading](
    func(readings []SensorReading) error {
        return storageService.SaveReadings(readings)
    },
    func(reading SensorReading) string {
        return fmt.Sprintf("%s_%s", reading.SensorID, reading.Location)
    },
)
```

### 3. Déduplication d'API requests

```go
type APIRequest struct {
    Method   string
    URL      string
    UserID   string
    Params   map[string]string
}

// Déduplication des requêtes identiques
pipeline := gopipeline.NewDeduplicationPipeline[APIRequest](
    func(requests []APIRequest) error {
        return apiGateway.ProcessRequests(requests)
    },
    func(req APIRequest) string {
        // Créer une clé basée sur la méthode, URL et paramètres
        paramsStr, _ := json.Marshal(req.Params)
        return fmt.Sprintf("%s_%s_%s_%s", req.Method, req.URL, req.UserID, paramsStr)
    },
)
```

## Optimisation des performances

### 1. Optimisation de la fonction de clé

```go
// ❌ Inefficace - sérialisation JSON coûteuse
func slowKeyFunc(item ComplexStruct) string {
    data, _ := json.Marshal(item)
    return string(data)
}

// ✅ Efficace - concaténation de champs spécifiques
func fastKeyFunc(item ComplexStruct) string {
    return fmt.Sprintf("%d_%s_%d", item.ID, item.Type, item.Version)
}
```

### 2. Configuration pour haute performance

```go
highPerfConfig := gopipeline.NewPipelineConfig().
    SetFlushSize(100).                    // Lots plus importants
    SetFlushInterval(1 * time.Second).    // Intervalle plus long
    SetMaxWorkers(runtime.NumCPU()).      // Utilisation complète du CPU
    SetChannelSize(500)                   // Buffer plus important
```

### 3. Gestion des pics de charge

```go
// Configuration pour gérer les pics de données
burstConfig := gopipeline.NewPipelineConfig().
    SetFlushSize(200).
    SetChannelSize(2000).  // Buffer important pour absorber les pics
    SetMaxWorkers(4)
```

## Surveillance et métriques

### Métriques spécifiques à la déduplication

```go
pipeline := gopipeline.NewDeduplicationPipeline[int](
    func(items []int) error {
        metrics := pipeline.GetMetrics()
        
        // Métriques standard
        fmt.Printf("Éléments traités : %d\n", metrics.ProcessedCount)
        fmt.Printf("Lots traités : %d\n", metrics.BatchCount)
        
        // Calculer le taux de déduplication
        totalAdded := metrics.ProcessedCount + metrics.DroppedCount
        deduplicationRate := float64(metrics.DroppedCount) / float64(totalAdded) * 100
        fmt.Printf("Taux de déduplication : %.2f%%\n", deduplicationRate)
        
        return processItems(items)
    },
    keyFunc,
)
```

### Logging détaillé

```go
pipeline := gopipeline.NewDeduplicationPipeline[string](
    func(items []string) error {
        log.Printf("Traitement de %d éléments uniques", len(items))
        for i, item := range items {
            log.Printf("  %d: %s", i+1, item)
        }
        return nil
    },
    func(item string) string {
        key := generateKey(item)
        log.Printf("Élément '%s' -> clé '%s'", item, key)
        return key
    },
)
```

## Tests et validation

### Test de déduplication

```go
func TestDeduplication(t *testing.T) {
    var processedItems []int
    var mu sync.Mutex
    
    pipeline := gopipeline.NewDeduplicationPipeline[int](
        func(items []int) error {
            mu.Lock()
            defer mu.Unlock()
            processedItems = append(processedItems, items...)
            return nil
        },
        func(item int) string {
            return fmt.Sprintf("key_%d", item)
        },
    )
    
    // Ajouter des données avec doublons
    testData := []int{1, 2, 1, 3, 2, 4, 1}
    for _, item := range testData {
        pipeline.Add(item)
    }
    
    pipeline.Close()
    pipeline.Wait()
    
    // Vérifier que seuls les éléments uniques sont traités
    expected := []int{1, 2, 3, 4}
    sort.Ints(processedItems)
    assert.Equal(t, expected, processedItems)
}
```

### Test de performance

```go
func BenchmarkDeduplication(b *testing.B) {
    pipeline := gopipeline.NewDeduplicationPipeline[int](
        func(items []int) error {
            return nil // Traitement vide pour le benchmark
        },
        func(item int) string {
            return fmt.Sprintf("key_%d", item%1000) // 1000 clés uniques
        },
    )
    
    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        pipeline.Add(i)
    }
    
    pipeline.Close()
    pipeline.Wait()
}
```

## Bonnes pratiques

### 1. Conception de la fonction de clé

- **Unique** : Assurez-vous que la clé identifie uniquement l'élément
- **Efficace** : Évitez les opérations coûteuses dans la génération de clé
- **Stable** : La même entrée doit toujours produire la même clé
- **Courte** : Les clés plus courtes utilisent moins de mémoire

### 2. Gestion de la mémoire

```go
// Surveiller l'utilisation mémoire en production
go func() {
    ticker := time.NewTicker(30 * time.Second)
    defer ticker.Stop()
    
    for range ticker.C {
        var m runtime.MemStats
        runtime.ReadMemStats(&m)
        log.Printf("Utilisation mémoire : %d KB", m.Alloc/1024)
    }
}()
```

### 3. Configuration adaptative

```go
func createAdaptiveConfig(expectedDuplicateRate float64) *gopipeline.PipelineConfig {
    if expectedDuplicateRate > 0.5 {
        // Taux de doublons élevé - lots plus petits
        return gopipeline.NewPipelineConfig().
            SetFlushSize(30).
            SetFlushInterval(500 * time.Millisecond)
    }
    // Taux de doublons faible - lots plus importants
    return gopipeline.NewPipelineConfig().
        SetFlushSize(100).
        SetFlushInterval(2 * time.Second)
}
```

## Dépannage

### Problèmes courants

1. **Utilisation mémoire élevée** : Réduire `FlushSize` et `ChannelSize`
2. **Déduplication inefficace** : Vérifier la logique de génération de clé
3. **Performance lente** : Optimiser la fonction de génération de clé
4. **Fuite mémoire** : S'assurer que `Close()` et `Wait()` sont appelés

### Débogage

```go
// Activer le logging de débogage
pipeline := gopipeline.NewDeduplicationPipelineWithConfig[int](
    processor,
    keyFunc,
    gopipeline.NewPipelineConfig().SetDebug(true),
)