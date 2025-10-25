---
sidebar_position: 3
---

# Guide de Configuration

Ce guide détaille tous les paramètres de configuration disponibles dans Go Pipeline v2 et leurs cas d'usage.

## Structure de Configuration

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

## Paramètres Détaillés

### BufferSize (Taille du Tampon)

**Type** : `uint32`  
**Défaut** : `100`  
**Description** : Capacité du canal tampon interne

```go
config := gopipeline.NewPipelineConfig().
    WithBufferSize(200) // Définir la taille du tampon à 200
```

**Recommandations** :
- Devrait être >= `FlushSize * 2` pour éviter le blocage
- Pour un débit élevé : augmenter à 500-1000
- Pour une faible utilisation mémoire : réduire à 50-100
- Surveiller l'utilisation mémoire lors de l'ajustement

### FlushSize (Taille du Lot)

**Type** : `uint32`  
**Défaut** : `50`  
**Description** : Nombre maximum d'éléments dans chaque lot

```go
config := gopipeline.NewPipelineConfig().
    WithFlushSize(100) // Traiter 100 éléments par lot
```

**Recommandations** :
- Lots plus grands = meilleur débit, latence plus élevée
- Lots plus petits = latence plus faible, débit réduit
- Pour les opérations de base de données : 50-200
- Pour les appels API : 10-50
- Tester avec votre charge de travail spécifique

### FlushInterval (Intervalle de Flush)

**Type** : `time.Duration`  
**Défaut** : `50ms`  
**Description** : Intervalle de temps maximum avant le flush forcé

```go
config := gopipeline.NewPipelineConfig().
    WithFlushInterval(time.Millisecond * 100) // Flush toutes les 100ms
```

**Recommandations** :
- Applications temps réel : 10-50ms
- Traitement par lots : 100-1000ms
- Équilibrer latence vs débit
- Considérer les exigences SLA

### DrainOnCancel (Nettoyage lors de l'Annulation)

**Type** : `bool`  
**Défaut** : `false`  
**Description** : Effectuer un flush de nettoyage à durée limitée lors de l'annulation du contexte

```go
config := gopipeline.NewPipelineConfig().
    WithDrainOnCancel(true).
    WithDrainGracePeriod(time.Second * 5) // Période de grâce de 5 secondes
```

**Cas d'usage** :
- Activer pour les données critiques
- Désactiver pour un arrêt rapide
- Utiliser avec `DrainGracePeriod` pour contrôler le timeout

### DrainGracePeriod (Période de Grâce de Nettoyage)

**Type** : `time.Duration`  
**Défaut** : `0` (pas de limite)  
**Description** : Temps maximum alloué pour le nettoyage lors de l'annulation

```go
config := gopipeline.NewPipelineConfig().
    WithDrainOnCancel(true).
    WithDrainGracePeriod(time.Second * 10) // Maximum 10 secondes pour le nettoyage
```

### FinalFlushOnCloseTimeout (Timeout de Flush Final)

**Type** : `time.Duration`  
**Défaut** : `0` (désactivé)  
**Description** : Timeout pour le flush final lors de la fermeture du canal

```go
config := gopipeline.NewPipelineConfig().
    WithFinalFlushOnCloseTimeout(time.Second * 30) // Timeout de 30 secondes
```

### MaxConcurrentFlushes (Flush Simultanés Maximum)

**Type** : `uint32`  
**Défaut** : `0` (illimité)  
**Description** : Limite le nombre de flush asynchrones simultanés

```go
config := gopipeline.NewPipelineConfig().
    WithMaxConcurrentFlushes(5) // Maximum 5 flush simultanés
```

## Méthodes de Configuration Pratiques

### Méthodes en Chaîne

```go
config := gopipeline.NewPipelineConfig().
    WithBufferSize(200).
    WithFlushSize(100).
    WithFlushInterval(time.Millisecond * 100).
    WithDrainOnCancel(true).
    WithDrainGracePeriod(time.Second * 5).
    WithFinalFlushOnCloseTimeout(time.Second * 30).
    WithMaxConcurrentFlushes(3)
```

### Configuration par Struct

```go
config := gopipeline.PipelineConfig{
    BufferSize:               200,
    FlushSize:                100,
    FlushInterval:            time.Millisecond * 100,
    DrainOnCancel:            true,
    DrainGracePeriod:         time.Second * 5,
    FinalFlushOnCloseTimeout: time.Second * 30,
    MaxConcurrentFlushes:     3,
}
```

## Configurations Prédéfinies

### Configuration Haute Performance

```go
// Optimisé pour le débit maximum
highThroughputConfig := gopipeline.NewPipelineConfig().
    WithBufferSize(1000).
    WithFlushSize(200).
    WithFlushInterval(time.Millisecond * 200).
    WithMaxConcurrentFlushes(10)
```

### Configuration Faible Latence

```go
// Optimisé pour la latence minimale
lowLatencyConfig := gopipeline.NewPipelineConfig().
    WithBufferSize(50).
    WithFlushSize(10).
    WithFlushInterval(time.Millisecond * 10).
    WithMaxConcurrentFlushes(1)
```

### Configuration Équilibrée

```go
// Équilibre entre débit et latence
balancedConfig := gopipeline.NewPipelineConfig().
    WithBufferSize(100).
    WithFlushSize(50).
    WithFlushInterval(time.Millisecond * 50).
    WithMaxConcurrentFlushes(3)
```

### Configuration Robuste

```go
// Avec nettoyage et timeouts pour la robustesse
robustConfig := gopipeline.NewPipelineConfig().
    WithBufferSize(200).
    WithFlushSize(50).
    WithFlushInterval(time.Millisecond * 100).
    WithDrainOnCancel(true).
    WithDrainGracePeriod(time.Second * 10).
    WithFinalFlushOnCloseTimeout(time.Second * 30).
    WithMaxConcurrentFlushes(5)
```

## Ajustement Dynamique des Paramètres

Go Pipeline v2 prend en charge l'ajustement sûr des paramètres clés à l'exécution :

```go
// Ajuster la taille du lot à l'exécution
pipeline.SetFlushSize(100)

// Ajuster l'intervalle de flush à l'exécution
pipeline.SetFlushInterval(time.Millisecond * 200)

// Ajuster le nombre maximum de flush simultanés
pipeline.SetMaxConcurrentFlushes(8)
```

## Considérations de Performance

### Relation BufferSize et FlushSize

```go
// Recommandé : BufferSize >= FlushSize * 2
config := gopipeline.NewPipelineConfig().
    WithBufferSize(200).  // 200 >= 100 * 2
    WithFlushSize(100)
```

### Optimisation Mémoire vs Performance

```go
// Utilisation mémoire élevée, haute performance
config := gopipeline.NewPipelineConfig().
    WithBufferSize(1000).
    WithFlushSize(200)

// Utilisation mémoire faible, performance modérée
config := gopipeline.NewPipelineConfig().
    WithBufferSize(100).
    WithFlushSize(25)
```

## Gestion des Erreurs et Monitoring

### Configuration avec Gestion d'Erreurs

```go
config := gopipeline.NewPipelineConfig().
    WithBufferSize(200).
    WithFlushSize(50).
    WithDrainOnCancel(true).
    WithDrainGracePeriod(time.Second * 5)

pipeline := gopipeline.NewStandardPipeline(config, flushFunc)

// Surveiller les erreurs
go func() {
    for err := range pipeline.ErrorChan(100) {
        log.Printf("Erreur de pipeline : %v", err)
        // Implémenter la logique de retry ou d'alerte
    }
}()
```

## Meilleures Pratiques

1. **Commencer avec les Défauts** : Utiliser la configuration par défaut et ajuster selon les besoins
2. **Tester sous Charge** : Valider la configuration avec des charges de travail réalistes
3. **Surveiller les Métriques** : Suivre le débit, la latence et l'utilisation mémoire
4. **Ajustement Graduel** : Modifier un paramètre à la fois et mesurer l'impact
5. **Considérer les Contraintes** : Équilibrer performance, mémoire et exigences métier

## Dépannage

### Problèmes Courants

**Pipeline Lent** :
- Augmenter `FlushSize`
- Réduire `FlushInterval`
- Augmenter `MaxConcurrentFlushes`

**Utilisation Mémoire Élevée** :
- Réduire `BufferSize`
- Réduire `FlushSize`
- Implémenter la contre-pression

**Perte de Données lors de l'Arrêt** :
- Activer `DrainOnCancel`
- Définir `DrainGracePeriod` approprié
- Utiliser `FinalFlushOnCloseTimeout`

## Exemples de Configuration par Cas d'Usage

### Insertion en Base de Données

```go
dbConfig := gopipeline.NewPipelineConfig().
    WithBufferSize(500).
    WithFlushSize(100).
    WithFlushInterval(time.Millisecond * 200).
    WithDrainOnCancel(true).
    WithDrainGracePeriod(time.Second * 10)
```

### Appels API

```go
apiConfig := gopipeline.NewPipelineConfig().
    WithBufferSize(100).
    WithFlushSize(20).
    WithFlushInterval(time.Millisecond * 100).
    WithMaxConcurrentFlushes(5)
```

### Traitement de Logs

```go
logConfig := gopipeline.NewPipelineConfig().
    WithBufferSize(1000).
    WithFlushSize(200).
    WithFlushInterval(time.Second * 1).
    WithMaxConcurrentFlushes(3)
```

### Traitement Temps Réel

```go
realtimeConfig := gopipeline.NewPipelineConfig().
    WithBufferSize(50).
    WithFlushSize(10).
    WithFlushInterval(time.Millisecond * 10).
    WithMaxConcurrentFlushes(1)
```