import React, { useEffect, useState } from 'react';
import {
  ClipboardList,
  Plus,
  CheckCircle,
  AlertCircle,
  Lock,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  FileCheck,
} from 'lucide-react';
import { InventorySession } from '../types/pharmacy';
import { store } from '../services/store';
import { formatCDF, formatDateTime } from '../utils/fefo';

export const InventoryView: React.FC = () => {
  const [sessions, setSessions] = useState<InventorySession[]>(store.getInventorySessions());
  const currentUser = store.getCurrentUser();

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [showNewSessionModal, setShowNewSessionModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newZone, setNewZone] = useState('Général - Tous rayons');

  // Modal d'approbation des écarts
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approvePin, setApprovePin] = useState('');
  const [approveError, setApproveError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = store.subscribe(() => {
      const sess = store.getInventorySessions();
      setSessions(sess);
      if (!activeSessionId && sess.length > 0) {
        setActiveSessionId(sess[0].id);
      }
    });
    return unsub;
  }, [activeSessionId]);

  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0] || null;

  const handleCreateSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const session = store.createInventorySession(newTitle.trim(), newZone);
    setActiveSessionId(session.id);
    setShowNewSessionModal(false);
    setNewTitle('');
  };

  const handleUpdateItemCount = (itemId: string, counted: number, reason?: string) => {
    if (!activeSession) return;
    store.updateInventoryCount(activeSession.id, itemId, counted, reason);
  };

  const handleSubmitForApproval = () => {
    if (!activeSession) return;
    store.submitInventoryForApproval(activeSession.id);
  };

  const handleConfirmApproval = () => {
    if (!activeSession) return;
    setApproveError(null);

    const res = store.approveInventoryDiscrepancies(activeSession.id, approvePin);
    if (res.success) {
      setShowApproveModal(false);
      setApprovePin('');
    } else {
      setApproveError(res.error || "Erreur lors de l'approbation.");
    }
  };

  // Calcul des statistiques de l'inventaire actif
  const totalItems = activeSession ? activeSession.items.length : 0;
  const itemsWithDiscrepancy = activeSession
    ? activeSession.items.filter((i) => i.discrepancyQuantity !== 0)
    : [];
  const netFinancialDiscrepancy = activeSession
    ? activeSession.items.reduce((sum, i) => sum + i.discrepancyValueCDF, 0)
    : 0;

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* En-tête & Bouton Nouvelle Session */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Inventaire Tournant & Contrôle des Écarts
          </h2>
          <p className="text-xs text-slate-500">
            Comptage physique des lots, calcul des écarts et approbation réglementaire stricte
          </p>
        </div>

        {currentUser.role !== 'CASHIER' && (
          <button
            onClick={() => setShowNewSessionModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-blue-800 hover:bg-blue-900 rounded-md transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Démarrer un Inventaire</span>
          </button>
        )}
      </div>

      {sessions.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500 space-y-3">
          <ClipboardList className="w-10 h-10 mx-auto text-slate-400" />
          <h3 className="font-semibold text-slate-800 text-sm">Aucune session d'inventaire</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Les inventaires tournants permettent de vérifier la concordance entre le stock théorique
            du système et les quantités physiques réelles en rayon.
          </p>
          {currentUser.role !== 'CASHIER' && (
            <button
              onClick={() => setShowNewSessionModal(true)}
              className="px-4 py-2 bg-blue-800 text-white font-semibold text-xs rounded-md shadow-xs"
            >
              Créer la première session
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Liste des Sessions (Gauche, 4 cols) */}
          <div className="lg:col-span-4 space-y-3">
            <h4 className="font-semibold text-xs text-slate-500 uppercase tracking-wider">
              Sessions d'inventaire
            </h4>
            <div className="space-y-2">
              {sessions.map((sess) => {
                const isSelected = sess.id === activeSession?.id;
                return (
                  <div
                    key={sess.id}
                    onClick={() => setActiveSessionId(sess.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-blue-50/70 border-blue-300 ring-1 ring-blue-400'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-blue-900">
                        {sess.sessionNumber}
                      </span>
                      <span
                        className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                          sess.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : sess.status === 'PENDING_APPROVAL'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {sess.status === 'APPROVED'
                          ? 'Approuvé'
                          : sess.status === 'PENDING_APPROVAL'
                          ? 'En attente d’approbation'
                          : 'En cours'}
                      </span>
                    </div>

                    <div className="font-medium text-xs text-slate-900 mt-1">{sess.title}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Zone : {sess.zoneOrCategory}</div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      Initié par {sess.initiatedByName} · {formatDateTime(sess.createdAt)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Détails de la Session Active & Table de Comptage (Droite, 8 cols) */}
          {activeSession && (
            <div className="lg:col-span-8 space-y-4">
              {/* Synthèse de la session */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900 text-sm">{activeSession.title}</h3>
                      <span className="font-mono text-xs text-slate-500">
                        ({activeSession.sessionNumber})
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Zone : {activeSession.zoneOrCategory} · Statut :{' '}
                      <strong>{activeSession.status}</strong>
                    </p>
                  </div>

                  {/* Actions selon le statut et le rôle */}
                  <div className="flex items-center gap-2">
                    {activeSession.status === 'IN_PROGRESS' && (
                      <button
                        onClick={handleSubmitForApproval}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-800 hover:bg-blue-900 rounded-md transition-colors shadow-xs"
                      >
                        Soumettre pour approbation
                      </button>
                    )}

                    {activeSession.status === 'PENDING_APPROVAL' && (
                      <button
                        onClick={() => {
                          setShowApproveModal(true);
                          setApproveError(null);
                        }}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-md transition-colors shadow-xs flex items-center gap-1.5"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>Approuver les écarts (Code PIN)</span>
                      </button>
                    )}

                    {activeSession.status === 'APPROVED' && (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-semibold bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                        <span>Clôturé par {activeSession.approvedByName}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Synthèse des écarts financiers */}
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="text-slate-500">Articles contrôlés</div>
                    <div className="text-base font-bold text-slate-900 mt-0.5">{totalItems}</div>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="text-slate-500">Lignes avec écarts</div>
                    <div
                      className={`text-base font-bold mt-0.5 ${
                        itemsWithDiscrepancy.length > 0 ? 'text-amber-700' : 'text-slate-900'
                      }`}
                    >
                      {itemsWithDiscrepancy.length}
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="text-slate-500">Impact financier net</div>
                    <div
                      className={`text-base font-bold font-mono mt-0.5 ${
                        netFinancialDiscrepancy < 0
                          ? 'text-red-700'
                          : netFinancialDiscrepancy > 0
                          ? 'text-emerald-700'
                          : 'text-slate-900'
                      }`}
                    >
                      {formatCDF(netFinancialDiscrepancy)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Table de comptage physique */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-3 border-b border-slate-100 flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-xs">
                    Saisie des comptages par lot
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {activeSession.status === 'APPROVED' ? 'Mode lecture seule' : 'Modifications autorisées'}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 bg-slate-50">
                        <th className="py-2 px-3 font-semibold">Médicament</th>
                        <th className="py-2 px-3 font-semibold">N° Lot</th>
                        <th className="py-2 px-3 font-semibold">Emplacement</th>
                        <th className="py-2 px-3 font-semibold text-right">Théorique</th>
                        <th className="py-2 px-3 font-semibold text-center">Compté</th>
                        <th className="py-2 px-3 font-semibold text-right">Écart Qté</th>
                        <th className="py-2 px-3 font-semibold text-right">Écart Valeur</th>
                        <th className="py-2 px-3 font-semibold">Motif / Justification</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeSession.items.map((item) => {
                        const hasDiff = item.discrepancyQuantity !== 0;
                        const isReadOnly = activeSession.status === 'APPROVED';

                        return (
                          <tr key={item.id} className={hasDiff ? 'bg-amber-50/40' : ''}>
                            <td className="py-2.5 px-3">
                              <div className="font-semibold text-slate-900">{item.productName}</div>
                              <div className="text-[10px] text-slate-500">{item.inn}</div>
                            </td>

                            <td className="py-2.5 px-3 font-mono font-medium text-slate-700">
                              {item.batchNumber}
                            </td>

                            <td className="py-2.5 px-3 text-slate-500">{item.location}</td>

                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-700">
                              {item.theoreticalQuantity}
                            </td>

                            <td className="py-2.5 px-3 text-center">
                              {isReadOnly ? (
                                <span className="font-mono font-bold text-slate-900">
                                  {item.countedQuantity}
                                </span>
                              ) : (
                                <input
                                  type="number"
                                  min="0"
                                  value={item.countedQuantity}
                                  onChange={(e) =>
                                    handleUpdateItemCount(
                                      item.id,
                                      parseInt(e.target.value) || 0,
                                      item.discrepancyReason
                                    )
                                  }
                                  className="w-16 p-1 border border-slate-300 rounded font-mono font-bold text-center text-xs"
                                />
                              )}
                            </td>

                            <td className="py-2.5 px-3 text-right font-mono font-bold">
                              {item.discrepancyQuantity > 0 && (
                                <span className="text-emerald-700">+{item.discrepancyQuantity}</span>
                              )}
                              {item.discrepancyQuantity < 0 && (
                                <span className="text-red-700">{item.discrepancyQuantity}</span>
                              )}
                              {item.discrepancyQuantity === 0 && (
                                <span className="text-slate-400">0</span>
                              )}
                            </td>

                            <td className="py-2.5 px-3 text-right font-mono">
                              {item.discrepancyValueCDF !== 0 ? (
                                <span
                                  className={
                                    item.discrepancyValueCDF > 0
                                      ? 'text-emerald-700 font-semibold'
                                      : 'text-red-700 font-semibold'
                                  }
                                >
                                  {formatCDF(item.discrepancyValueCDF)}
                                </span>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>

                            <td className="py-2.5 px-3">
                              {isReadOnly ? (
                                <span className="text-slate-500 text-[11px]">
                                  {item.discrepancyReason || '-'}
                                </span>
                              ) : (
                                <input
                                  type="text"
                                  placeholder={hasDiff ? 'Justifier l’écart...' : 'Optionnel'}
                                  value={item.discrepancyReason || ''}
                                  onChange={(e) =>
                                    handleUpdateItemCount(
                                      item.id,
                                      item.countedQuantity,
                                      e.target.value
                                    )
                                  }
                                  className={`w-full p-1 text-[11px] border rounded ${
                                    hasDiff && !item.discrepancyReason
                                      ? 'border-amber-300 bg-amber-50/50'
                                      : 'border-slate-200'
                                  }`}
                                />
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal Création Session */}
      {showNewSessionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl p-6 text-slate-800 space-y-4">
            <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-3">
              Nouvelle Session d'Inventaire Tournant
            </h3>

            <form onSubmit={handleCreateSession} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Intitulé de la session *
                </label>
                <input
                  required
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex: Inventaire mensuel CTA & Antibiotiques"
                  className="w-full p-2 border border-slate-300 rounded font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Périmètre / Zone couverte
                </label>
                <select
                  value={newZone}
                  onChange={(e) => setNewZone(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded"
                >
                  <option value="Général - Tous rayons">Général - Tous rayons</option>
                  <option value="Rayon A - Antalgiques & Antipyrétiques">
                    Rayon A - Antalgiques & Antipyrétiques
                  </option>
                  <option value="Rayon B - Antipaludéens (CTA)">
                    Rayon B - Antipaludéens (CTA)
                  </option>
                  <option value="Rayon C - Antibiotiques">Rayon C - Antibiotiques</option>
                  <option value="Frigo Médical 1 (2-8°C)">Frigo Médical 1 (2-8°C)</option>
                </select>
              </div>

              <div className="p-3 bg-blue-50 rounded-lg text-blue-900 text-[11px] space-y-1">
                <p className="font-semibold">Procédure réglementaire :</p>
                <p>
                  1. Le personnel de vente effectue le comptage physique des boîtes.
                </p>
                <p>
                  2. Les écarts constatés sont soumis à l’approbation obligatoire du Pharmacien
                  Titulaire ou du Gestionnaire de stock.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-blue-800 hover:bg-blue-900 text-white font-semibold rounded"
                >
                  Initialiser la session
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewSessionModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Approbation des Écarts (Code PIN Gestionnaire / Admin) */}
      {showApproveModal && activeSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl p-6 text-slate-800 space-y-4">
            <div className="flex items-center gap-2 text-emerald-800 border-b border-slate-100 pb-3">
              <Lock className="w-5 h-5 text-emerald-700" />
              <h3 className="font-bold text-slate-900 text-sm">
                Approbation des Écarts d'Inventaire
              </h3>
            </div>

            {approveError && (
              <div className="p-2.5 bg-red-50 text-red-800 text-xs rounded border border-red-200">
                {approveError}
              </div>
            )}

            <div className="text-xs text-slate-600 space-y-2">
              <p>
                Vous vous apprêtez à valider définitivement les comptages physiques de la session{' '}
                <strong>{activeSession.sessionNumber}</strong>.
              </p>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-1">
                <div className="flex justify-between">
                  <span>Lignes avec écarts :</span>
                  <span className="font-bold text-slate-900">{itemsWithDiscrepancy.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Impact financier net :</span>
                  <span className="font-bold font-mono text-slate-900">
                    {formatCDF(netFinancialDiscrepancy)}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded border border-amber-200">
                Cette validation ajustera automatiquement les stocks théoriques de chaque lot et sera
                enregistrée avec signature d'intégrité au Journal d'Audit inaltérable.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Code PIN du Gestionnaire ou Pharmacien Titulaire :
              </label>
              <input
                type="password"
                maxLength={6}
                value={approvePin}
                onChange={(e) => setApprovePin(e.target.value)}
                placeholder="Entrez votre PIN (ex: 1234 pour Admin, 2345 pour Gérant)"
                className="w-full text-xs p-2 border border-slate-300 rounded font-mono tracking-widest text-center"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleConfirmApproval}
                className="flex-1 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded shadow-xs"
              >
                Approuver les écarts & Mettre à jour les stocks
              </button>
              <button
                onClick={() => setShowApproveModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
