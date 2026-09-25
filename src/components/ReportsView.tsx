import React, { useState } from 'react';
import {
  FileBarChart,
  Download,
  Printer,
  Calendar,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Boxes,
  FileSpreadsheet,
} from 'lucide-react';
import { store } from '../services/store';
import {
  formatCDF,
  formatDate,
  formatDateTime,
  formatUSD,
  getExpiryAlertLevel,
} from '../utils/fefo';

export const ReportsView: React.FC = () => {
  const pharmacy = store.getCurrentPharmacy();
  const sales = store.getSales();
  const products = store.getProducts();
  const batches = store.getBatches();

  const [activeReportTab, setActiveReportTab] = useState<'SALES_DAILY' | 'STOCK_VALUATION' | 'EXPIRY_ALERT'>('SALES_DAILY');

  // Filtrer les ventes du jour
  const todayStr = new Date().toISOString().split('T')[0];
  const todaySales = sales.filter((s) => s.saleDate.startsWith(todayStr) && s.status === 'COMPLETED');
  const totalRevenueCDF = todaySales.reduce((sum, s) => sum + s.totalCDF, 0);
  const totalRevenueUSD = todaySales.reduce((sum, s) => sum + s.totalUSD, 0);

  // Lots à péremption imminente
  const expiringSoonBatches = batches.filter((b) => {
    if (b.status !== 'ACTIVE') return false;
    const alert = getExpiryAlertLevel(b.expiryDate);
    return alert === 'CRITICAL_30' || alert === 'WARNING_60' || alert === 'ATTENTION_90';
  });

  // Export CSV fonction générique
  const exportTableToCSV = (filename: string, headers: string[], rows: (string | number)[][]) => {
    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${filename}_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportCurrentReport = () => {
    if (activeReportTab === 'SALES_DAILY') {
      const headers = ['N_Vente', 'Heure', 'Client', 'Caissier', 'Total_CDF', 'Total_USD', 'Mode_Paiement'];
      const rows = todaySales.map((s) => [
        s.saleNumber,
        s.saleDate,
        `"${s.clientName || 'Comptoir'}"`,
        `"${s.cashierName}"`,
        s.totalCDF,
        s.totalUSD,
        s.paymentMethod,
      ]);
      exportTableToCSV('rapport_ventes_journalieres', headers, rows);
    } else if (activeReportTab === 'STOCK_VALUATION') {
      const headers = ['Code_Medicament', 'Nom_Commercial', 'DCI', 'Dosage', 'Categorie', 'Stock_Disponible', 'Prix_Vente_CDF', 'Valeur_Totale_CDF'];
      const rows = products.map((p) => {
        const stock = batches
          .filter((b) => b.productId === p.id && b.status === 'ACTIVE')
          .reduce((sum, b) => sum + b.currentQuantity, 0);
        return [
          p.code,
          `"${p.name}"`,
          `"${p.inn}"`,
          `"${p.dosage}"`,
          `"${p.category}"`,
          stock,
          p.unitPriceCDF,
          stock * p.unitPriceCDF,
        ];
      });
      exportTableToCSV('etat_stocks_valorise', headers, rows);
    } else {
      const headers = ['Medicament', 'N_Lot', 'Date_Peremption', 'Quantite_Restante', 'Emplacement', 'Niveau_Alerte'];
      const rows = expiringSoonBatches.map((b) => {
        const prod = products.find((p) => p.id === b.productId);
        return [
          `"${prod?.name || ''}"`,
          b.batchNumber,
          b.expiryDate,
          b.currentQuantity,
          `"${b.location}"`,
          getExpiryAlertLevel(b.expiryDate),
        ];
      });
      exportTableToCSV('lots_peremption_imminente', headers, rows);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileBarChart className="w-5 h-5 text-blue-800" />
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Rapports d'Activité & Exports Réglementaires
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            Édition des états journaliers de caisse, valorisation du stock et registre de péremption
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCurrentReport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-blue-700" />
            <span>Exporter en CSV</span>
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-800 hover:bg-blue-900 rounded-md transition-colors shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimer le Rapport</span>
          </button>
        </div>
      </div>

      {/* Onglets des Rapports */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs">
        <button
          onClick={() => setActiveReportTab('SALES_DAILY')}
          className={`px-3 py-1.5 font-medium rounded-md transition-colors ${
            activeReportTab === 'SALES_DAILY' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
          }`}
        >
          Rapport Journalier de Caisse
        </button>
        <button
          onClick={() => setActiveReportTab('STOCK_VALUATION')}
          className={`px-3 py-1.5 font-medium rounded-md transition-colors ${
            activeReportTab === 'STOCK_VALUATION'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600'
          }`}
        >
          État Valorisé des Stocks
        </button>
        <button
          onClick={() => setActiveReportTab('EXPIRY_ALERT')}
          className={`px-3 py-1.5 font-medium rounded-md transition-colors ${
            activeReportTab === 'EXPIRY_ALERT'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600'
          }`}
        >
          Registre des Péremptions Imminentes ({expiringSoonBatches.length})
        </button>
      </div>

      {/* Contenu : Rapport Journalier de Caisse */}
      {activeReportTab === 'SALES_DAILY' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
              <div className="text-xs text-slate-500 font-medium">Recettes du jour (CDF)</div>
              <div className="text-xl font-extrabold text-blue-900 mt-1">
                {formatCDF(totalRevenueCDF)}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">{todaySales.length} ventes conclues</div>
            </div>

            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
              <div className="text-xs text-slate-500 font-medium">Contre-valeur USD ($)</div>
              <div className="text-xl font-extrabold text-slate-900 mt-1 font-mono">
                {formatUSD(totalRevenueUSD)}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Taux : 1 USD = {pharmacy.exchangeRateUsdToCdf} FC</div>
            </div>

            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
              <div className="text-xs text-slate-500 font-medium">Établissement & Titulaire</div>
              <div className="text-xs font-bold text-slate-800 mt-1">{pharmacy.name}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">{pharmacy.chiefPharmacist}</div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-3 border-b border-slate-100 flex items-center justify-between">
              <span className="font-bold text-slate-900 text-xs">Ventes comptoir de la journée</span>
              <span className="text-[11px] text-slate-400">{todaySales.length} transaction(s)</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 bg-slate-50">
                    <th className="py-2.5 px-3 font-semibold">N° Ticket</th>
                    <th className="py-2.5 px-3 font-semibold">Heure</th>
                    <th className="py-2.5 px-3 font-semibold">Client</th>
                    <th className="py-2.5 px-3 font-semibold">Caissier</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Total (FC)</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Total ($)</th>
                    <th className="py-2.5 px-3 font-semibold">Mode de règlement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {todaySales.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-mono font-semibold text-blue-900">
                        {s.saleNumber}
                      </td>
                      <td className="py-2 px-3 text-slate-600 font-mono">
                        {formatDateTime(s.saleDate).split(' ')[1]}
                      </td>
                      <td className="py-2 px-3 text-slate-800">{s.clientName || 'Comptoir'}</td>
                      <td className="py-2 px-3 text-slate-600">{s.cashierName}</td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900">
                        {formatCDF(s.totalCDF)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-500">
                        {formatUSD(s.totalUSD)}
                      </td>
                      <td className="py-2 px-3 text-slate-600">
                        {s.paymentMethod === 'CASH_CDF'
                          ? 'Espèces FC'
                          : s.paymentMethod === 'CASH_USD'
                          ? 'Espèces USD'
                          : 'Mixte'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Contenu : État Valorisé des Stocks */}
      {activeReportTab === 'STOCK_VALUATION' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-3 border-b border-slate-100 flex items-center justify-between">
            <span className="font-bold text-slate-900 text-xs">Inventaire valorisé par référence</span>
            <span className="text-[11px] text-slate-400">{products.length} références</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 bg-slate-50">
                  <th className="py-2.5 px-3 font-semibold">Code</th>
                  <th className="py-2.5 px-3 font-semibold">Médicament & DCI</th>
                  <th className="py-2.5 px-3 font-semibold">Catégorie</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Stock Disponible</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Prix Unitaire (FC)</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Valeur Totale (FC)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => {
                  const stock = batches
                    .filter((b) => b.productId === p.id && b.status === 'ACTIVE')
                    .reduce((sum, b) => sum + b.currentQuantity, 0);
                  const totalVal = stock * p.unitPriceCDF;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-mono text-slate-500">{p.code}</td>
                      <td className="py-2 px-3">
                        <div className="font-semibold text-slate-900">{p.name}</div>
                        <div className="text-[10px] text-slate-500">
                          {p.inn} · {p.dosage}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-slate-600">{p.category}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">
                        {stock}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-600">
                        {formatCDF(p.unitPriceCDF)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-blue-900">
                        {formatCDF(totalVal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Contenu : Registre des Péremptions Imminentes */}
      {activeReportTab === 'EXPIRY_ALERT' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-3 border-b border-slate-100 flex items-center justify-between">
            <span className="font-bold text-slate-900 text-xs">
              Lots sous alerte 30 / 60 / 90 jours
            </span>
            <span className="text-[11px] text-amber-700 font-semibold">
              Action FEFO prioritaire requise
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 bg-slate-50">
                  <th className="py-2.5 px-3 font-semibold">Médicament</th>
                  <th className="py-2.5 px-3 font-semibold">N° Lot</th>
                  <th className="py-2.5 px-3 font-semibold">Date Péremption</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Quantité en Stock</th>
                  <th className="py-2.5 px-3 font-semibold">Emplacement</th>
                  <th className="py-2.5 px-3 font-semibold">Alerte FEFO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expiringSoonBatches.map((b) => {
                  const prod = products.find((p) => p.id === b.productId);
                  const alert = getExpiryAlertLevel(b.expiryDate);

                  return (
                    <tr key={b.id} className="hover:bg-slate-50">
                      <td className="py-2 px-3">
                        <div className="font-semibold text-slate-900">{prod?.name}</div>
                        <div className="text-[10px] text-slate-500">{prod?.inn}</div>
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-blue-900">{b.batchNumber}</td>
                      <td className="py-2 px-3 font-medium text-slate-800">
                        {formatDate(b.expiryDate)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">
                        {b.currentQuantity}
                      </td>
                      <td className="py-2 px-3 text-slate-600">{b.location}</td>
                      <td className="py-2 px-3">
                        {alert === 'CRITICAL_30' ? (
                          <span className="text-red-700 font-bold flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Péremption ≤ 30 jours
                          </span>
                        ) : alert === 'WARNING_60' ? (
                          <span className="text-amber-700 font-semibold">
                            Péremption 31–60 jours
                          </span>
                        ) : (
                          <span className="text-yellow-700 font-medium">
                            Surveillance 61–90 jours
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
