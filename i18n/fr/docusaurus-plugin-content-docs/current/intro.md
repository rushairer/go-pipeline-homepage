---
sidebar_position: 1
---

# Go Pipeline

**Go Pipeline** est un framework de traitement par lots haute performance pour Go, conçu pour simplifier et optimiser le traitement des données par lots. Il prend en charge les génériques Go 1.18+, offrant une sécurité de type et une flexibilité exceptionnelles.

## ✨ Caractéristiques principales

- 🚀 **Haute performance** : Traitement par lots optimisé avec gestion intelligente de la mémoire
- 🔒 **Sécurité de concurrence** : Mécanismes intégrés de sécurité goroutine
- 🎯 **Support générique** : Implémentation sûre basée sur les génériques Go 1.18+
- 🔄 **Déduplication** : Pipeline de déduplication intégré pour éliminer les données en double
- ⚙️ **Configuration flexible** : Configuration riche pour différents scénarios
- 📊 **Surveillance** : Métriques et surveillance intégrées

## 🚀 Démarrage rapide

### Installation

```bash
go get github.com/rushairer/go-pipeline/v2
```

### Utilisation de base

```go
package main

import (
    "context"
    "fmt"
    "time"
    
    "github.com/rushairer/go-pipeline/v2"
)

func main() {
    // Créer un pipeline avec configuration par défaut
    pipeline := gopipeline.NewStandardPipeline[int](func(items []int) error {
        fmt.Printf("Traitement du lot : %v\n", items)
        return nil
    })
    
    // Ajouter des données
    pipeline.Add(1)
    pipeline.Add(2)
    pipeline.Add(3)
    
    // Fermer et attendre la fin du traitement
    pipeline.Close()
    pipeline.Wait()
}
```

## 📋 Types de pipeline

### Pipeline standard
Le pipeline standard est adapté à la plupart des scénarios de traitement par lots :

```go
pipeline := gopipeline.NewStandardPipeline[string](func(items []string) error {
    // Traiter le lot de chaînes
    for _, item := range items {
        fmt.Println("Traitement :", item)
    }
    return nil
})
```

### Pipeline de déduplication
Le pipeline de déduplication élimine automatiquement les données en double :

```go
pipeline := gopipeline.NewDeduplicationPipeline[int](
    func(items []int) error {
        // Traiter les éléments uniques
        fmt.Printf("Éléments uniques : %v\n", items)
        return nil
    },
    func(item int) string {
        // Fonction de génération de clé pour la déduplication
        return fmt.Sprintf("key_%d", item)
    },
)
```

## ⚙️ Configuration

Go Pipeline offre une configuration riche pour s'adapter à différents scénarios :

```go
config := gopipeline.NewPipelineConfig().
    SetFlushSize(100).                    // Taille du lot
    SetFlushInterval(5 * time.Second).    // Intervalle de vidage
    SetMaxWorkers(4).                     // Nombre de workers
    SetChannelSize(1000)                  // Taille du canal

pipeline := gopipeline.NewStandardPipelineWithConfig[int](
    func(items []int) error {
        // Logique de traitement
        return nil
    },
    config,
)
```

## 📊 Surveillance et métriques

```go
// Obtenir les métriques du pipeline
metrics := pipeline.GetMetrics()
fmt.Printf("Éléments traités : %d\n", metrics.ProcessedCount)
fmt.Printf("Lots traités : %d\n", metrics.BatchCount)
fmt.Printf("Erreurs : %d\n", metrics.ErrorCount)
```

## 🎯 Scénarios d'utilisation

- **Insertion en lot en base de données** : Optimiser les performances d'insertion
- **Traitement de logs** : Agrégation et traitement par lots des logs
- **Traitement d'événements** : Traitement par lots des événements en temps réel
- **Traitement d'API** : Réduire les appels API par le traitement par lots
- **Traitement de données** : Traitement efficace de grandes quantités de données

## 📚 Documentation

- [Pipeline standard](./standard-pipeline) - Guide d'utilisation du pipeline standard
- [Pipeline de déduplication](./deduplication-pipeline) - Guide du pipeline de déduplication
- [Configuration](./configuration) - Guide de configuration détaillé
- [Référence API](./api-reference) - Documentation complète de l'API

## 🤝 Contribution

Les contributions sont les bienvenues ! Veuillez consulter notre [guide de contribution](https://github.com/rushairer/go-pipeline/blob/main/CONTRIBUTING.md).

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier [LICENSE](https://github.com/rushairer/go-pipeline/blob/main/LICENSE) pour plus de détails.