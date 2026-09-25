import React, { useState } from 'react';
import {
  RefreshCw,
  X,
  AlertTriangle,
  CheckCircle,
  CloudOff,
  Cloud,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { SyncEvent } from '../types/pharmacy';
import { store } from '../services/store';
import { formatDateTime } from '../utils/fefo';

interface OfflineSyncModalProps {
  onClose: () => void;
}

export const OfflineSyncModal: React.FC<OfflineSyncModalProps> = ({ onClose }) => {
  const [syncQueue, setSyncQueue] = useState<SyncEvent[]>(store.getSyncQueue());
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeConflictEvent, setActiveConflictEvent] = useState<SyncEvent | null>(
    syncQueue.find((e) => e.status === 'CONFLICT') || null
  );
  const [resolutionChoice, setResolutionChoice] = useState<'SUBSTITUTE_FEFO' | 'USE_REMOTE' | 'CANCEL_TRANSACTION'>('SUBSTITUTE_FEFO');
  const [resolutionNotes, setResolutionNotes] = useState('');

  const isOnline = store.isNetworkConnected();

  const handleSyncNow = async () => {
    setIsSyncing(true);
    try {
      const res = await store.triggerSync();
      const updatedQueue = store.getSyncQueue();
      setSyncQueue(updatedQueue);
      const nextConflict = updatedQueue.find((e) => e.status === 'CONFLICT');
      setActiveConflictEvent(nextConflict || null);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleResolveConflict = () => {
    if (!activeConflictEvent) return;
    store.resolveConflict(activeConflictEvent.id, resolutionChoice, resolutionNotes || 'Arbitrage manuel de conformité');
    const updatedQueue = store.getSyncQueue();
    setSyncQueue(updatedQueue);
    setActiveConflictEvent(updatedQueue.find((e) => e.status === 'CONFLICT') || null);
    setResolutionNotes('');
  };

  const pendingEvents = syncQueue.filter((e) => e.status === 'PENDING');
  const conflictEvents = syncQueue.filter((e) => e.status === 'CONFLICT');
  const syncedEvents = syncQueue.filter((e) => e.status === 'SYNCED');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl p-6 text-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-blue-800" />
            <h3 className="font-bold text-slate-900 text-sm">
              File de Synchronisation Hors Ligne & Résolution de Conflits
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* État de la connectivité */}
        <div className="flex items-center justify-between p-3 rounded-lg border text-xs bg-slate-50 border-slate-200">
          <div className="flex items-center gap-2">
            {isOnline ? (
              <>
                <Cloud className="w-4 h-4 text-emerald-600" />
                <span className="font-semibold text-slate-800">
                  Connectivité : En Ligne (Serveur accessible)
                </span>
              </>
            ) : (
              <>
                <CloudOff className="w-4 h-4 text-amber-700" />
                <span className="font-semibold text-slate-800">
                  Connectivité : Mode Hors Ligne (Transactions sécurisées en local)
                </span>
              </>
            )}
          </div>

          {isOnline && (
            <button
              onClick={handleSyncNow}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-800 hover:bg-blue-900 text-white font-semibold rounded-md shadow-xs disabled:opacity-50 text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Synchronisation...' : 'Synchroniser la file'}</span>
            </button>
          )}
        </div>

        {/* Section Conflit Explicite (Si détecté) */}
        {activeConflictEvent && activeConflictEvent.conflictDetails && (
          <div className="p-4 bg-red-50 border border-red-300 rounded-xl space-y-3">
            <div className="flex items-center gap-2 text-red-900 font-bold text-xs">
              <ShieldAlert className="w-4 h-4 text-red-600" />
              <span>Conflit de Synchronisation Détecté — Règle : Zéro écrasement silencieux !</span>
            </div>

            <p className="text-xs text-red-800">
              {activeConflictEvent.conflictDetails.message}
            </p>

            <div className="bg-white p-3 rounded-lg border border-red-200 text-xs space-y-2">
              <div className="font-semibold text-slate-800">
                Sélectionnez la résolution explicite à appliquer :
              </div>
              <div className="space-y-1.5">
                {activeConflictEvent.conflictDetails.resolutionOptions.map((opt) => (
                  <label
                    key={opt.key}
                    className={`flex items-start gap-2 p-2 rounded border cursor-pointer ${
                      resolutionChoice === opt.key
                        ? 'border-blue-500 bg-blue-50/50'
                        : 'border-slate-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name="resolution"
                      value={opt.key}
                      checked={resolutionChoice === opt.key}
                      onChange={() => setResolutionChoice(opt.key as any)}
                      className="mt-0.5 text-blue-800"
                    />
                    <div>
                      <div className="font-semibold text-slate-800">{opt.label}</div>
                      <div className="text-[11px] text-slate-500">{opt.description}</div>
                    </div>
                  </label>
                ))}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Justification d'arbitrage (consignée en audit) :
                </label>
                <input
                  type="text"
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Ex: Remplacement par lot sain disponible au rayon B1..."
                  className="w-full text-xs p-1.5 border border-slate-300 rounded"
                />
              </div>

              <button
                onClick={handleResolveConflict}
                className="w-full py-2 bg-red-700 hover:bg-red-800 text-white font-bold rounded text-xs shadow-xs"
              >
                Valider la résolution du conflit et consigner au Journal d'Audit
              </button>
            </div>
          </div>
        )}

        {/* Détails de la file d'attente */}
        <div className="space-y-2">
          <h4 className="font-bold text-xs text-slate-700">
            Historique des événements locaux ({syncQueue.length} transactions)
          </h4>

          {syncQueue.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs border border-dashed rounded-lg">
              Toutes les transactions sont synchronisées avec succès.
            </div>
          ) : (
            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-lg">
              {syncQueue.map((evt) => (
                <div key={evt.id} className="p-3 text-xs flex items-center justify-between hover:bg-slate-50">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-slate-800">
                        {evt.entity} : {evt.action}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                          evt.status === 'SYNCED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : evt.status === 'CONFLICT'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {evt.status === 'SYNCED'
                          ? 'Synchronisé'
                          : evt.status === 'CONFLICT'
                          ? 'Conflit'
                          : 'En attente'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      UUID: {evt.id} · Horodatage local: {formatDateTime(evt.clientTimestamp)}
                    </div>
                  </div>

                  {evt.status === 'CONFLICT' && (
                    <button
                      onClick={() => setActiveConflictEvent(evt)}
                      className="px-2.5 py-1 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded border border-red-200"
                    >
                      Résoudre
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded text-xs"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
