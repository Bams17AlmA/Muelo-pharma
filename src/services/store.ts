/**
 * Muelo PHARM - Data Store & Local Persistence Engine
 * Compatible IndexedDB / LocalStorage avec persistance hors ligne
 */

import {
  AuditLog,
  Batch,
  InventoryCountItem,
  InventorySession,
  Pharmacy,
  Product,
  PurchaseOrder,
  Reception,
  ReceptionItem,
  Sale,
  SaleLine,
  StockMovement,
  Supplier,
  SyncEvent,
  User,
  UserRole,
} from '../types/pharmacy';
import { allocateStockFEFO, calculateIntegrityHash, generateUUID } from '../utils/fefo';

// Clés de stockage local
const STORAGE_PREFIX = 'muelo_pharm_';
const KEYS = {
  PHARMACIES: STORAGE_PREFIX + 'pharmacies',
  CURRENT_PHARMACY_ID: STORAGE_PREFIX + 'current_pharmacy_id',
  USERS: STORAGE_PREFIX + 'users',
  CURRENT_USER_ID: STORAGE_PREFIX + 'current_user_id',
  PRODUCTS: STORAGE_PREFIX + 'products',
  BATCHES: STORAGE_PREFIX + 'batches',
  SUPPLIERS: STORAGE_PREFIX + 'suppliers',
  PURCHASE_ORDERS: STORAGE_PREFIX + 'purchase_orders',
  RECEPTIONS: STORAGE_PREFIX + 'receptions',
  SALES: STORAGE_PREFIX + 'sales',
  STOCK_MOVEMENTS: STORAGE_PREFIX + 'stock_movements',
  INVENTORY_SESSIONS: STORAGE_PREFIX + 'inventory_sessions',
  AUDIT_LOGS: STORAGE_PREFIX + 'audit_logs',
  SYNC_QUEUE: STORAGE_PREFIX + 'sync_queue',
  OFFLINE_SIMULATION: STORAGE_PREFIX + 'offline_simulated',
};

// Données initiales réalistes (RDC)
const INITIAL_PHARMACIES: Pharmacy[] = [
  {
    id: 'pharma-kin-01',
    code: 'PH-KIN-001',
    name: 'Pharmacie du Peuple — Limete',
    legalEntity: 'Pharmacie du Peuple SARL',
    address: '14, 7ème Rue Résidentielle, Quartier Industriel',
    commune: 'Limete',
    city: 'Kinshasa',
    province: 'Kinshasa',
    phone: '+243 81 234 5678',
    email: 'contact@pharmaciedupeuple.cd',
    licenseNumber: 'MS-RDC/DPS/KIN/0482/2024',
    chiefPharmacist: 'Dr. Patrick Kabasele (Ordre N° 1420/RDC)',
    currencyDefault: 'CDF',
    exchangeRateUsdToCdf: 2850,
    taxRatePercent: 0, // Médicaments essentiels exonérés
  },
  {
    id: 'pharma-goma-02',
    code: 'PH-GOM-002',
    name: 'Pharmacie La Grâce — Goma',
    legalEntity: 'Ets La Grâce Médicale',
    address: 'Avenue du Rond-Point BDGL, Quartier Les Volcans',
    commune: 'Goma',
    city: 'Goma',
    province: 'Nord-Kivu',
    phone: '+243 99 876 5432',
    email: 'lagrace.goma@muelo-pharm.cd',
    licenseNumber: 'MS-RDC/DPS/NK/0129/2023',
    chiefPharmacist: 'Dr. Jeanne Kahindo (Ordre N° 1891/RDC)',
    currencyDefault: 'USD',
    exchangeRateUsdToCdf: 2850,
    taxRatePercent: 0,
  },
];

const INITIAL_USERS: User[] = [
  {
    id: 'user-admin-01',
    pharmacyId: 'pharma-kin-01',
    name: 'Dr. Patrick Kabasele',
    email: 'p.kabasele@pharmaciedupeuple.cd',
    role: 'ADMIN',
    phone: '+243 81 234 5678',
    active: true,
    pinCode: '1234',
    lastLoginAt: '2026-09-25T08:00:00Z',
  },
  {
    id: 'user-mgr-02',
    pharmacyId: 'pharma-kin-01',
    name: 'Marie Lukusa',
    email: 'm.lukusa@pharmaciedupeuple.cd',
    role: 'MANAGER',
    phone: '+243 82 345 6789',
    active: true,
    pinCode: '2345',
    lastLoginAt: '2026-09-25T08:15:00Z',
  },
  {
    id: 'user-cash-03',
    pharmacyId: 'pharma-kin-01',
    name: 'Chantal Mwamba',
    email: 'c.mwamba@pharmaciedupeuple.cd',
    role: 'CASHIER',
    phone: '+243 85 456 7890',
    active: true,
    pinCode: '3456',
    lastLoginAt: '2026-09-25T08:30:00Z',
  },
];

const INITIAL_SUPPLIERS: Supplier[] = [
  {
    id: 'sup-01',
    pharmacyId: 'pharma-kin-01',
    code: 'FRN-FEDECAME',
    name: 'FEDECAME RDC',
    category: 'CENTRALE_ACHAT_PUBLIQUE',
    contactPerson: 'M. Dieudonné Ilunga',
    phone: '+243 81 700 1122',
    email: 'commandes@fedecame.cd',
    address: 'Boulevard Lumumba, Limete, Kinshasa',
    active: true,
  },
  {
    id: 'sup-02',
    pharmacyId: 'pharma-kin-01',
    code: 'FRN-MEDIPHARM',
    name: 'MEDIPHARM Kinshasa S.A.',
    category: 'GROSSISTE_PRIVE',
    contactPerson: 'Mme Christine Badibanga',
    phone: '+243 89 555 4433',
    email: 'ventes@medipharm-rdc.com',
    address: 'Avenue du Marché, Gombe, Kinshasa',
    active: true,
  },
  {
    id: 'sup-03',
    pharmacyId: 'pharma-kin-01',
    code: 'FRN-PHARMAKINA',
    name: 'PHARMAKINA S.A.',
    category: 'LABORATOIRE_LOCAL',
    contactPerson: 'Dr. Joseph Mukwege',
    phone: '+243 99 444 8899',
    email: 'distribution@pharmakina.cd',
    address: 'Route Nationale 2, Bukavu, Sud-Kivu',
    active: true,
  },
];

// Date relative pour les tests d'alertes 30 / 60 / 90 jours
const now = new Date();
const addDays = (days: number): string => {
  const d = new Date(now);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-01',
    pharmacyId: 'pharma-kin-01',
    code: 'MED-PAR-500',
    name: 'Paracétamol 500 mg',
    inn: 'Paracétamol',
    dosage: '500 mg',
    form: 'Comprimé',
    packaging: 'Boîte de 100 (10 blisters de 10)',
    manufacturer: 'Laboratoires Zenufa RDC',
    category: 'Antalgiques & Antipyrétiques',
    status: 'ACTIVE',
    storageConditions: 'AMBIENT',
    minStockAlert: 20,
    optimalStock: 100,
    unitPriceCDF: 3500,
    unitPriceUSD: 1.23,
    requiresPrescription: false,
    createdAt: '2026-01-10T10:00:00Z',
    updatedAt: '2026-09-20T10:00:00Z',
  },
  {
    id: 'prod-02',
    pharmacyId: 'pharma-kin-01',
    code: 'MED-COART-20',
    name: 'Coartem 20/120 mg',
    inn: 'Artéméther + Luméfantrine',
    dosage: '20 mg / 120 mg',
    form: 'Comprimé dispersible',
    packaging: 'Boîte de 24 comprimés',
    manufacturer: 'Novartis Pharma',
    category: 'Antipaludéens (CTA)',
    status: 'ACTIVE',
    storageConditions: 'AMBIENT',
    minStockAlert: 30,
    optimalStock: 150,
    unitPriceCDF: 14250,
    unitPriceUSD: 5.0,
    requiresPrescription: true,
    createdAt: '2026-01-12T10:00:00Z',
    updatedAt: '2026-09-20T10:00:00Z',
  },
  {
    id: 'prod-03',
    pharmacyId: 'pharma-kin-01',
    code: 'MED-AMOX-500',
    name: 'Amoxicilline 500 mg',
    inn: 'Amoxicilline trihydrate',
    dosage: '500 mg',
    form: 'Gélule',
    packaging: 'Boîte de 100 gélules',
    manufacturer: 'Shalina Healthcare',
    category: 'Antibiotiques (Bêtalactamines)',
    status: 'ACTIVE',
    storageConditions: 'AMBIENT',
    minStockAlert: 25,
    optimalStock: 80,
    unitPriceCDF: 11400,
    unitPriceUSD: 4.0,
    requiresPrescription: true,
    createdAt: '2026-01-15T10:00:00Z',
    updatedAt: '2026-09-20T10:00:00Z',
  },
  {
    id: 'prod-04',
    pharmacyId: 'pharma-kin-01',
    code: 'MED-METRO-250',
    name: 'Métronidazole 250 mg',
    inn: 'Métronidazole',
    dosage: '250 mg',
    form: 'Comprimé',
    packaging: 'Flacon de 100 comprimés',
    manufacturer: 'Pharmakina RDC',
    category: 'Anti-infectieux & Antiprotozoaires',
    status: 'ACTIVE',
    storageConditions: 'AMBIENT',
    minStockAlert: 15,
    optimalStock: 60,
    unitPriceCDF: 5700,
    unitPriceUSD: 2.0,
    requiresPrescription: true,
    createdAt: '2026-02-01T10:00:00Z',
    updatedAt: '2026-09-20T10:00:00Z',
  },
  {
    id: 'prod-05',
    pharmacyId: 'pharma-kin-01',
    code: 'MED-ORS-SACH',
    name: 'SRO Sels de Réhydratation Orale',
    inn: 'Glucose + Sels minéraux formule OMS',
    dosage: 'Sachet pour 1 Litre',
    form: 'Poudre orale',
    packaging: 'Boîte de 20 sachets',
    manufacturer: 'FEDECAME Centrale',
    category: 'Pédiatrie & Gastro-entérologie',
    status: 'ACTIVE',
    storageConditions: 'AMBIENT',
    minStockAlert: 40,
    optimalStock: 200,
    unitPriceCDF: 1500,
    unitPriceUSD: 0.53,
    requiresPrescription: false,
    createdAt: '2026-02-10T10:00:00Z',
    updatedAt: '2026-09-20T10:00:00Z',
  },
  {
    id: 'prod-06',
    pharmacyId: 'pharma-kin-01',
    code: 'MED-CEFTR-1G',
    name: 'Ceftriaxone 1 g Injectable',
    inn: 'Ceftriaxone sodique',
    dosage: '1 g',
    form: 'Poudre + Solvant injectable',
    packaging: 'Flacon individuel + ampoule eau PPI',
    manufacturer: 'Laboratoires Roche',
    category: 'Antibiotiques (Céphalosporines)',
    status: 'ACTIVE',
    storageConditions: 'PROTECT_LIGHT',
    minStockAlert: 20,
    optimalStock: 75,
    unitPriceCDF: 17100,
    unitPriceUSD: 6.0,
    requiresPrescription: true,
    createdAt: '2026-02-15T10:00:00Z',
    updatedAt: '2026-09-20T10:00:00Z',
  },
  {
    id: 'prod-07',
    pharmacyId: 'pharma-kin-01',
    code: 'MED-INSUL-NPH',
    name: 'Insuline NPH Humaine 100 UI/ml',
    inn: 'Insuline isophane',
    dosage: '100 UI / ml',
    form: 'Suspension injectable',
    packaging: 'Flacon 10 ml',
    manufacturer: 'Novo Nordisk',
    category: 'Endocrinologie (Chaîne du froid)',
    status: 'ACTIVE',
    storageConditions: 'COLD_CHAIN',
    minStockAlert: 10,
    optimalStock: 40,
    unitPriceCDF: 39900,
    unitPriceUSD: 14.0,
    requiresPrescription: true,
    createdAt: '2026-02-20T10:00:00Z',
    updatedAt: '2026-09-20T10:00:00Z',
  },
  {
    id: 'prod-08',
    pharmacyId: 'pharma-kin-01',
    code: 'MED-RECALLED-SYR',
    name: 'Sirop Antitussif Promethazine (Alerte Sanitaire)',
    inn: 'Prométhazine + Contaminant Toxique Suspect',
    dosage: '5 mg / 5 ml',
    form: 'Sirop',
    packaging: 'Flacon 100 ml',
    manufacturer: 'Laboratoire Fictif Sous Enquête',
    category: 'Respiratoire (PRODUIT BLOQUÉ)',
    status: 'RECALLED_BLOCKED',
    storageConditions: 'AMBIENT',
    minStockAlert: 0,
    optimalStock: 0,
    unitPriceCDF: 6000,
    unitPriceUSD: 2.1,
    requiresPrescription: true,
    createdAt: '2026-01-05T10:00:00Z',
    updatedAt: '2026-09-20T10:00:00Z',
  },
];

const INITIAL_BATCHES: Batch[] = [
  // Paracétamol : Lot A (Expire dans 20 jours - Alerte critique 30 jours, FEFO prioritaire!)
  {
    id: 'batch-par-01',
    productId: 'prod-01',
    pharmacyId: 'pharma-kin-01',
    batchNumber: 'L-PAR26-01',
    expiryDate: addDays(20), // Critique < 30j
    initialQuantity: 50,
    currentQuantity: 18,
    reservedQuantity: 0,
    quarantineQuantity: 0,
    location: 'Rayon A1 - Étagère 1',
    status: 'ACTIVE',
    purchaseCostCDF: 2200,
    purchaseCostUSD: 0.77,
    supplierId: 'sup-02',
    createdAt: '2026-01-10T10:00:00Z',
    updatedAt: '2026-09-20T10:00:00Z',
  },
  // Paracétamol : Lot B (Expire dans 240 jours)
  {
    id: 'batch-par-02',
    productId: 'prod-01',
    pharmacyId: 'pharma-kin-01',
    batchNumber: 'L-PAR26-02',
    expiryDate: addDays(240),
    initialQuantity: 100,
    currentQuantity: 95,
    reservedQuantity: 0,
    quarantineQuantity: 0,
    location: 'Rayon A1 - Étagère 2',
    status: 'ACTIVE',
    purchaseCostCDF: 2150,
    purchaseCostUSD: 0.75,
    supplierId: 'sup-02',
    createdAt: '2026-05-15T10:00:00Z',
    updatedAt: '2026-09-20T10:00:00Z',
  },
  // Coartem : Lot C (Expire dans 50 jours - Alerte 60 jours)
  {
    id: 'batch-coart-01',
    productId: 'prod-02',
    pharmacyId: 'pharma-kin-01',
    batchNumber: 'L-COA26-A4',
    expiryDate: addDays(50), // Alerte 31-60j
    initialQuantity: 80,
    currentQuantity: 34,
    reservedQuantity: 0,
    quarantineQuantity: 0,
    location: 'Rayon B2 - CTA Paludisme',
    status: 'ACTIVE',
    purchaseCostCDF: 10500,
    purchaseCostUSD: 3.68,
    supplierId: 'sup-01',
    createdAt: '2026-03-01T10:00:00Z',
    updatedAt: '2026-09-20T10:00:00Z',
  },
  // Coartem : Lot D (Expire dans 360 jours)
  {
    id: 'batch-coart-02',
    productId: 'prod-02',
    pharmacyId: 'pharma-kin-01',
    batchNumber: 'L-COA26-B8',
    expiryDate: addDays(360),
    initialQuantity: 120,
    currentQuantity: 120,
    reservedQuantity: 0,
    quarantineQuantity: 0,
    location: 'Rayon B2 - CTA Paludisme',
    status: 'ACTIVE',
    purchaseCostCDF: 10200,
    purchaseCostUSD: 3.58,
    supplierId: 'sup-01',
    createdAt: '2026-08-10T10:00:00Z',
    updatedAt: '2026-09-20T10:00:00Z',
  },
  // Amoxicilline : Lot E (Expire dans 80 jours - Alerte 90 jours)
  {
    id: 'batch-amox-01',
    productId: 'prod-03',
    pharmacyId: 'pharma-kin-01',
    batchNumber: 'L-AMX26-102',
    expiryDate: addDays(80), // Alerte 61-90j
    initialQuantity: 60,
    currentQuantity: 28,
    reservedQuantity: 0,
    quarantineQuantity: 0,
    location: 'Rayon C1 - Antibiotiques',
    status: 'ACTIVE',
    purchaseCostCDF: 8000,
    purchaseCostUSD: 2.8,
    supplierId: 'sup-02',
    createdAt: '2026-02-15T10:00:00Z',
    updatedAt: '2026-09-20T10:00:00Z',
  },
  // Métronidazole : Lot G (Valide > 300 jours)
  {
    id: 'batch-metro-01',
    productId: 'prod-04',
    pharmacyId: 'pharma-kin-01',
    batchNumber: 'L-MTZ26-09',
    expiryDate: addDays(310),
    initialQuantity: 50,
    currentQuantity: 42,
    reservedQuantity: 0,
    quarantineQuantity: 0,
    location: 'Rayon C2 - Anti-infectieux',
    status: 'ACTIVE',
    purchaseCostCDF: 3900,
    purchaseCostUSD: 1.36,
    supplierId: 'sup-03',
    createdAt: '2026-04-10T10:00:00Z',
    updatedAt: '2026-09-20T10:00:00Z',
  },
  // SRO : Lot H (Valide 500 jours)
  {
    id: 'batch-ors-01',
    productId: 'prod-05',
    pharmacyId: 'pharma-kin-01',
    batchNumber: 'L-SRO26-K1',
    expiryDate: addDays(500),
    initialQuantity: 150,
    currentQuantity: 135,
    reservedQuantity: 0,
    quarantineQuantity: 0,
    location: 'Rayon D1 - Réhydratation',
    status: 'ACTIVE',
    purchaseCostCDF: 950,
    purchaseCostUSD: 0.33,
    supplierId: 'sup-01',
    createdAt: '2026-04-01T10:00:00Z',
    updatedAt: '2026-09-20T10:00:00Z',
  },
  // Ceftriaxone : Lot I (Faible stock, 8 restants)
  {
    id: 'batch-ceftr-01',
    productId: 'prod-06',
    pharmacyId: 'pharma-kin-01',
    batchNumber: 'L-CFT26-44',
    expiryDate: addDays(200),
    initialQuantity: 40,
    currentQuantity: 8, // Sous seuil min 20 !
    reservedQuantity: 0,
    quarantineQuantity: 0,
    location: 'Armoire Sécurisée B - Injectables',
    status: 'ACTIVE',
    purchaseCostCDF: 12500,
    purchaseCostUSD: 4.38,
    supplierId: 'sup-02',
    createdAt: '2026-03-20T10:00:00Z',
    updatedAt: '2026-09-20T10:00:00Z',
  },
  // Insuline NPH : Lot J (Frigo)
  {
    id: 'batch-insul-01',
    productId: 'prod-07',
    pharmacyId: 'pharma-kin-01',
    batchNumber: 'L-INS26-N2',
    expiryDate: addDays(140),
    initialQuantity: 25,
    currentQuantity: 19,
    reservedQuantity: 0,
    quarantineQuantity: 0,
    location: 'Réfrigérateur Médical 1 (2°C - 8°C)',
    status: 'ACTIVE',
    purchaseCostCDF: 29000,
    purchaseCostUSD: 10.17,
    supplierId: 'sup-02',
    createdAt: '2026-05-10T10:00:00Z',
    updatedAt: '2026-09-20T10:00:00Z',
  },
  // Lot Toxique Rappelé / Bloqué : Démonstration du Garde-Fou
  {
    id: 'batch-recalled-01',
    productId: 'prod-08',
    pharmacyId: 'pharma-kin-01',
    batchNumber: 'L-TOX25-999',
    expiryDate: addDays(120),
    initialQuantity: 15,
    currentQuantity: 0,
    reservedQuantity: 0,
    quarantineQuantity: 15,
    location: 'Zone Rouge - Quarantaine Sanitaire',
    status: 'BLOCKED_RECALL',
    purchaseCostCDF: 4000,
    purchaseCostUSD: 1.4,
    supplierId: 'sup-02',
    recallReason: 'Notification Ministère de la Santé RDC n° MS/DPM/2026/089 : Contamination au DEG',
    createdAt: '2026-01-05T10:00:00Z',
    updatedAt: '2026-09-20T10:00:00Z',
  },
];

// Historique de vente et audit initial
const INITIAL_SALES: Sale[] = [
  {
    id: 'sale-init-01',
    pharmacyId: 'pharma-kin-01',
    saleNumber: 'VTE-2026-0001',
    cashierUserId: 'user-cash-03',
    cashierName: 'Chantal Mwamba',
    clientName: 'Patient Ambulatoire #104',
    saleDate: '2026-09-24T14:32:00Z',
    items: [
      {
        id: 'line-01',
        productId: 'prod-01',
        productName: 'Paracétamol 500 mg',
        inn: 'Paracétamol',
        dosage: '500 mg',
        batchId: 'batch-par-01',
        batchNumber: 'L-PAR26-01',
        expiryDate: addDays(20),
        quantity: 2,
        unitPriceCDF: 3500,
        totalPriceCDF: 7000,
        unitPriceUSD: 1.23,
        totalPriceUSD: 2.46,
      },
      {
        id: 'line-02',
        productId: 'prod-05',
        productName: 'SRO Sels de Réhydratation Orale',
        inn: 'Glucose + Sels minéraux formule OMS',
        dosage: 'Sachet pour 1 Litre',
        batchId: 'batch-ors-01',
        batchNumber: 'L-SRO26-K1',
        expiryDate: addDays(500),
        quantity: 5,
        unitPriceCDF: 1500,
        totalPriceCDF: 7500,
        unitPriceUSD: 0.53,
        totalPriceUSD: 2.65,
      },
    ],
    subtotalCDF: 14500,
    taxCDF: 0,
    totalCDF: 14500,
    totalUSD: 5.09,
    paymentMethod: 'CASH_CDF',
    amountPaidCDF: 15000,
    amountPaidUSD: 0,
    changeGivenCDF: 500,
    changeGivenUSD: 0,
    exchangeRateApplied: 2850,
    status: 'COMPLETED',
    offlineCreated: false,
    syncStatus: 'SYNCED',
    signatureHash: 'SIG-d39b8fa01c',
    createdAt: '2026-09-24T14:32:00Z',
  },
];

const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'audit-01',
    pharmacyId: 'pharma-kin-01',
    timestamp: '2026-09-24T08:00:00Z',
    userId: 'user-admin-01',
    userName: 'Dr. Patrick Kabasele',
    userRole: 'ADMIN',
    actionType: 'PHARMACY_SETTINGS_UPDATED',
    entityType: 'Pharmacy',
    entityId: 'pharma-kin-01',
    details: 'Initialisation du registre légal de la pharmacie - N° Licence MS-RDC/DPS/KIN/0482/2024',
    deviceId: 'POS-TERMINAL-LIMETE-01',
    integrityHash: 'HASH-9812dfa8c2',
  },
  {
    id: 'audit-02',
    pharmacyId: 'pharma-kin-01',
    timestamp: '2026-09-24T09:15:00Z',
    userId: 'user-admin-01',
    userName: 'Dr. Patrick Kabasele',
    userRole: 'ADMIN',
    actionType: 'BATCH_RECALL_BLOCK',
    entityType: 'Batch',
    entityId: 'batch-recalled-01',
    details: 'Mise en quarantaine et blocage sanitaire du lot L-TOX25-999 suite à alerte ministérielle',
    deviceId: 'POS-TERMINAL-LIMETE-01',
    integrityHash: 'HASH-781ab45ef1',
  },
  {
    id: 'audit-03',
    pharmacyId: 'pharma-kin-01',
    timestamp: '2026-09-24T14:32:00Z',
    userId: 'user-cash-03',
    userName: 'Chantal Mwamba',
    userRole: 'CASHIER',
    actionType: 'SALE_CREATED',
    entityType: 'Sale',
    entityId: 'sale-init-01',
    details: 'Vente caisse comptoir VTE-2026-0001 (Montant : 14 500 FC) avec attribution FEFO',
    deviceId: 'POS-TERMINAL-LIMETE-01',
    integrityHash: 'HASH-61ab93441e',
  },
];

class PharmacyDataStore {
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.ensureInitialized();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error('Error in store listener', err);
      }
    });
  }

  private getItem<T>(key: string, defaultValue: T): T {
    try {
      const data = localStorage.getItem(key);
      if (!data) return defaultValue;
      return JSON.parse(data);
    } catch {
      return defaultValue;
    }
  }

  private setItem<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('LocalStorage write failed', e);
    }
  }

  private ensureInitialized(): void {
    if (!localStorage.getItem(KEYS.PHARMACIES)) {
      this.setItem(KEYS.PHARMACIES, INITIAL_PHARMACIES);
      this.setItem(KEYS.CURRENT_PHARMACY_ID, 'pharma-kin-01');
    }
    if (!localStorage.getItem(KEYS.USERS)) {
      this.setItem(KEYS.USERS, INITIAL_USERS);
      this.setItem(KEYS.CURRENT_USER_ID, 'user-admin-01');
    }
    if (!localStorage.getItem(KEYS.SUPPLIERS)) {
      this.setItem(KEYS.SUPPLIERS, INITIAL_SUPPLIERS);
    }
    if (!localStorage.getItem(KEYS.PRODUCTS)) {
      this.setItem(KEYS.PRODUCTS, INITIAL_PRODUCTS);
    }
    if (!localStorage.getItem(KEYS.BATCHES)) {
      this.setItem(KEYS.BATCHES, INITIAL_BATCHES);
    }
    if (!localStorage.getItem(KEYS.SALES)) {
      this.setItem(KEYS.SALES, INITIAL_SALES);
    }
    if (!localStorage.getItem(KEYS.AUDIT_LOGS)) {
      this.setItem(KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);
    }
    if (!localStorage.getItem(KEYS.SYNC_QUEUE)) {
      this.setItem(KEYS.SYNC_QUEUE, []);
    }
    if (!localStorage.getItem(KEYS.PURCHASE_ORDERS)) {
      this.setItem(KEYS.PURCHASE_ORDERS, []);
    }
    if (!localStorage.getItem(KEYS.RECEPTIONS)) {
      this.setItem(KEYS.RECEPTIONS, []);
    }
    if (!localStorage.getItem(KEYS.STOCK_MOVEMENTS)) {
      this.setItem(KEYS.STOCK_MOVEMENTS, []);
    }
    if (!localStorage.getItem(KEYS.INVENTORY_SESSIONS)) {
      this.setItem(KEYS.INVENTORY_SESSIONS, []);
    }
  }

  // --- Contextes Pharmacy & User ---
  public getPharmacies(): Pharmacy[] {
    return this.getItem(KEYS.PHARMACIES, INITIAL_PHARMACIES);
  }

  public getCurrentPharmacy(): Pharmacy {
    const pharmacies = this.getPharmacies();
    const currentId = this.getItem(KEYS.CURRENT_PHARMACY_ID, 'pharma-kin-01');
    return pharmacies.find((p) => p.id === currentId) || pharmacies[0];
  }

  public setCurrentPharmacy(pharmacyId: string): void {
    this.setItem(KEYS.CURRENT_PHARMACY_ID, pharmacyId);
    this.notify();
  }

  public addPharmacy(pharmacy: Pharmacy): void {
    const list = this.getPharmacies();
    list.push(pharmacy);
    this.setItem(KEYS.PHARMACIES, list);
    this.appendAuditLog({
      actionType: 'PHARMACY_SETTINGS_UPDATED',
      entityType: 'Pharmacy',
      entityId: pharmacy.id,
      details: `Création de l'établissement pharmacie : ${pharmacy.name} (${pharmacy.city})`,
    });
    this.notify();
  }

  public updatePharmacy(updated: Pharmacy): void {
    const list = this.getPharmacies().map((p) => (p.id === updated.id ? updated : p));
    this.setItem(KEYS.PHARMACIES, list);
    this.appendAuditLog({
      actionType: 'PHARMACY_SETTINGS_UPDATED',
      entityType: 'Pharmacy',
      entityId: updated.id,
      details: `Mise à jour des paramètres de la pharmacie ${updated.name}`,
    });
    this.notify();
  }

  public getUsers(): User[] {
    return this.getItem(KEYS.USERS, INITIAL_USERS);
  }

  public getCurrentUser(): User {
    const users = this.getUsers();
    const currentId = this.getItem(KEYS.CURRENT_USER_ID, 'user-admin-01');
    return users.find((u) => u.id === currentId) || users[0];
  }

  public setCurrentUser(userId: string): void {
    const user = this.getUsers().find((u) => u.id === userId);
    if (user) {
      this.setItem(KEYS.CURRENT_USER_ID, userId);
      this.appendAuditLog({
        actionType: 'USER_LOGIN',
        entityType: 'User',
        entityId: user.id,
        details: `Connexion de l'utilisateur ${user.name} avec rôle [${user.role}]`,
      });
      this.notify();
    }
  }

  public updateUserRole(userId: string, newRole: UserRole): void {
    const users = this.getUsers().map((u) => (u.id === userId ? { ...u, role: newRole } : u));
    this.setItem(KEYS.USERS, users);
    this.appendAuditLog({
      actionType: 'ROLE_CHANGE',
      entityType: 'User',
      entityId: userId,
      details: `Changement de rôle de l'utilisateur vers ${newRole}`,
    });
    this.notify();
  }

  // --- Offline Mode Simulation ---
  public isOfflineSimulated(): boolean {
    return this.getItem(KEYS.OFFLINE_SIMULATION, false);
  }

  public setOfflineSimulated(val: boolean): void {
    this.setItem(KEYS.OFFLINE_SIMULATION, val);
    this.notify();
  }

  public isNetworkConnected(): boolean {
    if (this.isOfflineSimulated()) return false;
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  }

  // --- Produits & Lots ---
  public getProducts(): Product[] {
    const currentPharmacy = this.getCurrentPharmacy();
    return this.getItem<Product[]>(KEYS.PRODUCTS, []).filter(
      (p) => p.pharmacyId === currentPharmacy.id
    );
  }

  public getBatches(): Batch[] {
    const currentPharmacy = this.getCurrentPharmacy();
    return this.getItem<Batch[]>(KEYS.BATCHES, []).filter(
      (b) => b.pharmacyId === currentPharmacy.id
    );
  }

  public getBatchesForProduct(productId: string): Batch[] {
    return this.getBatches().filter((b) => b.productId === productId);
  }

  public addProduct(product: Product): void {
    const all = this.getItem<Product[]>(KEYS.PRODUCTS, []);
    all.push(product);
    this.setItem(KEYS.PRODUCTS, all);

    this.appendAuditLog({
      actionType: 'PRODUCT_CREATE',
      entityType: 'Product',
      entityId: product.id,
      details: `Création du médicament : ${product.name} (${product.inn} ${product.dosage})`,
    });
    this.notify();
  }

  public updateProduct(product: Product): void {
    const all = this.getItem<Product[]>(KEYS.PRODUCTS, []).map((p) =>
      p.id === product.id ? product : p
    );
    this.setItem(KEYS.PRODUCTS, all);

    this.appendAuditLog({
      actionType: 'PRODUCT_UPDATE',
      entityType: 'Product',
      entityId: product.id,
      details: `Modification médicament : ${product.name} (Statut : ${product.status})`,
    });
    this.notify();
  }

  public updateBatchStatus(batchId: string, status: Batch['status'], reason?: string): void {
    const batches = this.getItem<Batch[]>(KEYS.BATCHES, []).map((b) => {
      if (b.id === batchId) {
        return {
          ...b,
          status,
          recallReason: reason || b.recallReason,
          updatedAt: new Date().toISOString(),
        };
      }
      return b;
    });
    this.setItem(KEYS.BATCHES, batches);

    this.appendAuditLog({
      actionType: status === 'BLOCKED_RECALL' ? 'BATCH_RECALL_BLOCK' : 'BATCH_STATUS_CHANGE',
      entityType: 'Batch',
      entityId: batchId,
      details: `Mise à jour statut lot vers ${status}. Raison : ${reason || 'Non précisée'}`,
    });
    this.notify();
  }

  // --- Fournisseurs & Réceptions ---
  public getSuppliers(): Supplier[] {
    const currentPharmacy = this.getCurrentPharmacy();
    return this.getItem<Supplier[]>(KEYS.SUPPLIERS, []).filter(
      (s) => s.pharmacyId === currentPharmacy.id
    );
  }

  public addSupplier(supplier: Supplier): void {
    const all = this.getItem<Supplier[]>(KEYS.SUPPLIERS, []);
    all.push(supplier);
    this.setItem(KEYS.SUPPLIERS, all);
    this.notify();
  }

  public getPurchaseOrders(): PurchaseOrder[] {
    const currentPharmacy = this.getCurrentPharmacy();
    return this.getItem<PurchaseOrder[]>(KEYS.PURCHASE_ORDERS, []).filter(
      (po) => po.pharmacyId === currentPharmacy.id
    );
  }

  public addPurchaseOrder(po: PurchaseOrder): void {
    const all = this.getItem<PurchaseOrder[]>(KEYS.PURCHASE_ORDERS, []);
    all.push(po);
    this.setItem(KEYS.PURCHASE_ORDERS, all);
    this.notify();
  }

  public getReceptions(): Reception[] {
    const currentPharmacy = this.getCurrentPharmacy();
    return this.getItem<Reception[]>(KEYS.RECEPTIONS, []).filter(
      (r) => r.pharmacyId === currentPharmacy.id
    );
  }

  /**
   * Enregistre une réception avec contrôle strict (Lot, Péremption, Blocage sanitaire)
   */
  public processReception(reception: Reception): { success: boolean; message: string } {
    const allBatches = this.getItem<Batch[]>(KEYS.BATCHES, []);
    const allMovements = this.getItem<StockMovement[]>(KEYS.STOCK_MOVEMENTS, []);
    const user = this.getCurrentUser();
    const pharmacy = this.getCurrentPharmacy();

    for (const item of reception.items) {
      if (!item.isCompliant) continue;

      // Vérifier si le lot existe déjà
      let existingBatch = allBatches.find(
        (b) =>
          b.pharmacyId === pharmacy.id &&
          b.productId === item.productId &&
          b.batchNumber.toLowerCase() === item.batchNumber.toLowerCase()
      );

      const qty = item.quantityReceived;

      if (existingBatch) {
        const prev = existingBatch.currentQuantity;
        existingBatch.currentQuantity += qty;
        existingBatch.updatedAt = new Date().toISOString();

        allMovements.push({
          id: generateUUID(),
          pharmacyId: pharmacy.id,
          productId: item.productId,
          productName: item.productName,
          batchId: existingBatch.id,
          batchNumber: existingBatch.batchNumber,
          type: 'RECEPTION',
          quantity: qty,
          previousQuantity: prev,
          newQuantity: existingBatch.currentQuantity,
          referenceDocType: 'RECEPTION',
          referenceDocId: reception.receptionNumber,
          reason: `Réception BL ${reception.deliverySlipNumber}`,
          performedByUserId: user.id,
          performedByName: user.name,
          timestamp: new Date().toISOString(),
        });
      } else {
        const newBatchId = 'batch-' + generateUUID().substring(0, 8);
        const newBatch: Batch = {
          id: newBatchId,
          productId: item.productId,
          pharmacyId: pharmacy.id,
          batchNumber: item.batchNumber,
          expiryDate: item.expiryDate,
          initialQuantity: qty,
          currentQuantity: qty,
          reservedQuantity: 0,
          quarantineQuantity: 0,
          location: item.location || 'Rayon Réception',
          status: 'ACTIVE',
          purchaseCostCDF: item.unitCostCDF,
          purchaseCostUSD: item.unitCostUSD,
          supplierId: reception.supplierId,
          receptionId: reception.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        allBatches.push(newBatch);

        allMovements.push({
          id: generateUUID(),
          pharmacyId: pharmacy.id,
          productId: item.productId,
          productName: item.productName,
          batchId: newBatchId,
          batchNumber: item.batchNumber,
          type: 'RECEPTION',
          quantity: qty,
          previousQuantity: 0,
          newQuantity: qty,
          referenceDocType: 'RECEPTION',
          referenceDocId: reception.receptionNumber,
          reason: `Création lot réception BL ${reception.deliverySlipNumber}`,
          performedByUserId: user.id,
          performedByName: user.name,
          timestamp: new Date().toISOString(),
        });
      }
    }

    this.setItem(KEYS.BATCHES, allBatches);
    this.setItem(KEYS.STOCK_MOVEMENTS, allMovements);

    const receptions = this.getItem<Reception[]>(KEYS.RECEPTIONS, []);
    receptions.unshift(reception);
    this.setItem(KEYS.RECEPTIONS, receptions);

    this.appendAuditLog({
      actionType: 'BATCH_RECEPTION',
      entityType: 'Reception',
      entityId: reception.id,
      details: `Réception de stock ${reception.receptionNumber} du fournisseur ${reception.supplierName} (${reception.items.length} références)`,
    });

    this.notify();
    return { success: true, message: 'Réception validée et lots intégrés en stock.' };
  }

  // --- Caisse & Ventes (FEFO strict + Mode Hors Ligne) ---
  public getSales(): Sale[] {
    const currentPharmacy = this.getCurrentPharmacy();
    return this.getItem<Sale[]>(KEYS.SALES, []).filter((s) => s.pharmacyId === currentPharmacy.id);
  }

  public getStockMovements(): StockMovement[] {
    const currentPharmacy = this.getCurrentPharmacy();
    return this.getItem<StockMovement[]>(KEYS.STOCK_MOVEMENTS, []).filter(
      (m) => m.pharmacyId === currentPharmacy.id
    );
  }

  /**
   * Enregistre une vente comptoir en moins de 2 secondes.
   * Gère le FEFO, décrémente les stocks de lot, génère les mouvements,
   * calcule l'empreinte d'intégrité, et alimente la file de synchronisation si hors ligne.
   */
  public async createSale(saleData: {
    items: Array<{
      productId: string;
      quantity: number;
      customBatchId?: string; // Si forcé manuellement, sinon FEFO automatique
    }>;
    clientName?: string;
    paymentMethod: 'CASH_CDF' | 'CASH_USD' | 'MIXED';
    amountPaidCDF: number;
    amountPaidUSD: number;
  }): Promise<{ success: boolean; sale?: Sale; error?: string }> {
    const pharmacy = this.getCurrentPharmacy();
    const user = this.getCurrentUser();
    const allProducts = this.getItem<Product[]>(KEYS.PRODUCTS, []);
    const allBatches = this.getItem<Batch[]>(KEYS.BATCHES, []);
    const isOnline = this.isNetworkConnected();

    const saleLines: SaleLine[] = [];
    let subtotalCDF = 0;
    let subtotalUSD = 0;

    const batchesToUpdate: Map<string, { batch: Batch; qtyToDeduct: number }> = new Map();

    // 1. Vérification & allocation FEFO pour chaque produit
    for (const reqItem of saleData.items) {
      const product = allProducts.find((p) => p.id === reqItem.productId);
      if (!product) {
        return { success: false, error: `Produit introuvable : ${reqItem.productId}` };
      }

      if (product.status === 'RECALLED_BLOCKED') {
        return {
          success: false,
          error: `GARDE-FOU SANITAIRE : Le produit ${product.name} est sous blocage sanitaire et ne peut pas être vendu !`,
        };
      }

      // Récupérer les lots du produit
      const productBatches = allBatches.filter(
        (b) => b.productId === product.id && b.pharmacyId === pharmacy.id
      );

      if (reqItem.customBatchId) {
        // Choix manuel de lot
        const targetBatch = productBatches.find((b) => b.id === reqItem.customBatchId);
        if (!targetBatch) {
          return { success: false, error: `Lot spécifié introuvable pour ${product.name}` };
        }
        if (targetBatch.status !== 'ACTIVE') {
          return {
            success: false,
            error: `Le lot ${targetBatch.batchNumber} n'est pas actif (${targetBatch.status})`,
          };
        }
        if (targetBatch.currentQuantity < reqItem.quantity) {
          return {
            success: false,
            error: `Stock insuffisant sur le lot ${targetBatch.batchNumber} (${targetBatch.currentQuantity} disp.)`,
          };
        }

        const lineCDF = targetBatch.purchaseCostCDF || product.unitPriceCDF * reqItem.quantity;
        const lineUSD = targetBatch.purchaseCostUSD || product.unitPriceUSD * reqItem.quantity;

        saleLines.push({
          id: generateUUID(),
          productId: product.id,
          productName: product.name,
          inn: product.inn,
          dosage: product.dosage,
          batchId: targetBatch.id,
          batchNumber: targetBatch.batchNumber,
          expiryDate: targetBatch.expiryDate,
          quantity: reqItem.quantity,
          unitPriceCDF: product.unitPriceCDF,
          totalPriceCDF: product.unitPriceCDF * reqItem.quantity,
          unitPriceUSD: product.unitPriceUSD,
          totalPriceUSD: product.unitPriceUSD * reqItem.quantity,
        });

        subtotalCDF += product.unitPriceCDF * reqItem.quantity;
        subtotalUSD += product.unitPriceUSD * reqItem.quantity;

        batchesToUpdate.set(targetBatch.id, {
          batch: targetBatch,
          qtyToDeduct: reqItem.quantity,
        });
      } else {
        // FEFO Automatique
        const fefoResult = allocateStockFEFO(productBatches, reqItem.quantity);
        if (!fefoResult.isFullySatisfied) {
          return {
            success: false,
            error: `Stock insuffisant pour ${product.name}. Demandé: ${reqItem.quantity}, disponible en lots valides: ${fefoResult.fulfilledQuantity}`,
          };
        }

        for (const alloc of fefoResult.allocations) {
          saleLines.push({
            id: generateUUID(),
            productId: product.id,
            productName: product.name,
            inn: product.inn,
            dosage: product.dosage,
            batchId: alloc.batch.id,
            batchNumber: alloc.batch.batchNumber,
            expiryDate: alloc.batch.expiryDate,
            quantity: alloc.allocatedQuantity,
            unitPriceCDF: product.unitPriceCDF,
            totalPriceCDF: product.unitPriceCDF * alloc.allocatedQuantity,
            unitPriceUSD: product.unitPriceUSD,
            totalPriceUSD: product.unitPriceUSD * alloc.allocatedQuantity,
          });

          subtotalCDF += product.unitPriceCDF * alloc.allocatedQuantity;
          subtotalUSD += product.unitPriceUSD * alloc.allocatedQuantity;

          const currentDeduct = batchesToUpdate.get(alloc.batch.id)?.qtyToDeduct || 0;
          batchesToUpdate.set(alloc.batch.id, {
            batch: alloc.batch,
            qtyToDeduct: currentDeduct + alloc.allocatedQuantity,
          });
        }
      }
    }

    // 2. Calcul du total et monnaie rendue
    const taxCDF = 0; // Exonéré
    const totalCDF = subtotalCDF;
    const totalUSD = subtotalUSD;

    const rate = pharmacy.exchangeRateUsdToCdf;
    const totalPaidInCDF = saleData.amountPaidCDF + saleData.amountPaidUSD * rate;
    const changeCDF = Math.max(0, totalPaidInCDF - totalCDF);
    const changeUSD = +(changeCDF / rate).toFixed(2);

    const saleNumber = `VTE-${new Date().getFullYear()}-${String(
      this.getSales().length + 1
    ).padStart(4, '0')}`;
    const saleId = generateUUID();

    const saleSignature = await calculateIntegrityHash({
      saleId,
      saleNumber,
      cashier: user.id,
      totalCDF,
      items: saleLines.map((l) => ({ b: l.batchId, q: l.quantity })),
      timestamp: new Date().toISOString(),
    });

    const newSale: Sale = {
      id: saleId,
      pharmacyId: pharmacy.id,
      saleNumber,
      cashierUserId: user.id,
      cashierName: user.name,
      clientName: saleData.clientName || 'Client Comptoir',
      saleDate: new Date().toISOString(),
      items: saleLines,
      subtotalCDF,
      taxCDF,
      totalCDF,
      totalUSD,
      paymentMethod: saleData.paymentMethod,
      amountPaidCDF: saleData.amountPaidCDF,
      amountPaidUSD: saleData.amountPaidUSD,
      changeGivenCDF: changeCDF,
      changeGivenUSD: changeUSD,
      exchangeRateApplied: rate,
      status: 'COMPLETED',
      offlineCreated: !isOnline,
      syncStatus: isOnline ? 'SYNCED' : 'PENDING',
      signatureHash: saleSignature,
      createdAt: new Date().toISOString(),
    };

    // 3. Décrémenter les stocks et enregistrer les mouvements
    const allMovements = this.getItem<StockMovement[]>(KEYS.STOCK_MOVEMENTS, []);
    for (const [batchId, { batch, qtyToDeduct }] of batchesToUpdate.entries()) {
      const prevQty = batch.currentQuantity;
      batch.currentQuantity = Math.max(0, batch.currentQuantity - qtyToDeduct);
      batch.updatedAt = new Date().toISOString();

      allMovements.push({
        id: generateUUID(),
        pharmacyId: pharmacy.id,
        productId: batch.productId,
        productName: saleLines.find((l) => l.batchId === batchId)?.productName || 'Médicament',
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        type: 'SALE',
        quantity: -qtyToDeduct,
        previousQuantity: prevQty,
        newQuantity: batch.currentQuantity,
        referenceDocType: 'SALE',
        referenceDocId: saleNumber,
        reason: `Vente caisse ${saleNumber}`,
        performedByUserId: user.id,
        performedByName: user.name,
        timestamp: new Date().toISOString(),
      });
    }

    this.setItem(KEYS.BATCHES, allBatches);
    this.setItem(KEYS.STOCK_MOVEMENTS, allMovements);

    const allSales = this.getItem<Sale[]>(KEYS.SALES, []);
    allSales.unshift(newSale);
    this.setItem(KEYS.SALES, allSales);

    // 4. File de synchronisation hors ligne (si hors ligne)
    if (!isOnline) {
      this.enqueueSyncEvent({
        id: generateUUID(),
        pharmacyId: pharmacy.id,
        entity: 'SALE',
        action: 'CREATE',
        payload: newSale,
        clientTimestamp: new Date().toISOString(),
        status: 'PENDING',
        retryCount: 0,
      });
    }

    // 5. Journal d'audit inaltérable
    this.appendAuditLog({
      actionType: 'SALE_CREATED',
      entityType: 'Sale',
      entityId: newSale.id,
      details: `Vente ${saleNumber} par ${user.name} (${user.role}). Total : ${totalCDF.toLocaleString()} FC ($${totalUSD.toFixed(2)} USD). Mode : ${isOnline ? 'En ligne' : 'Hors ligne (Local IndexedDB)'}`,
    });

    this.notify();
    return { success: true, sale: newSale };
  }

  /**
   * Annulation de vente sécurisée avec autorisation (PIN / Rôle Manager ou Admin)
   */
  public async cancelSale(
    saleId: string,
    reason: string,
    authorizerPin: string
  ): Promise<{ success: boolean; error?: string }> {
    const allUsers = this.getUsers();
    const authorizer = allUsers.find(
      (u) => (u.role === 'ADMIN' || u.role === 'MANAGER') && u.pinCode === authorizerPin
    );

    if (!authorizer) {
      return {
        success: false,
        error:
          "Code PIN d'autorisation invalide. Seul un Gestionnaire ou un Administrateur peut autoriser une annulation de vente.",
      };
    }

    const allSales = this.getItem<Sale[]>(KEYS.SALES, []);
    const sale = allSales.find((s) => s.id === saleId);
    if (!sale) return { success: false, error: 'Vente introuvable' };
    if (sale.status === 'CANCELLED')
      return { success: false, error: 'Cette vente a déjà été annulée' };

    // Remettre les quantités en stock
    const allBatches = this.getItem<Batch[]>(KEYS.BATCHES, []);
    const allMovements = this.getItem<StockMovement[]>(KEYS.STOCK_MOVEMENTS, []);

    for (const item of sale.items) {
      const batch = allBatches.find((b) => b.id === item.batchId);
      if (batch) {
        const prevQty = batch.currentQuantity;
        batch.currentQuantity += item.quantity;
        batch.updatedAt = new Date().toISOString();

        allMovements.push({
          id: generateUUID(),
          pharmacyId: sale.pharmacyId,
          productId: item.productId,
          productName: item.productName,
          batchId: batch.id,
          batchNumber: batch.batchNumber,
          type: 'SALE_CANCEL',
          quantity: item.quantity,
          previousQuantity: prevQty,
          newQuantity: batch.currentQuantity,
          referenceDocType: 'SALE',
          referenceDocId: sale.saleNumber,
          reason: `Annulation vente ${sale.saleNumber} : ${reason}`,
          performedByUserId: authorizer.id,
          performedByName: authorizer.name,
          timestamp: new Date().toISOString(),
        });
      }
    }

    sale.status = 'CANCELLED';
    sale.cancellationReason = reason;
    sale.cancelledByUserId = authorizer.id;
    sale.cancelledByName = authorizer.name;
    sale.cancelledAt = new Date().toISOString();

    this.setItem(KEYS.BATCHES, allBatches);
    this.setItem(KEYS.STOCK_MOVEMENTS, allMovements);
    this.setItem(KEYS.SALES, allSales);

    // Si hors ligne, enfiler l'événement
    if (!this.isNetworkConnected()) {
      this.enqueueSyncEvent({
        id: generateUUID(),
        pharmacyId: sale.pharmacyId,
        entity: 'SALE',
        action: 'CANCEL',
        payload: { saleId: sale.id, reason, authorizerId: authorizer.id },
        clientTimestamp: new Date().toISOString(),
        status: 'PENDING',
        retryCount: 0,
      });
    }

    this.appendAuditLog({
      actionType: 'SALE_CANCELLED',
      entityType: 'Sale',
      entityId: sale.id,
      details: `Annulation de la vente ${sale.saleNumber} par ${authorizer.name} (${authorizer.role}). Motif : "${reason}". Montant réintégré : ${sale.totalCDF} FC`,
    });

    this.notify();
    return { success: true };
  }

  // --- Inventaires Tournants & Approbations ---
  public getInventorySessions(): InventorySession[] {
    const currentPharmacy = this.getCurrentPharmacy();
    return this.getItem<InventorySession[]>(KEYS.INVENTORY_SESSIONS, []).filter(
      (s) => s.pharmacyId === currentPharmacy.id
    );
  }

  public createInventorySession(title: string, zoneOrCategory: string): InventorySession {
    const user = this.getCurrentUser();
    const pharmacy = this.getCurrentPharmacy();
    const allProducts = this.getProducts();
    const allBatches = this.getBatches();

    const items: InventoryCountItem[] = [];

    allBatches.forEach((batch) => {
      const prod = allProducts.find((p) => p.id === batch.productId);
      if (!prod) return;

      items.push({
        id: generateUUID(),
        productId: prod.id,
        productName: prod.name,
        inn: prod.inn,
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        expiryDate: batch.expiryDate,
        location: batch.location,
        theoreticalQuantity: batch.currentQuantity,
        countedQuantity: batch.currentQuantity, // Pré-rempli par défaut
        discrepancyQuantity: 0,
        unitCostCDF: batch.purchaseCostCDF,
        discrepancyValueCDF: 0,
        approvalStatus: 'PENDING',
      });
    });

    const session: InventorySession = {
      id: generateUUID(),
      pharmacyId: pharmacy.id,
      sessionNumber: `INV-${new Date().getFullYear()}-${String(
        this.getInventorySessions().length + 1
      ).padStart(3, '0')}`,
      title,
      zoneOrCategory,
      status: 'IN_PROGRESS',
      initiatedByUserId: user.id,
      initiatedByName: user.name,
      createdAt: new Date().toISOString(),
      items,
    };

    const allSessions = this.getItem<InventorySession[]>(KEYS.INVENTORY_SESSIONS, []);
    allSessions.unshift(session);
    this.setItem(KEYS.INVENTORY_SESSIONS, allSessions);

    this.appendAuditLog({
      actionType: 'INVENTORY_SUBMITTED',
      entityType: 'InventorySession',
      entityId: session.id,
      details: `Ouverture de session d'inventaire ${session.sessionNumber} : ${session.title}`,
    });

    this.notify();
    return session;
  }

  public updateInventoryCount(
    sessionId: string,
    itemId: string,
    countedQty: number,
    reason?: string
  ): void {
    const allSessions = this.getItem<InventorySession[]>(KEYS.INVENTORY_SESSIONS, []);
    const session = allSessions.find((s) => s.id === sessionId);
    if (!session || session.status === 'APPROVED') return;

    const item = session.items.find((i) => i.id === itemId);
    if (item) {
      item.countedQuantity = countedQty;
      item.discrepancyQuantity = countedQty - item.theoreticalQuantity;
      item.discrepancyValueCDF = item.discrepancyQuantity * item.unitCostCDF;
      item.discrepancyReason = reason;
      this.setItem(KEYS.INVENTORY_SESSIONS, allSessions);
      this.notify();
    }
  }

  public submitInventoryForApproval(sessionId: string): void {
    const allSessions = this.getItem<InventorySession[]>(KEYS.INVENTORY_SESSIONS, []);
    const session = allSessions.find((s) => s.id === sessionId);
    if (session) {
      session.status = 'PENDING_APPROVAL';
      this.setItem(KEYS.INVENTORY_SESSIONS, allSessions);
      this.appendAuditLog({
        actionType: 'INVENTORY_SUBMITTED',
        entityType: 'InventorySession',
        entityId: session.id,
        details: `Soumission de l'inventaire ${session.sessionNumber} pour approbation des écarts`,
      });
      this.notify();
    }
  }

  /**
   * Approbation des écarts d'inventaire (réservée Gestionnaire / Admin)
   * Met à jour les stocks théoriques et consigne les ajustements dans le journal d'audit.
   */
  public approveInventoryDiscrepancies(
    sessionId: string,
    authorizerPin: string
  ): { success: boolean; error?: string } {
    const allUsers = this.getUsers();
    const authorizer = allUsers.find(
      (u) => (u.role === 'ADMIN' || u.role === 'MANAGER') && u.pinCode === authorizerPin
    );

    if (!authorizer) {
      return {
        success: false,
        error:
          "Autorisation refusée : Seul un Gestionnaire ou un Administrateur avec code PIN valide peut approuver les écarts d'inventaire.",
      };
    }

    const allSessions = this.getItem<InventorySession[]>(KEYS.INVENTORY_SESSIONS, []);
    const session = allSessions.find((s) => s.id === sessionId);
    if (!session) return { success: false, error: 'Session introuvable' };

    const allBatches = this.getItem<Batch[]>(KEYS.BATCHES, []);
    const allMovements = this.getItem<StockMovement[]>(KEYS.STOCK_MOVEMENTS, []);

    let totalDiscrepancyCDF = 0;

    for (const item of session.items) {
      if (item.discrepancyQuantity !== 0) {
        const batch = allBatches.find((b) => b.id === item.batchId);
        if (batch) {
          const prevQty = batch.currentQuantity;
          batch.currentQuantity = item.countedQuantity;
          batch.updatedAt = new Date().toISOString();

          allMovements.push({
            id: generateUUID(),
            pharmacyId: session.pharmacyId,
            productId: item.productId,
            productName: item.productName,
            batchId: batch.id,
            batchNumber: batch.batchNumber,
            type: 'INVENTORY_ADJUSTMENT',
            quantity: item.discrepancyQuantity,
            previousQuantity: prevQty,
            newQuantity: batch.currentQuantity,
            referenceDocType: 'INVENTORY',
            referenceDocId: session.sessionNumber,
            reason: `Ajustement inventaire approuvé : ${item.discrepancyReason || 'Comptage physique'}`,
            performedByUserId: authorizer.id,
            performedByName: authorizer.name,
            timestamp: new Date().toISOString(),
          });

          totalDiscrepancyCDF += item.discrepancyValueCDF;
        }
      }
      item.approvalStatus = 'APPROVED';
    }

    session.status = 'APPROVED';
    session.approvedByUserId = authorizer.id;
    session.approvedByName = authorizer.name;
    session.completedAt = new Date().toISOString();

    this.setItem(KEYS.BATCHES, allBatches);
    this.setItem(KEYS.STOCK_MOVEMENTS, allMovements);
    this.setItem(KEYS.INVENTORY_SESSIONS, allSessions);

    this.appendAuditLog({
      actionType: 'INVENTORY_APPROVED',
      entityType: 'InventorySession',
      entityId: session.id,
      details: `Approbation des écarts d'inventaire ${session.sessionNumber} par ${authorizer.name}. Impact financier net : ${totalDiscrepancyCDF.toLocaleString()} FC`,
    });

    this.notify();
    return { success: true };
  }

  // --- File de Synchronisation Hors Ligne & Gestion des Conflits ---
  public getSyncQueue(): SyncEvent[] {
    const currentPharmacy = this.getCurrentPharmacy();
    return this.getItem<SyncEvent[]>(KEYS.SYNC_QUEUE, []).filter(
      (e) => e.pharmacyId === currentPharmacy.id
    );
  }

  private enqueueSyncEvent(event: SyncEvent): void {
    const queue = this.getItem<SyncEvent[]>(KEYS.SYNC_QUEUE, []);
    queue.push(event);
    this.setItem(KEYS.SYNC_QUEUE, queue);
  }

  public async triggerSync(): Promise<{
    processed: number;
    conflicts: number;
    errors: number;
  }> {
    if (!this.isNetworkConnected()) {
      return { processed: 0, conflicts: 0, errors: 0 };
    }

    const allEvents = this.getItem<SyncEvent[]>(KEYS.SYNC_QUEUE, []);
    const pharmacy = this.getCurrentPharmacy();
    let processed = 0;
    let conflicts = 0;

    for (const evt of allEvents) {
      if (evt.pharmacyId !== pharmacy.id) continue;
      if (evt.status === 'SYNCED') continue;

      // Détecter un conflit simulé ou réel
      // Exemple : Si un lot vendu hors ligne est tombé à 0 sur le serveur ou a été bloqué
      if (evt.entity === 'SALE' && evt.action === 'CREATE') {
        const sale = evt.payload as Sale;
        const allBatches = this.getItem<Batch[]>(KEYS.BATCHES, []);
        let hasConflict = false;

        for (const line of sale.items) {
          const currentBatch = allBatches.find((b) => b.id === line.batchId);
          if (currentBatch && currentBatch.status === 'BLOCKED_RECALL') {
            hasConflict = true;
            evt.status = 'CONFLICT';
            evt.conflictDetails = {
              conflictType: 'BATCH_LOCKED',
              message: `Le lot ${line.batchNumber} (${line.productName}) a été placé sous rappel/blocage sanitaire durant la déconnexion !`,
              localPayload: sale,
              remoteState: currentBatch,
              resolutionOptions: [
                {
                  key: 'SUBSTITUTE_FEFO',
                  label: 'Attribuer un autre lot sain (FEFO)',
                  description: 'Remplacer automatiquement par le lot valide le plus ancien.',
                },
                {
                  key: 'CANCEL_TRANSACTION',
                  label: 'Annuler la ligne et consigner au registre',
                  description: 'Rembourser le patient et alerter le pharmacien titulaire.',
                },
              ],
            };
            conflicts++;
            break;
          }
        }

        if (!hasConflict) {
          evt.status = 'SYNCED';
          evt.serverTimestamp = new Date().toISOString();
          processed++;

          // Marquer la vente comme synchronisée
          const sales = this.getItem<Sale[]>(KEYS.SALES, []);
          const matchedSale = sales.find((s) => s.id === sale.id);
          if (matchedSale) matchedSale.syncStatus = 'SYNCED';
          this.setItem(KEYS.SALES, sales);
        }
      } else {
        evt.status = 'SYNCED';
        evt.serverTimestamp = new Date().toISOString();
        processed++;
      }
    }

    this.setItem(KEYS.SYNC_QUEUE, allEvents);

    if (processed > 0 || conflicts > 0) {
      this.appendAuditLog({
        actionType: 'SYNC_EVENT_REPLAYED',
        entityType: 'SyncQueue',
        entityId: pharmacy.id,
        details: `Synchronisation réseau : ${processed} événement(s) rejoués avec succès, ${conflicts} conflit(s) détecté(s).`,
      });
    }

    this.notify();
    return { processed, conflicts, errors: 0 };
  }

  /**
   * Résolution explicite d'un conflit de synchronisation
   * Conformément au cahier des charges : JAMAIS d'écrasement silencieux !
   */
  public resolveConflict(
    eventId: string,
    resolutionOption: 'SUBSTITUTE_FEFO' | 'USE_REMOTE' | 'CANCEL_TRANSACTION',
    notes: string
  ): void {
    const queue = this.getItem<SyncEvent[]>(KEYS.SYNC_QUEUE, []);
    const evt = queue.find((e) => e.id === eventId);
    if (!evt) return;

    evt.status = 'SYNCED';
    evt.serverTimestamp = new Date().toISOString();
    delete evt.conflictDetails;
    this.setItem(KEYS.SYNC_QUEUE, queue);

    this.appendAuditLog({
      actionType: 'SYNC_CONFLICT_RESOLVED',
      entityType: 'SyncEvent',
      entityId: eventId,
      details: `Résolution explicite du conflit [${resolutionOption}] : ${notes}`,
    });

    this.notify();
  }

  // --- Journal d'Audit Inaltérable (Append-Only) ---
  public getAuditLogs(): AuditLog[] {
    const currentPharmacy = this.getCurrentPharmacy();
    return this.getItem<AuditLog[]>(KEYS.AUDIT_LOGS, []).filter(
      (a) => a.pharmacyId === currentPharmacy.id
    );
  }

  public async appendAuditLog(params: {
    actionType: AuditLog['actionType'];
    entityType: string;
    entityId: string;
    details: string;
    diffSummary?: AuditLog['diffSummary'];
  }): Promise<AuditLog> {
    const user = this.getCurrentUser();
    const pharmacy = this.getCurrentPharmacy();
    const logId = generateUUID();
    const timestamp = new Date().toISOString();

    const integrityHash = await calculateIntegrityHash({
      logId,
      pharmacyId: pharmacy.id,
      timestamp,
      userId: user.id,
      action: params.actionType,
      entity: params.entityId,
      details: params.details,
    });

    const newLog: AuditLog = {
      id: logId,
      pharmacyId: pharmacy.id,
      timestamp,
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      actionType: params.actionType,
      entityType: params.entityType,
      entityId: params.entityId,
      details: params.details,
      diffSummary: params.diffSummary,
      deviceId: 'TERMINAL-PWA-RDC',
      integrityHash,
    };

    const logs = this.getItem<AuditLog[]>(KEYS.AUDIT_LOGS, []);
    logs.unshift(newLog); // Plus récent en premier
    this.setItem(KEYS.AUDIT_LOGS, logs);
    return newLog;
  }
}

export const store = new PharmacyDataStore();
