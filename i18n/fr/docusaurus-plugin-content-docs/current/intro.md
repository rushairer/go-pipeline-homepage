---
sidebar_position: 1
---

# Introduction à Go Pipeline v2

Go Pipeline v2 est un framework de pipeline de traitement par lots haute performance pour Go qui prend en charge les génériques, la sécurité concurrentielle et fournit deux modes : traitement par lots standard et traitement par lots avec déduplication.

## 🚀 Fonctionnalités principales

- **Support des génériques** : Basé sur les génériques Go 1.18+, sécurisé au niveau des types
- **Mécanisme de traitement par lots** : Prend en charge le traitement automatique par lots par taille et intervalle de temps
- **Sécurité concurrentielle** : Mécanisme de sécurité goroutine intégré
- **Configuration flexible** : Taille de tampon, taille de lot et intervalle de vidage personnalisables
- **Gestion d'erreurs** : Mécanisme complet de gestion et de propagation d'erreurs
- **Deux modes** : Traitement par lots standard et traitement par lots avec déduplication
- **Sync/Async** : Prend en charge les modes d'exécution synchrone et asynchrone
- **Conventions Go** : Adopte le principe de gestion des canaux "l'écrivain ferme"

## 📋 Exigences système

- Go 1.18+ (support des génériques)
- Prend en charge Linux, macOS, Windows

## 📦 Installation

```bash
go get github.com/rushairer/go-pipeline/v2@latest
```

## 🏗️ Conception de l'architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Entrée données│───▶│   Canal tampon   │───▶│ Processeur lots │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                       ┌──────────────────┐    ┌─────────────────┐
                       │   Timer Ticker   │    │ Gestionnaire    │
                       └──────────────────┘    │    vidage       │
                                │              └─────────────────┘
                                └────────┬───────────────┘
                                         ▼
                                ┌─────────────────┐
                                │  Canal erreurs  │
                                └─────────────────┘
```

## 📦 Composants principaux

### Définitions d'interfaces

- **`PipelineChannel[T]`** : Définit l'interface d'accès au canal du pipeline
- **`Performer`** : Définit l'interface pour exécuter les opérations du pipeline
- **`DataProcessor[T]`** : Définit l'interface principale pour le traitement par lots des données
- **`Pipeline[T]`** : Combine toutes les fonctionnalités du pipeline en une interface universelle

### Types d'implémentation

- **`StandardPipeline[T]`** : Pipeline de traitement par lots standard, les données sont traitées par lots dans l'ordre
- **`DeduplicationPipeline[T]`** : Pipeline de traitement par lots avec déduplication, déduplique basé sur des clés uniques
- **`PipelineImpl[T]`** : Implémentation générique du pipeline, fournit les fonctionnalités de base

## 💡 Démarrage rapide

### Exemple de pipeline standard

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
    
    // Démarrer le traitement asynchrone
    go func() {
        if err := pipeline.AsyncPerform(ctx); err != nil {
            log.Printf("Erreur d'exécution du pipeline : %v", err)
        }
    }()
    
    // Écouter les erreurs
    errorChan := pipeline.ErrorChan(10)
    go func() {
        for err := range errorChan {
            log.Printf("Erreur de traitement : %v", err)
        }
    }()
    
    // Ajouter des données
    dataChan := pipeline.DataChan()
    for i := 0; i < 100; i++ {
        dataChan <- i
    }
    
    // Fermer le canal de données
    close(dataChan)
    
    // Attendre la fin du traitement
    time.Sleep(time.Second * 2)
}
```

## 📋 Paramètres de configuration

```go
type PipelineConfig struct {
    BufferSize    uint32        // Capacité du canal tampon (défaut : 100)
    FlushSize     uint32        // Capacité maximale des données de traitement par lots (défaut : 50)
    FlushInterval time.Duration // Intervalle de temps pour l'actualisation programmée (défaut : 50ms)
}
```

### 🎯 Valeurs par défaut optimisées pour les performances

Basé sur les benchmarks de performance, la version v2 adopte une configuration par défaut optimisée :

- **BufferSize: 100** - Taille du tampon, devrait être >= FlushSize * 2 pour éviter le blocage
- **FlushSize: 50** - Taille du lot, les tests de performance montrent qu'environ 50 est optimal
- **FlushInterval: 50ms** - Intervalle de vidage, équilibre la latence et le débit

## Étapes suivantes

- [Pipeline standard](./standard-pipeline) - Apprendre à utiliser le pipeline de traitement par lots standard
- [Pipeline de déduplication](./deduplication-pipeline) - Apprendre à utiliser le pipeline de traitement par lots avec déduplication
- [Guide de configuration](./configuration) - Instructions détaillées des paramètres de configuration
- [Référence API](./api-reference) - Documentation API complète