import React, { useEffect, useState } from 'react';
import {
  Search,
  ShoppingCart,
  Trash2,
  Printer,
  XCircle,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Layers,
  Sparkles,
  DollarSign,
  Banknote,
  Clock,
} from 'lucide-react';
import { Batch, Product, Sale } from '../types/pharmacy';
import { store } from '../services/store';
import {
  formatCDF,
  formatUSD,
  formatDate,
  formatDateTime,
  getDaysUntilExpiry,
  getExpiryAlertLevel,
} from '../utils/fefo';

interface CartItem {
  product: Product;
  quantity: number;
  customBatchId?: string;
}

export const POSView: React.FC = () => {
  const [products, setProducts] = useState<Product[]>(store.getProducts());
  const [batches, setBatches] = useState<Batch[]>(store.getBatches());
  const [sales, setSales] = useState<Sale[]>(store.getSales());
  const pharmacy = store.getCurrentPharmacy();
  const currentUser = store.getCurrentUser();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [clientName, setClientName] = useState('');
  const [paymentCurrency, setPaymentCurrency] = useState<'CDF' | 'USD' | 'MIXED'>('CDF');
  const [cashGivenCDF, setCashGivenCDF] = useState<number>(0);
  const [cashGivenUSD, setCashGivenUSD] = useState<number>(0);

  const [lastCompletedSale, setLastCompletedSale] = useState<Sale | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Modal d'annulation
  const [saleToCancel, setSaleToCancel] = useState<Sale | null>(null);
  const [cancelPin, setCancelPin] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = store.subscribe(() => {
      setProducts(store.getProducts());
      setBatches(store.getBatches());
      setSales(store.getSales());
    });
    return unsub;
  }, []);

  // Catégories uniques pour le filtre rapide
  const categories = ['ALL', ...Array.from(new Set(products.map((p) => p.category)))];

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.inn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategory === 'ALL' || p.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  // Calcul du stock disponible total pour un produit
  const getProductAvailableStock = (productId: string) => {
    return batches
      .filter((b) => b.productId === productId && b.status === 'ACTIVE')
      .reduce((sum, b) => sum + (b.currentQuantity - (b.reservedQuantity || 0)), 0);
  };

  // Récupérer le lot FEFO suggéré
  const getSuggestedFEFOBatch = (productId: string) => {
    const validBatches = batches
      .filter((b) => b.productId === productId && b.status === 'ACTIVE' && b.currentQuantity > 0)
      .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
    return validBatches[0] || null;
  };

  const handleAddToCart = (product: Product) => {
    setErrorMessage(null);

    if (product.status === 'RECALLED_BLOCKED') {
      setErrorMessage(
        `GARDE-FOU LÉGAL : ${product.name} fait l'objet d'un rappel sanitaire ministériel ou d'un blocage. Vente formellement interdite !`
      );
      return;
    }

    const available = getProductAvailableStock(product.id);
    if (available <= 0) {
      setErrorMessage(`Rupture de stock pour ${product.name}`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity + 1 > available) {
          setErrorMessage(`Quantité maximale disponible atteinte pour ${product.name} (${available})`);
          return prev;
        }
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      } else {
        return [...prev, { product, quantity: 1 }];
      }
    });
  };

  const handleUpdateQuantity = (productId: string, qty: number) => {
    const available = getProductAvailableStock(productId);
    if (qty <= 0) {
      handleRemoveFromCart(productId);
      return;
    }
    if (qty > available) {
      setErrorMessage(`Quantité demandée (${qty}) supérieure au stock disponible (${available})`);
      qty = available;
    }
    setCart((prev) =>
      prev.map((item) => (item.product.id === productId ? { ...item, quantity: qty } : item))
    );
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleSelectBatchManual = (productId: string, batchId: string) => {
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId
          ? { ...item, customBatchId: batchId === 'AUTO' ? undefined : batchId }
          : item
      )
    );
  };

  // Calcul totaux panier
  const totalCDF = cart.reduce((acc, item) => acc + item.product.unitPriceCDF * item.quantity, 0);
  const totalUSD = cart.reduce((acc, item) => acc + item.product.unitPriceUSD * item.quantity, 0);

  // Conversion et calcul rendu monnaie
  const rate = pharmacy.exchangeRateUsdToCdf;
  const totalPaidInCDF = cashGivenCDF + cashGivenUSD * rate;
  const changeCDF = Math.max(0, totalPaidInCDF - totalCDF);
  const changeUSD = +(changeCDF / rate).toFixed(2);

  // Vente en 1 clic (< 2 secondes)
  const handleCompleteSale = async () => {
    if (cart.length === 0) return;
    if (totalPaidInCDF < totalCDF && cashGivenCDF + cashGivenUSD > 0) {
      setErrorMessage('Le montant versé par le client est inférieur au total dû.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    const startTime = performance.now();

    try {
      const result = await store.createSale({
        items: cart.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          customBatchId: item.customBatchId,
        })),
        clientName: clientName.trim() || undefined,
        paymentMethod: paymentCurrency === 'CDF' ? 'CASH_CDF' : paymentCurrency === 'USD' ? 'CASH_USD' : 'MIXED',
        amountPaidCDF: cashGivenCDF > 0 ? cashGivenCDF : totalCDF,
        amountPaidUSD: cashGivenUSD,
      });

      const elapsed = Math.round(performance.now() - startTime);

      if (result.success && result.sale) {
        setLastCompletedSale(result.sale);
        setShowReceiptModal(true);
        // Réinitialiser le panier
        setCart([]);
        setCashGivenCDF(0);
        setCashGivenUSD(0);
        setClientName('');
        console.log(`Vente enregistrée avec succès en ${elapsed} ms (< 2000 ms)`);
      } else {
        setErrorMessage(result.error || "Échec de l'enregistrement de la vente.");
      }
    } catch (e: any) {
      setErrorMessage(e.message || 'Erreur inattendue.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Annulation de vente avec code PIN (Admin ou Gestionnaire)
  const handleConfirmCancelSale = async () => {
    if (!saleToCancel) return;
    setCancelError(null);

    if (!cancelPin.trim()) {
      setCancelError('Veuillez saisir votre code PIN de responsable.');
      return;
    }

    if (!cancelReason.trim()) {
      setCancelError('Le motif d’annulation est obligatoire pour le journal d’audit.');
      return;
    }

    const result = await store.cancelSale(saleToCancel.id, cancelReason, cancelPin);
    if (result.success) {
      setSaleToCancel(null);
      setCancelPin('');
      setCancelReason('');
    } else {
      setCancelError(result.error || 'Erreur lors de l’annulation.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Messages d'alerte / Erreurs */}
      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-xs text-red-800">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <strong>Alerte opérationnelle :</strong> {errorMessage}
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-red-600">
            &times;
          </button>
        </div>
      )}

      {/* Grille principale : Catalogue (gauche) & Caisse / Panier (droite) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Section Gauche : Recherche & Catalogue de Médicaments (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
            {/* Barre de recherche instantanée */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher par Nom commercial, DCI (ex: Paracétamol, Artéméther) ou Code..."
                className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                autoFocus
              />
            </div>

            {/* Filtres par Catégorie Thérapeutique (Segmented controls, zero-pill style) */}
            <div className="flex items-center gap-1.5 mt-3 overflow-x-auto pb-1 scrollbar-none text-xs">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 font-medium rounded-md whitespace-nowrap transition-colors ${
                    selectedCategory === cat
                      ? 'bg-blue-800 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat === 'ALL' ? 'Tous les produits' : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Grille des Médicaments */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredProducts.map((product) => {
              const stock = getProductAvailableStock(product.id);
              const suggestedBatch = getSuggestedFEFOBatch(product.id);
              const isBlocked = product.status === 'RECALLED_BLOCKED';
              const daysLeft = suggestedBatch ? getDaysUntilExpiry(suggestedBatch.expiryDate) : null;
              const alertLevel = suggestedBatch ? getExpiryAlertLevel(suggestedBatch.expiryDate) : 'OK';

              return (
                <div
                  key={product.id}
                  onClick={() => !isBlocked && stock > 0 && handleAddToCart(product)}
                  className={`p-3.5 rounded-xl border transition-all text-left flex flex-col justify-between ${
                    isBlocked
                      ? 'bg-red-50/50 border-red-200 cursor-not-allowed'
                      : stock <= 0
                      ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                      : 'bg-white border-slate-200 hover:border-blue-400 hover:shadow-sm cursor-pointer active:scale-[0.99]'
                  }`}
                >
                  <div>
                    {/* En-tête produit : Nom & Forme */}
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-semibold text-slate-900 text-sm leading-snug">
                        {product.name}
                      </h4>
                      <span className="text-xs font-bold text-blue-900 whitespace-nowrap">
                        {formatCDF(product.unitPriceCDF)}
                      </span>
                    </div>

                    {/* DCI, Dosage et Fabricant */}
                    <div className="text-xs text-slate-500 mt-1">
                      <span>{product.inn}</span>
                      <span aria-hidden="true"> · </span>
                      <span>{product.dosage}</span>
                    </div>

                    <div className="text-[11px] text-slate-400 mt-0.5">
                      <span>{product.form}</span>
                      <span aria-hidden="true"> · </span>
                      <span>{product.packaging}</span>
                    </div>
                  </div>

                  {/* Stock et Attribution FEFO */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      {isBlocked ? (
                        <span className="text-red-700 font-bold flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5 text-red-600" />
                          Rappel / Bloqué
                        </span>
                      ) : stock <= 0 ? (
                        <span className="text-red-600 font-medium">Rupture de stock</span>
                      ) : (
                        <div className="text-slate-600">
                          Stock disp. :{' '}
                          <span
                            className={`font-bold ${
                              stock <= product.minStockAlert ? 'text-amber-700' : 'text-slate-800'
                            }`}
                          >
                            {stock}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* FEFO indication */}
                    {suggestedBatch && !isBlocked && (
                      <div
                        className="text-[11px] text-right"
                        title={`Lot prioritaire FEFO : ${suggestedBatch.batchNumber}`}
                      >
                        <span className="text-slate-400">Lot FEFO : </span>
                        <span className="font-mono font-medium text-slate-700">
                          {suggestedBatch.batchNumber}
                        </span>
                        {daysLeft !== null && daysLeft <= 60 && (
                          <div
                            className={`text-[10px] font-medium ${
                              alertLevel === 'CRITICAL_30' ? 'text-red-600' : 'text-amber-600'
                            }`}
                          >
                            Expire dans {daysLeft}j
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section Droite : Panier de Vente & Caisse (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col h-full">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-blue-700" />
                <h3 className="font-bold text-slate-900 text-sm">Panier de Vente au détail</h3>
              </div>
              {cart.length > 0 && (
                <button
                  onClick={() => setCart([])}
                  className="text-xs text-slate-400 hover:text-red-600 transition-colors"
                >
                  Vider le panier
                </button>
              )}
            </div>

            {/* Lignes du panier */}
            <div className="flex-1 overflow-y-auto max-h-80 my-3 divide-y divide-slate-100">
              {cart.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  <ShoppingCart className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p>Le panier est vide.</p>
                  <p className="mt-1 text-slate-400">
                    Sélectionnez un médicament dans le catalogue à gauche.
                  </p>
                </div>
              ) : (
                cart.map((item) => {
                  const productBatches = batches.filter(
                    (b) => b.productId === item.product.id && b.status === 'ACTIVE'
                  );
                  const selectedBatch = item.customBatchId
                    ? productBatches.find((b) => b.id === item.customBatchId)
                    : null;
                  const suggestedBatch = getSuggestedFEFOBatch(item.product.id);
                  const activeBatch = selectedBatch || suggestedBatch;

                  return (
                    <div key={item.product.id} className="py-2.5 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h5 className="font-semibold text-slate-800 text-xs">
                            {item.product.name}
                          </h5>
                          <div className="text-[11px] text-slate-400">
                            {item.product.inn} · {item.product.dosage}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-xs text-slate-900">
                            {formatCDF(item.product.unitPriceCDF * item.quantity)}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {formatUSD(item.product.unitPriceUSD * item.quantity)}
                          </div>
                        </div>
                      </div>

                      {/* Sélection du lot (FEFO automatique ou choix manuel) */}
                      <div className="flex items-center justify-between text-[11px] bg-slate-50 p-1.5 rounded-md border border-slate-200">
                        <div className="flex items-center gap-1 text-slate-600">
                          <Layers className="w-3 h-3 text-blue-700" />
                          <span>Lot délivré :</span>
                        </div>
                        <select
                          value={item.customBatchId || 'AUTO'}
                          onChange={(e) => handleSelectBatchManual(item.product.id, e.target.value)}
                          className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[11px] font-mono font-medium text-slate-700 focus:outline-none"
                        >
                          <option value="AUTO">
                            FEFO Auto ({suggestedBatch?.batchNumber || 'N/A'} - Exp{' '}
                            {formatDate(suggestedBatch?.expiryDate || '')})
                          </option>
                          {productBatches.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.batchNumber} (Exp: {formatDate(b.expiryDate)} - Restant:{' '}
                              {b.currentQuantity})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Quantité & Supprimer */}
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleUpdateQuantity(item.product.id, item.quantity - 1)}
                            className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              handleUpdateQuantity(item.product.id, parseInt(e.target.value) || 1)
                            }
                            className="w-12 text-center text-xs font-semibold border border-slate-200 rounded py-0.5"
                          />
                          <button
                            onClick={() => handleUpdateQuantity(item.product.id, item.quantity + 1)}
                            className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs"
                          >
                            +
                          </button>
                        </div>
                        <button
                          onClick={() => handleRemoveFromCart(item.product.id)}
                          className="text-slate-400 hover:text-red-600 p-1"
                          title="Supprimer la ligne"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Pied du panier : Données client & Paiement */}
            {cart.length > 0 && (
              <div className="border-t border-slate-200 pt-3 space-y-3">
                {/* Nom du client / Patient */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                    Nom du client / Patient (optionnel) :
                  </label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Ex: Patient Mbuyi, Maman Louise..."
                    className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>

                {/* Synthèse des totaux Bidevise (CDF / USD) */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Taux officiel appliqué :</span>
                    <span className="font-mono">1 USD = {rate.toLocaleString()} FC</span>
                  </div>

                  <div className="flex items-baseline justify-between border-t border-slate-200 pt-1.5">
                    <span className="text-xs font-bold text-slate-700">Total à payer :</span>
                    <div className="text-right">
                      <div className="text-lg font-black text-blue-900 tracking-tight">
                        {formatCDF(totalCDF)}
                      </div>
                      <div className="text-xs font-semibold text-slate-500">
                        {formatUSD(totalUSD)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mode de règlement & Montants reçus */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-slate-500 font-medium">Devise de versement :</span>
                    <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-md">
                      <button
                        onClick={() => setPaymentCurrency('CDF')}
                        className={`px-2 py-0.5 rounded font-medium ${
                          paymentCurrency === 'CDF'
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600'
                        }`}
                      >
                        FC (CDF)
                      </button>
                      <button
                        onClick={() => setPaymentCurrency('USD')}
                        className={`px-2 py-0.5 rounded font-medium ${
                          paymentCurrency === 'USD'
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600'
                        }`}
                      >
                        USD ($)
                      </button>
                      <button
                        onClick={() => setPaymentCurrency('MIXED')}
                        className={`px-2 py-0.5 rounded font-medium ${
                          paymentCurrency === 'MIXED'
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600'
                        }`}
                      >
                        Mixte
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {(paymentCurrency === 'CDF' || paymentCurrency === 'MIXED') && (
                      <div>
                        <label className="text-[10px] text-slate-500 font-medium">
                          Espèces reçues (FC) :
                        </label>
                        <input
                          type="number"
                          value={cashGivenCDF || ''}
                          onChange={(e) => setCashGivenCDF(parseFloat(e.target.value) || 0)}
                          placeholder={`${totalCDF}`}
                          className="w-full text-xs px-2 py-1.5 border border-slate-300 rounded font-mono font-semibold"
                        />
                      </div>
                    )}
                    {(paymentCurrency === 'USD' || paymentCurrency === 'MIXED') && (
                      <div>
                        <label className="text-[10px] text-slate-500 font-medium">
                          Espèces reçues ($ USD) :
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          value={cashGivenUSD || ''}
                          onChange={(e) => setCashGivenUSD(parseFloat(e.target.value) || 0)}
                          placeholder={`${totalUSD.toFixed(1)}`}
                          className="w-full text-xs px-2 py-1.5 border border-slate-300 rounded font-mono font-semibold"
                        />
                      </div>
                    )}
                  </div>

                  {/* Monnaie à rendre */}
                  {changeCDF > 0 && (
                    <div className="flex items-center justify-between text-xs p-2 bg-emerald-50 text-emerald-900 rounded-md border border-emerald-200">
                      <span className="font-semibold">Monnaie à rendre :</span>
                      <span className="font-bold font-mono">
                        {formatCDF(changeCDF)} ({formatUSD(changeUSD)})
                      </span>
                    </div>
                  )}
                </div>

                {/* Bouton de confirmation de vente (< 2s) */}
                <button
                  onClick={handleCompleteSale}
                  disabled={isProcessing}
                  className="w-full py-3 bg-blue-800 hover:bg-blue-900 text-white font-bold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 active:scale-[0.99]"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>
                    {isProcessing ? 'Enregistrement sécurisé...' : 'Valider la Vente & Imprimer le Ticket'}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Historique récent des ventes avec bouton d'annulation sécurisée */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-700" />
            <h4 className="font-bold text-slate-900 text-sm">Dernières ventes comptoir</h4>
          </div>
          <span className="text-xs text-slate-500">{sales.length} transaction(s) enregistrée(s)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 bg-slate-50">
                <th className="py-2 px-3 font-semibold">N° Vente</th>
                <th className="py-2 px-3 font-semibold">Date & Heure</th>
                <th className="py-2 px-3 font-semibold">Client</th>
                <th className="py-2 px-3 font-semibold">Caissier</th>
                <th className="py-2 px-3 font-semibold">Articles délivrés</th>
                <th className="py-2 px-3 font-semibold text-right">Total (FC)</th>
                <th className="py-2 px-3 font-semibold text-right">Total ($)</th>
                <th className="py-2 px-3 font-semibold">Statut</th>
                <th className="py-2 px-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sales.slice(0, 8).map((sale) => (
                <tr key={sale.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-mono font-semibold text-blue-900">
                    {sale.saleNumber}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">{formatDateTime(sale.saleDate)}</td>
                  <td className="py-2.5 px-3 text-slate-800">{sale.clientName || 'Comptoir'}</td>
                  <td className="py-2.5 px-3 text-slate-600">{sale.cashierName}</td>
                  <td className="py-2.5 px-3 text-slate-600">
                    {sale.items.map((i) => `${i.productName} (Lot ${i.batchNumber}) x${i.quantity}`).join(', ')}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-slate-900 text-right">
                    {formatCDF(sale.totalCDF)}
                  </td>
                  <td className="py-2.5 px-3 text-slate-500 text-right font-mono">
                    {formatUSD(sale.totalUSD)}
                  </td>
                  <td className="py-2.5 px-3">
                    {sale.status === 'COMPLETED' ? (
                      <span className="text-emerald-700 font-medium">Confirmée</span>
                    ) : (
                      <span className="text-red-700 font-medium" title={sale.cancellationReason}>
                        Annulée
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right space-x-1">
                    <button
                      onClick={() => {
                        setLastCompletedSale(sale);
                        setShowReceiptModal(true);
                      }}
                      className="p-1 text-slate-500 hover:text-blue-700 hover:bg-slate-100 rounded"
                      title="Réimprimer le ticket de caisse"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                    {sale.status === 'COMPLETED' && (
                      <button
                        onClick={() => {
                          setSaleToCancel(sale);
                          setCancelError(null);
                        }}
                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                        title="Annuler la vente (Requiert code PIN Gestionnaire/Admin)"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Reçu de Caisse / Ticket Thermique imprimable */}
      {showReceiptModal && lastCompletedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl p-6 text-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Ticket Header conforme RDC */}
            <div className="text-center space-y-1 border-b border-dashed border-slate-300 pb-3">
              <h3 className="font-extrabold text-base text-slate-900 uppercase tracking-tight">
                {pharmacy.name}
              </h3>
              <p className="text-xs text-slate-600">{pharmacy.address}</p>
              <p className="text-xs text-slate-600">
                {pharmacy.commune}, {pharmacy.city} — Tél : {pharmacy.phone}
              </p>
              <p className="text-[11px] text-blue-900 font-semibold">
                N° Aut. Min. Santé : {pharmacy.licenseNumber}
              </p>
              <p className="text-[11px] text-slate-500">Titulaire : {pharmacy.chiefPharmacist}</p>
            </div>

            {/* Méta Ticket */}
            <div className="text-xs space-y-1 text-slate-600">
              <div className="flex justify-between">
                <span>Ticket N° :</span>
                <span className="font-mono font-bold text-slate-900">
                  {lastCompletedSale.saleNumber}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Date & Heure :</span>
                <span>{formatDateTime(lastCompletedSale.saleDate)}</span>
              </div>
              <div className="flex justify-between">
                <span>Caissier(e) :</span>
                <span>{lastCompletedSale.cashierName}</span>
              </div>
              {lastCompletedSale.clientName && (
                <div className="flex justify-between">
                  <span>Client :</span>
                  <span>{lastCompletedSale.clientName}</span>
                </div>
              )}
            </div>

            {/* Lignes d'articles et Traçabilité des lots délivrés */}
            <div className="border-t border-b border-dashed border-slate-300 py-2 space-y-2 text-xs">
              <div className="font-semibold text-slate-700 flex justify-between">
                <span>Désignation & Lot délivré</span>
                <span>Total</span>
              </div>
              {lastCompletedSale.items.map((item) => (
                <div key={item.id} className="space-y-0.5">
                  <div className="flex justify-between">
                    <span className="font-medium text-slate-900">
                      {item.productName} ({item.dosage}) x{item.quantity}
                    </span>
                    <span className="font-mono">{formatCDF(item.totalPriceCDF)}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 flex justify-between font-mono">
                    <span>
                      Lot: {item.batchNumber} · Exp: {formatDate(item.expiryDate)}
                    </span>
                    <span>({formatUSD(item.totalPriceUSD)})</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Totaux & Rendu Monnaie */}
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-base font-bold text-slate-900">
                <span>TOTAL :</span>
                <span className="text-blue-900">{formatCDF(lastCompletedSale.totalCDF)}</span>
              </div>
              <div className="flex justify-between text-xs font-semibold text-slate-500">
                <span>Contre-valeur USD :</span>
                <span>{formatUSD(lastCompletedSale.totalUSD)}</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 pt-1">
                <span>Montant reçu :</span>
                <span>
                  {formatCDF(lastCompletedSale.amountPaidCDF)}
                  {lastCompletedSale.amountPaidUSD > 0 &&
                    ` + $${lastCompletedSale.amountPaidUSD.toFixed(2)} USD`}
                </span>
              </div>
              {lastCompletedSale.changeGivenCDF > 0 && (
                <div className="flex justify-between text-xs font-semibold text-emerald-800">
                  <span>Monnaie rendue :</span>
                  <span>{formatCDF(lastCompletedSale.changeGivenCDF)}</span>
                </div>
              )}
            </div>

            {/* Empreinte cryptographique d'intégrité */}
            <div className="pt-2 text-center text-[10px] text-slate-400 font-mono border-t border-slate-100">
              Signature d'audit : {lastCompletedSale.signatureHash}
              <p className="mt-1 text-slate-500 italic">
                Médicaments non repris ni échangés. Conserver hors de portée des enfants.
              </p>
            </div>

            {/* Actions du Modal */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 bg-blue-800 hover:bg-blue-900 text-white text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimer Reçu</span>
              </button>
              <button
                onClick={() => setShowReceiptModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-md"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal d'Annulation de Vente (Requiert PIN Gestionnaire / Admin) */}
      {saleToCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl p-6 text-slate-800 space-y-4">
            <div className="flex items-center gap-2 text-red-700 border-b border-slate-100 pb-3">
              <Lock className="w-5 h-5 text-red-600" />
              <h3 className="font-bold text-slate-900 text-sm">
                Annulation de Vente sécurisée : {saleToCancel.saleNumber}
              </h3>
            </div>

            {cancelError && (
              <div className="p-2.5 bg-red-50 text-red-800 text-xs rounded border border-red-200">
                {cancelError}
              </div>
            )}

            <div className="text-xs text-slate-600 space-y-1">
              <p>
                <strong>Montant :</strong> {formatCDF(saleToCancel.totalCDF)} (
                {formatUSD(saleToCancel.totalUSD)})
              </p>
              <p>
                <strong>Lots à réintégrer en stock :</strong>{' '}
                {saleToCancel.items.map((i) => `${i.productName} x${i.quantity}`).join(', ')}
              </p>
              <p className="text-amber-800 bg-amber-50 p-2 rounded border border-amber-200 mt-2">
                Conformément aux règles de contrôle interne, toute annulation réintègre les lots en
                stock et est consignée au Journal d'Audit inaltérable.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Motif d'annulation obligatoire :
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Ex: Erreur de saisie caissier, désistement patient avant remise des médicaments..."
                rows={2}
                className="w-full text-xs p-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Code PIN du Gestionnaire ou Administrateur :
              </label>
              <input
                type="password"
                maxLength={6}
                value={cancelPin}
                onChange={(e) => setCancelPin(e.target.value)}
                placeholder="Entrez votre PIN (ex: 1234 pour Admin, 2345 pour Gérant)"
                className="w-full text-xs p-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600 font-mono tracking-widest text-center"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleConfirmCancelSale}
                className="flex-1 py-2 bg-red-700 hover:bg-red-800 text-white text-xs font-semibold rounded-md shadow-xs"
              >
                Confirmer l'annulation & Réintégrer le stock
              </button>
              <button
                onClick={() => setSaleToCancel(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-md"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
