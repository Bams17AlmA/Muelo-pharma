import React, { useState } from 'react';
import {
  Building2, ChevronDown, User as UserIcon, ShoppingCart, Boxes, Truck,
  ClipboardList, History, FileBarChart, Info, Check, Settings, Menu, X,
  Wifi, WifiOff, Download, RefreshCw
} from 'lucide-react';
import { UserRole } from '../types/pharmacy';
import { store } from '../services/store';
import { NetworkStatusBadge } from './NetworkStatusBadge';
import { PWAInstallButton } from './PWAInstallButton';

export type NavigationTab =
  | 'pos' | 'stock' | 'receptions' | 'inventory' | 'audit' | 'reports' | 'admin' | 'scope';

interface HeaderProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  onOpenSyncModal: () => void;
}

const navItems: Array<{ id: NavigationTab; label: string; short: string; icon: React.ElementType }> = [
  { id: 'pos', label: 'Caisse', short: 'Vente', icon: ShoppingCart },
  { id: 'stock', label: 'Stocks & lots', short: 'Stocks', icon: Boxes },
  { id: 'receptions', label: 'Réceptions', short: 'Entrées', icon: Truck },
  { id: 'inventory', label: 'Inventaire', short: 'Inventaire', icon: ClipboardList },
  { id: 'audit', label: 'Journal d’audit', short: 'Journal', icon: History },
  { id: 'reports', label: 'Rapports', short: 'Rapports', icon: FileBarChart },
  { id: 'admin', label: 'Administration', short: 'Admin', icon: Settings },
  { id: 'scope', label: 'À propos', short: 'À propos', icon: Info },
];

export const Header: React.FC<HeaderProps> = ({ currentTab, onSelectTab, onOpenSyncModal }) => {
  const currentPharmacy = store.getCurrentPharmacy();
  const currentUser = store.getCurrentUser();
  const pharmacies = store.getPharmacies();
  const users = store.getUsers();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [menu, setMenu] = useState<'pharmacy' | 'user' | null>(null);

  const getRoleLabel = (role: UserRole) => ({
    ADMIN: 'Administrateur',
    MANAGER: 'Gestionnaire',
    CASHIER: 'Caissier',
  }[role]);

  const selectTab = (tab: NavigationTab) => {
    onSelectTab(tab);
    setMobileOpen(false);
    setMenu(null);
  };

  return (
    <>
      <header className="muelo-header">
        <div className="muelo-header-main">
          <button className="muelo-mobile-menu" onClick={() => setMobileOpen(v => !v)} aria-label="Ouvrir le menu">
            {mobileOpen ? <X /> : <Menu />}
          </button>

          <button className="muelo-brand" onClick={() => selectTab('pos')} aria-label="Muelo PHARM — Caisse">
            <span className="muelo-brand-mark">M<span>P</span></span>
            <span className="muelo-brand-copy">
              <strong>Muelo <em>PHARM</em></strong>
              <small>Gestion d’officine</small>
            </span>
          </button>

          <div className="muelo-context">
            <div className="muelo-context-pill">
              <Building2 size={15} />
              <span>{currentPharmacy.name}</span>
              <ChevronDown size={13} />
            </div>
            <span className="muelo-context-location">{currentPharmacy.commune}, {currentPharmacy.city}</span>
          </div>

          <div className="muelo-header-actions">
            <NetworkStatusBadge onOpenSyncModal={onOpenSyncModal} />
            <PWAInstallButton />

            <div className="muelo-menu-wrap">
              <button
                className="muelo-user-trigger"
                onClick={() => { setMenu(menu === 'user' ? null : 'user'); }}
                aria-label="Profil utilisateur"
              >
                <span className="muelo-avatar">{currentUser.name.slice(0, 1).toUpperCase()}</span>
                <span className="muelo-user-copy">
                  <strong>{currentUser.name}</strong>
                  <small>{getRoleLabel(currentUser.role)}</small>
                </span>
                <ChevronDown size={14} />
              </button>
              {menu === 'user' && (
                <div className="muelo-popover muelo-user-popover">
                  <div className="muelo-popover-head">
                    <strong>Changer d’utilisateur</strong>
                    <small>Les droits suivent le rôle actif.</small>
                  </div>
                  {users.map(u => (
                    <button key={u.id} className="muelo-menu-item" onClick={() => {
                      store.setCurrentUser(u.id); setMenu(null);
                    }}>
                      <span className="muelo-avatar small">{u.name.slice(0, 1).toUpperCase()}</span>
                      <span><strong>{u.name}</strong><small>{getRoleLabel(u.role)}</small></span>
                      {u.id === currentUser.id && <Check size={16} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <nav className="muelo-nav" aria-label="Navigation principale">
          <div className="muelo-nav-inner">
            {navItems.map(item => {
              const Icon = item.icon;
              const active = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  className={`muelo-nav-item ${active ? 'active' : ''} ${item.id === 'admin' ? 'admin' : ''}`}
                  onClick={() => selectTab(item.id)}
                  title={item.label}
                >
                  <Icon size={17} strokeWidth={active ? 2.4 : 1.9} />
                  <span>{item.label}</span>
                </button>
              );
            })}
            <div className="muelo-nav-spacer" />
            <button className="muelo-nav-sync" onClick={onOpenSyncModal} title="Synchronisation">
              <RefreshCw size={16} />
              <span>Synchronisation</span>
            </button>
          </div>
        </nav>
      </header>

      {mobileOpen && (
        <div className="muelo-mobile-drawer">
          <div className="muelo-mobile-drawer-head">
            <span>Navigation</span>
            <button onClick={() => setMobileOpen(false)}><X size={18} /></button>
          </div>
          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={`muelo-mobile-item ${currentTab === item.id ? 'active' : ''}`}
                onClick={() => selectTab(item.id)}
              >
                <Icon size={19} />
                <span>{item.label}</span>
              </button>
            );
          })}
          <div className="muelo-mobile-divider" />
          <button className="muelo-mobile-item" onClick={onOpenSyncModal}>
            <RefreshCw size={19} /><span>Synchronisation</span>
          </button>
        </div>
      )}

      {menu === 'pharmacy' && (
        <div className="muelo-popover muelo-pharmacy-popover">
          <div className="muelo-popover-head">
            <strong>Établissement</strong>
            <small>Choisissez l’officine active.</small>
          </div>
          {pharmacies.map(p => (
            <button key={p.id} className="muelo-menu-item" onClick={() => {
              store.setCurrentPharmacy(p.id); setMenu(null);
            }}>
              <span className="muelo-menu-icon"><Building2 size={16} /></span>
              <span><strong>{p.name}</strong><small>{p.commune}, {p.city}</small></span>
              {p.id === currentPharmacy.id && <Check size={16} />}
            </button>
          ))}
        </div>
      )}
    </>
  );
};
