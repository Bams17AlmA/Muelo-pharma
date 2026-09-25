# Modèle de Données — Muelo PHARM (MVP RDC)

> **Spécification Technique du Modèle de Données v1.0**  
> Schéma relationnel et structure des entités pour PostgreSQL et cache local IndexedDB.

---

## 1. Diagramme Entité-Association (Vue d'ensemble)

```
┌──────────────┐       1:N       ┌──────────────┐
│   Pharmacy   │────────────────▶│     User     │
└──────┬───────┘                 └──────────────┘
       │ 1:N
       ├────────────────────────┐
       ▼                        ▼
┌──────────────┐         ┌──────────────┐
│   Supplier   │         │   Product    │
└──────┬───────┘         └──────┬───────┘
       │ 1:N                    │ 1:N
       ▼                        ▼
┌──────────────┐  1:N    ┌──────────────┐
│  Reception   │────────▶│    Batch     │ (Numéro de lot, péremption, emplacement)
└──────────────┘         └──────┬───────┘
                                │ 1:N
             ┌──────────────────┼──────────────────┐
             ▼                  ▼                  ▼
      ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
      │StockMovement │   │   SaleLine   │   │InventoryItem │
      └──────────────┘   └──────▲───────┘   └──────▲───────┘
                                │ N:1              │ N:1
                         ┌──────┴───────┐   ┌──────┴───────┐
                         │     Sale     │   │InventorySess │
                         └──────────────┘   └──────────────┘

┌──────────────┐         ┌──────────────┐
│   AuditLog   │         │  SyncEvent   │
│ (Append-Only)│         │(File locale) │
└──────────────┘         └──────────────┘
```

---

## 2. Dictionnaire des Entités

### 2.1. `Pharmacy` (Établissement / Tenant)
| Champ | Type | Description |
|---|---|---|
| `id` | `VARCHAR(64)` PK | Identifiant stable unique (UUID ou code établissement) |
| `code` | `VARCHAR(32)` UNIQUE | Code officiel de la pharmacie (ex: `PH-KIN-001`) |
| `name` | `VARCHAR(128)` | Nom commercial de l'officine |
| `legalEntity` | `VARCHAR(128)` | Raison sociale légale (SARL, Établissement, etc.) |
| `address` | `VARCHAR(256)` | Adresse physique |
| `commune` | `VARCHAR(64)` | Commune d'implantation |
| `city` | `VARCHAR(64)` | Ville (Kinshasa, Lubumbashi, Goma, Bukavu, etc.) |
| `province` | `VARCHAR(64)` | Province de la RDC |
| `phone` | `VARCHAR(32)` | Téléphone de contact |
| `email` | `VARCHAR(128)` | Adresse email professionnelle |
| `licenseNumber` | `VARCHAR(64)` | N° d'autorisation délivré par le Ministère de la Santé Publique RDC |
| `chiefPharmacist`| `VARCHAR(128)` | Pharmacien Titulaire responsable légal (N° Ordre RDC) |
| `currencyDefault`| `ENUM('CDF', 'USD')` | Devise de référence locale |
| `exchangeRateUsdToCdf` | `NUMERIC(10,2)` | Taux de change appliqué (ex: 2850.00 CDF = 1 USD) |
| `taxRatePercent` | `NUMERIC(5,2)` | Taux de TVA (0% pour médicaments essentiels) |

---

### 2.2. `User` (Utilisateurs & Droits)
| Champ | Type | Description |
|---|---|---|
| `id` | `VARCHAR(64)` PK | UUID de l'utilisateur |
| `pharmacyId` | `VARCHAR(64)` FK | Référence vers la pharmacie d'affectation |
| `name` | `VARCHAR(128)` | Nom complet de l'agent |
| `email` | `VARCHAR(128)` UNIQUE | Email de connexion |
| `role` | `ENUM('ADMIN', 'MANAGER', 'CASHIER')` | Rôle selon le principe du moindre privilège |
| `pinCode` | `VARCHAR(8)` | Code PIN rapide pour autorisations (annulations, inventaires) |
| `active` | `BOOLEAN` | Compte actif / suspendu |
| `lastLoginAt` | `TIMESTAMP` | Dernier horodatage de connexion |

**Matrice des privilèges :**
- `ADMIN` : Configuration établissement, création utilisateurs, annulation de vente, approbation inventaires, consultation audit complet.
- `MANAGER` : Commandes, réceptions de stock, gestion des lots/quarantaine, approbation d'inventaires, rapports.
- `CASHIER` : Ventes comptoir rapides, consultation des stocks et lots, saisie des comptages d'inventaire. Annulation de vente et validation d'écarts interdites sans PIN d'un supérieur.

---

### 2.3. `Product` (Référentiel Médicaments)
| Champ | Type | Description |
|---|---|---|
| `id` | `VARCHAR(64)` PK | Identifiant stable du produit |
| `pharmacyId` | `VARCHAR(64)` FK | Référence tenant |
| `code` | `VARCHAR(32)` | Code interne ou code-barres (ex: `MED-PAR-500`) |
| `name` | `VARCHAR(128)` | Nom commercial (ex: *Paracétamol Zenufa 500mg*) |
| `inn` | `VARCHAR(128)` | DCI - Dénomination Commune Internationale (ex: *Paracétamol*) |
| `dosage` | `VARCHAR(64)` | Dosage (ex: *500 mg*, *20/120 mg*, *250 mg/5 ml*) |
| `form` | `VARCHAR(64)` | Forme galénique (*Comprimé, Gélule, Sirop, Injectable*) |
| `packaging` | `VARCHAR(64)` | Conditionnement (*Boîte de 100, Flacon 100 ml*) |
| `manufacturer` | `VARCHAR(128)` | Laboratoire ou fabricant pharmaceutique |
| `category` | `VARCHAR(64)` | Classe thérapeutique (*Antipaludéens, Antibiotiques*) |
| `status` | `ENUM('ACTIVE', 'SURVEILLANCE', 'RECALLED_BLOCKED')` | Statut réglementaire |
| `storageConditions` | `ENUM('AMBIENT', 'COLD_CHAIN', 'PROTECT_LIGHT')` | Température et conditions de conservation |
| `minStockAlert` | `INTEGER` | Seuil d'alerte de réapprovisionnement |
| `optimalStock` | `INTEGER` | Stock théorique cible |
| `unitPriceCDF` | `NUMERIC(12,2)` | Prix de vente public en Franc Congolais |
| `unitPriceUSD` | `NUMERIC(10,2)` | Prix de vente public en Dollar US |
| `requiresPrescription`| `BOOLEAN` | Soumis à ordonnance médicale |

---

### 2.4. `Batch` (Lots de fabrication & Dates d'expiration)
| Champ | Type | Description |
|---|---|---|
| `id` | `VARCHAR(64)` PK | UUID du lot |
| `productId` | `VARCHAR(64)` FK | Référence produit |
| `pharmacyId` | `VARCHAR(64)` FK | Référence tenant |
| `batchNumber` | `VARCHAR(64)` | Numéro de lot fabricant (ex: `L-PAR26-01`) |
| `expiryDate` | `DATE` | Date d'expiration (YYYY-MM-DD) |
| `initialQuantity`| `INTEGER` | Quantité initiale reçue |
| `currentQuantity`| `INTEGER` | Quantité physique disponible |
| `reservedQuantity`| `INTEGER` | Quantité temporairement réservée |
| `quarantineQuantity`| `INTEGER` | Quantité isolée en zone de quarantaine |
| `location` | `VARCHAR(64)` | Emplacement physique (ex: *Rayon A1, Frigo 1*) |
| `status` | `ENUM('ACTIVE', 'QUARANTINE', 'EXPIRED', 'BLOCKED_RECALL')` | Statut sanitaire du lot |
| `purchaseCostCDF`| `NUMERIC(12,2)` | Coût d'achat unitaire en CDF |
| `purchaseCostUSD`| `NUMERIC(10,2)` | Coût d'achat unitaire en USD |
| `supplierId` | `VARCHAR(64)` FK | Fournisseur d'origine |
| `recallReason` | `TEXT` | Motif légal en cas de mise sous blocage ou rappel |

---

### 2.5. `StockMovement` (Traçabilité des Mouvements)
| Champ | Type | Description |
|---|---|---|
| `id` | `VARCHAR(64)` PK | UUID du mouvement |
| `pharmacyId` | `VARCHAR(64)` FK | Référence tenant |
| `productId` | `VARCHAR(64)` FK | Référence produit |
| `batchId` | `VARCHAR(64)` FK | Référence lot |
| `type` | `ENUM('RECEPTION', 'SALE', 'SALE_CANCEL', 'INVENTORY_ADJUSTMENT', 'LOSS_DAMAGE', 'QUARANTINE_TRANSFER', 'RECALL_BLOCK')` | Type d'opération |
| `quantity` | `INTEGER` | Quantité mouvementée (+ pour entrées, - pour sorties) |
| `previousQuantity`| `INTEGER` | Solde avant opération |
| `newQuantity` | `INTEGER` | Nouveau solde après opération |
| `referenceDocType`| `VARCHAR(32)` | Type de pièce justificative (BL, Ticket Vente, N° Inventaire) |
| `referenceDocId`| `VARCHAR(64)` | Numéro de la pièce |
| `performedByUserId`| `VARCHAR(64)` FK | Utilisateur ayant agi |
| `timestamp` | `TIMESTAMP` | Date et heure de l'opération |

---

### 2.6. `Sale` & `SaleLine` (Ventes Caisse)
**`Sale` :**
- `id` (UUID) : Identifiant pérenne utilisé pour l'idempotence hors ligne.
- `saleNumber` : Numéro incrémental lisible (ex: `VTE-2026-0001`).
- `cashierUserId`, `clientName`, `saleDate`.
- `totalCDF`, `totalUSD`, `exchangeRateApplied`.
- `amountPaidCDF`, `amountPaidUSD`, `changeGivenCDF`, `changeGivenUSD`.
- `status` (`'COMPLETED' | 'CANCELLED'`).
- `signatureHash` : Empreinte cryptographique scellée localement.

**`SaleLine` :**
- `id`, `saleId`, `productId`, `batchId`, `batchNumber`, `expiryDate`.
- `quantity`, `unitPriceCDF`, `totalPriceCDF`, `unitPriceUSD`, `totalPriceUSD`.

---

### 2.7. `AuditLog` (Journal d'audit inaltérable)
- `id` (UUID), `pharmacyId`, `timestamp`.
- `userId`, `userName`, `userRole`.
- `actionType` : `USER_LOGIN`, `ROLE_CHANGE`, `PRODUCT_CREATE`, `BATCH_RECEPTION`, `BATCH_RECALL_BLOCK`, `SALE_CREATED`, `SALE_CANCELLED`, `INVENTORY_APPROVED`, `SYNC_CONFLICT_RESOLVED`.
- `entityType`, `entityId`, `details`.
- `deviceId` : Identifiant du terminal.
- `integrityHash` : Hash SHA-256 calculé sur l'événement.

---

### 2.8. `SyncEvent` (File locale de synchronisation)
- `id` (UUID identique au payload pour idempotence).
- `pharmacyId`, `entity` (`SALE`, `STOCK_MOVEMENT`, `INVENTORY_SESSION`, `BATCH`).
- `action` (`CREATE`, `UPDATE`, `CANCEL`).
- `payload` : Objet JSON complet.
- `clientTimestamp`, `serverTimestamp`.
- `status` (`'PENDING' | 'SYNCED' | 'CONFLICT'`).
- `conflictDetails` : Structure détaillée contenant les versions locale et distante et les choix d'arbitrage.

---

## 3. Séparation Transactionnelle / Entrepôt Analytique

Le schéma est conçu dès la Phase 2 pour séparer distinctement :
1. **Données opérationnelles transactionnelles (OLTP) :**  
   Tables optimisées pour les écritures rapides, l'accès par lot et la faible latence de caisse.
2. **Points d'extraction pour le futur entrepôt analytique (OLAP) :**  
   Les entités comportent des identifiants immuables (`UUID`), des horodatages UTC normalisés, et des clés de partitionnement par établissement (`pharmacyId`), facilitant l'ingestion ultérieure vers un data warehouse national (ex: ClickHouse ou BigQuery) pour le Ministère de la Santé Publique RDC.
