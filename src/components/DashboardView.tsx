import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertTriangle, ArrowUpRight, Boxes, CalendarDays, Clock3,
  PackageCheck, ShoppingCart, TrendingUp, WalletCards
} from 'lucide-react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts';
import { store } from '../services/store';
import { formatCDF, formatUSD, getExpiryAlertLevel } from '../utils/fefo';
import { Product, Sale } from '../types/pharmacy';

const chartColors = [
  'var(--muelo-chart-primary)',
  'var(--muelo-chart-secondary)',
  'var(--muelo-chart-tertiary)',
  'var(--muelo-chart-quaternary)',
];

const formatDay = (date: Date) =>
  date.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit' }).replace('.', '');

const startOfDay = (date: Date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const DashboardView: React.FC = () => {
  const [, forceUpdate] = useState(0);
  const pharmacy = store.getCurrentPharmacy();

  useEffect(() => store.subscribe(() => forceUpdate(v => v + 1)), []);

  const products = store.getProducts();
  const batches = store.getBatches();
  const sales = store.getSales();
  const movements = store.getStockMovements();

  const completedSales = sales.filter(s => s.status === 'COMPLETED');

  const today = startOfDay(new Date());
  const todayKey = today.toISOString().slice(0, 10);
  const todaySales = completedSales.filter(s => s.saleDate.slice(0, 10) === todayKey);

  const stockByProduct = useMemo(() => {
    const map = new Map<string, number>();
    batches.filter(b => b.status === 'ACTIVE').forEach(b => {
      map.set(b.productId, (map.get(b.productId) || 0) + b.currentQuantity);
    });
    return map;
  }, [batches]);

  const stockValue = useMemo(() =>
    products.reduce((sum, p) => sum + (stockByProduct.get(p.id) || 0) * p.unitPriceCDF, 0),
    [products, stockByProduct]
  );

  const salesTrend = useMemo(() => {
    const points: Array<{ label: string; revenue: number; sales: number }> = [];
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const daySales = completedSales.filter(s => s.saleDate.slice(0, 10) === key);
      points.push({
        label: formatDay(d),
        revenue: daySales.reduce((sum, s) => sum + s.totalCDF, 0),
        sales: daySales.length,
      });
    }
    return points;
  }, [completedSales, todayKey]);

  const salesByCategory = useMemo(() => {
    const productCategory = new Map(products.map(p => [p.id, p.category]));
    const map = new Map<string, number>();
    completedSales.forEach(s => s.items.forEach(item => {
      const category = productCategory.get(item.productId) || 'Autres';
      map.set(category, (map.get(category) || 0) + item.totalPriceCDF);
    }));
    return [...map.entries()]
      .map(([category, revenue]) => ({ category, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6);
  }, [completedSales, products]);

  const stockHealth = useMemo(() => {
    let healthy = 0;
    let low = 0;
    let out = 0;
    products.filter(p => p.status !== 'RECALLED_BLOCKED').forEach(p => {
      const quantity = stockByProduct.get(p.id) || 0;
      if (quantity === 0) out += 1;
      else if (quantity <= p.minStockAlert) low += 1;
      else healthy += 1;
    });
    return [
      { name: 'Stock normal', value: healthy },
      { name: 'Stock faible', value: low },
      { name: 'Rupture', value: out },
    ].filter(item => item.value > 0);
  }, [products, stockByProduct]);

  const expiryCounts = useMemo(() => {
    const counts = { critical: 0, warning: 0, attention: 0 };
    batches.filter(b => b.status === 'ACTIVE').forEach(b => {
      const level = getExpiryAlertLevel(b.expiryDate);
      if (level === 'CRITICAL_30') counts.critical += 1;
      else if (level === 'WARNING_60') counts.warning += 1;
      else if (level === 'ATTENTION_90') counts.attention += 1;
    });
    return counts;
  }, [batches]);

  const expiringSoon = batches
    .filter(b => b.status === 'ACTIVE' && getExpiryAlertLevel(b.expiryDate) !== 'OK')
    .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate))
    .slice(0, 4);

  const recentMovements = movements
    .slice()
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 5);

  const totalRevenue = todaySales.reduce((sum, s) => sum + s.totalCDF, 0);
  const averageBasket = todaySales.length ? totalRevenue / todaySales.length : 0;
  const lowStockProducts = products.filter(p => {
    const quantity = stockByProduct.get(p.id) || 0;
    return p.status !== 'RECALLED_BLOCKED' && quantity <= p.minStockAlert;
  }).length;

  return (
    <div className="muelo-dashboard">
      <section className="muelo-dashboard-hero">
        <div>
          <div className="muelo-eyebrow"><Activity size={14} /> Pilotage</div>
          <h1>Bonjour, {store.getCurrentUser().name.split(' ')[0]}</h1>
          <p>{pharmacy.name} · {pharmacy.commune}, {pharmacy.city}</p>
        </div>
        <img
          src={`${import.meta.env.BASE_URL}logo.svg`}
          alt="Muelo PHARM"
          className="muelo-dashboard-logo"
        />
      </section>

      <section className="muelo-dashboard-kpis">
        <DashboardKpi icon={WalletCards} label="Recettes aujourd’hui" value={formatCDF(totalRevenue)} meta={`${todaySales.length} transaction(s)`} />
        <DashboardKpi icon={ShoppingCart} label="Panier moyen" value={formatCDF(averageBasket)} meta="par transaction" />
        <DashboardKpi icon={Boxes} label="Stock valorisé" value={formatCDF(stockValue)} meta={`${products.length} références`} />
        <DashboardKpi icon={AlertTriangle} label="À surveiller" value={String(lowStockProducts + expiryCounts.critical)} meta={`${lowStockProducts} stock · ${expiryCounts.critical} péremption`} warning />
      </section>

      <section className="muelo-chart-grid">
        <DashboardCard
          title="Évolution des ventes"
          subtitle="Chiffre d’affaires CDF · 7 derniers jours"
          icon={TrendingUp}
          className="muelo-chart-wide"
        >
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={salesTrend} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="mueloRevenueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--muelo-chart-primary)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="var(--muelo-chart-primary)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--muelo-chart-grid)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: 'var(--muelo-chart-text)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--muelo-chart-text)', fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={value => value >= 1000 ? `${Math.round(value / 1000)}k` : String(value)} />
              <Tooltip
                contentStyle={{ background: 'var(--muelo-chart-surface)', border: '1px solid var(--muelo-line)', borderRadius: 10, color: 'var(--muelo-ink)', fontSize: 11 }}
                formatter={(value: number | undefined) => [formatCDF(value || 0), 'Recettes']}
              />
              <Area type="monotone" dataKey="revenue" stroke="var(--muelo-chart-primary)" strokeWidth={3} fill="url(#mueloRevenueFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </DashboardCard>

        <DashboardCard title="Répartition des ventes" subtitle="Par catégorie thérapeutique" icon={PackageCheck}>
          {salesByCategory.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={salesByCategory} layout="vertical" margin={{ top: 8, right: 12, left: 4, bottom: 8 }}>
                <CartesianGrid stroke="var(--muelo-chart-grid)" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="category" width={125} tick={{ fill: 'var(--muelo-chart-text)', fontSize: 9 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: 'var(--muelo-chart-surface)', border: '1px solid var(--muelo-line)', borderRadius: 10, color: 'var(--muelo-ink)', fontSize: 11 }}
                  formatter={(value: number | undefined) => [formatCDF(value || 0), 'Ventes']}
                />
                <Bar dataKey="revenue" fill="var(--muelo-chart-secondary)" radius={[0, 6, 6, 0]} barSize={22} />
              </BarChart>
            </ResponsiveContainer>
          ) : <ChartEmpty message="Pas encore assez de ventes pour comparer les catégories." />}
        </DashboardCard>

        <DashboardCard title="Santé du stock" subtitle="Références actives" icon={Boxes}>
          {stockHealth.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={stockHealth} dataKey="value" nameKey="name" innerRadius={66} outerRadius={96} paddingAngle={3}>
                  {stockHealth.map((_, index) => <Cell key={index} fill={chartColors[index]} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ background: 'var(--muelo-chart-surface)', border: '1px solid var(--muelo-line)', borderRadius: 10, color: 'var(--muelo-ink)', fontSize: 11 }}
                  formatter={(value: number | undefined) => [value || 0, 'Références']}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : <ChartEmpty message="Aucune référence active." />}
          <div className="muelo-chart-legend">
            {stockHealth.map((item, index) => (
              <span key={item.name}><i style={{ background: chartColors[index] }} />{item.name} <b>{item.value}</b></span>
            ))}
          </div>
        </DashboardCard>

        <DashboardCard title="Péremptions" subtitle="Lots sous surveillance" icon={CalendarDays}>
          <div className="muelo-expiry-rings">
            <ExpiryMetric value={expiryCounts.critical} label="≤ 30 jours" tone="critical" />
            <ExpiryMetric value={expiryCounts.warning} label="31–60 jours" tone="warning" />
            <ExpiryMetric value={expiryCounts.attention} label="61–90 jours" tone="attention" />
          </div>
          <div className="muelo-mini-list">
            {expiringSoon.length ? expiringSoon.map(batch => {
              const product = products.find(p => p.id === batch.productId);
              return (
                <div key={batch.id}>
                  <span><strong>{product?.name || 'Produit'}</strong><small>Lot {batch.batchNumber}</small></span>
                  <b>{batch.expiryDate}</b>
                </div>
              );
            }) : <ChartEmpty message="Aucun lot sous alerte." />}
          </div>
        </DashboardCard>
      </section>

      <section className="muelo-dashboard-bottom">
        <DashboardCard title="Mouvements récents" subtitle="Traçabilité du stock" icon={Clock3}>
          <div className="muelo-activity-list">
            {recentMovements.length ? recentMovements.map(m => (
              <div key={m.id}>
                <span className={m.quantity > 0 ? 'in' : 'out'}>{m.quantity > 0 ? '+' : ''}{m.quantity}</span>
                <span className="muelo-activity-copy"><strong>{m.productName}</strong><small>{movementLabel(m.type)} · {m.performedByName}</small></span>
                <span className="muelo-activity-time">{new Date(m.timestamp).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</span>
              </div>
            )) : <ChartEmpty message="Aucun mouvement enregistré." />}
          </div>
        </DashboardCard>

        <DashboardCard title="Accès rapide" subtitle="Opérations fréquentes" icon={ArrowUpRight}>
          <div className="muelo-quick-actions">
            <QuickAction icon={ShoppingCart} label="Nouvelle vente" target="pos" />
            <QuickAction icon={Boxes} label="Voir le stock" target="stock" />
            <QuickAction icon={TrendingUp} label="Rapports" target="reports" />
          </div>
        </DashboardCard>
      </section>
    </div>
  );
};

const DashboardKpi: React.FC<{ icon: React.ElementType; label: string; value: string; meta: string; warning?: boolean }> = ({ icon: Icon, label, value, meta, warning }) => (
  <div className={`muelo-dashboard-kpi ${warning ? 'warning' : ''}`}>
    <span className="muelo-dashboard-kpi-icon"><Icon size={17} /></span>
    <div><small>{label}</small><strong>{value}</strong><em>{meta}</em></div>
  </div>
);

const DashboardCard: React.FC<{
  title: string; subtitle: string; icon: React.ElementType; className?: string; children: React.ReactNode;
}> = ({ title, subtitle, icon: Icon, className = '', children }) => (
  <article className={`muelo-chart-card ${className}`}>
    <header><span className="muelo-chart-card-icon"><Icon size={16} /></span><div><strong>{title}</strong><small>{subtitle}</small></div></header>
    <div className="muelo-chart-card-body">{children}</div>
  </article>
);

const ChartEmpty: React.FC<{ message: string }> = ({ message }) => (
  <div className="muelo-chart-empty"><Activity size={20} /><span>{message}</span></div>
);

const ExpiryMetric: React.FC<{ value: number; label: string; tone: string }> = ({ value, label, tone }) => (
  <div className={`muelo-expiry-metric ${tone}`}><strong>{value}</strong><span>{label}</span></div>
);

const QuickAction: React.FC<{ icon: React.ElementType; label: string; target: string }> = ({ icon: Icon, label, target }) => {
  const click = () => window.dispatchEvent(new CustomEvent('muelo:navigate', { detail: target }));
  return <button onClick={click}><Icon size={17} /><span>{label}</span><ArrowUpRight size={14} /></button>;
};

const movementLabel = (type: string) => ({
  RECEPTION: 'Réception',
  SALE: 'Vente',
  SALE_CANCEL: 'Annulation',
  INVENTORY_ADJUSTMENT: 'Ajustement',
  LOSS_DAMAGE: 'Perte / dommage',
  QUARANTINE_TRANSFER: 'Quarantaine',
  RECALL_BLOCK: 'Rappel sanitaire',
}[type] || type);

export default DashboardView;
