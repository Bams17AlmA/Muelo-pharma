/**
 * Muelo PHARM - Modèle de données TypeScript (MVP RDC)
 * Cahier des charges: MUELO GROUPE v1.0
 */

export type UserRole = 'ADMIN' | 'MANAGER' | 'CASHIER';

export type PermissionKey =
  | 'pos_sales'              // Effectuer des encaissements et ventes comptoir
  | 'pos_cancel'             // Annuler une vente avec motif
  | 'stock_view'             // Consulter le catalogue des produits et lots FEFO
  | 'stock_manage'           // Créer et modifier des médicaments et fiches produits
  | 'stock_quarantine'       // Changer le statut d'un lot (quarantaine, rappel sanitaire)
  | 'receptions_create'      // Saisir et valider les réceptions fournisseurs (BL)
  | 'inventory_count'        // Saisir les comptages physiques d'inventaire tournant
  | 'inventory_approve'      // Approuver les écarts d'inventaire (code PIN requis)
  | 'audit_view'             // Consulter le journal d'audit inaltérable (append-only)
  | 'reports_export'         // Exporter les états financiers et rapports réglementaires
  | 'admin_users'            // Créer, modifier des comptes utilisateurs et attribuer les rôles
  | 'admin_settings'         // Configurer les paramètres légaux et fiscaux de l'officine
  | 'admin_db_manage';       // Sauvegarder, restaurer et réinitialiser les données de la DB

export interface PermissionDefinition {
  key: PermissionKey;
  label: string;
  category: 'VENTE' | 'STOCK' | 'INVENTAIRE' | 'AUDIT_RAPPORTS' | 'ADMINISTRATION';
  description: string;
}

export const SYSTEM_PERMISSIONS: PermissionDefinition[] = [
  {
    key: 'pos_sales',
    label: 'Ventes au détail / Caisse',
    category: 'VENTE',
    description: 'Encaisser les ventes au comptoir en CDF et USD avec calcul de monnaie',
  },
  {
    key: 'pos_cancel',
    label: 'Annulation de vente',
    category: 'VENTE',
    description: 'Annuler une transaction de caisse et réintégrer les lots en stock (Superviseur)',
  },
  {
    key: 'stock_view',
    label: 'Consultation des stocks',
    category: 'STOCK',
    description: 'Consulter les niveaux de stocks et les priorités FEFO des lots',
  },
  {
    key: 'stock_manage',
    label: 'Gestion du référentiel produit',
    category: 'STOCK',
    description: 'Créer de nouveaux médicaments, modifier dosages et seuils d\'alerte',
  },
  {
    key: 'stock_quarantine',
    label: 'Gestion des lots & Quarantaine',
    category: 'STOCK',
    description: 'Isoler un lot suspect ou appliquer un rappel sanitaire ministériel',
  },
  {
    key: 'receptions_create',
    label: 'Réceptions fournisseurs',
    category: 'STOCK',
    description: 'Contrôler les bordereaux de livraison (BL), lots et dates de péremption',
  },
  {
    key: 'inventory_count',
    label: 'Comptage physique d\'inventaire',
    category: 'INVENTAIRE',
    description: 'Saisir les quantités physiques constatées lors des inventaires tournants',
  },
  {
    key: 'inventory_approve',
    label: 'Approbation des écarts d\'inventaire',
    category: 'INVENTAIRE',
    description: 'Valider les ajustements de stock et répercussions financières',
  },
  {
    key: 'audit_view',
    label: 'Consultation du journal d\'audit',
    category: 'AUDIT_RAPPORTS',
    description: 'Consulter l\'historique inaltérable scellé par empreintes SHA-256',
  },
  {
    key: 'reports_export',
    label: 'Exports et rapports d\'activité',
    category: 'AUDIT_RAPPORTS',
    description: 'Générer et exporter les états journaliers et valorisations en CSV/JSON',
  },
  {
    key: 'admin_users',
    label: 'Gestion des utilisateurs & rôles',
    category: 'ADMINISTRATION',
    description: 'Créer des comptes, réinitialiser les PIN et définir les droits d\'accès',
  },
  {
    key: 'admin_settings',
    label: 'Paramètres généraux de l\'officine',
    category: 'ADMINISTRATION',
    description: 'Modifier le taux officiel USD/CDF, la licence sanitaire et informations légales',
  },
  {
    key: 'admin_db_manage',
    label: 'Gestion de la base de données',
    category: 'ADMINISTRATION',
    description: 'Sauvegarde complète, restauration JSON, purge et réinitialisation de la DB',
  },
];

export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, PermissionKey[]> = {
  ADMIN: [
    'pos_sales',
    'pos_cancel',
    'stock_view',
    'stock_manage',
    'stock_quarantine',
    'receptions_create',
    'inventory_count',
    'inventory_approve',
    'audit_view',
    'reports_export',
    'admin_users',
    'admin_settings',
    'admin_db_manage',
  ],
  MANAGER: [
    'pos_sales',
    'pos_cancel',
    'stock_view',
    'stock_manage',
    'stock_quarantine',
    'receptions_create',
    'inventory_count',
    'inventory_approve',
    'audit_view',
    'reports_export',
  ],
  CASHIER: [
    'pos_sales',
    'stock_view',
    'inventory_count',
  ],
};

export interface User {
  id: string;
  pharmacyId: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  active: boolean;
  pinCode?: string; // Code PIN rapide pour autorisations (ex: annulation caisse)
  customPermissions?: PermissionKey[]; // Droits personnalisés s'ils dérogent au rôle
  lastLoginAt: string;
  createdAt?: string;
}

export interface Pharmacy {
  id: string;
  code: string;
  name: string;
  legalEntity: string;
  address: string;
  commune: string;
  city: string;
  province: string; // Kinshasa, Haut-Katanga, Nord-Kivu, etc.
  phone: string;
  email: string;
  licenseNumber: string; // Numéro d'autorisation Ministère de la Santé Publique RDC
  chiefPharmacist: string; // Pharmacien titulaire
  currencyDefault: 'CDF' | 'USD';
  exchangeRateUsdToCdf: number; // Taux de change officiel appliqué (ex: 2850 CDF = 1 USD)
  taxRatePercent: number; // TVA 16% en RDC ou exonération médicaments essentiels
}

export type ProductStatus = 'ACTIVE' | 'SURVEILLANCE' | 'RECALLED_BLOCKED';
export type StorageCondition = 'AMBIENT' | 'COLD_CHAIN' | 'PROTECT_LIGHT';

export interface Product {
  id: string;
  pharmacyId: string;
  code: string; // Ex: MED-PAR-500
  name: string; // Nom commercial
  inn: string; // DCI (Dénomination Commune Internationale / Principe actif)
  dosage: string; // Ex: 500 mg, 1 g, 200 mg/5 ml
  form: string; // Comprimé, Gélule, Sirop, Injectable, Suspension, Pommade, Soluté
  packaging: string; // Boîte de 100, Flacon 100 ml, Ampoule 10 ml
  manufacturer: string; // Laboratoire fabricant
  category: string; // Antibiotiques, Antipaludéens, Antalgiques & Antipyrétiques, etc.
  status: ProductStatus;
  storageConditions: StorageCondition;
  minStockAlert: number;
  optimalStock: number;
  unitPriceCDF: number;
  unitPriceUSD: number;
  requiresPrescription: boolean;
  createdAt: string;
  updatedAt: string;
}

export type BatchStatus = 'ACTIVE' | 'QUARANTINE' | 'EXPIRED' | 'BLOCKED_RECALL';

export interface Batch {
  id: string;
  productId: string;
  pharmacyId: string;
  batchNumber: string; // Numéro de lot fabricant
  expiryDate: string; // YYYY-MM-DD
  initialQuantity: number;
  currentQuantity: number; // Stock disponible
  reservedQuantity: number; // En attente de finalisation
  quarantineQuantity: number;
  location: string; // Rayon A1, Frigo 1, Armoire B, etc.
  status: BatchStatus;
  purchaseCostCDF: number;
  purchaseCostUSD: number;
  supplierId: string;
  receptionId?: string;
  recallReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  id: string;
  pharmacyId: string;
  code: string;
  name: string; // Ex: FEDECAME, CAMEG, MEDIPHARM KINSHASA
  category: 'CENTRALE_ACHAT_PUBLIQUE' | 'GROSSISTE_PRIVE' | 'LABORATOIRE_LOCAL';
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  active: boolean;
}

export type PurchaseOrderStatus = 'DRAFT' | 'ORDERED' | 'RECEIVED' | 'CANCELLED';

export interface PurchaseOrderItem {
  productId: string;
  productName: string;
  orderedQuantity: number;
  unitPriceCDF: number;
  unitPriceUSD: number;
  receivedQuantity?: number;
}

export interface PurchaseOrder {
  id: string;
  pharmacyId: string;
  orderNumber: string;
  supplierId: string;
  supplierName: string;
  orderDate: string;
  expectedDate?: string;
  status: PurchaseOrderStatus;
  items: PurchaseOrderItem[];
  totalAmountCDF: number;
  totalAmountUSD: number;
  notes?: string;
  createdByUserId: string;
  createdAt: string;
}

export interface ReceptionItem {
  productId: string;
  productName: string;
  batchNumber: string;
  expiryDate: string;
  quantityOrdered: number;
  quantityReceived: number;
  unitCostCDF: number;
  unitCostUSD: number;
  location: string;
  isCompliant: boolean;
  rejectionReason?: string;
}

export interface Reception {
  id: string;
  pharmacyId: string;
  receptionNumber: string;
  purchaseOrderId?: string;
  supplierId: string;
  supplierName: string;
  receptionDate: string;
  deliverySlipNumber: string; // N° Bordereau de livraison fournisseur
  receivedByUserId: string;
  receivedByName: string;
  items: ReceptionItem[];
  status: 'VALIDATED' | 'WITH_ANOMALIES' | 'REJECTED';
  notes?: string;
  createdAt: string;
}

export type StockMovementType =
  | 'RECEPTION'
  | 'SALE'
  | 'SALE_CANCEL'
  | 'INVENTORY_ADJUSTMENT'
  | 'LOSS_DAMAGE'
  | 'QUARANTINE_TRANSFER'
  | 'RECALL_BLOCK';

export interface StockMovement {
  id: string;
  pharmacyId: string;
  productId: string;
  productName: string;
  batchId: string;
  batchNumber: string;
  type: StockMovementType;
  quantity: number; // Positif pour entrées, négatif pour sorties
  previousQuantity: number;
  newQuantity: number;
  referenceDocType: 'RECEPTION' | 'SALE' | 'INVENTORY' | 'MANUAL';
  referenceDocId: string;
  reason?: string;
  performedByUserId: string;
  performedByName: string;
  timestamp: string;
}

export interface SaleLine {
  id: string;
  productId: string;
  productName: string;
  inn: string;
  dosage: string;
  batchId: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  unitPriceCDF: number;
  totalPriceCDF: number;
  unitPriceUSD: number;
  totalPriceUSD: number;
}

export interface Sale {
  id: string; // UUID stable
  pharmacyId: string;
  saleNumber: string; // Ex: VTE-2026-0001
  cashierUserId: string;
  cashierName: string;
  clientName?: string;
  saleDate: string;
  items: SaleLine[];
  subtotalCDF: number;
  taxCDF: number;
  totalCDF: number;
  totalUSD: number;
  paymentMethod: 'CASH_CDF' | 'CASH_USD' | 'MIXED';
  amountPaidCDF: number;
  amountPaidUSD: number;
  changeGivenCDF: number;
  changeGivenUSD: number;
  exchangeRateApplied: number;
  status: 'COMPLETED' | 'CANCELLED';
  cancellationReason?: string;
  cancelledByUserId?: string;
  cancelledByName?: string;
  cancelledAt?: string;
  offlineCreated: boolean;
  syncStatus: 'SYNCED' | 'PENDING' | 'CONFLICT';
  signatureHash: string; // Intégrité locale
  createdAt: string;
}

export interface InventoryCountItem {
  id: string;
  productId: string;
  productName: string;
  inn: string;
  batchId: string;
  batchNumber: string;
  expiryDate: string;
  location: string;
  theoreticalQuantity: number;
  countedQuantity: number;
  discrepancyQuantity: number; // counted - theoretical
  unitCostCDF: number;
  discrepancyValueCDF: number;
  reason?: string;
  discrepancyReason?: string;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface InventorySession {
  id: string;
  pharmacyId: string;
  sessionNumber: string;
  title: string;
  zoneOrCategory: string;
  status: 'IN_PROGRESS' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  initiatedByUserId: string;
  initiatedByName: string;
  approvedByUserId?: string;
  approvedByName?: string;
  createdAt: string;
  completedAt?: string;
  items: InventoryCountItem[];
}

export type AuditActionType =
  | 'USER_LOGIN'
  | 'USER_LOGOUT'
  | 'USER_CREATE'
  | 'USER_UPDATE'
  | 'USER_DELETE'
  | 'USER_PIN_RESET'
  | 'ROLE_CHANGE'
  | 'PRODUCT_CREATE'
  | 'PRODUCT_UPDATE'
  | 'BATCH_RECEPTION'
  | 'BATCH_STATUS_CHANGE'
  | 'BATCH_RECALL_BLOCK'
  | 'SALE_CREATED'
  | 'SALE_CANCELLED'
  | 'INVENTORY_SUBMITTED'
  | 'INVENTORY_APPROVED'
  | 'SYNC_EVENT_REPLAYED'
  | 'SYNC_CONFLICT_RESOLVED'
  | 'PHARMACY_SETTINGS_UPDATED'
  | 'DB_BACKUP_EXPORT'
  | 'DB_RESTORE'
  | 'DB_RESET'
  | 'DB_PURGE';

export interface DatabaseStats {
  pharmaciesCount: number;
  usersCount: number;
  productsCount: number;
  batchesCount: number;
  salesCount: number;
  movementsCount: number;
  receptionsCount: number;
  inventoryCount: number;
  auditLogsCount: number;
  syncQueueCount: number;
  estimatedSizeBytes: number;
  lastBackupDate?: string;
}

export interface DatabaseBackupPayload {
  version: string;
  exportDate: string;
  app: 'Muelo PHARM';
  checksum: string;
  data: {
    pharmacies: Pharmacy[];
    users: User[];
    products: Product[];
    batches: Batch[];
    suppliers: Supplier[];
    sales: Sale[];
    stockMovements: StockMovement[];
    receptions: Reception[];
    inventorySessions: InventorySession[];
    auditLogs: AuditLog[];
    syncQueue: SyncEvent[];
  };
}

export interface AuditLog {
  id: string;
  pharmacyId: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  actionType: AuditActionType;
  entityType: string;
  entityId: string;
  details: string;
  diffSummary?: {
    before?: Record<string, any>;
    after?: Record<string, any>;
  };
  deviceId: string;
  integrityHash: string;
}

export interface SyncEvent {
  id: string; // UUIDv4
  pharmacyId: string;
  entity: 'SALE' | 'STOCK_MOVEMENT' | 'INVENTORY_SESSION' | 'BATCH';
  action: 'CREATE' | 'UPDATE' | 'CANCEL';
  payload: any;
  clientTimestamp: string;
  serverTimestamp?: string;
  status: 'PENDING' | 'SYNCED' | 'CONFLICT';
  retryCount: number;
  conflictDetails?: {
    conflictType: 'STOCK_DEPLETED' | 'BATCH_LOCKED' | 'PRICE_MISMATCH' | 'RECORD_ALREADY_EXISTS';
    message: string;
    localPayload: any;
    remoteState: any;
    resolutionOptions: Array<{
      key: 'USE_LOCAL' | 'USE_REMOTE' | 'SUBSTITUTE_FEFO' | 'CANCEL_TRANSACTION';
      label: string;
      description: string;
    }>;
  };
}

export type ExpiryAlertLevel = 'EXPIRED' | 'CRITICAL_30' | 'WARNING_60' | 'ATTENTION_90' | 'OK';
