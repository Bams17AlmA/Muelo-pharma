# Muelo PHARM (MVP) — Solution Numérique Nationale de Vente au Détail et de Gestion des Stocks des Produits Pharmaceutiques en RDC

[![CI/CD](https://github.com/muelo-groupe/muelo-pharm/actions/workflows/ci.yml/badge.svg)](https://github.com/muelo-groupe/muelo-pharm/actions)
[![PWA Ready](https://img.shields.io/badge/PWA-Installable-blue.svg)](https://web.dev/progressive-web-apps/)
[![License](https://img.shields.io/badge/License-Proprietary-slate.svg)](#)

Application Web Progressive (PWA) de gestion d'officine pharmaceutique conçue pour la République Démocratique du Congo. L'application garantit une **résilience totale en mode hors ligne**, gère les stocks par lot et date d'expiration (**FEFO strict**), sécurise les encaissements bidevise (CDF / USD), et pose les fondations du modèle fédéré national supervisé par les autorités sanitaires (Phase 2 du cahier des charges MUELO GROUPE v1.0 — 7 septembre 2026).

---

## ⚠️ Garde-fou Fonctionnel & Déontologique Absolu

> **Avertissement légal :**  
> Le système **Muelo PHARM** est exclusivement un outil logistique, comptable et d'audit pour la gestion d'officine.  
> **Il ne formule jamais de diagnostic médical, ne prescrit aucun médicament, ne modifie pas les ordonnances, et ne produit aucune recommandation thérapeutique autonome.**  
> La dispensation reste sous la responsabilité exclusive du Pharmacien Titulaire inscrit au tableau de l'Ordre des Pharmaciens de la RDC.

---

## 1. Fonctionnalités Couvertes par le MVP (Phase 2)

1. **Multi-Établissements (Multi-tenants) :**  
   Gestion isolée par officine (ex: *Pharmacie du Peuple — Limete, Kinshasa* et *Pharmacie La Grâce — Goma, Nord-Kivu*), prête pour la fédération nationale.
2. **Gestion des Utilisateurs, Rôles & Droits d'Accès (RBAC Moindre Privilège) :**  
   Création et modification de comptes utilisateurs, attribution de rôles (*Administrateur / Titulaire*, *Gestionnaire de Pharmacie*, *Vendeur / Caissier*), matrice de 13 permissions granulaires avec dérogations personnalisées, codes PIN d'autorisation rapide, suspension de compte et protection anti-suppression du dernier administrateur.
3. **Paramètres de l'Officine & Financiers :**  
   Gestion des données légales de l'établissement (numéro d'autorisation DPS RDC, pharmacien responsable CNOP), taux de change dynamique USD/CDF, devises et fiscalité TVA.
4. **Gestion Avancée de la Base de Données (DB) :**  
   Statistiques en temps réel, sauvegarde complète instantanée en JSON avec checksum, restauration avec contrôle d'intégrité, explorateur de tables brutes, purge sécurisée des transactions de test et réinitialisation d'usine aux valeurs RDC certifiées.
5. **Référentiel Médicaments Conforme RDC :**  
   Nom commercial, DCI (Dénomination Commune Internationale), forme galénique, dosage, conditionnement, fabricant, seuil de réapprovisionnement et conditions de conservation (Ambiante, Frigo 2–8°C, Abri lumière).
6. **Fournisseurs & Réceptions avec Contrôle Strict :**  
   Enregistrement des centrales publiques (FEDECAME, CAMEG) et grossistes privés ; contrôle à l'entrée du N° de lot fabricant, de la date de péremption et **blocage automatique immédiat en cas d'alerte de rappel sanitaire**.
7. **Gestion des Stocks par Lot & Moteur FEFO :**  
   Attribution prioritaire *First-Expired, First-Out*, alertes graduées à 30 jours (Critique), 60 jours (Alerte) et 90 jours (Surveillance), historique complet des mouvements.
8. **Caisse & Vente au Détail Rapide (< 2 secondes) :**  
   Recherche instantanée, calcul bidevise (Franc Congolais CDF et Dollar US USD), calcul de monnaie, impression de ticket thermique conforme (avec mention des lots délivrés).
9. **Annulation de Vente Sécurisée :**  
   Requiert obligatoirement le code PIN d'un Gestionnaire ou Administrateur avec motif consigné au registre.
10. **Inventaire Tournant & Approbation des Écarts :**  
    Comptage physique par lot, calcul d'écarts de stock et de valorisation, validation restreinte avec mise à jour automatique des stocks théoriques.
11. **Mode Hors Ligne Total & File de Synchronisation Idempotente :**  
    Persistance locale (IndexedDB / LocalStorage), file d'attente d'événements signés localement avec UUID. **Résolution explicite des conflits : aucun écrasement silencieux.**
12. **Journal d'Audit Inaltérable (Append-Only) :**  
    Traçabilité intégrale de toutes les opérations sensibles avec signature cryptographique SHA-256 scellant l'auteur et la date.
13. **Rapports & Exports :**  
    Rapports journaliers de caisse, état valorisé des stocks, liste des péremptions imminentes, exports CSV et JSON.

---

## 2. Périmètre Explicitement Non Couvert par ce MVP (Feuille de Route)

Conformément à la Section 2 du cahier des charges, les éléments suivants sont **prévus pour les phases ultérieures** et ne font pas partie du MVP :
- ❌ **Portail national d'agrégation multi-pharmacies** et tableaux de bord provinciaux pour le Ministère de la Santé Publique et l'Ordre des Pharmaciens.
- ❌ **Ordonnances électroniques réglementées** et délivrance contrôlée avec signature numérique des prescripteurs.
- ❌ **Diffusion automatisée temps-réel de rappels sanitaires inter-pharmacies** (push direct depuis l'autorité centrale de régulation).
- ❌ **Paiement Mobile Money direct** (API M-Pesa, Orange Money, Airtel Money).
- ❌ **Capteurs connectés de chaîne du froid** (télémétrie IoT en continu dans les frigos).
- ❌ **Portail de commande en ligne / Click & Collect** pour les patients.
- ❌ **Gestion multi-entrepôts centralisés**.
- ❌ **Authentification multifacteur (MFA)** (les points d'extension sont prévus dans le modèle de données mais non activés).
- ❌ **Intégrations aux systèmes de santé nationaux (DHIS2, SNIS)**.

---

## 3. Installation Locale & Démarrage

### Prérequis
- Node.js 20+ ou 22+
- npm ou pnpm
- Docker & Docker Compose (optionnel pour l'environnement conteneurisé)

### Procédure standard

```bash
# 1. Cloner le dépôt
git clone https://github.com/muelo-groupe/muelo-pharm.git
cd muelo-pharm

# 2. Installer les dépendances
npm install

# 3. Lancer la validation des types TypeScript
npm run lint

# 4. Exécuter la suite de tests (FEFO, calculs de stock et scénario e2e offline/sync)
npm run test

# 5. Démarrer le serveur de développement PWA
npm run dev
```

L'application est accessible sur `http://localhost:3000`.

---

## 4. Environnement Docker Local

Pour lancer l'environnement complet avec base de données PostgreSQL :

```bash
docker-compose up --build -d
```

Services démarrés :
- **Web Frontend (PWA) :** `http://localhost:3000`
- **PostgreSQL Database :** `localhost:5432` (`muelo_pharm_db`)

---

## 5. Déploiement du Pilote

### A. Frontend PWA (Vercel ou Netlify)
1. Lier le dépôt GitHub à Vercel ou Netlify.
2. Build command : `npm run build`
3. Output directory : `dist`
4. Variables d'environnement :
   - `VITE_APP_NAME` : `Muelo PHARM`
   - `VITE_API_URL` : URL de l'API backend

### B. Backend API & Base de Données (Render, Railway ou Fly.io)
Pour héberger le backend Node.js et PostgreSQL à coût minimal pour la phase pilote :
- **Render.com / Railway.app :**
  - Provisionner un service **PostgreSQL Database** (instance Developer gratuite ou 5$/mois).
  - Déployer le service Web Node.js.
  - Variables d'environnement obligatoires :
    - `DATABASE_URL` : Chaîne de connexion PostgreSQL (`postgres://user:pass@host:5432/muelo_pharm_db`)
    - `PORT` : `3000`
    - `JWT_SECRET` : Clé secrète de signature des tokens (min. 32 caractères aléatoires)
    - `NODE_ENV` : `production`

---

## 6. Architecture & Documentation

- [Architecture Technique Détaillée](docs/architecture.md)
- [Modèle de Données & Schéma](docs/data-model.md)
- [Suite de Tests Métier](tests/run-tests.ts)

---

## 7. Auteurs & Mentions Légales

- **Projet :** Muelo PHARM (MVP v1.0)
- **Initiateur :** MUELO GROUPE (7 septembre 2026)
- **Territoire d'application :** République Démocratique du Congo
- **Cadre réglementaire :** Ministère de la Santé Publique, Hygiène et Prévention / Ordre National des Pharmaciens de la RDC.
