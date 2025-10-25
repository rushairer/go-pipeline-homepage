---
sidebar_position: 1
---

# Introduction à Go Pipeline v2

Go Pipeline v2 est un framework de pipeline de traitement par lots haute performance pour Go, basé sur les génériques et la sécurité de concurrence, avec un traitement par lots intégré par taille de lot et fenêtre temporelle, contre-pression et arrêt gracieux, erreurs et métriques, flush asynchrone à débit limité et ajustement dynamique des paramètres, fournissant des modes de pipeline standard et de déduplication.

## 🚀 Fonctionnalités principales

- **Support générique** : Basé sur les génériques Go 1.20+, type-safe
- **Traitement par lots** : Prend en charge le traitement automatique par lots par taille et intervalle de temps
- **Sécurité de concurrence** : Mécanismes de sécurité goroutine intégrés
- **Configuration flexible** : Taille de tampon, taille de lot et intervalle de flush personnalisables
- **Gestion des erreurs** : Mécanismes complets de gestion et de propagation des erreurs
- **Deux modes** : Traitement par lots standard et traitement par lots avec déduplication
- **Sync/Async** : Prend en charge les modes d'exécution synchrone et asynchrone
- **Conventions Go** : Suit les principes de gestion des canaux "qui écrit, qui ferme"
- **API pratique** : Nouvelles méthodes Start() et Run() pour réduire le code passe-partout
- **Ajustement dynamique des paramètres** : Prend en charge l'ajustement sûr des paramètres clés à l'exécution
- **Arrêt gracieux** : Prend en charge le nettoyage à durée limitée lors de l'annulation et la protection de timeout de flush final

## 📋 Exigences système

- Go 1.20+ (support générique)
- Prend en charge Linux, macOS, Windows

## 📦 Installation

```bash
go get github.com/rushairer/go-pipeline/v2@latest
```

## 🏗️ Conception d'architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Entrée Data   │───▶│  Canal Tampon    │───▶│ Processeur Lot  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                       ┌──────────────────┐    ┌─────────────────┐
                       │  Timer Ticker    │    │ Gestionnaire    │
                       │                  │    │ Flush           │
                       └──────────────────┘    └─────────────────┘
                                │                        │
                                └────────┬───────────────┘
                                         ▼
                                ┌─────────────────┐
                                │  Canal Erreur   │
                                └─────────────────┘
```

## 📦 Composants principaux

### Définitions d'interface

- **`PipelineChannel[T]`** : Définit l'interface d'accès au canal de pipeline
- **`Performer`** : Définit l'interface pour exécuter les opérations de pipeline
- **`DataProcessor[T]`** : Définit l'interface principale pour le traitement des données par lots
- **`Pipeline[T]`** : Combine toutes les fonctionnalités de pipeline en une interface universelle

### Types d'implémentation

- **`StandardPipeline[T]`** : Pipeline de traitement par lots standard, les données sont traitées par lots dans l'ordre
- **`DeduplicationPipeline[T]`** : Pipeline de traitement par lots avec déduplication, déduplique basé sur des clés uniques
- **`PipelineImpl[T]`** : Implémentation de pipeline universelle, fournit des fonctionnalités de base

## 💡 Démarrage rapide

### Utilisation de l'API pratique (Recommandé)

```go
package main

import (
    "context"
    "fmt"
    "log"
    "time"
    
    gopipeline "github.com/rushairer/go-pipeline/v2"
)

func main() {
    // Créer un pipeline standard
    pipeline := gopipeline.NewDefaultStandardPipeline(
        func(ctx context.Context, batchData []int) error {
            fmt.Printf("Traitement des données par lots : %v\n", batchData)
            return nil
        },
    )
    
    ctx, cancel := context.WithTimeout(context.Background(), time.Second*10)
    defer cancel()
    
    // Démarrer avec l'API pratique
    done, errs := pipeline.Start(ctx)
    
    // Écouter les erreurs
    go func() {
        for err := range errs {
            log.Printf("Erreur de traitement : %v", err)
        }
    }()
    
    // Ajouter des données
    dataChan := pipeline.DataChan()
    go func() {
        defer close(dataChan) // Qui écrit, qui ferme
        for i := 0; i < 100; i++ {
            select {
            case dataChan <- i:
            case <-ctx.Done():
                return
            }
        }
    }()
    
    // Attendre la fin
    <-done
}
```

### Exemple d'exécution synchrone

```go
func syncExample() {
    pipeline := gopipeline.NewDefaultStandardPipeline(
        func(ctx context.Context, batchData []int) error {
            fmt.Printf("Traitement des données par lots : %v\n", batchData)
            return nil
        },
    )
    
    ctx, cancel := context.WithTimeout(context.Background(), time.Second*10)
    defer cancel()
    
    // Exécution synchrone, définir la capacité du canal d'erreur à 128
    if err := pipeline.Run(ctx, 128); err != nil {
        log.Printf("Erreur d'exécution du pipeline : %v", err)
    }
}
```

## 📋 Paramètres de configuration

```go
type PipelineConfig struct {
    BufferSize               uint32        // Capacité du canal tampon (défaut : 100)
    FlushSize                uint32        // Capacité maximale pour les données de traitement par lots (défaut : 50)
    FlushInterval            time.Duration // Intervalle de temps pour le rafraîchissement programmé (défaut : 50ms)
    DrainOnCancel            bool          // S'il faut effectuer un flush de nettoyage à durée limitée lors de l'annulation (défaut false)
    DrainGracePeriod         time.Duration // Fenêtre de temps maximale pour le flush de nettoyage
    FinalFlushOnCloseTimeout time.Duration // Timeout de flush final pour le chemin de fermeture du canal (0 signifie désactivé)
    MaxConcurrentFlushes     uint32        // Nombre maximum de flush asynchrones simultanés (0 signifie illimité)
}
```

### 🎯 Valeurs par défaut optimisées pour les performances

Basé sur les benchmarks de performance, v2.2.2 utilise une configuration par défaut optimisée :

- **BufferSize: 100** - Taille du tampon, devrait être >= FlushSize * 2 pour éviter le blocage
- **FlushSize: 50** - Taille du lot, les tests de performance montrent qu'environ 50 est optimal
- **FlushInterval: 50ms** - Intervalle de flush, équilibre la latence et le débit

### 🔧 Méthodes de configuration pratiques

```go
// Créer une configuration en utilisant des méthodes en chaîne
config := gopipeline.NewPipelineConfig().
    WithFlushInterval(time.Millisecond * 10).
    WithBufferSize(200).
    WithDrainOnCancel(true).
    WithDrainGracePeriod(150 * time.Millisecond)

pipeline := gopipeline.NewStandardPipeline(config, flushFunc)
```

## Étapes suivantes

- [Pipeline Standard](./standard-pipeline) - Apprendre à utiliser les pipelines de traitement par lots standard
- [Pipeline de Déduplication](./deduplication-pipeline) - Apprendre à utiliser les pipelines de traitement par lots avec déduplication
- [Guide de Configuration](./configuration) - Descriptions détaillées des paramètres de configuration
- [Référence API](./api-reference) - Documentation API complète