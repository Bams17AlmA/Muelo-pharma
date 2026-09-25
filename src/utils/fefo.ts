import { Batch, ExpiryAlertLevel, Product } from '../types/pharmacy';

/**
 * Calcule le niveau d'alerte de péremption pour un lot donné.
 * Seuils conformes au cahier des charges :
 * - Périmé : date dépassée (rouge)
 * - 30 jours ou moins : alerte critique (ambre foncé / rouge)
 * - 31 à 60 jours : alerte imminente (ambre)
 * - 61 à 90 jours : alerte sous surveillance (jaune)
 * - > 90 jours : stock sain (vert / normal)
 */
export function getExpiryAlertLevel(expiryDateStr: string): ExpiryAlertLevel {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiry = new Date(expiryDateStr);
  expiry.setHours(0, 0, 0, 0);

  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'EXPIRED';
  if (diffDays <= 30) return 'CRITICAL_30';
  if (diffDays <= 60) return 'WARNING_60';
  if (diffDays <= 90) return 'ATTENTION_90';
  return 'OK';
}

export function getDaysUntilExpiry(expiryDateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDateStr);
  expiry.setHours(0, 0, 0, 0);
  const diffTime = expiry.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Algorithme FEFO (First-Expired, First-Out)
 * Sélectionne automatiquement les lots disponibles pour un produit,
 * ordonnés par date d'expiration la plus proche, en excluant les lots périmés,
 * mis en quarantaine ou rappelés/bloqués.
 */
export interface FEFOAllocationItem {
  batch: Batch;
  allocatedQuantity: number;
}

export interface FEFOResult {
  allocations: FEFOAllocationItem[];
  fulfilledQuantity: number;
  remainingRequested: number;
  isFullySatisfied: boolean;
  warnings: string[];
}

export function allocateStockFEFO(
  batches: Batch[],
  quantityRequested: number,
  allowExpiringSoon = true
): FEFOResult {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Filtrer les lots valides et non bloqués
  const validBatches = batches.filter((b) => {
    if (b.status !== 'ACTIVE') return false;
    if (b.currentQuantity <= 0) return false;

    const expiry = new Date(b.expiryDate);
    expiry.setHours(0, 0, 0, 0);
    // Exclure les lots déjà périmés
    if (expiry.getTime() < today.getTime()) return false;

    return true;
  });

  // Trier par date d'expiration croissante (FEFO strict)
  validBatches.sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

  let needed = quantityRequested;
  const allocations: FEFOAllocationItem[] = [];
  const warnings: string[] = [];

  for (const batch of validBatches) {
    if (needed <= 0) break;

    const available = batch.currentQuantity - (batch.reservedQuantity || 0);
    if (available <= 0) continue;

    const toTake = Math.min(available, needed);
    allocations.push({
      batch,
      allocatedQuantity: toTake,
    });

    const daysLeft = getDaysUntilExpiry(batch.expiryDate);
    if (daysLeft <= 30) {
      warnings.push(`Le lot ${batch.batchNumber} expire dans ${daysLeft} jour(s).`);
    }

    needed -= toTake;
  }

  const fulfilledQuantity = quantityRequested - needed;
  const isFullySatisfied = needed === 0;

  return {
    allocations,
    fulfilledQuantity,
    remainingRequested: needed,
    isFullySatisfied,
    warnings,
  };
}

/**
 * Formate un montant en Franc Congolais (CDF)
 */
export function formatCDF(amount: number): string {
  return new Intl.NumberFormat('fr-CD', {
    style: 'currency',
    currency: 'CDF',
    maximumFractionDigits: 0,
  }).format(amount).replace('CDF', 'FC');
}

/**
 * Formate un montant en Dollar Américain (USD)
 */
export function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Formate une date au format lisible RDC (ex: 25 sept. 2026)
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Formate un horodatage complet (date + heure Kinshasa)
 */
export function formatDateTime(dateStr: string): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Génère un identifiant unique (UUID v4)
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Calcule une empreinte d'intégrité (hash SHA-256 simulé ou crypto natif)
 */
export async function calculateIntegrityHash(payload: Record<string, any>): Promise<string> {
  const jsonStr = JSON.stringify(payload);
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const msgBuffer = new TextEncoder().encode(jsonStr);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').substring(0, 24);
    } catch {
      // fallback
    }
  }
  let hash = 0;
  for (let i = 0; i < jsonStr.length; i++) {
    const char = jsonStr.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return 'SIG-' + Math.abs(hash).toString(16).padStart(12, '0');
}
