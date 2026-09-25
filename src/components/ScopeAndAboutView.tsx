import React from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Building2,
  Server,
  Database,
  Lock,
} from 'lucide-react';

export const ScopeAndAboutView: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Bannière Garde-fou Fonctionnel Légal (Non-négociable) */}
      <div className="p-4 bg-red-50 border-2 border-red-300 rounded-xl text-red-900 space-y-2 shadow-xs">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-red-700 shrink-0" />
          <h3 className="font-extrabold text-sm uppercase tracking-wide">
            Garde-fou Fonctionnel & Réglementaire (Ministère de la Santé Publique — RDC)
          </h3>
        </div>
        <p className="text-xs text-red-800 leading-relaxed font-medium">
          <strong>Interdiction formelle d'aide au diagnostic clinique :</strong> L'application{' '}
          <strong>Muelo PHARM</strong> est strictement un progiciel de gestion logistique des stocks,
          de traçabilité des lots pharmaceutiques et de vente au détail. Le système ne doit en aucun cas
          prescrire, diagnostiquer, modifier une ordonnance médicale, ni produire une recommandation
          thérapeutique autonome. Seul un pharmacien diplômé ou un praticien de santé habilité par
          l'Ordre des Pharmaciens de la RDC est compétent pour la délivrance des médicaments.
        </p>
      </div>

      {/* Présentation du projet */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-800" />
            <h2 className="text-base font-bold text-slate-900">
              Muelo PHARM — Cahier des Charges MVP (Phase 2)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Dérivé de la spécification technique <em>"Solution numérique nationale de vente au détail et
            de gestion des stocks des produits pharmaceutiques en RDC"</em> (MUELO GROUPE v1.0 — 7
            septembre 2026).
          </p>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          Le projet cible un modèle <strong>fédéré</strong> : chaque officine pharmaceutique dispose de
          son espace opérationnel local capable de fonctionner à 100% sans interruption lors des
          coupures d'Internet fréquentes en RDC (mode hors ligne avec file d'événements idempotente),
          tandis qu'une plateforme centrale agrège les indicateurs de santé publique et diffuse les alertes
          sanitaires de rappel de lots.
        </p>

        {/* Tableau comparatif : Périmètre du MVP vs Hors Périmètre */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Inclus dans le MVP (Actif) */}
          <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-3">
            <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs uppercase tracking-wider">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              <span>Périmètre MVP Développé (Phase 2)</span>
            </div>
            <ul className="text-xs text-slate-700 space-y-2 list-disc list-inside">
              <li>
                <strong>Multi-établissements :</strong> Isolation par officine (tenant), extensible
                (ex: Pharmacie du Peuple Kinshasa & Pharmacie La Grâce Goma).
              </li>
              <li>
                <strong>Rôles & Moindre Privilège :</strong> Administrateur / Titulaire, Gestionnaire
                de Pharmacie, Vendeur / Caissier.
              </li>
              <li>
                <strong>Référentiel Produits :</strong> Nom commercial, DCI, dosage, forme galénique,
                conditionnement, fabricant, catégorie, conditions de conservation.
              </li>
              <li>
                <strong>Fournisseurs & Réceptions :</strong> Contrôle d'entrée obligatoire (N° lot,
                péremption, quantité, blocage immédiat si produit sous alerte de rappel sanitaire).
              </li>
              <li>
                <strong>Gestion des Lots & FEFO :</strong> First-Expired-First-Out automatique par
                défaut, alertes de péremption à 30, 60 et 90 jours, seuils de réapprovisionnement.
              </li>
              <li>
                <strong>Caisse au détail :</strong> Recherche rapide (&lt; 2s), encaissement bidevise
                (CDF / USD), rendu monnaie, impression de ticket thermique conforme RDC.
              </li>
              <li>
                <strong>Annulation sécurisée :</strong> Requiert l'autorisation par code PIN d'un
                Gestionnaire ou Titulaire, avec motif obligatoire consigné en audit.
              </li>
              <li>
                <strong>Inventaire tournant :</strong> Comptage physique, calcul des écarts de quantité
                et de valeur, approbation obligatoire soumise à code PIN.
              </li>
              <li>
                <strong>Mode hors ligne complet :</strong> Stockage local IndexedDB, file d'attente
                horodatée avec identifiants UUID et résolution explicite de conflits (aucun écrasement
                silencieux).
              </li>
              <li>
                <strong>Journal d'audit inaltérable :</strong> Écriture seule (append-only) scellée
                avec signature cryptographique d'intégrité SHA-256.
              </li>
              <li>
                <strong>Exports & Rapports :</strong> Rapports de caisse, stocks valorisés, exports CSV
                et JSON.
              </li>
            </ul>
          </div>

          {/* Hors Périmètre MVP (À documenter, prévu ultérieurement) */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center gap-2 text-slate-700 font-bold text-xs uppercase tracking-wider">
              <XCircle className="w-4 h-4 text-slate-500" />
              <span>Explicitement Hors MVP (Feuille de Route)</span>
            </div>
            <ul className="text-xs text-slate-600 space-y-2 list-disc list-inside">
              <li>
                <strong>Portail national centralisé :</strong> Agrégation provinciale / nationale et
                tableaux de bord pour le Ministère de la Santé Publique et l'Ordre des Pharmaciens.
              </li>
              <li>
                <strong>Ordonnances électroniques contrôlées :</strong> Délivrance réglementée avec
                signature électronique des médecins prescripteurs.
              </li>
              <li>
                <strong>Réseau temps-réel de rappels sanitaires :</strong> Push automatique
                inter-pharmacies depuis l'autorité centrale de régulation du médicament (DPM).
              </li>
              <li>
                <strong>Paiements Mobile Money directs :</strong> Intégration directe aux API M-Pesa,
                Orange Money, Airtel Money.
              </li>
              <li>
                <strong>Chaîne du froid connectée :</strong> Télémétrie par capteurs IoT Bluetooth/4G
                dans les réfrigérateurs.
              </li>
              <li>
                <strong>Commande en ligne & Click & Collect :</strong> Portail patient grand public.
              </li>
              <li>
                <strong>Multi-entrepôts centralisés :</strong> Gestion logistique de dépôts régionaux
                en amont des officines de détail.
              </li>
              <li>
                <strong>Authentification multifacteur (MFA) :</strong> Points d'extension prévus au
                schéma, à brancher en Phase 3.
              </li>
              <li>
                <strong>Intégration DHIS2 / SNIS :</strong> Connecteurs d'interopérabilité sanitaire
                nationale.
              </li>
            </ul>
          </div>
        </div>

        {/* Principes d'architecture technique */}
        <div className="border-t border-slate-100 pt-4 space-y-2">
          <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
            Architecture Technique & Résilience Hors Ligne
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="font-semibold text-slate-900 flex items-center gap-1.5 mb-1">
                <Server className="w-3.5 h-3.5 text-blue-700" />
                <span>PWA & Service Worker</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">
                Application Web Progressive installable sur téléphone Android bas de gamme, tablette
                ou ordinateur d'officine.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="font-semibold text-slate-900 flex items-center gap-1.5 mb-1">
                <Database className="w-3.5 h-3.5 text-blue-700" />
                <span>IndexedDB & File Idempotente</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">
                Chaque transaction est stockée localement avec UUID unique. Aucune perte de vente en
                cas de déconnexion réseau prolongée.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="font-semibold text-slate-900 flex items-center gap-1.5 mb-1">
                <Lock className="w-3.5 h-3.5 text-blue-700" />
                <span>Résolution Explicite de Conflits</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">
                En cas de divergence de stock ou de lot bloqué durant la période hors ligne,
                l'utilisateur est notifié et choisit explicitement l'arbitrage.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
