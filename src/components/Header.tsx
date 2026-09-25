import React, { useState } from 'react';
import {
  Building2,
  ChevronDown,
  ShieldCheck,
  User as UserIcon,
  ShoppingCart,
  Boxes,
  Truck,
  ClipboardList,
  History,
  FileBarChart,
  Info,
  Check,
  Settings,
} from 'lucide-react';
import { Pharmacy, User, UserRole } from '../types/pharmacy';
import { store } from '../services/store';
import { NetworkStatusBadge } from './NetworkStatusBadge';
import { PWAInstallButton } from './PWAInstallButton';

export type NavigationTab =
  | 'pos'
  | 'stock'
  | 'receptions'
  | 'inventory'
  | 'audit'
  | 'reports'
  | 'admin'
  | 'scope';

interface HeaderProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  onOpenSyncModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  onOpenSyncModal,
}) => {
  const currentPharmacy = store.getCurrentPharmacy();
  const currentUser = store.getCurrentUser();
  const pharmacies = store.getPharmacies();
  const users = store.getUsers();

  const [showPharmacyMenu, setShowPharmacyMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return 'Administrateur / Titulaire';
      case 'MANAGER':
        return 'Gestionnaire de Pharmacie';
      case 'CASHIER':
        return 'Vendeur / Caissier';
    }
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return 'text-purple-700 bg-purple-50 border-purple-200';
      case 'MANAGER':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'CASHIER':
        return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
      {/* Top Banner: Brand, Pharmacy Tenant, User, Network Status */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-800 flex items-center justify-center text-white font-black text-xl shadow-xs tracking-tighter">
              <span className="text-sky-300">M</span>P
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 tracking-tight text-base sm:text-lg">
                  Muelo PHARM
                </span>
                <span className="text-[11px] font-semibold text-blue-800 uppercase tracking-widest bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                  MVP RDC
                </span>
              </div>
              <div className="text-xs text-slate-500 hidden sm:block">
                Gestion pharmaceutique & FEFO · Mode hors ligne
              </div>
            </div>
          </div>

          {/* Controls: Pharmacy Selector, User/Role Switcher, Network, PWA */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Network Indicator & Offline Sim */}
            <NetworkStatusBadge onOpenSyncModal={onOpenSyncModal} />

            {/* PWA Install */}
            <PWAInstallButton />

            {/* Pharmacy Tenant Switcher */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowPharmacyMenu(!showPharmacyMenu);
                  setShowUserMenu(false);
                }}
                className="flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-md border border-slate-200 transition-colors"
                title="Changer d'établissement pharmaceutique (Multi-tenants)"
              >
                <Building2 className="w-3.5 h-3.5 text-blue-700" />
                <span className="hidden md:inline font-semibold">{currentPharmacy.name}</span>
                <span className="md:hidden font-semibold">{currentPharmacy.city}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {showPharmacyMenu && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-xl border border-slate-200 py-1.5 z-50 text-xs">
                  <div className="px-3 py-2 border-b border-slate-100 bg-slate-50">
                    <p className="font-semibold text-slate-900">Établissements (Multi-tenants)</p>
                    <p className="text-[11px] text-slate-500">Chaque pharmacie a son propre espace isolé</p>
                  </div>
                  {pharmacies.map((pharmacy) => (
                    <button
                      key={pharmacy.id}
                      onClick={() => {
                        store.setCurrentPharmacy(pharmacy.id);
                        setShowPharmacyMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-start justify-between gap-2"
                    >
                      <div>
                        <div className="font-medium text-slate-800">{pharmacy.name}</div>
                        <div className="text-[11px] text-slate-500">
                          {pharmacy.commune}, {pharmacy.city} · N° {pharmacy.licenseNumber}
                        </div>
                      </div>
                      {pharmacy.id === currentPharmacy.id && (
                        <Check className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* User & Role Switcher (Least Privilege) */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowUserMenu(!showUserMenu);
                  setShowPharmacyMenu(false);
                }}
                className={`flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors ${getRoleColor(
                  currentUser.role
                )}`}
                title="Profil utilisateur & rôle actuel (Moindre privilège)"
              >
                <UserIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline font-medium">{currentUser.name}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  [{currentUser.role}]
                </span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-slate-200 py-1.5 z-50 text-xs">
                  <div className="px-3 py-2 border-b border-slate-100 bg-slate-50">
                    <p className="font-semibold text-slate-900">Changer de compte utilisateur</p>
                    <p className="text-[11px] text-slate-500">
                      Principe du moindre privilège appliqué
                    </p>
                  </div>
                  {users.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        store.setCurrentUser(u.id);
                        setShowUserMenu(false);
                      }}
                      className="w-full text-left px-3 py-2.5 hover:bg-slate-50 flex items-start justify-between gap-2 border-b border-slate-50"
                    >
                      <div>
                        <div className="font-semibold text-slate-800">{u.name}</div>
                        <div className="text-[11px] text-blue-700 font-medium">
                          {getRoleLabel(u.role)}
                        </div>
                        <div className="text-[10px] text-slate-400">PIN: {u.pinCode}</div>
                      </div>
                      {u.id === currentUser.id && (
                        <Check className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                      )}
                    </button>
                  ))}
                  <div className="px-3 py-2 text-[11px] text-slate-500 bg-slate-50">
                    <p>
                      <strong>Admin :</strong> Accès total + annulations & audit
                    </p>
                    <p>
                      <strong>Gestionnaire :</strong> Commandes, réceptions, stocks & inventaires
                    </p>
                    <p>
                      <strong>Vendeur :</strong> Caisse & comptage (annulation restreinte)
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Primary Navigation Tabs */}
      <div className="border-t border-slate-200 bg-slate-50 overflow-x-auto scrollbar-none">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <nav className="flex space-x-1 sm:space-x-4 py-1.5">
            <button
              onClick={() => onSelectTab('pos')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                currentTab === 'pos'
                  ? 'bg-blue-800 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Caisse & Vente au détail</span>
            </button>

            <button
              onClick={() => onSelectTab('stock')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                currentTab === 'stock'
                  ? 'bg-blue-800 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Boxes className="w-4 h-4" />
              <span>Stocks & Lots FEFO</span>
            </button>

            <button
              onClick={() => onSelectTab('receptions')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                currentTab === 'receptions'
                  ? 'bg-blue-800 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>Réceptions & Fournisseurs</span>
            </button>

            <button
              onClick={() => onSelectTab('inventory')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                currentTab === 'inventory'
                  ? 'bg-blue-800 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              <span>Inventaire Tournant</span>
            </button>

            <button
              onClick={() => onSelectTab('audit')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                currentTab === 'audit'
                  ? 'bg-blue-800 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Journal d'Audit</span>
            </button>

            <button
              onClick={() => onSelectTab('reports')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                currentTab === 'reports'
                  ? 'bg-blue-800 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <FileBarChart className="w-4 h-4" />
              <span>Rapports & Exports</span>
            </button>

            <button
              onClick={() => onSelectTab('admin')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                currentTab === 'admin'
                  ? 'bg-purple-800 text-white shadow-xs'
                  : 'text-purple-700 hover:text-purple-900 hover:bg-purple-100/60 bg-purple-50/70 border border-purple-200/50'
              }`}
            >
              <Settings className="w-4 h-4 text-purple-400" />
              <span>Administration & Paramètres</span>
              {currentUser.role === 'ADMIN' && (
                <span className="text-[9px] bg-purple-200 text-purple-900 px-1 rounded font-bold">
                  Admin
                </span>
              )}
            </button>

            <button
              onClick={() => onSelectTab('scope')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                currentTab === 'scope'
                  ? 'bg-blue-800 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Info className="w-4 h-4" />
              <span>Périmètre MVP & Garde-fous</span>
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};
