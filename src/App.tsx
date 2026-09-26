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

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavigationTab>('pos');
  const [showSyncModal, setShowSyncModal] = useState(false);

  return (
    <div className="min-h-screen flex flex-col muelo-app">
      <Header
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenSyncModal={() => setShowSyncModal(true)}
      />

      <main className="flex-1 pb-12 muelo-main">
        {currentTab === 'pos' && <POSView />}
        {currentTab === 'stock' && <StockView />}
        {currentTab === 'receptions' && <ReceptionsView />}
        {currentTab === 'inventory' && <InventoryView />}
        {currentTab === 'audit' && <AuditLogView />}
        {currentTab === 'reports' && <ReportsView />}
        {currentTab === 'admin' && <AdminSettingsView />}
        {currentTab === 'scope' && <ScopeAndAboutView />}
      </main>

      {showSyncModal && <OfflineSyncModal onClose={() => setShowSyncModal(false)} />}

      <footer className="border-t py-4 text-center text-xs">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <span className="font-bold text-slate-700">Muelo PHARM</span> · MVP Phase 2 · RDC
          </div>
          <div className="text-[11px] text-slate-400">
            Traçabilité pharmaceutique · Transactions hors ligne résilientes
          </div>
        </div>
      </footer>
    </div>
  );
}
