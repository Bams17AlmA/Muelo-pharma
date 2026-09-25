import React, { useEffect, useState } from 'react';
import { Cloud, CloudOff, RefreshCw, AlertTriangle } from 'lucide-react';
import { store } from '../services/store';

interface NetworkStatusBadgeProps {
  onOpenSyncModal: () => void;
}

export const NetworkStatusBadge: React.FC<NetworkStatusBadgeProps> = ({ onOpenSyncModal }) => {
  const [isOfflineSimulated, setIsOfflineSimulated] = useState(store.isOfflineSimulated());
  const [isOnline, setIsOnline] = useState(store.isNetworkConnected());
  const [syncQueue, setSyncQueue] = useState(store.getSyncQueue());
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      setIsOfflineSimulated(store.isOfflineSimulated());
      setIsOnline(store.isNetworkConnected());
      setSyncQueue(store.getSyncQueue());
    });

    const handleBrowserOnline = () => {
      setIsOnline(store.isNetworkConnected());
      store.triggerSync();
    };

    const handleBrowserOffline = () => {
      setIsOnline(store.isNetworkConnected());
    };

    window.addEventListener('online', handleBrowserOnline);
    window.addEventListener('offline', handleBrowserOffline);

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleBrowserOnline);
      window.removeEventListener('offline', handleBrowserOffline);
    };
  }, []);

  const handleToggleOfflineSimulation = () => {
    const nextState = !isOfflineSimulated;
    store.setOfflineSimulated(nextState);
    if (!nextState) {
      // Retour en ligne -> tenter la synchro
      handleTriggerSync();
    }
  };

  const handleTriggerSync = async () => {
    setIsSyncing(true);
    try {
      await store.triggerSync();
    } finally {
      setIsSyncing(false);
    }
  };

  const pendingCount = syncQueue.filter((e) => e.status === 'PENDING').length;
  const conflictCount = syncQueue.filter((e) => e.status === 'CONFLICT').length;

  return (
    <div className="flex items-center gap-2">
      {/* Bouton de simulation réseau RDC (indispensable pour valider le fonctionnement hors ligne) */}
      <button
        onClick={handleToggleOfflineSimulation}
        className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border transition-colors ${
          isOfflineSimulated
            ? 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100'
            : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
        }`}
        title="Simuler une coupure de réseau internet locale (RDC) pour tester la file hors ligne"
      >
        {isOfflineSimulated ? (
          <>
            <CloudOff className="w-3.5 h-3.5 text-amber-700" />
            <span>Mode Hors Ligne (Simulé)</span>
          </>
        ) : (
          <>
            <Cloud className="w-3.5 h-3.5 text-emerald-600" />
            <span>Connectivité : En Ligne</span>
          </>
        )}
      </button>

      {/* Indicateur de la file de synchro */}
      {(pendingCount > 0 || conflictCount > 0) && (
        <button
          onClick={onOpenSyncModal}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
            conflictCount > 0
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
          title="Consulter la file d'attente de synchronisation et les éventuels conflits"
        >
          {conflictCount > 0 ? (
            <AlertTriangle className="w-3.5 h-3.5 text-amber-200 animate-pulse" />
          ) : (
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          )}
          <span>
            {conflictCount > 0
              ? `${conflictCount} conflit(s) à résoudre`
              : `${pendingCount} en attente de synchro`}
          </span>
        </button>
      )}

      {/* Bouton Synchro manuelle si en ligne avec des éléments en attente */}
      {isOnline && pendingCount > 0 && conflictCount === 0 && (
        <button
          onClick={handleTriggerSync}
          disabled={isSyncing}
          className="p-1 text-slate-500 hover:text-blue-700 rounded-md hover:bg-slate-100"
          title="Forcer la synchronisation immédiate"
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
        </button>
      )}
    </div>
  );
};
