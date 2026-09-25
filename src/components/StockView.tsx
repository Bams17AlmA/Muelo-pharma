import React, { useEffect, useState } from 'react';
import {
  Boxes,
  AlertTriangle,
  Clock,
  ShieldAlert,
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  Lock,
  CheckCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { Batch, BatchStatus, Product, StockMovement, StorageCondition } from '../types/pharmacy';
import { store } from '../services/store';
import {
  formatCDF,
  formatDate,
  formatDateTime,
  formatUSD,
  getDaysUntilExpiry,
  getExpiryAlertLevel,
} from '../utils/fefo';

export const StockView: React.FC = () => {
  const [products, setProducts] = useState<Product[]>(store.getProducts());
  const [batches, setBatches] = useState<Batch[]>(store.getBatches());
  const [movements, setMovements] = useState<StockMovement[]>(store.getStockMovements());
  const currentUser = store.getCurrentUser();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterAlert, setFilterAlert] = useState<'ALL' | 'CRITICAL_30' | 'WARNING_60' | 'ATTENTION_90' | 'BLOCKED' | 'LOW_STOCK'>('ALL');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  // Modal Nouveau Produit
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [newProductData, setNewProductData] = useState({
    code: '',
    name: '',
    inn: '',
    dosage: '',
    form: 'Comprimé',
    packaging: 'Boîte de 30',
    manufacturer: '',
    category: 'Antipaludéens (CTA)',
    storageConditions: 'AMBIENT' as StorageCondition,
    minStockAlert: 20,
    optimalStock: 100,
    unitPriceCDF: 5000,
    unitPriceUSD: 1.75,
    requiresPrescription: true,
  });

  // Modal Changement Statut Lot (Mise en Quarantaine / Blocage Rappel)
  const [batchToEdit, setBatchToEdit] = useState<Batch | null>(null);
  const [newStatus, setNewStatus] = useState<BatchStatus>('QUARANTINE');
  const [statusReason, setStatusReason] = useState('');

  useEffect(() => {
    const unsub = store.subscribe(() => {
      setProducts(store.getProducts());
      setBatches(store.getBatches());
      setMovements(store.getStockMovements());
    });
    return unsub;
  }, []);

  // Calcul des statistiques globales de stock
  const totalStockValuationCDF = batches
    .filter((b) => b.status === 'ACTIVE')
    .reduce((sum, b) => sum + b.currentQuantity * b.purchaseCostCDF, 0);

  const batchesUnder30 = batches.filter(
    (b) => b.status === 'ACTIVE' && getExpiryAlertLevel(b.expiryDate) === 'CRITICAL_30'
  );
  const batchesUnder60 = batches.filter(
    (b) => b.status === 'ACTIVE' && getExpiryAlertLevel(b.expiryDate) === 'WARNING_60'
  );
  const batchesUnder90 = batches.filter(
    (b) => b.status === 'ACTIVE' && getExpiryAlertLevel(b.expiryDate) === 'ATTENTION_90'
  );
  const batchesBlocked = batches.filter((b) => b.status === 'BLOCKED_RECALL' || b.status === 'QUARANTINE');

  // Filtrer les lots selon les critères
  const filteredBatches = batches.filter((b) => {
    const product = products.find((p) => p.id === b.productId);
    if (!product) return false;

    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.inn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.batchNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.location.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (filterAlert === 'CRITICAL_30') return getExpiryAlertLevel(b.expiryDate) === 'CRITICAL_30';
    if (filterAlert === 'WARNING_60') return getExpiryAlertLevel(b.expiryDate) === 'WARNING_60';
    if (filterAlert === 'ATTENTION_90') return getExpiryAlertLevel(b.expiryDate) === 'ATTENTION_90';
    if (filterAlert === 'BLOCKED') return b.status === 'BLOCKED_RECALL' || b.status === 'QUARANTINE';
    if (filterAlert === 'LOW_STOCK') {
      const totalAvailable = batches
        .filter((bx) => bx.productId === product.id && bx.status === 'ACTIVE')
        .reduce((sum, bx) => sum + bx.currentQuantity, 0);
      return totalAvailable <= product.minStockAlert;
    }

    return true;
  });

  // Trier les lots par FEFO strict (Péremption la plus proche en haut)
  filteredBatches.sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const pharmacy = store.getCurrentPharmacy();
    const id = 'prod-' + Date.now();

    store.addProduct({
      id,
      pharmacyId: pharmacy.id,
      code: newProductData.code || `MED-${Date.now().toString().slice(-4)}`,
      name: newProductData.name,
      inn: newProductData.inn,
      dosage: newProductData.dosage,
      form: newProductData.form,
      packaging: newProductData.packaging,
      manufacturer: newProductData.manufacturer || 'Non spécifié',
      category: newProductData.category,
      status: 'ACTIVE',
      storageConditions: newProductData.storageConditions,
      minStockAlert: Number(newProductData.minStockAlert),
      optimalStock: Number(newProductData.optimalStock),
      unitPriceCDF: Number(newProductData.unitPriceCDF),
      unitPriceUSD: Number(newProductData.unitPriceUSD),
      requiresPrescription: newProductData.requiresPrescription,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    setShowAddProductModal(false);
  };

  const handleSaveBatchStatus = () => {
    if (!batchToEdit) return;
    store.updateBatchStatus(batchToEdit.id, newStatus, statusReason);
    setBatchToEdit(null);
    setStatusReason('');
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* En-tête & Chiffres clés des stocks */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Gestion des Stocks & Traçabilité des Lots (FEFO)
          </h2>
          <p className="text-xs text-slate-500">
            Suivi des lots par date de péremption, seuils de rupture et alertes 30 / 60 / 90 jours
          </p>
        </div>

        {/* Action : Nouveau Médicament au référentiel */}
        {currentUser.role !== 'CASHIER' && (
          <button
            onClick={() => setShowAddProductModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-blue-800 hover:bg-blue-900 rounded-md transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Nouveau Médicament</span>
          </button>
        )}
      </div>

      {/* Cartes d'indicateurs de seuils & alertes péremption (Zero-pill style) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div
          onClick={() => setFilterAlert('ALL')}
          className={`p-3 rounded-xl border cursor-pointer transition-all ${
            filterAlert === 'ALL'
              ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-400'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-[11px] font-medium text-slate-500">Valorisation active</div>
          <div className="text-sm sm:text-base font-extrabold text-blue-900 mt-1">
            {formatCDF(totalStockValuationCDF)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">{batches.length} lots référencés</div>
        </div>

        <div
          onClick={() => setFilterAlert('CRITICAL_30')}
          className={`p-3 rounded-xl border cursor-pointer transition-all ${
            filterAlert === 'CRITICAL_30'
              ? 'bg-red-50 border-red-300 ring-1 ring-red-400'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-[11px] font-semibold text-red-700 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Critique ≤ 30j</span>
          </div>
          <div className="text-lg font-black text-red-700 mt-1">{batchesUnder30.length}</div>
          <div className="text-[10px] text-red-600/80">FEFO prioritaire urgent</div>
        </div>

        <div
          onClick={() => setFilterAlert('WARNING_60')}
          className={`p-3 rounded-xl border cursor-pointer transition-all ${
            filterAlert === 'WARNING_60'
              ? 'bg-amber-50 border-amber-300 ring-1 ring-amber-400'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-[11px] font-semibold text-amber-700 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>Alerte 31–60j</span>
          </div>
          <div className="text-lg font-black text-amber-700 mt-1">{batchesUnder60.length}</div>
          <div className="text-[10px] text-amber-600/80">À écouler rapidement</div>
        </div>

        <div
          onClick={() => setFilterAlert('ATTENTION_90')}
          className={`p-3 rounded-xl border cursor-pointer transition-all ${
            filterAlert === 'ATTENTION_90'
              ? 'bg-yellow-50 border-yellow-300 ring-1 ring-yellow-400'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-[11px] font-semibold text-yellow-800 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>Surveillance 61–90j</span>
          </div>
          <div className="text-lg font-black text-yellow-800 mt-1">{batchesUnder90.length}</div>
          <div className="text-[10px] text-yellow-700/80">Surveillance rapprochée</div>
        </div>

        <div
          onClick={() => setFilterAlert('BLOCKED')}
          className={`p-3 rounded-xl border cursor-pointer transition-all ${
            filterAlert === 'BLOCKED'
              ? 'bg-slate-100 border-slate-400 ring-1 ring-slate-500'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
            <span>Bloqués / Quarantaine</span>
          </div>
          <div className="text-lg font-black text-slate-800 mt-1">{batchesBlocked.length}</div>
          <div className="text-[10px] text-slate-500">Rappels sanitaires RDC</div>
        </div>
      </div>

      {/* Barre de Recherche & Filtres interactifs (Segmented control) */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher par médicament, DCI, numéro de lot ou emplacement..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600 focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs self-start">
            <button
              onClick={() => setFilterAlert('ALL')}
              className={`px-3 py-1 font-medium rounded-md transition-colors ${
                filterAlert === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Tous ({batches.length})
            </button>
            <button
              onClick={() => setFilterAlert('LOW_STOCK')}
              className={`px-3 py-1 font-medium rounded-md transition-colors ${
                filterAlert === 'LOW_STOCK' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Sous Seuil Min
            </button>
            <button
              onClick={() => setFilterAlert('BLOCKED')}
              className={`px-3 py-1 font-medium rounded-md transition-colors ${
                filterAlert === 'BLOCKED' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Quarantaine / Rappels
            </button>
          </div>
        </div>
      </div>

      {/* Tableau des Lots avec Priorité FEFO */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Boxes className="w-4 h-4 text-blue-700" />
            <h3 className="font-bold text-slate-900 text-sm">
              Registre des Lots (Ordonné par FEFO : Date d'expiration croissante)
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            {filteredBatches.length} lot(s) affiché(s)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 bg-slate-50">
                <th className="py-2.5 px-3 font-semibold">Médicament & DCI</th>
                <th className="py-2.5 px-3 font-semibold">N° Lot</th>
                <th className="py-2.5 px-3 font-semibold">Date Péremption</th>
                <th className="py-2.5 px-3 font-semibold">Priorité FEFO / Urgence</th>
                <th className="py-2.5 px-3 font-semibold text-right">Stock Disponible</th>
                <th className="py-2.5 px-3 font-semibold">Emplacement</th>
                <th className="py-2.5 px-3 font-semibold">Conservation</th>
                <th className="py-2.5 px-3 font-semibold">Statut Lot</th>
                <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBatches.map((batch) => {
                const prod = products.find((p) => p.id === batch.productId);
                if (!prod) return null;

                const daysLeft = getDaysUntilExpiry(batch.expiryDate);
                const alertLevel = getExpiryAlertLevel(batch.expiryDate);

                return (
                  <tr key={batch.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-900">{prod.name}</div>
                      <div className="text-[11px] text-slate-500">
                        {prod.inn} · {prod.dosage}
                      </div>
                    </td>

                    <td className="py-2.5 px-3 font-mono font-semibold text-blue-900">
                      {batch.batchNumber}
                    </td>

                    <td className="py-2.5 px-3">
                      <div className="font-medium text-slate-800">{formatDate(batch.expiryDate)}</div>
                      <div className="text-[10px] text-slate-400">
                        {daysLeft < 0 ? 'Périmé' : `dans ${daysLeft} jour(s)`}
                      </div>
                    </td>

                    <td className="py-2.5 px-3">
                      {batch.status === 'BLOCKED_RECALL' ? (
                        <span className="text-red-700 font-bold flex items-center gap-1">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          Rappel Sanitaire Bloqué
                        </span>
                      ) : batch.status === 'QUARANTINE' ? (
                        <span className="text-slate-600 font-medium">En Quarantaine</span>
                      ) : alertLevel === 'EXPIRED' ? (
                        <span className="text-red-700 font-bold">Périmé (Vente interdite)</span>
                      ) : alertLevel === 'CRITICAL_30' ? (
                        <span className="text-red-700 font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          FEFO Priorité 1 (≤ 30j)
                        </span>
                      ) : alertLevel === 'WARNING_60' ? (
                        <span className="text-amber-700 font-semibold">
                          FEFO Priorité 2 (31–60j)
                        </span>
                      ) : alertLevel === 'ATTENTION_90' ? (
                        <span className="text-yellow-700 font-medium">Surveillance (61–90j)</span>
                      ) : (
                        <span className="text-slate-600 font-medium">Conforme (&gt; 90j)</span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-right">
                      <span className="font-bold text-slate-900 font-mono text-sm">
                        {batch.currentQuantity}
                      </span>
                      {batch.quarantineQuantity > 0 && (
                        <div className="text-[10px] text-red-600">
                          +{batch.quarantineQuantity} en quarantaine
                        </div>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-slate-600">{batch.location}</td>

                    <td className="py-2.5 px-3 text-slate-600">
                      {prod.storageConditions === 'COLD_CHAIN' ? (
                        <span className="text-sky-700 font-medium">Frigo 2–8°C</span>
                      ) : prod.storageConditions === 'PROTECT_LIGHT' ? (
                        <span className="text-slate-600">Abri lumière</span>
                      ) : (
                        <span className="text-slate-500">Ambiante &lt;25°C</span>
                      )}
                    </td>

                    <td className="py-2.5 px-3">
                      {batch.status === 'ACTIVE' && (
                        <span className="text-emerald-700 font-medium">Actif</span>
                      )}
                      {batch.status === 'QUARANTINE' && (
                        <span className="text-amber-700 font-medium">Quarantaine</span>
                      )}
                      {batch.status === 'BLOCKED_RECALL' && (
                        <span className="text-red-700 font-bold">Bloqué</span>
                      )}
                      {batch.status === 'EXPIRED' && (
                        <span className="text-red-600 font-medium">Périmé</span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-right">
                      {currentUser.role !== 'CASHIER' && (
                        <button
                          onClick={() => {
                            setBatchToEdit(batch);
                            setNewStatus(batch.status);
                            setStatusReason(batch.recallReason || '');
                          }}
                          className="px-2 py-1 text-slate-600 hover:text-blue-700 hover:bg-slate-100 rounded text-[11px] font-medium"
                        >
                          Gérer Statut
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Historique récent des mouvements de stock */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-blue-700" />
            <h4 className="font-bold text-slate-900 text-sm">
              Mouvements de stock récents (Traçabilité physique)
            </h4>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {movements.length} mouvement(s) consigné(s)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 bg-slate-50">
                <th className="py-2 px-3 font-semibold">Date & Heure</th>
                <th className="py-2 px-3 font-semibold">Type</th>
                <th className="py-2 px-3 font-semibold">Médicament</th>
                <th className="py-2 px-3 font-semibold">N° Lot</th>
                <th className="py-2 px-3 font-semibold text-right">Quantité</th>
                <th className="py-2 px-3 font-semibold text-right">Nouveau Solde</th>
                <th className="py-2 px-3 font-semibold">Motif / Réf.</th>
                <th className="py-2 px-3 font-semibold">Opérateur</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {movements.slice(0, 8).map((m) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="py-2 px-3 text-slate-500 font-mono">
                    {formatDateTime(m.timestamp)}
                  </td>
                  <td className="py-2 px-3">
                    <span
                      className={`font-semibold ${
                        m.quantity > 0 ? 'text-emerald-700' : 'text-blue-800'
                      }`}
                    >
                      {m.type === 'RECEPTION'
                        ? 'Réception'
                        : m.type === 'SALE'
                        ? 'Vente Caisse'
                        : m.type === 'SALE_CANCEL'
                        ? 'Annulation Vente'
                        : m.type === 'INVENTORY_ADJUSTMENT'
                        ? 'Ajustement Inventaire'
                        : m.type}
                    </span>
                  </td>
                  <td className="py-2 px-3 font-medium text-slate-900">{m.productName}</td>
                  <td className="py-2 px-3 font-mono text-slate-700">{m.batchNumber}</td>
                  <td className="py-2 px-3 text-right font-bold font-mono">
                    <span className={m.quantity > 0 ? 'text-emerald-700' : 'text-slate-800'}>
                      {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-slate-600">
                    {m.newQuantity}
                  </td>
                  <td className="py-2 px-3 text-slate-500 truncate max-w-xs">{m.reason}</td>
                  <td className="py-2 px-3 text-slate-600">{m.performedByName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Création Médicament */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl p-6 text-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-slate-900 text-base border-b border-slate-100 pb-3">
              Ajouter un nouveau médicament au Référentiel
            </h3>

            <form onSubmit={handleCreateProduct} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nom Commercial *
                  </label>
                  <input
                    required
                    type="text"
                    value={newProductData.name}
                    onChange={(e) =>
                      setNewProductData({ ...newProductData, name: e.target.value })
                    }
                    placeholder="Ex: Coartem, Paracétamol Zenufa"
                    className="w-full p-2 border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    DCI (Principe actif) *
                  </label>
                  <input
                    required
                    type="text"
                    value={newProductData.inn}
                    onChange={(e) =>
                      setNewProductData({ ...newProductData, inn: e.target.value })
                    }
                    placeholder="Ex: Artéméther + Luméfantrine"
                    className="w-full p-2 border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Dosage *</label>
                  <input
                    required
                    type="text"
                    value={newProductData.dosage}
                    onChange={(e) =>
                      setNewProductData({ ...newProductData, dosage: e.target.value })
                    }
                    placeholder="Ex: 500 mg, 20/120 mg"
                    className="w-full p-2 border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Forme *</label>
                  <input
                    required
                    type="text"
                    value={newProductData.form}
                    onChange={(e) =>
                      setNewProductData({ ...newProductData, form: e.target.value })
                    }
                    placeholder="Ex: Comprimé, Gélule"
                    className="w-full p-2 border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Conditionnement</label>
                  <input
                    type="text"
                    value={newProductData.packaging}
                    onChange={(e) =>
                      setNewProductData({ ...newProductData, packaging: e.target.value })
                    }
                    placeholder="Ex: Boîte de 30"
                    className="w-full p-2 border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Fabricant</label>
                  <input
                    type="text"
                    value={newProductData.manufacturer}
                    onChange={(e) =>
                      setNewProductData({ ...newProductData, manufacturer: e.target.value })
                    }
                    placeholder="Laboratoire / Fabricant"
                    className="w-full p-2 border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Catégorie</label>
                  <input
                    type="text"
                    value={newProductData.category}
                    onChange={(e) =>
                      setNewProductData({ ...newProductData, category: e.target.value })
                    }
                    placeholder="Ex: Antibiotiques, Antipaludéens"
                    className="w-full p-2 border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Conservation
                  </label>
                  <select
                    value={newProductData.storageConditions}
                    onChange={(e) =>
                      setNewProductData({
                        ...newProductData,
                        storageConditions: e.target.value as StorageCondition,
                      })
                    }
                    className="w-full p-2 border border-slate-300 rounded"
                  >
                    <option value="AMBIENT">Température ambiante (&lt;25°C)</option>
                    <option value="COLD_CHAIN">Chaîne du froid (2°C - 8°C)</option>
                    <option value="PROTECT_LIGHT">À l'abri de la lumière</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Seuil d'alerte stock minimum
                  </label>
                  <input
                    type="number"
                    value={newProductData.minStockAlert}
                    onChange={(e) =>
                      setNewProductData({
                        ...newProductData,
                        minStockAlert: parseInt(e.target.value) || 10,
                      })
                    }
                    className="w-full p-2 border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Prix de vente (FC) *
                  </label>
                  <input
                    required
                    type="number"
                    value={newProductData.unitPriceCDF}
                    onChange={(e) =>
                      setNewProductData({
                        ...newProductData,
                        unitPriceCDF: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full p-2 border border-slate-300 rounded font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Prix de vente ($ USD) *
                  </label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={newProductData.unitPriceUSD}
                    onChange={(e) =>
                      setNewProductData({
                        ...newProductData,
                        unitPriceUSD: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full p-2 border border-slate-300 rounded font-mono"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-blue-800 hover:bg-blue-900 text-white font-semibold rounded"
                >
                  Enregistrer dans le Référentiel
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddProductModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Changement Statut Lot (Quarantaine / Rappel Sanitaire) */}
      {batchToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl p-6 text-slate-800 space-y-4">
            <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-3">
              Modifier le statut du Lot : {batchToEdit.batchNumber}
            </h3>

            <div className="text-xs text-slate-600 space-y-1">
              <p>
                <strong>Stock actuel :</strong> {batchToEdit.currentQuantity} unités
              </p>
              <p>
                <strong>Péremption :</strong> {formatDate(batchToEdit.expiryDate)}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nouveau Statut Réglementaire :
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as BatchStatus)}
                className="w-full text-xs p-2 border border-slate-300 rounded font-medium"
              >
                <option value="ACTIVE">Actif (Autorisé à la vente)</option>
                <option value="QUARANTINE">Quarantaine (En attente d'expertise/contrôle)</option>
                <option value="BLOCKED_RECALL">
                  Bloqué pour Rappel Sanitaire (Interdiction formelle de vente)
                </option>
                <option value="EXPIRED">Périmé (Destruction / Retrait)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Motif réglementaire obligatoire :
              </label>
              <textarea
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                placeholder="Ex: Notification n° MS/DPM/2026/..., anomalie visuelle, dégradation..."
                rows={3}
                className="w-full text-xs p-2 border border-slate-300 rounded"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleSaveBatchStatus}
                className="flex-1 py-2 bg-blue-800 hover:bg-blue-900 text-white text-xs font-semibold rounded"
              >
                Valider et consigner au Journal d'Audit
              </button>
              <button
                onClick={() => setBatchToEdit(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
