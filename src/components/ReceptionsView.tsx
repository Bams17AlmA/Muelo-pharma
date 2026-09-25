import React, { useEffect, useState } from 'react';
import {
  Truck,
  Plus,
  CheckCircle,
  AlertTriangle,
  ShieldAlert,
  FileText,
  Calendar,
  Layers,
  MapPin,
  Building,
} from 'lucide-react';
import { Product, Reception, ReceptionItem, Supplier } from '../types/pharmacy';
import { store } from '../services/store';
import { formatDate, formatDateTime, getDaysUntilExpiry, generateUUID } from '../utils/fefo';

export const ReceptionsView: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>(store.getSuppliers());
  const [receptions, setReceptions] = useState<Reception[]>(store.getReceptions());
  const [products, setProducts] = useState<Product[]>(store.getProducts());
  const currentUser = store.getCurrentUser();
  const pharmacy = store.getCurrentPharmacy();

  const [showAddReceptionModal, setShowAddReceptionModal] = useState(false);
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);

  // Formulaire de réception
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [deliverySlipNumber, setDeliverySlipNumber] = useState('');
  const [receptionNotes, setReceptionNotes] = useState('');
  const [receptionLines, setReceptionLines] = useState<
    Array<{
      productId: string;
      batchNumber: string;
      expiryDate: string;
      quantityReceived: number;
      unitCostCDF: number;
      unitCostUSD: number;
      location: string;
      isCompliant: boolean;
      sanitaryWarning?: string;
    }>
  >([]);

  // Formulaire Fournisseur
  const [newSupplier, setNewSupplier] = useState({
    code: '',
    name: '',
    category: 'GROSSISTE_PRIVE' as Supplier['category'],
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
  });

  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    const unsub = store.subscribe(() => {
      setSuppliers(store.getSuppliers());
      setReceptions(store.getReceptions());
      setProducts(store.getProducts());
    });
    return unsub;
  }, []);

  const handleAddLine = () => {
    if (products.length === 0) return;
    const firstProd = products[0];

    // Vérifier si produit sous rappel
    let warning: string | undefined = undefined;
    if (firstProd.status === 'RECALLED_BLOCKED') {
      warning = 'ALERTE SANITAIRE : Ce produit fait l’objet d’un blocage / rappel réglementaire !';
    }

    // Date péremption par défaut (+2 ans)
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 2);

    setReceptionLines((prev) => [
      ...prev,
      {
        productId: firstProd.id,
        batchNumber: `LOT-${Date.now().toString().slice(-4)}`,
        expiryDate: futureDate.toISOString().split('T')[0],
        quantityReceived: 50,
        unitCostCDF: Math.round(firstProd.unitPriceCDF * 0.7),
        unitCostUSD: +(firstProd.unitPriceUSD * 0.7).toFixed(2),
        location: firstProd.storageConditions === 'COLD_CHAIN' ? 'Frigo 1 (2-8°C)' : 'Rayon A1',
        isCompliant: firstProd.status !== 'RECALLED_BLOCKED',
        sanitaryWarning: warning,
      },
    ]);
  };

  const handleProductChange = (index: number, newProductId: string) => {
    const prod = products.find((p) => p.id === newProductId);
    if (!prod) return;

    setReceptionLines((prev) => {
      const next = [...prev];
      const isBlocked = prod.status === 'RECALLED_BLOCKED';
      next[index] = {
        ...next[index],
        productId: prod.id,
        unitCostCDF: Math.round(prod.unitPriceCDF * 0.7),
        unitCostUSD: +(prod.unitPriceUSD * 0.7).toFixed(2),
        location: prod.storageConditions === 'COLD_CHAIN' ? 'Frigo 1 (2-8°C)' : 'Rayon A1',
        isCompliant: !isBlocked,
        sanitaryWarning: isBlocked
          ? 'ALERTE SANITAIRE : Produit bloqué ou rappelé par les autorités sanitaires ! Réception interdite.'
          : undefined,
      };
      return next;
    });
  };

  const handleValidateReception = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackMessage(null);

    if (!selectedSupplierId) {
      setFeedbackMessage({ type: 'error', text: 'Veuillez sélectionner un fournisseur.' });
      return;
    }
    if (!deliverySlipNumber.trim()) {
      setFeedbackMessage({
        type: 'error',
        text: 'Le numéro de bordereau de livraison (BL) est obligatoire.',
      });
      return;
    }
    if (receptionLines.length === 0) {
      setFeedbackMessage({
        type: 'error',
        text: 'Veuillez ajouter au moins une ligne de réception.',
      });
      return;
    }

    const supplier = suppliers.find((s) => s.id === selectedSupplierId);

    // Contrôles stricts de conformité
    for (const line of receptionLines) {
      const prod = products.find((p) => p.id === line.productId);
      if (!line.batchNumber.trim()) {
        setFeedbackMessage({
          type: 'error',
          text: `Le numéro de lot est obligatoire pour ${prod?.name}.`,
        });
        return;
      }

      const daysLeft = getDaysUntilExpiry(line.expiryDate);
      if (daysLeft <= 0) {
        setFeedbackMessage({
          type: 'error',
          text: `CONTRÔLE REJETÉ : Le lot ${line.batchNumber} de ${prod?.name} est déjà périmé ! Réception interdite.`,
        });
        return;
      }

      if (prod?.status === 'RECALLED_BLOCKED') {
        setFeedbackMessage({
          type: 'error',
          text: `GARDE-FOU SANITAIRE : Réception refusée. ${prod.name} est sous ordonnance de blocage sanitaire !`,
        });
        return;
      }
    }

    const receptionId = generateUUID();
    const receptionItems: ReceptionItem[] = receptionLines.map((l) => {
      const prod = products.find((p) => p.id === l.productId);
      return {
        productId: l.productId,
        productName: prod?.name || 'Médicament',
        batchNumber: l.batchNumber,
        expiryDate: l.expiryDate,
        quantityOrdered: l.quantityReceived,
        quantityReceived: l.quantityReceived,
        unitCostCDF: l.unitCostCDF,
        unitCostUSD: l.unitCostUSD,
        location: l.location,
        isCompliant: true,
      };
    });

    const newReception: Reception = {
      id: receptionId,
      pharmacyId: pharmacy.id,
      receptionNumber: `REC-${new Date().getFullYear()}-${String(
        receptions.length + 1
      ).padStart(4, '0')}`,
      supplierId: selectedSupplierId,
      supplierName: supplier?.name || 'Fournisseur',
      receptionDate: new Date().toISOString(),
      deliverySlipNumber: deliverySlipNumber.trim(),
      receivedByUserId: currentUser.id,
      receivedByName: currentUser.name,
      items: receptionItems,
      status: 'VALIDATED',
      notes: receptionNotes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    const res = store.processReception(newReception);
    if (res.success) {
      setFeedbackMessage({
        type: 'success',
        text: `Réception ${newReception.receptionNumber} enregistrée avec succès. Les stocks de lots ont été intégrés !`,
      });
      setShowAddReceptionModal(false);
      setReceptionLines([]);
      setDeliverySlipNumber('');
      setReceptionNotes('');
    }
  };

  const handleCreateSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    store.addSupplier({
      id: 'sup-' + Date.now(),
      pharmacyId: pharmacy.id,
      code: newSupplier.code || `FRN-${Date.now().toString().slice(-4)}`,
      name: newSupplier.name,
      category: newSupplier.category,
      contactPerson: newSupplier.contactPerson,
      phone: newSupplier.phone,
      email: newSupplier.email,
      address: newSupplier.address,
      active: true,
    });
    setShowAddSupplierModal(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Notifications / Feedback */}
      {feedbackMessage && (
        <div
          className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMessage.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-slate-400 hover:text-slate-600"
          >
            &times;
          </button>
        </div>
      )}

      {/* Titre & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Fournisseurs, Commandes & Contrôle des Réceptions
          </h2>
          <p className="text-xs text-slate-500">
            Contrôle d'entrée obligatoire : validation des lots, péremptions, et vérification des blocages sanitaires
          </p>
        </div>

        {currentUser.role !== 'CASHIER' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddSupplierModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors shadow-xs"
            >
              <Building className="w-3.5 h-3.5 text-blue-700" />
              <span>Nouveau Fournisseur</span>
            </button>

            <button
              onClick={() => {
                setShowAddReceptionModal(true);
                if (receptionLines.length === 0) handleAddLine();
              }}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-blue-800 hover:bg-blue-900 rounded-md transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Nouvelle Réception de Stock</span>
            </button>
          </div>
        )}
      </div>

      {/* Grille : Fournisseurs Référencés (Haut) */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-blue-700" />
            <h4 className="font-bold text-slate-900 text-sm">
              Fournisseurs Agréés (Centrales Publiques & Grossistes RDC)
            </h4>
          </div>
          <span className="text-xs text-slate-500">{suppliers.length} fournisseur(s) actif(s)</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {suppliers.map((sup) => (
            <div key={sup.id} className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs space-y-1">
              <div className="flex items-start justify-between">
                <span className="font-bold text-slate-900">{sup.name}</span>
                <span className="text-[10px] font-semibold text-blue-800 bg-blue-100 px-1.5 py-0.5 rounded">
                  {sup.category === 'CENTRALE_ACHAT_PUBLIQUE'
                    ? 'Centrale Publique'
                    : sup.category === 'LABORATOIRE_LOCAL'
                    ? 'Laboratoire Local'
                    : 'Grossiste Privé'}
                </span>
              </div>
              <div className="text-slate-500">Contact : {sup.contactPerson}</div>
              <div className="text-slate-500">Tél : {sup.phone}</div>
              <div className="text-slate-400 text-[11px] truncate">{sup.address}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Registre des Réceptions Validées */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-blue-700" />
            <h3 className="font-bold text-slate-900 text-sm">
              Registre des Réceptions & Contrôles Sanitaires
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            {receptions.length} réception(s) effectuée(s)
          </span>
        </div>

        {receptions.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            Aucun bordereau de réception enregistré pour le moment.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 bg-slate-50">
                  <th className="py-2.5 px-3 font-semibold">N° Réception</th>
                  <th className="py-2.5 px-3 font-semibold">Date & Heure</th>
                  <th className="py-2.5 px-3 font-semibold">Fournisseur</th>
                  <th className="py-2.5 px-3 font-semibold">N° Bordereau (BL)</th>
                  <th className="py-2.5 px-3 font-semibold">Lots & Références Reçues</th>
                  <th className="py-2.5 px-3 font-semibold">Réceptionnaire</th>
                  <th className="py-2.5 px-3 font-semibold">Statut Contrôle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {receptions.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono font-semibold text-blue-900">
                      {rec.receptionNumber}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 font-mono">
                      {formatDateTime(rec.receptionDate)}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">
                      {rec.supplierName}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-700">
                      {rec.deliverySlipNumber}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      <div className="space-y-0.5">
                        {rec.items.map((it, idx) => (
                          <div key={idx}>
                            <span className="font-medium text-slate-900">{it.productName}</span>{' '}
                            (Lot: <span className="font-mono">{it.batchNumber}</span>, Exp:{' '}
                            {formatDate(it.expiryDate)}) — <strong>+{it.quantityReceived}</strong>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{rec.receivedByName}</td>
                    <td className="py-2.5 px-3">
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                        Conforme & Intégré
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Saisie Réception avec Contrôles Stricts */}
      {showAddReceptionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-3xl bg-white rounded-xl shadow-2xl p-6 text-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-700" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Nouvelle Réception de Stock (Contrôle Sanitaire d'Entrée)
                </h3>
              </div>
              <button
                onClick={() => setShowAddReceptionModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleValidateReception} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Fournisseur expéditeur *
                  </label>
                  <select
                    required
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded font-medium"
                  >
                    <option value="">Sélectionner un fournisseur...</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.category})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    N° Bordereau de Livraison (BL Fournisseur) *
                  </label>
                  <input
                    required
                    type="text"
                    value={deliverySlipNumber}
                    onChange={(e) => setDeliverySlipNumber(e.target.value)}
                    placeholder="Ex: BL-FED-2026-904"
                    className="w-full p-2 border border-slate-300 rounded font-mono"
                  />
                </div>
              </div>

              {/* Lignes d'articles reçus avec vérification de lot & péremption */}
              <div className="space-y-2 border border-slate-200 p-3 rounded-lg bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900">
                    Articles & Lots Physiques Contrôlés
                  </span>
                  <button
                    type="button"
                    onClick={handleAddLine}
                    className="flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:text-blue-800"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Ajouter une ligne</span>
                  </button>
                </div>

                {receptionLines.map((line, idx) => {
                  const daysLeft = getDaysUntilExpiry(line.expiryDate);
                  return (
                    <div key={idx} className="p-3 bg-white border border-slate-200 rounded-lg space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                        <div className="sm:col-span-4">
                          <label className="block text-[10px] text-slate-500 font-semibold mb-0.5">
                            Médicament
                          </label>
                          <select
                            value={line.productId}
                            onChange={(e) => handleProductChange(idx, e.target.value)}
                            className="w-full p-1.5 border border-slate-300 rounded text-xs"
                          >
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.inn} {p.dosage})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="sm:col-span-3">
                          <label className="block text-[10px] text-slate-500 font-semibold mb-0.5">
                            N° Lot Fabricant *
                          </label>
                          <input
                            required
                            type="text"
                            value={line.batchNumber}
                            onChange={(e) => {
                              const next = [...receptionLines];
                              next[idx].batchNumber = e.target.value;
                              setReceptionLines(next);
                            }}
                            className="w-full p-1.5 border border-slate-300 rounded font-mono text-xs"
                          />
                        </div>

                        <div className="sm:col-span-3">
                          <label className="block text-[10px] text-slate-500 font-semibold mb-0.5">
                            Date Péremption *
                          </label>
                          <input
                            required
                            type="date"
                            value={line.expiryDate}
                            onChange={(e) => {
                              const next = [...receptionLines];
                              next[idx].expiryDate = e.target.value;
                              setReceptionLines(next);
                            }}
                            className="w-full p-1.5 border border-slate-300 rounded text-xs"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-[10px] text-slate-500 font-semibold mb-0.5">
                            Quantité reçue
                          </label>
                          <input
                            required
                            type="number"
                            min="1"
                            value={line.quantityReceived}
                            onChange={(e) => {
                              const next = [...receptionLines];
                              next[idx].quantityReceived = parseInt(e.target.value) || 1;
                              setReceptionLines(next);
                            }}
                            className="w-full p-1.5 border border-slate-300 rounded text-xs font-mono font-bold"
                          />
                        </div>
                      </div>

                      {/* Alerte sanitaire / Garde-fou */}
                      {line.sanitaryWarning && (
                        <div className="p-2 bg-red-50 border border-red-300 rounded text-red-700 text-[11px] font-semibold flex items-center gap-1.5">
                          <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
                          <span>{line.sanitaryWarning}</span>
                        </div>
                      )}

                      {/* Avertissement péremption courte */}
                      {daysLeft <= 180 && daysLeft > 0 && (
                        <div className="text-[11px] text-amber-700 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Attention : Date de péremption courte ({daysLeft} jours restants).</span>
                        </div>
                      )}
                      {daysLeft <= 0 && (
                        <div className="text-[11px] text-red-700 font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>REJET : Ce lot est périmé. Réception interdite !</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Observations / Contrôle de conformité des colis
                </label>
                <textarea
                  value={receptionNotes}
                  onChange={(e) => setReceptionNotes(e.target.value)}
                  placeholder="Intégrité des emballages, respect de la chaîne du froid, conforme au bordereau..."
                  rows={2}
                  className="w-full p-2 border border-slate-300 rounded text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-800 hover:bg-blue-900 text-white font-bold rounded-lg shadow-sm"
                >
                  Valider le Contrôle & Intégrer les Lots en Stock
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddReceptionModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Création Fournisseur */}
      {showAddSupplierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl p-6 text-slate-800 space-y-4">
            <h3 className="font-bold text-slate-900 text-base border-b border-slate-100 pb-3">
              Enregistrer un Fournisseur Agréé
            </h3>

            <form onSubmit={handleCreateSupplier} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Raison Sociale *</label>
                <input
                  required
                  type="text"
                  value={newSupplier.name}
                  onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                  placeholder="Ex: CAMEG RDC, MEDIPHARM..."
                  className="w-full p-2 border border-slate-300 rounded"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Catégorie</label>
                <select
                  value={newSupplier.category}
                  onChange={(e) =>
                    setNewSupplier({
                      ...newSupplier,
                      category: e.target.value as Supplier['category'],
                    })
                  }
                  className="w-full p-2 border border-slate-300 rounded font-medium"
                >
                  <option value="GROSSISTE_PRIVE">Grossiste Privé</option>
                  <option value="CENTRALE_ACHAT_PUBLIQUE">Centrale d'Achat Publique</option>
                  <option value="LABORATOIRE_LOCAL">Laboratoire Pharmaceutique Local</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Personne de contact</label>
                <input
                  type="text"
                  value={newSupplier.contactPerson}
                  onChange={(e) =>
                    setNewSupplier({ ...newSupplier, contactPerson: e.target.value })
                  }
                  placeholder="Nom du pharmacien responsable ou délégué"
                  className="w-full p-2 border border-slate-300 rounded"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Téléphone</label>
                  <input
                    type="text"
                    value={newSupplier.phone}
                    onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                    placeholder="+243 ..."
                    className="w-full p-2 border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={newSupplier.email}
                    onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })}
                    placeholder="contact@..."
                    className="w-full p-2 border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Adresse</label>
                <input
                  type="text"
                  value={newSupplier.address}
                  onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })}
                  placeholder="Commune, Ville, Province"
                  className="w-full p-2 border border-slate-300 rounded"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-blue-800 hover:bg-blue-900 text-white font-semibold rounded"
                >
                  Enregistrer
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddSupplierModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
