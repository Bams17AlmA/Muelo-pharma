import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  Settings,
  Database,
  Shield,
  UserPlus,
  Edit,
  Trash2,
  KeyRound,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
  Upload,
  RefreshCw,
  Building2,
  Save,
  Search,
  Check,
  X,
  HardDrive,
  Eye,
  EyeOff,
  Table,
  Plus,
  MapPin,
  Phone,
  Mail,
  Coins,
  Store,
  ExternalLink,
} from 'lucide-react';
import {
  User,
  UserRole,
  PermissionKey,
  Pharmacy,
  SYSTEM_PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
  DatabaseStats,
  DatabaseBackupPayload,
} from '../types/pharmacy';
import { store } from '../services/store';
import { generateUUID } from '../utils/fefo';

export const AdminSettingsView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'permissions' | 'pharmacies' | 'settings' | 'database'>('users');
  const [, setTick] = useState(0);

  // Active pharmacy and user
  const currentPharmacy = store.getCurrentPharmacy();
  const currentUser = store.getCurrentUser();
  const users = store.getUsers();
  const pharmacies = store.getPharmacies();

  // Search in user list
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');

  // Modals state for users
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [permissionsUser, setPermissionsUser] = useState<User | null>(null);
  const [pinResetUser, setPinResetUser] = useState<User | null>(null);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<User | null>(null);

  // Modals state for pharmacies
  const [showCreatePharmacyModal, setShowCreatePharmacyModal] = useState(false);
  const [deleteConfirmPharmacy, setDeleteConfirmPharmacy] = useState<Pharmacy | null>(null);

  // Database actions modals
  const [purgeConfirm, setPurgeConfirm] = useState(false);
  const [resetDbConfirm, setResetDbConfirm] = useState(false);

  // Form states for user creation
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('CASHIER');
  const [newUserPin, setNewUserPin] = useState('1234');
  const [newUserPharmacyId, setNewUserPharmacyId] = useState(currentPharmacy.id);
  const [formError, setFormError] = useState('');

  // Form states for pharmacy creation
  const [newPharmaCode, setNewPharmaCode] = useState('');
  const [newPharmaName, setNewPharmaName] = useState('');
  const [newPharmaLegal, setNewPharmaLegal] = useState('');
  const [newPharmaLicense, setNewPharmaLicense] = useState('');
  const [newPharmaChief, setNewPharmaChief] = useState('');
  const [newPharmaAddress, setNewPharmaAddress] = useState('');
  const [newPharmaCommune, setNewPharmaCommune] = useState('');
  const [newPharmaCity, setNewPharmaCity] = useState('Kinshasa');
  const [newPharmaProvince, setNewPharmaProvince] = useState('Kinshasa');
  const [newPharmaPhone, setNewPharmaPhone] = useState('');
  const [newPharmaEmail, setNewPharmaEmail] = useState('');
  const [newPharmaCurrency, setNewPharmaCurrency] = useState<'CDF' | 'USD'>('CDF');
  const [newPharmaExchangeRate, setNewPharmaExchangeRate] = useState<number>(2850);
  const [newPharmaTaxRate, setNewPharmaTaxRate] = useState<number>(0);
  const [newPharmaActivateNow, setNewPharmaActivateNow] = useState<boolean>(true);
  const [pharmaFormError, setPharmaFormError] = useState<string>('');

  // Form state for PIN reset
  const [newPinCode, setNewPinCode] = useState('');
  const [pinError, setPinError] = useState('');

  // Permissions modal state
  const [selectedPermissions, setSelectedPermissions] = useState<PermissionKey[]>([]);

  // Visible PINs toggle
  const [showPins, setShowPins] = useState<Record<string, boolean>>({});

  // Pharmacy settings form state (selected pharmacy to edit in settings tab)
  const [selectedConfigPharmacyId, setSelectedConfigPharmacyId] = useState<string>(currentPharmacy.id);
  const [pharmacyForm, setPharmacyForm] = useState<Pharmacy>({ ...currentPharmacy });
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Database stats & actions state
  const [dbStats, setDbStats] = useState<DatabaseStats>(store.getDatabaseStats());
  const [dbActionStatus, setDbActionStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [selectedTablePreview, setSelectedTablePreview] = useState<string>('users');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync store updates
  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      setTick((t) => t + 1);
      setDbStats(store.getDatabaseStats());
      const p = store.getPharmacies().find((x) => x.id === selectedConfigPharmacyId) || store.getCurrentPharmacy();
      setPharmacyForm({ ...p });
    });
    return unsubscribe;
  }, [selectedConfigPharmacyId]);

  // Update form when target pharmacy changes
  const handleSelectPharmacyToEdit = (pharmaId: string) => {
    setSelectedConfigPharmacyId(pharmaId);
    const p = pharmacies.find((x) => x.id === pharmaId) || currentPharmacy;
    setPharmacyForm({ ...p });
    setSaveSuccessMsg('');
  };

  // Filtered users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.phone && u.phone.includes(userSearch));
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const isCurrentUserAdmin = currentUser.role === 'ADMIN';

  // Toggle pin visibility
  const togglePin = (userId: string) => {
    setShowPins((prev) => ({ ...prev, [userId]: !prev[userId] }));
  };

  // Open modal for creating a new pharmacy
  const openCreatePharmacyModal = () => {
    const nextNum = (pharmacies.length + 1).toString().padStart(3, '0');
    setNewPharmaCode(`PH-KIN-${nextNum}`);
    setNewPharmaName('');
    setNewPharmaLegal('Pharmacie SARL');
    setNewPharmaLicense(`MS-RDC/DPS/KIN/${Math.floor(1000 + Math.random() * 9000)}/2026`);
    setNewPharmaChief('Dr. (Titulaire CNOP)');
    setNewPharmaAddress('');
    setNewPharmaCommune('Gombe');
    setNewPharmaCity('Kinshasa');
    setNewPharmaProvince('Kinshasa');
    setNewPharmaPhone('+243 81 000 0000');
    setNewPharmaEmail('contact@officine.cd');
    setNewPharmaCurrency('CDF');
    setNewPharmaExchangeRate(2850);
    setNewPharmaTaxRate(0);
    setNewPharmaActivateNow(true);
    setPharmaFormError('');
    setShowCreatePharmacyModal(true);
  };

  // Handle pharmacy creation
  const handleCreatePharmacy = (e: React.FormEvent) => {
    e.preventDefault();
    setPharmaFormError('');

    if (!newPharmaName.trim() || !newPharmaCode.trim()) {
      setPharmaFormError('Le code et le nom de l\'établissement sont obligatoires.');
      return;
    }

    if (pharmacies.some((p) => p.code.toLowerCase() === newPharmaCode.trim().toLowerCase())) {
      setPharmaFormError('Un établissement avec ce code existe déjà.');
      return;
    }

    const newPharmacy: Pharmacy = {
      id: generateUUID(),
      code: newPharmaCode.trim().toUpperCase(),
      name: newPharmaName.trim(),
      legalEntity: newPharmaLegal.trim() || newPharmaName.trim(),
      address: newPharmaAddress.trim() || 'Avenue Principale',
      commune: newPharmaCommune.trim() || 'Commune',
      city: newPharmaCity.trim() || 'Kinshasa',
      province: newPharmaProvince.trim() || 'Kinshasa',
      phone: newPharmaPhone.trim() || '+243 00 000 0000',
      email: newPharmaEmail.trim() || 'contact@officine.cd',
      licenseNumber: newPharmaLicense.trim() || 'MS-RDC/DPS/2026',
      chiefPharmacist: newPharmaChief.trim() || 'Pharmacien Titulaire',
      currencyDefault: newPharmaCurrency,
      exchangeRateUsdToCdf: Number(newPharmaExchangeRate) || 2850,
      taxRatePercent: Number(newPharmaTaxRate) || 0,
    };

    store.addPharmacy(newPharmacy);

    if (newPharmaActivateNow) {
      store.setCurrentPharmacy(newPharmacy.id);
      setSelectedConfigPharmacyId(newPharmacy.id);
      setPharmacyForm({ ...newPharmacy });
    }

    setShowCreatePharmacyModal(false);
    setDbActionStatus({
      type: 'success',
      message: `Nouvel établissement "${newPharmacy.name}" (${newPharmacy.city}) créé avec succès !`,
    });
  };

  // Handle pharmacy deletion
  const handleDeletePharmacy = () => {
    if (!deleteConfirmPharmacy) return;
    const res = store.deletePharmacy(deleteConfirmPharmacy.id);
    if (!res.success) {
      alert(res.message);
    } else {
      setDbActionStatus({
        type: 'success',
        message: `Établissement "${deleteConfirmPharmacy.name}" supprimé avec succès.`,
      });
    }
    setDeleteConfirmPharmacy(null);
  };

  // Handle user creation
  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!newUserName.trim() || !newUserEmail.trim()) {
      setFormError('Le nom complet et l\'adresse email sont obligatoires.');
      return;
    }

    if (users.some((u) => u.email.toLowerCase() === newUserEmail.trim().toLowerCase())) {
      setFormError('Un utilisateur avec cette adresse email existe déjà.');
      return;
    }

    if (!/^\d{4,6}$/.test(newUserPin)) {
      setFormError('Le code PIN doit comporter entre 4 et 6 chiffres numériques.');
      return;
    }

    store.createUser({
      name: newUserName,
      email: newUserEmail,
      role: newUserRole,
      phone: newUserPhone,
      pinCode: newUserPin,
      pharmacyId: newUserPharmacyId,
    });

    setNewUserName('');
    setNewUserEmail('');
    setNewUserPhone('');
    setNewUserRole('CASHIER');
    setNewUserPin('1234');
    setShowCreateUserModal(false);
  };

  // Handle user edition
  const handleUpdateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    if (!editingUser.name.trim() || !editingUser.email.trim()) {
      setFormError('Le nom et l\'email ne peuvent pas être vides.');
      return;
    }

    store.updateUser(editingUser);
    setEditingUser(null);
  };

  // Open permissions manager for a user
  const openPermissionsModal = (user: User) => {
    setPermissionsUser(user);
    const initialPerms = user.customPermissions && user.customPermissions.length > 0
      ? [...user.customPermissions]
      : [...DEFAULT_ROLE_PERMISSIONS[user.role]];
    setSelectedPermissions(initialPerms);
  };

  // Save customized permissions
  const handleSavePermissions = () => {
    if (!permissionsUser) return;
    store.updateUserPermissions(permissionsUser.id, selectedPermissions);
    setPermissionsUser(null);
  };

  // Reset to role default permissions
  const handleResetToRolePermissions = () => {
    if (!permissionsUser) return;
    setSelectedPermissions([...DEFAULT_ROLE_PERMISSIONS[permissionsUser.role]]);
  };

  // Handle PIN reset
  const handleResetPinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');

    if (!/^\d{4,6}$/.test(newPinCode)) {
      setPinError('Le code PIN doit être composé de 4 à 6 chiffres.');
      return;
    }

    if (!pinResetUser) return;
    store.resetUserPin(pinResetUser.id, newPinCode);
    setPinResetUser(null);
    setNewPinCode('');
  };

  // Handle user deletion
  const handleDeleteUser = () => {
    if (!deleteConfirmUser) return;
    const res = store.deleteUser(deleteConfirmUser.id);
    if (!res.success) {
      alert(res.message);
    }
    setDeleteConfirmUser(null);
  };

  // Handle pharmacy settings update
  const handleSavePharmacySettings = (e: React.FormEvent) => {
    e.preventDefault();
    store.updatePharmacy(pharmacyForm);
    setSaveSuccessMsg(`Paramètres de l'officine "${pharmacyForm.name}" enregistrés avec succès !`);
    setTimeout(() => setSaveSuccessMsg(''), 4000);
  };

  // Database Backup Export (JSON)
  const handleExportBackup = () => {
    const backup = store.exportDatabaseBackup();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backup, null, 2));
    const downloadAnchor = document.createElement('a');
    const dateFormatted = new Date().toISOString().split('T')[0];
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `muelo_pharm_backup_${currentPharmacy.code}_${dateFormatted}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    setDbActionStatus({
      type: 'success',
      message: 'Sauvegarde complète exportée avec succès sous format JSON.',
    });
  };

  // Database Backup Import (JSON)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const file = e.target.files?.[0];
    if (!file) return;

    fileReader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content) as DatabaseBackupPayload;
        const res = store.importDatabaseBackup(parsed);
        if (res.success) {
          setDbActionStatus({ type: 'success', message: res.message });
        } else {
          setDbActionStatus({ type: 'error', message: res.message });
        }
      } catch (err: any) {
        setDbActionStatus({
          type: 'error',
          message: `Fichier JSON corrompu ou illisible : ${err.message}`,
        });
      }
    };
    fileReader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Purge Operational Data
  const handlePurge = () => {
    store.purgeOperationalData();
    setPurgeConfirm(false);
    setDbActionStatus({
      type: 'success',
      message: 'Données de transactions purgées avec succès. Référentiel et comptes préservés.',
    });
  };

  // Reset to defaults
  const handleResetDb = () => {
    store.resetDatabaseToDefaults();
    setResetDbConfirm(false);
    setDbActionStatus({
      type: 'success',
      message: 'Base de données réinitialisée aux paramètres certifiés d\'usine pour la RDC.',
    });
  };

  // Get table preview data
  const getTablePreviewData = () => {
    switch (selectedTablePreview) {
      case 'users':
        return store.getUsers();
      case 'pharmacies':
        return store.getPharmacies();
      case 'products':
        return store.getProducts();
      case 'batches':
        return store.getBatches();
      case 'sales':
        return store.getSales();
      case 'auditLogs':
        return store.getAuditLogs().slice(0, 10);
      default:
        return [];
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner / Access Notice */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-purple-100 text-purple-700">
              <Shield className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Administration & Paramètres Système
              </h1>
              <p className="text-xs text-slate-500">
                Gestion des comptes, attribution des rôles, création d'établissements, configuration officine et gestion DB.
              </p>
            </div>
          </div>
        </div>

        {/* Current User Badge / Warning */}
        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs">
          <div>
            <div className="text-[10px] uppercase font-semibold text-slate-400">Compte actif</div>
            <div className="font-bold text-slate-800">{currentUser.name}</div>
          </div>
          <span
            className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase border ${
              isCurrentUserAdmin
                ? 'bg-purple-50 text-purple-700 border-purple-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}
          >
            {currentUser.role}
          </span>
          {!isCurrentUserAdmin && (
            <span className="text-[11px] text-amber-600 font-medium">
              (Mode simulation — activez un compte ADMIN pour les opérations d'administration)
            </span>
          )}
        </div>
      </div>

      {/* Sub Tabs Navigation */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-xl px-4 pt-2 gap-2 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveSubTab('users')}
          className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeSubTab === 'users'
              ? 'border-blue-700 text-blue-700 bg-blue-50/50 rounded-t'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Utilisateurs & Comptes ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('permissions')}
          className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeSubTab === 'permissions'
              ? 'border-blue-700 text-blue-700 bg-blue-50/50 rounded-t'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>Matrice des Droits d'Accès</span>
        </button>

        <button
          onClick={() => setActiveSubTab('pharmacies')}
          className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeSubTab === 'pharmacies'
              ? 'border-blue-700 text-blue-700 bg-blue-50/50 rounded-t'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Établissements & Succursales ({pharmacies.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('settings')}
          className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeSubTab === 'settings'
              ? 'border-blue-700 text-blue-700 bg-blue-50/50 rounded-t'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Paramètres de l'Officine</span>
        </button>

        <button
          onClick={() => setActiveSubTab('database')}
          className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeSubTab === 'database'
              ? 'border-blue-700 text-blue-700 bg-blue-50/50 rounded-t'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Gestion des Données (DB)</span>
        </button>
      </div>

      {/* SUB-TAB 1: USERS MANAGEMENT */}
      {activeSubTab === 'users' && (
        <div className="space-y-4">
          {/* Controls: Search, Filter, New User Button */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher par nom, email, téléphone..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              {/* Role filter */}
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as any)}
                className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-700 font-medium"
              >
                <option value="ALL">Tous les rôles</option>
                <option value="ADMIN">ADMIN</option>
                <option value="MANAGER">MANAGER</option>
                <option value="CASHIER">CASHIER (Vendeur)</option>
              </select>
            </div>

            <button
              onClick={() => {
                setFormError('');
                setShowCreateUserModal(true);
              }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs rounded-lg transition-colors shadow-xs"
            >
              <UserPlus className="w-4 h-4" />
              <span>Créer un compte utilisateur</span>
            </button>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Utilisateur</th>
                    <th className="px-3 py-3">Rôle attribué</th>
                    <th className="px-3 py-3">Établissement</th>
                    <th className="px-3 py-3 text-center">Code PIN</th>
                    <th className="px-3 py-3 text-center">Droits d'accès</th>
                    <th className="px-3 py-3 text-center">Statut</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                        Aucun utilisateur trouvé pour cette recherche.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const userPharmacy = pharmacies.find((p) => p.id === u.pharmacyId) || currentPharmacy;
                      const hasCustomPerms = u.customPermissions && u.customPermissions.length > 0;
                      const permsCount = hasCustomPerms
                        ? u.customPermissions!.length
                        : DEFAULT_ROLE_PERMISSIONS[u.role].length;

                      return (
                        <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-900">{u.name}</div>
                            <div className="text-[11px] text-slate-500">{u.email}</div>
                            {u.phone && <div className="text-[10px] text-slate-400">{u.phone}</div>}
                          </td>

                          <td className="px-3 py-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                                u.role === 'ADMIN'
                                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                                  : u.role === 'MANAGER'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}
                            >
                              {u.role === 'ADMIN' && 'Administrateur'}
                              {u.role === 'MANAGER' && 'Gestionnaire'}
                              {u.role === 'CASHIER' && 'Vendeur / Caissier'}
                            </span>
                          </td>

                          <td className="px-3 py-3 text-slate-600">
                            <div className="font-medium text-slate-800">{userPharmacy.name}</div>
                            <div className="text-[10px] text-slate-400">{userPharmacy.city}</div>
                          </td>

                          <td className="px-3 py-3 text-center">
                            <div className="inline-flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded font-mono text-[11px] text-slate-700">
                              <span>{showPins[u.id] ? u.pinCode : '••••'}</span>
                              <button
                                onClick={() => togglePin(u.id)}
                                className="text-slate-400 hover:text-slate-600"
                                title="Afficher/Masquer le code PIN"
                              >
                                {showPins[u.id] ? (
                                  <EyeOff className="w-3.5 h-3.5" />
                                ) : (
                                  <Eye className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </td>

                          <td className="px-3 py-3 text-center">
                            <button
                              onClick={() => openPermissionsModal(u)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
                              title="Personnaliser les droits d'accès"
                            >
                              <KeyRound className="w-3 h-3 text-blue-600" />
                              <span>{permsCount} / {SYSTEM_PERMISSIONS.length}</span>
                              {hasCustomPerms && (
                                <span className="text-[9px] bg-amber-100 text-amber-800 px-1 rounded font-bold">
                                  Déroge
                                </span>
                              )}
                            </button>
                          </td>

                          <td className="px-3 py-3 text-center">
                            <button
                              onClick={() => {
                                const res = store.toggleUserActive(u.id);
                                if (!res.success) alert(res.message);
                              }}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase transition-colors ${
                                u.active
                                  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                              }`}
                              title="Cliquer pour activer / suspendre ce compte"
                            >
                              {u.active ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>Actif</span>
                                </>
                              ) : (
                                <>
                                  <XCircle className="w-3 h-3 text-rose-600" />
                                  <span>Suspendu</span>
                                </>
                              )}
                            </button>
                          </td>

                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => {
                                  setEditingUser({ ...u });
                                  setFormError('');
                                }}
                                className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded"
                                title="Modifier le compte"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => {
                                  setPinResetUser(u);
                                  setNewPinCode('');
                                  setPinError('');
                                }}
                                className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded"
                                title="Changer le code PIN"
                              >
                                <KeyRound className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => setDeleteConfirmUser(u)}
                                disabled={u.id === currentUser.id}
                                className={`p-1.5 rounded ${
                                  u.id === currentUser.id
                                    ? 'text-slate-300 cursor-not-allowed'
                                    : 'text-slate-500 hover:text-rose-700 hover:bg-rose-50'
                                }`}
                                title={
                                  u.id === currentUser.id
                                    ? 'Vous ne pouvez pas supprimer votre propre compte actif'
                                    : 'Supprimer ce compte'
                                }
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: ACCESS RIGHTS MATRIX */}
      {activeSubTab === 'permissions' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Matrice des Rôles & Droits d'Accès (Principe du Moindre Privilège)
              </h2>
              <p className="text-xs text-slate-500">
                Chaque rôle dispose d'un ensemble de prérogatives strictes. Les permissions individuelles peuvent également être personnalisées par utilisateur.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Permission Système</th>
                    <th className="px-3 py-3">Catégorie</th>
                    <th className="px-4 py-3">Description fonctionnelle</th>
                    <th className="px-3 py-3 text-center bg-purple-50/50">ADMIN</th>
                    <th className="px-3 py-3 text-center bg-blue-50/50">MANAGER</th>
                    <th className="px-3 py-3 text-center bg-emerald-50/50">CASHIER</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {SYSTEM_PERMISSIONS.map((perm) => {
                    const adminHas = DEFAULT_ROLE_PERMISSIONS.ADMIN.includes(perm.key);
                    const managerHas = DEFAULT_ROLE_PERMISSIONS.MANAGER.includes(perm.key);
                    const cashierHas = DEFAULT_ROLE_PERMISSIONS.CASHIER.includes(perm.key);

                    return (
                      <tr key={perm.key} className="hover:bg-slate-50/60">
                        <td className="px-4 py-2.5 font-semibold text-slate-900">
                          {perm.label}
                          <div className="font-mono text-[10px] text-slate-400">{perm.key}</div>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-medium">
                            {perm.category}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-slate-600 max-w-md">
                          {perm.description}
                        </td>
                        <td className="px-3 py-2.5 text-center bg-purple-50/20">
                          {adminHas ? (
                            <Check className="w-4 h-4 text-purple-700 mx-auto" />
                          ) : (
                            <X className="w-4 h-4 text-slate-300 mx-auto" />
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-center bg-blue-50/20">
                          {managerHas ? (
                            <Check className="w-4 h-4 text-blue-700 mx-auto" />
                          ) : (
                            <X className="w-4 h-4 text-slate-300 mx-auto" />
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-center bg-emerald-50/20">
                          {cashierHas ? (
                            <Check className="w-4 h-4 text-emerald-700 mx-auto" />
                          ) : (
                            <X className="w-4 h-4 text-slate-300 mx-auto" />
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

      {/* SUB-TAB 3: PHARMACIES (MULTI-TENANTS) MANAGEMENT */}
      {activeSubTab === 'pharmacies' && (
        <div className="space-y-4">
          {/* Header Card with creation action */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-lg bg-blue-100 text-blue-700">
                  <Building2 className="w-5 h-5" />
                </span>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Réseau d'Établissements & Succursales (Multi-tenants RDC)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Chaque officine dispose de ses propres stocks, caisses, utilisateurs et autorisations sanitaires isolées.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={openCreatePharmacyModal}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs rounded-lg shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Créer un Nouvel Établissement</span>
            </button>
          </div>

          {/* Pharmacies Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pharmacies.map((p) => {
              const isCurrent = p.id === currentPharmacy.id;
              const associatedUsersCount = users.filter((u) => u.pharmacyId === p.id).length;

              return (
                <div
                  key={p.id}
                  className={`bg-white rounded-xl border p-5 space-y-4 transition-shadow shadow-xs hover:shadow-md ${
                    isCurrent ? 'border-blue-600 ring-2 ring-blue-600/10' : 'border-slate-200'
                  }`}
                >
                  {/* Top: Name, code, active status badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                          {p.code}
                        </span>
                        {isCurrent && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Établissement Actif</span>
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-slate-900 mt-1.5">{p.name}</h3>
                      <p className="text-xs text-slate-500 font-medium">{p.legalEntity}</p>
                    </div>

                    <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                      <Store className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Details grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100">
                    <div className="flex items-start gap-2 text-slate-600">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                      <div>
                        <div>{p.address}</div>
                        <div className="font-semibold text-slate-800">
                          {p.commune}, {p.city} ({p.province})
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1 text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{p.phone}</span>
                      </div>
                      <div className="flex items-center gap-1.5 truncate">
                        <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{p.email}</span>
                      </div>
                    </div>
                  </div>

                  {/* License & Pharmacist */}
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-[11px] space-y-1">
                    <div>
                      <span className="text-slate-500 font-medium">N° Autorisation DPS RDC : </span>
                      <strong className="text-slate-800">{p.licenseNumber}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium">Pharmacien Titulaire : </span>
                      <strong className="text-blue-900">{p.chiefPharmacist}</strong>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[10px]">
                      <span className="text-slate-500">
                        Taux officiel : <strong>{p.exchangeRateUsdToCdf.toLocaleString()} CDF = 1 USD</strong>
                      </span>
                      <span className="text-slate-500">
                        Utilisateurs rattachés : <strong>{associatedUsersCount}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    {isCurrent ? (
                      <span className="text-[11px] text-blue-700 font-semibold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>Session active sur cette officine</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => {
                          store.setCurrentPharmacy(p.id);
                          setDbActionStatus({
                            type: 'success',
                            message: `Vous opérez désormais sur l'établissement "${p.name}".`,
                          });
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
                      >
                        Bascule / Sélectionner
                      </button>
                    )}

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          handleSelectPharmacyToEdit(p.id);
                          setActiveSubTab('settings');
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 font-medium transition-colors"
                        title="Configurer les paramètres de cette pharmacie"
                      >
                        <Settings className="w-3.5 h-3.5 text-slate-500" />
                        <span>Configurer</span>
                      </button>

                      {pharmacies.length > 1 && !isCurrent && (
                        <button
                          onClick={() => setDeleteConfirmPharmacy(p)}
                          className="p-1.5 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded"
                          title="Supprimer cet établissement"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB 4: PHARMACY SETTINGS */}
      {activeSubTab === 'settings' && (
        <div className="space-y-4">
          <form onSubmit={handleSavePharmacySettings} className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6">
            {/* Top Selector: Choose which pharmacy to configure + Quick New Pharmacy button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Paramètres de l'Officine & Informations Légales (RDC)
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-slate-500">Configurer l'officine :</span>
                  <select
                    value={selectedConfigPharmacyId}
                    onChange={(e) => handleSelectPharmacyToEdit(e.target.value)}
                    className="px-2.5 py-1 text-xs border border-blue-300 bg-blue-50/50 rounded-md font-bold text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    {pharmacies.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.city}) {p.id === currentPharmacy.id ? '· [ACTIF]' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={openCreatePharmacyModal}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition-colors border border-slate-200"
                >
                  <Plus className="w-3.5 h-3.5 text-blue-700" />
                  <span>Nouvel Établissement</span>
                </button>

                {saveSuccessMsg && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{saveSuccessMsg}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Grid Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
              {/* Identité légale */}
              <div className="space-y-3">
                <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] text-blue-800 border-b border-slate-100 pb-1">
                  1. Identification de l'Établissement
                </h3>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-1">
                    <label className="block text-slate-700 font-semibold mb-1">Code</label>
                    <input
                      type="text"
                      value={pharmacyForm.code}
                      onChange={(e) => setPharmacyForm({ ...pharmacyForm, code: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600 font-mono font-bold"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-slate-700 font-semibold mb-1">Nom commercial</label>
                    <input
                      type="text"
                      value={pharmacyForm.name}
                      onChange={(e) => setPharmacyForm({ ...pharmacyForm, name: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Raison sociale / Forme juridique</label>
                  <input
                    type="text"
                    value={pharmacyForm.legalEntity}
                    onChange={(e) => setPharmacyForm({ ...pharmacyForm, legalEntity: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Numéro d'Autorisation DPS / Ministère de la Santé RDC
                  </label>
                  <input
                    type="text"
                    value={pharmacyForm.licenseNumber}
                    onChange={(e) => setPharmacyForm({ ...pharmacyForm, licenseNumber: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Pharmacien Titulaire Responsable (Ordre National CNOP)
                  </label>
                  <input
                    type="text"
                    value={pharmacyForm.chiefPharmacist}
                    onChange={(e) => setPharmacyForm({ ...pharmacyForm, chiefPharmacist: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              {/* Localisation & Contacts */}
              <div className="space-y-3">
                <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] text-blue-800 border-b border-slate-100 pb-1">
                  2. Localisation & Coordonnées
                </h3>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Adresse physique</label>
                  <input
                    type="text"
                    value={pharmacyForm.address}
                    onChange={(e) => setPharmacyForm({ ...pharmacyForm, address: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Commune</label>
                    <input
                      type="text"
                      value={pharmacyForm.commune}
                      onChange={(e) => setPharmacyForm({ ...pharmacyForm, commune: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Ville</label>
                    <input
                      type="text"
                      value={pharmacyForm.city}
                      onChange={(e) => setPharmacyForm({ ...pharmacyForm, city: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Province (RDC)</label>
                  <select
                    value={pharmacyForm.province}
                    onChange={(e) => setPharmacyForm({ ...pharmacyForm, province: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600 bg-white"
                  >
                    <option value="Kinshasa">Kinshasa</option>
                    <option value="Haut-Katanga">Haut-Katanga (Lubumbashi)</option>
                    <option value="Nord-Kivu">Nord-Kivu (Goma)</option>
                    <option value="Sud-Kivu">Sud-Kivu (Bukavu)</option>
                    <option value="Kongo-Central">Kongo-Central (Matadi)</option>
                    <option value="Lualaba">Lualaba (Kolwezi)</option>
                    <option value="Tshopo">Tshopo (Kisangani)</option>
                    <option value="Ituri">Ituri (Bunia)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Téléphone</label>
                    <input
                      type="text"
                      value={pharmacyForm.phone}
                      onChange={(e) => setPharmacyForm({ ...pharmacyForm, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Email officiel</label>
                    <input
                      type="email"
                      value={pharmacyForm.email}
                      onChange={(e) => setPharmacyForm({ ...pharmacyForm, email: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Financial and Currency Settings */}
            <div className="pt-4 border-t border-slate-100">
              <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] text-blue-800 pb-3">
                3. Paramètres Monétaires, Fiscaux & Alertes
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Taux de change officiel (1 USD en CDF)
                  </label>
                  <input
                    type="number"
                    value={pharmacyForm.exchangeRateUsdToCdf}
                    onChange={(e) =>
                      setPharmacyForm({
                        ...pharmacyForm,
                        exchangeRateUsdToCdf: parseFloat(e.target.value) || 2850,
                      })
                    }
                    min={100}
                    step={10}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600 font-mono font-semibold"
                  />
                  <span className="text-[10px] text-slate-400">
                    Appliqué pour le calcul automatique bidevise en caisse
                  </span>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Devise principale</label>
                  <select
                    value={pharmacyForm.currencyDefault}
                    onChange={(e) =>
                      setPharmacyForm({
                        ...pharmacyForm,
                        currencyDefault: e.target.value as any,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600 bg-white"
                  >
                    <option value="CDF">Franc Congolais (CDF)</option>
                    <option value="USD">Dollar Américain (USD)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Taux de TVA standard</label>
                  <select
                    value={pharmacyForm.taxRatePercent}
                    onChange={(e) =>
                      setPharmacyForm({
                        ...pharmacyForm,
                        taxRatePercent: parseFloat(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600 bg-white"
                  >
                    <option value={0}>0% (Exonération médicaments essentiels)</option>
                    <option value={16}>16% (TVA standard RDC)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <div className="text-xs text-slate-500">
                Modification appliquée à l'établissement : <strong className="text-slate-800">{pharmacyForm.name}</strong>
              </div>
              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs rounded-lg shadow-xs transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>Enregistrer les paramètres de l'officine</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SUB-TAB 5: DATABASE & DATA MANAGEMENT */}
      {activeSubTab === 'database' && (
        <div className="space-y-6">
          {/* Action Notification */}
          {dbActionStatus && (
            <div
              className={`p-4 rounded-xl border flex items-start justify-between gap-3 text-xs ${
                dbActionStatus.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              <div className="flex items-center gap-2">
                {dbActionStatus.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                )}
                <span className="font-medium">{dbActionStatus.message}</span>
              </div>
              <button
                onClick={() => setDbActionStatus(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* DB Statistics Cards */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  État & Statistiques de la Base de Données Locale
                </h2>
                <p className="text-xs text-slate-500">
                  Persistance autonome sécurisée avec intégrité SHA-256 et file de synchronisation hors ligne
                </p>
              </div>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold">
                <HardDrive className="w-3.5 h-3.5" />
                <span>~{(dbStats.estimatedSizeBytes / 1024).toFixed(1)} Ko stockés</span>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Établissements (Officines)</div>
                <div className="text-xl font-bold text-blue-800 mt-1">{dbStats.pharmaciesCount}</div>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Comptes Utilisateurs</div>
                <div className="text-xl font-bold text-slate-900 mt-1">{dbStats.usersCount}</div>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Médicaments au catalogue</div>
                <div className="text-xl font-bold text-slate-900 mt-1">{dbStats.productsCount}</div>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Lots en Stock (FEFO)</div>
                <div className="text-xl font-bold text-slate-900 mt-1">{dbStats.batchesCount}</div>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Ventes Enregistrées</div>
                <div className="text-xl font-bold text-slate-900 mt-1">{dbStats.salesCount}</div>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Mouvements de Stock</div>
                <div className="text-xl font-bold text-slate-900 mt-1">{dbStats.movementsCount}</div>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Bordereaux Réception</div>
                <div className="text-xl font-bold text-slate-900 mt-1">{dbStats.receptionsCount}</div>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Sessions Inventaire</div>
                <div className="text-xl font-bold text-slate-900 mt-1">{dbStats.inventoryCount}</div>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Lignes Journal d'Audit</div>
                <div className="text-xl font-bold text-purple-700 mt-1">{dbStats.auditLogsCount}</div>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Dernière Sauvegarde</div>
                <div className="text-xs font-semibold text-slate-700 mt-2 truncate">
                  {dbStats.lastBackupDate
                    ? new Date(dbStats.lastBackupDate).toLocaleDateString('fr-FR')
                    : 'Aucune'}
                </div>
              </div>
            </div>
          </div>

          {/* Backup, Restore & Maintenance Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Download className="w-4 h-4 text-blue-700" />
                <span>Sauvegarde & Restauration Complète (JSON)</span>
              </h3>
              <p className="text-xs text-slate-500">
                Exportez une archive complète scellée contenant tous les établissements, médicaments, lots, ventes, utilisateurs et logs d'audit.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <button
                  onClick={handleExportBackup}
                  className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs rounded-lg transition-colors shadow-xs"
                >
                  <Download className="w-4 h-4" />
                  <span>Exporter la Sauvegarde</span>
                </button>

                <label className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-lg transition-colors cursor-pointer border border-slate-200">
                  <Upload className="w-4 h-4 text-slate-600" />
                  <span>Restaurer une Archive</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Opérations de Maintenance & Nettoyage</span>
              </h3>
              <p className="text-xs text-slate-500">
                Purgez les transactions de test ou réinitialisez la base aux valeurs d'usine certifiées pour la RDC.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <button
                  onClick={() => setPurgeConfirm(true)}
                  className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-semibold text-xs rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4 text-amber-600" />
                  <span>Purger les Ventes de Test</span>
                </button>

                <button
                  onClick={() => setResetDbConfirm(true)}
                  className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-semibold text-xs rounded-lg transition-colors"
                >
                  <RefreshCw className="w-4 h-4 text-rose-600" />
                  <span>Réinitialisation d'Usine</span>
                </button>
              </div>
            </div>
          </div>

          {/* Direct Table Inspector */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Table className="w-4 h-4 text-slate-700" />
                  <span>Explorateur de Données Brutes (Inspection DB)</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Visualisez les enregistrements stockés dans la base transactionnelle locale
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 font-medium">Table :</span>
                <select
                  value={selectedTablePreview}
                  onChange={(e) => setSelectedTablePreview(e.target.value)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50 font-semibold text-slate-800 focus:outline-none"
                >
                  <option value="users">Utilisateurs (users)</option>
                  <option value="pharmacies">Pharmacies (tenants)</option>
                  <option value="products">Produits (products)</option>
                  <option value="batches">Lots FEFO (batches)</option>
                  <option value="sales">Ventes (sales)</option>
                  <option value="auditLogs">Journal d'Audit (audit_logs)</option>
                </select>
              </div>
            </div>

            <div className="bg-slate-900 rounded-lg p-3 text-slate-200 font-mono text-[11px] max-h-72 overflow-y-auto scrollbar-thin">
              <pre>{JSON.stringify(getTablePreviewData(), null, 2)}</pre>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREATE PHARMACY ESTABLISHMENT */}
      {showCreatePharmacyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 font-bold text-sm">
                <Building2 className="w-4 h-4 text-sky-400" />
                <span>Création d'un Nouvel Établissement Pharmaceutique (RDC)</span>
              </div>
              <button
                onClick={() => setShowCreatePharmacyModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePharmacy} className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
              {pharmaFormError && (
                <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-700 font-medium">
                  {pharmaFormError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Code Officine <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="PH-KIN-003"
                    value={newPharmaCode}
                    onChange={(e) => setNewPharmaCode(e.target.value.toUpperCase())}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono font-bold focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-700 font-semibold mb-1">
                    Nom Commercial <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Pharmacie du Peuple — Masina"
                    value={newPharmaName}
                    onChange={(e) => setNewPharmaName(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Raison Sociale / Entité Légale
                </label>
                <input
                  type="text"
                  placeholder="Ex: Pharmacie du Peuple SARL"
                  value={newPharmaLegal}
                  onChange={(e) => setNewPharmaLegal(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    N° Autorisation DPS / Ministère de la Santé RDC <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="MS-RDC/DPS/KIN/0512/2026"
                    value={newPharmaLicense}
                    onChange={(e) => setNewPharmaLicense(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Pharmacien Titulaire (CNOP) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Dr. Joseph Mbuyi (CNOP N° 2145/RDC)"
                    value={newPharmaChief}
                    onChange={(e) => setNewPharmaChief(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Adresse Physique</label>
                <input
                  type="text"
                  placeholder="Ex: 45, Boulevard Lumumba, Quartier Sans Fil"
                  value={newPharmaAddress}
                  onChange={(e) => setNewPharmaAddress(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Commune</label>
                  <input
                    type="text"
                    placeholder="Masina"
                    value={newPharmaCommune}
                    onChange={(e) => setNewPharmaCommune(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Ville</label>
                  <input
                    type="text"
                    placeholder="Kinshasa"
                    value={newPharmaCity}
                    onChange={(e) => setNewPharmaCity(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Province (RDC)</label>
                  <select
                    value={newPharmaProvince}
                    onChange={(e) => setNewPharmaProvince(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600 bg-white"
                  >
                    <option value="Kinshasa">Kinshasa</option>
                    <option value="Haut-Katanga">Haut-Katanga (Lubumbashi)</option>
                    <option value="Nord-Kivu">Nord-Kivu (Goma)</option>
                    <option value="Sud-Kivu">Sud-Kivu (Bukavu)</option>
                    <option value="Kongo-Central">Kongo-Central (Matadi)</option>
                    <option value="Lualaba">Lualaba (Kolwezi)</option>
                    <option value="Tshopo">Tshopo (Kisangani)</option>
                    <option value="Ituri">Ituri (Bunia)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Téléphone de l'officine</label>
                  <input
                    type="text"
                    placeholder="+243 81 234 5678"
                    value={newPharmaPhone}
                    onChange={(e) => setNewPharmaPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Email officiel</label>
                  <input
                    type="email"
                    placeholder="masina@officine.cd"
                    value={newPharmaEmail}
                    onChange={(e) => setNewPharmaEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Devise principale</label>
                  <select
                    value={newPharmaCurrency}
                    onChange={(e) => setNewPharmaCurrency(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600 bg-white"
                  >
                    <option value="CDF">Franc Congolais (CDF)</option>
                    <option value="USD">Dollar Américain (USD)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Taux 1 USD en CDF</label>
                  <input
                    type="number"
                    value={newPharmaExchangeRate}
                    onChange={(e) => setNewPharmaExchangeRate(parseFloat(e.target.value) || 2850)}
                    min={100}
                    step={10}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono font-semibold focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Taux TVA</label>
                  <select
                    value={newPharmaTaxRate}
                    onChange={(e) => setNewPharmaTaxRate(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600 bg-white"
                  >
                    <option value={0}>0% (Exonération)</option>
                    <option value={16}>16% (TVA standard)</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newPharmaActivateNow}
                    onChange={(e) => setNewPharmaActivateNow(e.target.checked)}
                    className="rounded text-blue-700 focus:ring-blue-600"
                  />
                  <span className="font-semibold text-blue-900">
                    Définir immédiatement comme établissement actif dans ma session
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowCreatePharmacyModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 font-semibold rounded-lg hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-lg shadow-xs"
                >
                  Créer l'Établissement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRM DELETE PHARMACY */}
      {deleteConfirmPharmacy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-5 space-y-4 text-xs animate-in fade-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-sm font-bold text-slate-900">Supprimer cet établissement ?</h3>
              <p className="text-slate-500">
                Êtes-vous sûr de vouloir supprimer définitivement l'établissement{' '}
                <strong className="text-slate-800">{deleteConfirmPharmacy.name}</strong> ({deleteConfirmPharmacy.code}) ?
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteConfirmPharmacy(null)}
                className="w-full px-3.5 py-2 border border-slate-200 text-slate-600 font-semibold rounded-lg hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleDeletePharmacy}
                className="w-full px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg shadow-xs"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREATE USER */}
      {showCreateUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm">
                <UserPlus className="w-4 h-4 text-sky-400" />
                <span>Création d'un Nouveau Compte Utilisateur</span>
              </div>
              <button
                onClick={() => setShowCreateUserModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-700 font-medium">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Nom et Prénom <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: Dr. Patrick Kabasele"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Adresse Email professionnelle <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    placeholder="patrick.k@officine.cd"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Numéro de Téléphone (RDC)
                  </label>
                  <input
                    type="text"
                    placeholder="+243 81 234 5678"
                    value={newUserPhone}
                    onChange={(e) => setNewUserPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Rôle Système <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600 bg-white"
                  >
                    <option value="CASHIER">Vendeur / Caissier (Moindre privilège)</option>
                    <option value="MANAGER">Gestionnaire de Pharmacie</option>
                    <option value="ADMIN">Administrateur / Pharmacien Titulaire</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Code PIN d'autorisation rapide <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="1234"
                    value={newUserPin}
                    onChange={(e) => setNewUserPin(e.target.value.replace(/\D/g, ''))}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:ring-2 focus:ring-blue-600"
                  />
                  <span className="text-[10px] text-slate-400">4 à 6 chiffres pour les validations de caisse</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Établissement de rattachement
                </label>
                <select
                  value={newUserPharmacyId}
                  onChange={(e) => setNewUserPharmacyId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600 bg-white"
                >
                  {pharmacies.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.city})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateUserModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 font-semibold rounded-lg hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-lg shadow-xs"
                >
                  Créer le compte
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT USER */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm">
                <Edit className="w-4 h-4 text-sky-400" />
                <span>Modifier le Compte Utilisateur</span>
              </div>
              <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Nom et Prénom</label>
                <input
                  type="text"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Adresse Email</label>
                  <input
                    type="email"
                    value={editingUser.email}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Téléphone</label>
                  <input
                    type="text"
                    value={editingUser.phone || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Rôle attribué</label>
                  <select
                    value={editingUser.role}
                    onChange={(e) =>
                      setEditingUser({ ...editingUser, role: e.target.value as UserRole })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600 bg-white"
                  >
                    <option value="CASHIER">Vendeur / Caissier</option>
                    <option value="MANAGER">Gestionnaire de Pharmacie</option>
                    <option value="ADMIN">Administrateur / Titulaire</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Statut du compte</label>
                  <select
                    value={editingUser.active ? 'true' : 'false'}
                    onChange={(e) =>
                      setEditingUser({ ...editingUser, active: e.target.value === 'true' })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600 bg-white"
                  >
                    <option value="true">Actif</option>
                    <option value="false">Suspendu</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 font-semibold rounded-lg hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-lg shadow-xs"
                >
                  Enregistrer les modifications
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CUSTOM PERMISSIONS */}
      {permissionsUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div>
                <div className="flex items-center gap-2 font-bold text-sm">
                  <KeyRound className="w-4 h-4 text-sky-400" />
                  <span>Droits d'Accès Personnalisés — {permissionsUser.name}</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Rôle de base : <span className="font-semibold text-sky-300">{permissionsUser.role}</span>
                </div>
              </div>
              <button
                onClick={() => setPermissionsUser(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-slate-700 font-medium">
                  {selectedPermissions.length} sur {SYSTEM_PERMISSIONS.length} permissions accordées
                </span>
                <button
                  onClick={handleResetToRolePermissions}
                  className="text-blue-700 hover:underline font-semibold"
                >
                  Rétablir les permissions par défaut du rôle
                </button>
              </div>

              <div className="space-y-2">
                {SYSTEM_PERMISSIONS.map((perm) => {
                  const isChecked = selectedPermissions.includes(perm.key);
                  return (
                    <label
                      key={perm.key}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        isChecked
                          ? 'bg-blue-50/50 border-blue-200'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedPermissions([...selectedPermissions, perm.key]);
                          } else {
                            setSelectedPermissions(selectedPermissions.filter((k) => k !== perm.key));
                          }
                        }}
                        className="mt-0.5 rounded text-blue-700 focus:ring-blue-600"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{perm.label}</span>
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                            {perm.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">{perm.description}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setPermissionsUser(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 font-semibold rounded-lg hover:bg-slate-100"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSavePermissions}
                className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-lg shadow-xs"
              >
                Enregistrer les Droits
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: RESET PIN */}
      {pinResetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm">
                <KeyRound className="w-4 h-4 text-amber-400" />
                <span>Modifier le Code PIN</span>
              </div>
              <button onClick={() => setPinResetUser(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResetPinSubmit} className="p-5 space-y-4 text-xs">
              <p className="text-slate-600">
                Définir un nouveau code PIN d'autorisation rapide pour{' '}
                <strong className="text-slate-900">{pinResetUser.name}</strong>.
              </p>

              {pinError && (
                <div className="p-2 rounded bg-rose-50 border border-rose-200 text-rose-700 font-medium">
                  {pinError}
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Nouveau Code PIN (4 à 6 chiffres)
                </label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="Ex: 5678"
                  value={newPinCode}
                  onChange={(e) => setNewPinCode(e.target.value.replace(/\D/g, ''))}
                  required
                  autoFocus
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-center text-lg tracking-widest focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPinResetUser(null)}
                  className="px-3.5 py-1.5 border border-slate-200 text-slate-600 font-semibold rounded-lg hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg shadow-xs"
                >
                  Valider le PIN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRM DELETE USER */}
      {deleteConfirmUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-5 space-y-4 text-xs animate-in fade-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-sm font-bold text-slate-900">Confirmer la suppression</h3>
              <p className="text-slate-500">
                Êtes-vous sûr de vouloir supprimer définitivement le compte de{' '}
                <strong className="text-slate-800">{deleteConfirmUser.name}</strong> ({deleteConfirmUser.email}) ?
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteConfirmUser(null)}
                className="w-full px-3.5 py-2 border border-slate-200 text-slate-600 font-semibold rounded-lg hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                className="w-full px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg shadow-xs"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRM PURGE */}
      {purgeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-5 space-y-4 text-xs animate-in fade-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-5 h-5" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-sm font-bold text-slate-900">Purger les transactions de test ?</h3>
              <p className="text-slate-500">
                Toutes les ventes, mouvements de stock et réceptions seront effacés. Le référentiel des médicaments, lots initiaux et comptes utilisateurs seront <strong>conservés</strong>.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPurgeConfirm(false)}
                className="w-full px-3.5 py-2 border border-slate-200 text-slate-600 font-semibold rounded-lg hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handlePurge}
                className="w-full px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg shadow-xs"
              >
                Confirmer la Purge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRM FACTORY RESET */}
      {resetDbConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-5 space-y-4 text-xs animate-in fade-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
              <RefreshCw className="w-5 h-5" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-sm font-bold text-slate-900">Réinitialisation d'Usine</h3>
              <p className="text-slate-500">
                Cette action rétablit l'ensemble des données d'origine certifiées pour la République Démocratique du Congo (comptes, FEDECAME, catalogue et paramètres).
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setResetDbConfirm(false)}
                className="w-full px-3.5 py-2 border border-slate-200 text-slate-600 font-semibold rounded-lg hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleResetDb}
                className="w-full px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg shadow-xs"
              >
                Réinitialiser
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
