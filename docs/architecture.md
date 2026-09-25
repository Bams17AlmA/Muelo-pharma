# Architecture Technique — Muelo PHARM (MVP RDC)

> **Document de Référence d'Architecture v1.0**  
> Dérivé du Cahier des Charges *« Solution numérique nationale de vente au détail et de gestion des stocks des produits pharmaceutiques en RDC »* (MUELO GROUPE — 7 septembre 2026).

---

## 1. Vision et Modèle Fédéré Cible

Le système national de gestion pharmaceutique pour la République Démocratique du Congo (RDC) repose sur un **modèle fédéré à deux niveaux** :

1. **Niveau Local (Officines de détail) — Périmètre du présent MVP :**  
   Chaque pharmacie fonctionne comme une entité autonome (tenant isolé) dotée d'une résilience hors ligne totale. Les opérations critiques de caisse, de contrôle de péremption (FEFO) et d'inventaire ne s'interrompent jamais lors des coupures de réseau électrique ou Internet.

2. **Niveau Central (Autorités Sanitaires et Régulateurs) — Phase ultérieure :**  
   Une plateforme nationale consolide les indicateurs de santé publique (consommation d'antibiotiques, ruptures d'antipaludéens CTA), et diffuse les alertes sanitaires d'urgence (rappels de lots contaminés ou falsifiés) vers l'ensemble des officines connectées.

```
┌─────────────────────────────────────────────────────────────┐
│          PLATEFORME NATIONALE CENTRALE (DPM / SNIS)          │
│   Agrégation épidémiologique · Alertes Rappels de Lots      │
└──────────────┬───────────────────────────────┬──────────────┘
               │ (Sync Asynchrone REST/JSON)   │
               ▼                               ▼
┌─────────────────────────────┐ ┌─────────────────────────────┐
│  OFFICINE KINSHASA (TENANT)  │ │    OFFICINE GOMA (TENANT)   │
│  • PWA Installable          │ │  • PWA Installable          │
│  • Moteur FEFO Local        │ │  • Moteur FEFO Local        │
│  • File d'attente IndexedDB │ │  • File d'attente IndexedDB │
│  • Journal d'Audit SHA-256  │ │  • Journal d'Audit SHA-256  │
└─────────────────────────────┘ └─────────────────────────────┘
```

---

## 2. Principes Fondamentaux de Conception

### 2.1. Offline-First Inconditionnel
En RDC, la connectivité mobile (3G/4G) est fréquemment interrompue. L'architecture garantit que :
- **Zéro transaction confirmée n'est perdue** en cas de rupture de signal.
- Les encaissements s'effectuent en **moins de 2 secondes** à l'écran, sans attendre de réponse réseau.
- Toutes les mutations d'état local (ventes, ajustements d'inventaire, réceptions) sont stockées dans une file locale (`SyncQueue`) sous forme d'événements idempotents avec UUIDv4.

### 2.2. Résolution Explicite des Conflits (Aucun écrasement silencieux)
Lorsque le terminal retrouve le réseau, la file locale est rejouée vers le serveur. Si un conflit est détecté (par exemple : un lot délivré hors ligne a été mis sous rappel sanitaire ou déclaré périmé sur le serveur central durant la coupure) :
- Le système **interdit tout écrasement silencieux** (*no silent last-write-wins*).
- L'événement passe au statut `CONFLICT`.
- Une interface d'arbitrage s'ouvre, obligeant le Pharmacien Responsable à choisir explicitement la résolution (ex: substitution FEFO par un lot valide, réconciliation avec le client, ou annulation tracée) et à consigner le motif dans le journal d'audit.

### 2.3. Algorithme FEFO (First-Expired, First-Out)
Afin de minimiser les pertes financières et de prévenir la délivrance de médicaments périmés :
- Le moteur sélectionne prioritairement les lots actifs dont la date de péremption est la plus proche.
- Les lots périmés ou sous statut `BLOCKED_RECALL` sont exclus d'office du moteur d'allocation.
- Des alertes visuelles sont graduées à **30 jours (Critique)**, **60 jours (Alerte imminente)** et **90 jours (Surveillance)**.

### 2.4. Journal d'Audit Inaltérable (Append-Only)
Toute action sensible est soumise à traçabilité stricte :
- Création et annulation de vente.
- Entrée de stock et réception de bordereau fournisseur.
- Approbation des écarts d'inventaire physique.
- Blocage de lot pour motif sanitaire.
- Changement de rôle utilisateur.
Chaque ligne d'audit est scellée par une empreinte cryptographique (hash SHA-256) garantissant la non-répudiation face aux inspecteurs de la santé publique.

### 2.5. Support Bidevise (Franc Congolais CDF / Dollar US USD)
En raison de la dollarisation partielle de l'économie congolaise :
- Les prix de vente et les valorisations sont gérés simultanément en CDF et USD.
- Le taux officiel du jour de l'officine (ex: 1 USD = 2850 CDF) est appliqué avec calcul instantané de la monnaie rendue dans la devise choisie.

---

## 3. Architecture en Couches

```
┌────────────────────────────────────────────────────────┐
│                   COUCHE PRÉSENTATION                   │
│  React 19 + TypeScript + Vite + Tailwind CSS           │
│  • PWA (Service Worker + Web App Manifest)             │
│  • Interface tactile responsive (Mobile Android, POS)  │
│  • Composants légers sans dépendances superflues       │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│                      COUCHE MÉTIER                     │
│  • FEFO Allocation Engine (fefo.ts)                    │
│  • Contrôles Réglementaires & Garde-fous               │
│  • Moteur de Synchronisation Idempotente               │
│  • Validateur RBAC (Admin / Gestionnaire / Vendeur)    │
│  • Calculateur d'intégrité cryptographique SHA-256     │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│                     COUCHE DONNÉES                     │
│  Local : IndexedDB / LocalStorage Cache Réactif        │
│  Backend : API REST OpenAPI (Express / NestJS)         │
│  Base relationnelle : PostgreSQL (ACID)                │
└────────────────────────────────────────────────────────┘
```

---

## 4. Garde-fou Fonctionnel & Déontologique

> **Règle absolue :**  
> Le système **Muelo PHARM** est un progiciel de gestion d'officine et de traçabilité logistique.  
> **Il ne formule jamais de diagnostic, ne prescrit aucun traitement, ne modifie pas les ordonnances médicales, et ne fournit aucune recommandation clinique autonome.**
