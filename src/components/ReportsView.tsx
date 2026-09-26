import React, { useMemo, useState } from 'react';
import {
  FileBarChart, Download, FileText, Calendar, DollarSign, TrendingUp,
  AlertTriangle, Boxes, X, Printer, Eye, ArrowUpRight
} from 'lucide-react';
import { store } from '../services/store';
import { formatCDF, formatDate, formatDateTime, formatUSD, getExpiryAlertLevel } from '../utils/fefo';

type ReportTab = 'SALES_DAILY' | 'STOCK_VALUATION' | 'EXPIRY_ALERT';
type ExportKind = 'CSV' | 'PDF';

interface ExportPayload {
  title: string;
  subtitle: string;
  headers: string[];
  rows: (string | number)[][];
  filename: string;
}

export const ReportsView: React.FC = () => {
  const pharmacy = store.getCurrentPharmacy();
  const sales = store.getSales();
  const products = store.getProducts();
  const batches = store.getBatches();
  const [activeReportTab, setActiveReportTab] = useState<ReportTab>('SALES_DAILY');
  const [preview, setPreview] = useState<{ kind: ExportKind; payload: ExportPayload } | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];
  const todaySales = sales.filter(s => s.saleDate.startsWith(todayStr) && s.status === 'COMPLETED');
  const totalRevenueCDF = todaySales.reduce((sum, s) => sum + s.totalCDF, 0);
  const totalRevenueUSD = todaySales.reduce((sum, s) => sum + s.totalUSD, 0);

  const expiringSoonBatches = batches.filter(b => {
    if (b.status !== 'ACTIVE') return false;
    const alert = getExpiryAlertLevel(b.expiryDate);
    return alert === 'CRITICAL_30' || alert === 'WARNING_60' || alert === 'ATTENTION_90';
  });

  const stockValue = useMemo(() => products.reduce((sum, p) => {
    const stock = batches.filter(b => b.productId === p.id && b.status === 'ACTIVE')
      .reduce((n, b) => n + b.currentQuantity, 0);
    return sum + stock * p.unitPriceCDF;
  }, 0), [products, batches]);

  const payload = (): ExportPayload => {
    if (activeReportTab === 'SALES_DAILY') {
      return {
        title: 'Rapport journalier de caisse',
        subtitle: `${pharmacy.name} · ${todayStr}`,
        headers: ['N° Vente', 'Heure', 'Client', 'Caissier', 'Total CDF', 'Total USD', 'Paiement'],
        rows: todaySales.map(s => [
          s.saleNumber, formatDateTime(s.saleDate), s.clientName || 'Comptoir', s.cashierName,
          s.totalCDF, s.totalUSD, s.paymentMethod
        ]),
        filename: 'rapport_ventes_journalieres',
      };
    }
    if (activeReportTab === 'STOCK_VALUATION') {
      return {
        title: 'État valorisé des stocks',
        subtitle: `${pharmacy.name} · ${todayStr}`,
        headers: ['Code', 'Médicament', 'DCI', 'Dosage', 'Catégorie', 'Stock', 'Prix CDF', 'Valeur CDF'],
        rows: products.map(p => {
          const stock = batches.filter(b => b.productId === p.id && b.status === 'ACTIVE')
            .reduce((n, b) => n + b.currentQuantity, 0);
          return [p.code, p.name, p.inn, p.dosage, p.category, stock, p.unitPriceCDF, stock * p.unitPriceCDF];
        }),
        filename: 'etat_stocks_valorise',
      };
    }
    return {
      title: 'Registre des péremptions imminentes',
      subtitle: `${pharmacy.name} · lots sous alerte 30 / 60 / 90 jours`,
      headers: ['Médicament', 'N° Lot', 'Péremption', 'Quantité', 'Emplacement', 'Alerte'],
      rows: expiringSoonBatches.map(b => {
        const p = products.find(x => x.id === b.productId);
        return [p?.name || '', b.batchNumber, b.expiryDate, b.currentQuantity, b.location, getExpiryAlertLevel(b.expiryDate)];
      }),
      filename: 'lots_peremption_imminente',
    };
  };

  const openExportPreview = (kind: ExportKind) => setPreview({ kind, payload: payload() });

  const downloadCSV = (p: ExportPayload) => {
    const clean = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = '\uFEFF' + [p.headers.map(clean).join(';'), ...p.rows.map(r => r.map(clean).join(';'))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${p.filename}_${todayStr}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    document.body.classList.add('muelo-printing');
    setTimeout(() => {
      window.print();
      document.body.classList.remove('muelo-printing');
    }, 50);
  };

  const tabs = [
    { id: 'SALES_DAILY' as const, label: 'Caisse', icon: DollarSign, meta: `${todaySales.length} ventes` },
    { id: 'STOCK_VALUATION' as const, label: 'Stocks valorisés', icon: Boxes, meta: formatCDF(stockValue) },
    { id: 'EXPIRY_ALERT' as const, label: 'Péremptions', icon: AlertTriangle, meta: `${expiringSoonBatches.length} lots` },
  ];

  return (
    <div className="muelo-page">
      <section className="muelo-page-heading">
        <div>
          <div className="muelo-eyebrow"><FileBarChart size={14} /> Pilotage</div>
          <h1>Rapports & exports</h1>
          <p>Des états prêts à consulter, vérifier et transmettre.</p>
        </div>
        <div className="muelo-report-actions">
          <button className="muelo-btn secondary" onClick={() => openExportPreview('CSV')}><Eye size={16} /> Aperçu CSV</button>
          <button className="muelo-btn primary" onClick={() => openExportPreview('PDF')}><FileText size={16} /> Exporter PDF</button>
        </div>
      </section>

      <div className="muelo-report-tabs">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} className={activeReportTab === tab.id ? 'active' : ''} onClick={() => setActiveReportTab(tab.id)}>
              <span className="muelo-report-tab-icon"><Icon size={17} /></span>
              <span><strong>{tab.label}</strong><small>{tab.meta}</small></span>
              <ArrowUpRight size={14} />
            </button>
          );
        })}
      </div>

      {activeReportTab === 'SALES_DAILY' && (
        <>
          <div className="muelo-kpi-grid">
            <div className="muelo-kpi"><span>Recettes du jour</span><strong>{formatCDF(totalRevenueCDF)}</strong><small>{todaySales.length} transactions</small></div>
            <div className="muelo-kpi"><span>Contre-valeur USD</span><strong>{formatUSD(totalRevenueUSD)}</strong><small>1 USD = {pharmacy.exchangeRateUsdToCdf} FC</small></div>
            <div className="muelo-kpi"><span>Panier moyen</span><strong>{todaySales.length ? formatCDF(totalRevenueCDF / todaySales.length) : formatCDF(0)}</strong><small>par transaction</small></div>
          </div>
          <ReportTable payload={payload()} />
        </>
      )}

      {activeReportTab === 'STOCK_VALUATION' && <ReportTable payload={payload()} />}
      {activeReportTab === 'EXPIRY_ALERT' && <ReportTable payload={payload()} warning />}

      {preview && (
        <div className="muelo-modal-backdrop" role="dialog" aria-modal="true">
          <div className="muelo-export-modal">
            <header>
              <div>
                <div className="muelo-eyebrow"><Eye size={13} /> Prévisualisation</div>
                <h2>{preview.payload.title}</h2>
                <p>{preview.payload.subtitle}</p>
              </div>
              <button className="muelo-icon-btn" onClick={() => setPreview(null)} aria-label="Fermer"><X size={19} /></button>
            </header>
            <div className="muelo-export-toolbar">
              <span>{preview.payload.rows.length} ligne(s)</span>
              <span className="muelo-export-format">{preview.kind === 'PDF' ? 'PDF' : 'CSV'}</span>
            </div>
            <div className="muelo-export-preview">
              <div className="muelo-paper">
                <div className="muelo-paper-head">
                  <strong>{pharmacy.name}</strong>
                  <span>{preview.payload.title}</span>
                  <small>{preview.payload.subtitle}</small>
                </div>
                <table>
                  <thead><tr>{preview.payload.headers.map(h => <th key={h}>{h}</th>)}</tr></thead>
                  <tbody>
                    {preview.payload.rows.slice(0, 50).map((row, i) => (
                      <tr key={i}>{row.map((cell, j) => <td key={j}>{String(cell)}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
                {preview.payload.rows.length > 50 && <p className="muelo-preview-more">Aperçu limité aux 50 premières lignes. L’export complet contient {preview.payload.rows.length} lignes.</p>}
              </div>
            </div>
            <footer>
              <button className="muelo-btn secondary" onClick={() => setPreview(null)}>Annuler</button>
              {preview.kind === 'CSV'
                ? <button className="muelo-btn primary" onClick={() => { downloadCSV(preview.payload); setPreview(null); }}><Download size={16} /> Télécharger CSV</button>
                : <button className="muelo-btn primary" onClick={() => { exportPDF(); setPreview(null); }}><Printer size={16} /> Générer / imprimer PDF</button>}
            </footer>
          </div>
        </div>
      )}
    </div>
  );
};

const ReportTable: React.FC<{ payload: ExportPayload; warning?: boolean }> = ({ payload, warning }) => (
  <section className="muelo-report-card">
    <div className="muelo-report-card-head">
      <div><strong>{payload.title}</strong><small>{payload.subtitle}</small></div>
      {warning && <span className="muelo-alert-chip"><AlertTriangle size={13} /> Surveillance prioritaire</span>}
    </div>
    <div className="muelo-table-scroll">
      <table className="muelo-data-table">
        <thead><tr>{payload.headers.map(h => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>
          {payload.rows.length ? payload.rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}>{String(cell)}</td>)}</tr>) :
            <tr><td colSpan={payload.headers.length} className="muelo-empty">Aucune donnée à afficher.</td></tr>}
        </tbody>
      </table>
    </div>
  </section>
);
