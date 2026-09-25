import React, { useState } from 'react';
import { Header, NavigationTab } from './components/Header';
import { POSView } from './components/POSView';
import { StockView } from './components/StockView';
import { ReceptionsView } from './components/ReceptionsView';
import { InventoryView } from './components/InventoryView';
import { AuditLogView } from './components/AuditLogView';
import { ReportsView } from './components/ReportsView';
import { AdminSettingsView } from './components/AdminSettingsView';
import { ScopeAndAboutView } from './components/ScopeAndAboutView';
import { OfflineSyncModal } from './components/OfflineSyncModal';
import { store } from './services/store';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavigationTab>('pos');
  const [showSyncModal, setShowSyncModal] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-blue-600 selection:text-white">
      {/* Header avec Navigation, Sélecteur Multi-Établissements, Moindre Privilège, PWA & Mode Réseau */}
      <Header
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenSyncModal={() => setShowSyncModal(true)}
      />

      {/* Vue Principale */}
      <main className="flex-1 pb-12">
        {currentTab === 'pos' && <POSView />}
        {currentTab === 'stock' && <StockView />}
        {currentTab === 'receptions' && <ReceptionsView />}
        {currentTab === 'inventory' && <InventoryView />}
        {currentTab === 'audit' && <AuditLogView />}
        {currentTab === 'reports' && <ReportsView />}
        {currentTab === 'admin' && <AdminSettingsView />}
        {currentTab === 'scope' && <ScopeAndAboutView />}
      </main>

      {/* Modal File de Synchronisation & Résolution de Conflits */}
      {showSyncModal && <OfflineSyncModal onClose={() => setShowSyncModal(false)} />}

      {/* Pied de page institutionnel conforme RDC */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <span className="font-bold text-slate-700">Muelo PHARM</span> (v1.0 MVP — Phase 2) ·
            République Démocratique du Congo
          </div>
          <div className="text-[11px] text-slate-400">
            Conforme aux normes de traçabilité pharmaceutique · Zéro perte de transaction hors ligne
          </div>
        </div>
      </footer>
    </div>
  );
}
