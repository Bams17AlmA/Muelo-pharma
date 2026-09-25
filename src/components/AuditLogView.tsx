import React, { useEffect, useState } from 'react';
import {
  History,
  Shield,
  Download,
  Search,
  Filter,
  CheckCircle,
  FileCode,
  FileText,
  Lock,
} from 'lucide-react';
import { AuditActionType, AuditLog } from '../types/pharmacy';
import { store } from '../services/store';
import { formatDateTime } from '../utils/fefo';

export const AuditLogView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>(store.getAuditLogs());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState<string>('ALL');

  useEffect(() => {
    const unsub = store.subscribe(() => {
      setLogs(store.getAuditLogs());
    });
    return unsub;
  }, []);

  const actionTypes: Array<{ key: string; label: string }> = [
    { key: 'ALL', label: 'Toutes les actions' },
    { key: 'SALE_CREATED', label: 'Ventes' },
    { key: 'SALE_CANCELLED', label: 'Annulations de vente' },
    { key: 'BATCH_RECEPTION', label: 'Réceptions' },
    { key: 'BATCH_RECALL_BLOCK', label: 'Blocages sanitaires' },
    { key: 'INVENTORY_APPROVED', label: 'Approbations inventaire' },
    { key: 'ROLE_CHANGE', label: 'Changements de rôle' },
    { key: 'SYNC_EVENT_REPLAYED', label: 'Synchronisations' },
  ];

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entityType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.integrityHash.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAction = filterAction === 'ALL' || log.actionType === filterAction;
    return matchesSearch && matchesAction;
  });

  const handleExportCSV = () => {
    const headers = [
      'Identifiant',
      'Horodatage_UTC',
      'Utilisateur',
      'Role',
      'Type_Action',
      'Entite',
      'ID_Entite',
      'Details',
      'Terminal',
      'Signature_Integrite',
    ];

    const rows = filteredLogs.map((l) => [
      l.id,
      l.timestamp,
      `"${l.userName.replace(/"/g, '""')}"`,
      l.userRole,
      l.actionType,
      l.entityType,
      l.entityId,
      `"${l.details.replace(/"/g, '""')}"`,
      l.deviceId,
      l.integrityHash,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `journal_audit_muelo_pharm_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportJSON = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(filteredLogs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `journal_audit_muelo_pharm_${new Date().toISOString().split('T')[0]}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.removeChild(downloadAnchor);
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* En-tête & Exports */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-800" />
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Journal d'Audit Inaltérable (Append-Only Audit Trail)
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            Traçabilité complète des opérations sensibles : créations, annulations, réceptions,
            ajustements et changements de permissions
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors shadow-xs"
            title="Exporter pour inspection réglementaire (Format CSV)"
          >
            <Download className="w-3.5 h-3.5 text-blue-700" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleExportJSON}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors shadow-xs"
            title="Exporter les logs bruts (Format JSON)"
          >
            <FileCode className="w-3.5 h-3.5 text-slate-600" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* Garantie d'intégrité & Règles de conformité */}
      <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-3">
        <Lock className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold">
            Garantie de non-répudiation et intégrité cryptographique (Ordre des Pharmaciens RDC)
          </p>
          <p className="text-[11px] text-blue-800/80 mt-0.5">
            Ce registre est en écriture seule (append-only). Aucune ligne ne peut être modifiée ni
            supprimée. Chaque événement génère une signature SHA-256 scellant l'auteur, l'heure et
            l'état de la base.
          </p>
        </div>
      </div>

      {/* Barre de Recherche & Filtres interactifs */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filtrer par mot-clé, utilisateur, entité ou empreinte cryptographique..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600 focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none text-xs">
            {actionTypes.map((type) => (
              <button
                key={type.key}
                onClick={() => setFilterAction(type.key)}
                className={`px-2.5 py-1 font-medium rounded-md whitespace-nowrap transition-colors ${
                  filterAction === type.key
                    ? 'bg-blue-800 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table du Journal d'Audit */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-3 border-b border-slate-100 flex items-center justify-between">
          <span className="font-bold text-slate-900 text-xs">
            Événements d'audit horodatés ({filteredLogs.length} entrées)
          </span>
          <span className="text-[11px] text-slate-400 font-mono">Ordre antichronologique strict</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 bg-slate-50">
                <th className="py-2.5 px-3 font-semibold">Date & Heure</th>
                <th className="py-2.5 px-3 font-semibold">Opérateur & Rôle</th>
                <th className="py-2.5 px-3 font-semibold">Type d'Action</th>
                <th className="py-2.5 px-3 font-semibold">Entité</th>
                <th className="py-2.5 px-3 font-semibold">Détails de l'opération</th>
                <th className="py-2.5 px-3 font-semibold">Terminal</th>
                <th className="py-2.5 px-3 font-semibold font-mono">Empreinte SHA-256</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 font-sans">
                  <td className="py-2.5 px-3 text-slate-500 font-mono whitespace-nowrap">
                    {formatDateTime(log.timestamp)}
                  </td>

                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <div className="font-semibold text-slate-900">{log.userName}</div>
                    <div className="text-[10px] text-blue-700 font-medium">[{log.userRole}]</div>
                  </td>

                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span
                      className={`font-semibold ${
                        log.actionType.includes('CANCEL') || log.actionType.includes('BLOCK')
                          ? 'text-red-700'
                          : log.actionType.includes('APPROVED')
                          ? 'text-emerald-700'
                          : 'text-slate-800'
                      }`}
                    >
                      {log.actionType}
                    </span>
                  </td>

                  <td className="py-2.5 px-3 font-mono text-slate-600">{log.entityType}</td>

                  <td className="py-2.5 px-3 text-slate-800 max-w-md">{log.details}</td>

                  <td className="py-2.5 px-3 font-mono text-slate-400 text-[10px]">
                    {log.deviceId}
                  </td>

                  <td
                    className="py-2.5 px-3 font-mono text-slate-400 text-[10px] truncate max-w-[120px]"
                    title={log.integrityHash}
                  >
                    {log.integrityHash}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
