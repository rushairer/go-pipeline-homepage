---
sidebar_position: 4
---

# Référence API

Documentation API complète pour Go Pipeline v2.

## Interfaces Principales

### PipelineChannel[T]

Définit l'interface d'accès au canal de pipeline.

```go
type PipelineChannel[T any] interface {
    DataChan() chan<- T
    ErrorChan(capacity uint32) <-chan error
}
```

**Méthodes** :
- `DataChan()` : Retourne un canal de données en écriture seule
- `ErrorChan(capacity uint32)` : Retourne un canal d'erreur en lecture seule avec la capacité spécifiée

### Performer

Définit l'interface pour exécuter les opérations de pipeline.

```go
type Performer interface {
    AsyncPerform(ctx context.Context) error
}
```

**Méthodes** :
- `AsyncPerform(ctx context.Context)` : Démarre l'exécution asynchrone du pipeline

### DataProcessor[T]

Définit l'interface principale pour le traitement des données par lots.

```go
type DataProcessor[T any] interface {
    ProcessBatch(ctx context.Context, batchData []T) error
}
```

**Méthodes** :
- `ProcessBatch(ctx context.Context, batchData []T)` : Traite les données par lots

### Pipeline[T]

Combine toutes les fonctionnalités de pipeline en une interface universelle.

```go
type Pipeline[T any] interface {
    PipelineChannel[T]
    Performer
    DataProcessor[T]
    
    // Méthodes API pratiques
    Start(ctx context.Context) (<-chan struct{}, <-chan error)
    Run(ctx context.Context, errorChanCapacity uint32) error
    
    // Ajustement dynamique des paramètres
    SetFlushSize(n uint32)
    SetFlushInterval(d time.Duration)
    SetMaxConcurrentFlushes(n uint32)
}
```

## Types d'Implémentation

### StandardPipeline[T]

Pipeline de traitement par lots standard, les données sont traitées par lots dans l'ordre.

```go
type StandardPipeline[T any] struct {
    // Détails d'implémentation interne
}
```

**Constructeur** :
```go
func NewStandardPipeline[T any](
    config PipelineConfig,
    flushFunc func(ctx context.Context, batchData []T) error,
) *StandardPipeline[T]
```

**Constructeur par Défaut** :
```go
func NewDefaultStandardPipeline[T any](
    flushFunc func(ctx context.Context, batchData []T) error,
) *StandardPipeline[T]
```

### DeduplicationPipeline[T, K]

Pipeline de traitement par lots avec déduplication, déduplique basé sur des clés uniques.

```go
type DeduplicationPipeline[T any, K comparable] struct {
    // Détails d'implémentation interne
}
```

**Constructeur** :
```go
func NewDeduplicationPipeline[T any, K comparable](
    config PipelineConfig,
    keyFunc func(T) K,
    flushFunc func(ctx context.Context, batchData []T) error,
) *DeduplicationPipeline[T, K]
```

**Constructeur par Défaut** :
```go
func NewDefaultDeduplicationPipeline[T any, K comparable](
    keyFunc func(T) K,
    flushFunc func(ctx context.Context, batchData []T) error,
) *DeduplicationPipeline[T, K]
```

## Configuration

### PipelineConfig

Structure de configuration du pipeline.

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

### Constructeur de Configuration

```go
func NewPipelineConfig() PipelineConfig
```

Retourne une nouvelle configuration avec des valeurs par défaut optimisées.

### Méthodes de Configuration

```go
func (c PipelineConfig) WithBufferSize(size uint32) PipelineConfig
func (c PipelineConfig) WithFlushSize(size uint32) PipelineConfig
func (c PipelineConfig) WithFlushInterval(interval time.Duration) PipelineConfig
func (c PipelineConfig) WithDrainOnCancel(enabled bool) PipelineConfig
func (c PipelineConfig) WithDrainGracePeriod(d time.Duration) PipelineConfig
func (c PipelineConfig) WithFinalFlushOnCloseTimeout(d time.Duration) PipelineConfig
func (c PipelineConfig) WithMaxConcurrentFlushes(n uint32) PipelineConfig
```

## Détails des Méthodes

### Méthode Start

API pratique pour l'exécution asynchrone.

```go
func (p *Pipeline[T]) Start(ctx context.Context) (<-chan struct{}, <-chan error)
```

**Paramètres** :
- `ctx` : Contexte pour contrôler le cycle de vie du pipeline

**Retourne** :
- `<-chan struct{}` : Canal de fin, fermé quand le pipeline se termine
- `<-chan error` : Canal d'erreur pour recevoir les erreurs de traitement

**Exemple d'Utilisation** :
```go
pipeline := gopipeline.NewDefaultStandardPipeline(flushFunc)
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
    defer close(dataChan)
    for i := 0; i < 100; i++ {
        dataChan <- i
    }
}()

// Attendre la fin
<-done
```

### Méthode Run

API pratique pour l'exécution synchrone.

```go
func (p *Pipeline[T]) Run(ctx context.Context, errorChanCapacity uint32) error
```

**Paramètres** :
- `ctx` : Contexte pour contrôler le cycle de vie du pipeline
- `errorChanCapacity` : Capacité du canal d'erreur

**Retourne** :
- `error` : Première erreur rencontrée pendant l'exécution, ou nil si succès

**Exemple d'Utilisation** :
```go
pipeline := gopipeline.NewDefaultStandardPipeline(flushFunc)

// Ajouter des données
dataChan := pipeline.DataChan()
go func() {
    defer close(dataChan)
    for i := 0; i < 100; i++ {
        dataChan <- i
    }
}()

// Exécution synchrone
if err := pipeline.Run(ctx, 128); err != nil {
    log.Printf("Erreur d'exécution du pipeline : %v", err)
}
```

### Méthode AsyncPerform

API d'exécution asynchrone traditionnelle.

```go
func (p *Pipeline[T]) AsyncPerform(ctx context.Context) error
```

**Paramètres** :
- `ctx` : Contexte pour contrôler le cycle de vie du pipeline

**Retourne** :
- `error` : Erreur si le démarrage échoue

**Exemple d'Utilisation** :
```go
pipeline := gopipeline.NewDefaultStandardPipeline(flushFunc)

// Démarrer le pipeline
if err := pipeline.AsyncPerform(ctx); err != nil {
    log.Fatalf("Échec du démarrage du pipeline : %v", err)
}

// Gérer les erreurs
go func() {
    for err := range pipeline.ErrorChan(100) {
        log.Printf("Erreur de traitement : %v", err)
    }
}()

// Ajouter des données
dataChan := pipeline.DataChan()
for i := 0; i < 100; i++ {
    dataChan <- i
}
close(dataChan)
```

### Ajustement Dynamique des Paramètres

#### SetFlushSize

Ajuster dynamiquement la taille du lot à l'exécution.

```go
func (p *Pipeline[T]) SetFlushSize(n uint32)
```

**Paramètres** :
- `n` : Nouvelle taille de lot

**Notes** :
- Les changements n'affectent pas les lots en cours de construction
- Opération thread-safe

#### SetFlushInterval

Ajuster dynamiquement l'intervalle de flush à l'exécution.

```go
func (p *Pipeline[T]) SetFlushInterval(d time.Duration)
```

**Paramètres** :
- `d` : Nouvel intervalle de flush

**Notes** :
- Les changements prennent effet au prochain reset du timer
- Opération thread-safe

#### SetMaxConcurrentFlushes

Ajuster dynamiquement le nombre maximum de flush simultanés à l'exécution.

```go
func (p *Pipeline[T]) SetMaxConcurrentFlushes(n uint32)
```

**Paramètres** :
- `n` : Nombre maximum de flush simultanés (0 signifie illimité)

**Notes** :
- Les changements prennent effet immédiatement
- Opération thread-safe

## Modèles d'Utilisation

### Modèle d'Utilisation de Base

```go
// 1. Créer le pipeline
pipeline := gopipeline.NewDefaultStandardPipeline(
    func(ctx context.Context, batchData []int) error {
        // Traiter les données par lots
        fmt.Printf("Traitement de %d éléments : %v\n", len(batchData), batchData)
        return nil
    },
)

// 2. Démarrer le pipeline
ctx, cancel := context.WithTimeout(context.Background(), time.Second*10)
defer cancel()

done, errs := pipeline.Start(ctx)

// 3. Gérer les erreurs
go func() {
    for err := range errs {
        log.Printf("Erreur : %v", err)
    }
}()

// 4. Ajouter des données
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

// 5. Attendre la fin
<-done
```

### Modèle de Configuration Personnalisée

```go
// Créer une configuration personnalisée
config := gopipeline.NewPipelineConfig().
    WithBufferSize(200).
    WithFlushSize(100).
    WithFlushInterval(time.Millisecond * 100).
    WithDrainOnCancel(true).
    WithDrainGracePeriod(time.Second * 5)

// Créer le pipeline avec la configuration personnalisée
pipeline := gopipeline.NewStandardPipeline(config, flushFunc)

// Utiliser le pipeline...
```

### Modèle de Déduplication

```go
type User struct {
    ID   int
    Name string
}

// Créer un pipeline de déduplication
pipeline := gopipeline.NewDefaultDeduplicationPipeline(
    func(user User) int { return user.ID }, // Fonction de clé
    func(ctx context.Context, users []User) error {
        // Traiter les utilisateurs dédupliqués
        fmt.Printf("Traitement de %d utilisateurs uniques\n", len(users))
        return nil
    },
)

// Utiliser le pipeline...
```

### Modèle de Gestion d'Erreurs

```go
pipeline := gopipeline.NewDefaultStandardPipeline(flushFunc)

// Démarrer le pipeline
done, errs := pipeline.Start(ctx)

// Gestion complète des erreurs
go func() {
    for err := range errs {
        // Enregistrer l'erreur
        log.Printf("Erreur de pipeline : %v", err)
        
        // Implémenter la logique de retry ou d'alerte
        if isRetryableError(err) {
            // Implémenter la logique de retry
        } else {
            // Envoyer une alerte
            sendAlert(err)
        }
    }
}()

// Ajouter des données et attendre la fin
// ...
```

### Modèle d'Ajustement Dynamique

```go
pipeline := gopipeline.NewDefaultStandardPipeline(flushFunc)

// Démarrer la goroutine de surveillance et d'ajustement
go func() {
    ticker := time.NewTicker(time.Second * 30)
    defer ticker.Stop()
    
    for range ticker.C {
        load := getSystemLoad()
        memUsage := getMemoryUsage()
        
        switch {
        case load > 0.8:
            // Charge élevée : réduire la taille du lot, augmenter la fréquence
            pipeline.SetFlushSize(25)
            pipeline.SetFlushInterval(25 * time.Millisecond)
            
        case memUsage > 0.7:
            // Utilisation mémoire élevée : réduire la taille du lot
            pipeline.SetFlushSize(30)
            pipeline.SetFlushInterval(50 * time.Millisecond)
            
        default:
            // Situation normale : utiliser la configuration standard
            pipeline.SetFlushSize(50)
            pipeline.SetFlushInterval(50 * time.Millisecond)
        }
    }
}()

// Utiliser le pipeline...
```

## Types d'Erreurs

### Scénarios d'Erreurs Courants

1. **Annulation de Contexte** : Quand le contexte est annulé pendant le traitement
2. **Erreurs de Fonction Flush** : Erreurs retournées par la fonction flush fournie par l'utilisateur
3. **Fermeture de Canal** : Erreurs liées à une gestion incorrecte des canaux
4. **Erreurs de Configuration** : Paramètres de configuration invalides

### Meilleures Pratiques de Gestion d'Erreurs

```go
func handlePipelineError(err error) {
    switch {
    case errors.Is(err, context.Canceled):
        log.Println("Pipeline annulé")
    case errors.Is(err, context.DeadlineExceeded):
        log.Println("Timeout du pipeline")
    default:
        log.Printf("Erreur de pipeline : %v", err)
    }
}
```

## Considérations de Performance

### Utilisation Mémoire

- **BufferSize** : Affecte l'utilisation mémoire des canaux internes
- **FlushSize** : Affecte l'utilisation mémoire des données par lots
- **Canal d'Erreur** : Les canaux d'erreur non bornés peuvent causer des fuites mémoire

### Utilisation CPU

- **FlushInterval** : Des intervalles trop petits augmentent l'utilisation CPU
- **MaxConcurrentFlushes** : Équilibrer entre parallélisme et utilisation des ressources

### Optimisation du Débit

```go
// Configuration haute performance
config := gopipeline.NewPipelineConfig().
    WithBufferSize(1000).
    WithFlushSize(200).
    WithFlushInterval(time.Millisecond * 200).
    WithMaxConcurrentFlushes(10)
```

### Optimisation de la Latence

```go
// Configuration faible latence
config := gopipeline.NewPipelineConfig().
    WithBufferSize(50).
    WithFlushSize(10).
    WithFlushInterval(time.Millisecond * 10).
    WithMaxConcurrentFlushes(1)
```

## Sécurité des Threads

Toutes les opérations de pipeline sont thread-safe :

- **Canal de Données** : Sûr pour les écritures simultanées
- **Canal d'Erreur** : Sûr pour les lectures simultanées
- **Ajustements Dynamiques** : Toutes les méthodes SetXxx sont thread-safe
- **Méthodes de Pipeline** : Toutes les méthodes publiques sont thread-safe

## Gestion du Cycle de Vie

### Séquence de Démarrage

1. Créer le pipeline avec la configuration
2. Démarrer le pipeline en utilisant `Start()` ou `AsyncPerform()`
3. Configurer la gestion d'erreurs
4. Commencer la production de données

### Séquence d'Arrêt

1. Arrêter la production de données
2. Fermer le canal de données (suivant le principe "qui écrit, qui ferme")
3. Attendre la fin du pipeline
4. Gérer les erreurs restantes

### Arrêt Gracieux

```go
// Activer l'arrêt gracieux
config := gopipeline.NewPipelineConfig().
    WithDrainOnCancel(true).
    WithDrainGracePeriod(time.Second * 5).
    WithFinalFlushOnCloseTimeout(time.Second * 10)

pipeline := gopipeline.NewStandardPipeline(config, flushFunc)

// Utiliser un contexte avec timeout pour un arrêt contrôlé
ctx, cancel := context.WithTimeout(context.Background(), time.Minute)
defer cancel()

done, errs := pipeline.Start(ctx)

// Gérer le signal d'arrêt
c := make(chan os.Signal, 1)
signal.Notify(c, os.Interrupt, syscall.SIGTERM)

select {
case <-c:
    log.Println("Signal d'arrêt reçu, initiation de l'arrêt gracieux...")
    cancel() // Ceci déclenchera le drain si DrainOnCancel est true
case <-done:
    log.Println("Pipeline terminé normalement")
}
```

## Guide de Migration

### De v1 à v2

Changements clés lors de la migration de v1 :

1. **Support Générique** : Mettre à jour les déclarations de type pour utiliser les génériques
2. **Nouvelle Configuration** : Utiliser la nouvelle structure `PipelineConfig`
3. **API Pratique** : Considérer l'utilisation des nouvelles méthodes `Start()` et `Run()`
4. **Ajustement Dynamique** : Utiliser les nouvelles fonctionnalités d'ajustement des paramètres à l'exécution

### Exemple de Migration

**Code v1** :
```go
// Style v1 (pseudo-code)
pipeline := oldpipeline.New(config, flushFunc)
pipeline.Start()
```

**Code v2** :
```go
// Style v2
pipeline := gopipeline.NewDefaultStandardPipeline(flushFunc)
done, errs := pipeline.Start(ctx)
```

## Débogage et Surveillance

### Activer le Logging de Débogage

```go
// Ajouter le logging de débogage à la fonction flush
flushFunc := func(ctx context.Context, batchData []Data) error {
    log.Printf("Traitement d'un lot de %d éléments", len(batchData))
    
    start := time.Now()
    err := actualProcessing(batchData)
    duration := time.Since(start)
    
    log.Printf("Le traitement du lot a pris %v", duration)
    return err
}
```

### Collecte de Métriques

```go
type PipelineMetrics struct {
    TotalBatches    int64
    TotalItems      int64
    TotalErrors     int64
    AverageLatency  time.Duration
    LastBatchSize   int
}

func collectMetrics(pipeline Pipeline[Data]) PipelineMetrics {
    // Implémenter la logique de collecte de métriques
    return PipelineMetrics{}
}
```

## Résumé des Meilleures Pratiques

1. **Utiliser la Configuration par Défaut** : Commencer avec les défauts et ajuster selon les besoins
2. **Gérer les Erreurs** : Toujours consommer le canal d'erreur pour éviter les fuites de goroutines
3. **Suivre les Règles de Canal** : Principe "qui écrit, qui ferme"
4. **Surveiller les Performances** : Suivre les métriques clés et ajuster la configuration
5. **Arrêt Gracieux** : Utiliser l'annulation de contexte et les paramètres de drain
6. **Tester sous Charge** : Valider la configuration avec des charges de travail réalistes
7. **Documenter la Configuration** : Enregistrer les choix de configuration et les résultats des tests