import { useEffect, useState } from 'react';
import Head from 'next/head';
import { AlertCircle, CheckCircle2, ChevronRight, Crown, Heart, Loader2, RefreshCw, ShoppingCart } from 'lucide-react';
import { DONATION_PERKS, PRODUCTS } from '../lib/shop-products';

export default function Shop() {
  const [activeTab, setActiveTab] = useState('premium');
  const [purchaseState, setPurchaseState] = useState({ loading: true, purchases: {}, roblox: null, message: '' });
  const [claimingProductId, setClaimingProductId] = useState(null);
  const [productMessages, setProductMessages] = useState({});
  const [purchaseErrorModal, setPurchaseErrorModal] = useState(null);

  const loadPurchases = async () => {
    setPurchaseState(prev => ({ ...prev, loading: true, message: '' }));
    try {
      const response = await fetch('/api/shop/purchases');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to check purchases');
      setPurchaseState({
        loading: false,
        purchases: data.purchases || {},
        roblox: data.roblox || (data.robloxUsername ? { username: data.robloxUsername } : null),
        message: data.message || data.error || '',
        linked: data.linked,
      });
    } catch (error) {
      setPurchaseState(prev => ({
        ...prev,
        loading: false,
        message: error.message || 'Failed to check purchases',
      }));
    }
  };

  useEffect(() => {
    loadPurchases();
  }, []);

  const handleClaimPurchase = async (product) => {
    setClaimingProductId(product.id);
    setProductMessages(prev => ({ ...prev, [product.id]: null }));

    try {
      const response = await fetch('/api/shop/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id }),
      });
      const data = await response.json();

      if (!response.ok) {
        setProductMessages(prev => ({
          ...prev,
          [product.id]: { type: 'error', text: data.message || data.error || 'Purchase could not be verified.' },
        }));
        return;
      }

      if (!data.owned) {
        setPurchaseErrorModal({
          productName: product.name,
          message: data.message || 'Purchase could not be verified.',
        });
        return;
      }

      setPurchaseState(prev => ({
        ...prev,
        roblox: data.roblox || prev.roblox,
        purchases: {
          ...prev.purchases,
          [product.id]: { ...(prev.purchases?.[product.id] || {}), owned: true },
        },
      }));
      setProductMessages(prev => ({
        ...prev,
        [product.id]: { type: 'success', text: data.message || 'Purchase verified. Thank you for purchasing!' },
      }));

      if (data.redirectUrl) {
        window.open(data.redirectUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      setProductMessages(prev => ({
        ...prev,
        [product.id]: { type: 'error', text: error.message || 'Failed to verify purchase.' },
      }));
    } finally {
      setClaimingProductId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto animate-fade-in-up">
      <Head>
        <title>Shop | GSRP Dashboard</title>
      </Head>

      <div className="mb-8 p-8 rounded-2xl bg-card-gradient border border-gsrp-dark-border/50 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-gsrp-orange/10 to-gsrp-teal/10 opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-gsrp-orange/20 rounded-full blur-3xl animate-pulse-glow" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-gsrp-teal/20 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '1s' }} />
        
        <div className="relative z-10 flex flex-col md:flex-row items-center md:justify-between gap-6">
          <div>
            <h1 className="text-white font-black text-3xl md:text-5xl mb-4 tracking-tight flex items-center gap-4">
              <ShoppingCart className="w-10 h-10 text-gsrp-orange" />
              GSRP Store
            </h1>
            <p className="text-gsrp-teal-light/60 text-lg max-w-2xl font-medium">
              Support the Georgia State Roleplay community and unlock exclusive perks, roles, and in-game advantages.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-xl border border-gsrp-dark-border/60 bg-gsrp-dark/40 px-4 py-2 text-sm font-bold text-gsrp-teal-light/80">
                {purchaseState.loading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-gsrp-orange" />
                ) : purchaseState.roblox?.username ? (
                  <CheckCircle2 className="w-4 h-4 text-gsrp-teal" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-gsrp-orange" />
                )}
                {purchaseState.roblox?.username ? `Logged in as ${purchaseState.roblox.username}` : purchaseState.loading ? 'Checking linked Roblox account' : 'No Roblox account linked'}
              </div>
              <button
                onClick={loadPurchases}
                disabled={purchaseState.loading}
                className="inline-flex items-center gap-2 rounded-xl border border-gsrp-dark-border/60 bg-gsrp-dark/40 px-3 py-2 text-xs font-black uppercase tracking-wider text-gsrp-teal-light/50 hover:text-white hover:border-gsrp-teal/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Refresh purchase status"
              >
                <RefreshCw className={`w-4 h-4 ${purchaseState.loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
            {purchaseState.message && (
              <p className="mt-3 text-sm font-semibold text-gsrp-orange/90">{purchaseState.message}</p>
            )}
          </div>
          <div className="hidden md:block">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-gsrp-orange to-gsrp-teal p-0.5 animate-float">
              <div className="w-full h-full bg-gsrp-dark-card rounded-2xl flex items-center justify-center">
                <Crown className="w-12 h-12 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex space-x-2 mb-8 overflow-x-auto pb-2 scrollbar-none">
        {['premium', 'advertisements', 'donations'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 rounded-xl font-bold text-sm tracking-wide transition-all duration-300 capitalize flex-shrink-0 ${
              activeTab === tab
                ? 'bg-gsrp-orange text-white shadow-lg shadow-gsrp-orange/20 scale-105'
                : 'bg-gsrp-dark-card/50 text-gsrp-teal-light/40 hover:bg-gsrp-dark-surface hover:text-white border border-gsrp-dark-border/50'
            }`}
          >
            {tab === 'advertisements' ? 'Paid Advertisements' : tab}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {PRODUCTS[activeTab].map((product, idx) => {
          const owned = purchaseState.purchases?.[product.id]?.owned;
          const productMessage = productMessages[product.id];
          const isClaiming = claimingProductId === product.id;

          return (
          <div 
            key={idx}
            className={`relative rounded-2xl border transition-all duration-300 flex flex-col h-full bg-gsrp-dark-card/60 backdrop-blur-md group hover:-translate-y-2
              ${product.featured 
                ? 'border-gsrp-orange/50 shadow-lg shadow-gsrp-orange/10 hover:shadow-gsrp-orange/20 hover:border-gsrp-orange' 
                : 'border-gsrp-dark-border/50 hover:border-gsrp-teal/50 hover:shadow-lg hover:shadow-gsrp-teal/10'
              }
            `}
          >
            {product.featured && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-gsrp-orange to-gsrp-warm text-white text-[10px] font-black uppercase tracking-widest py-1 px-4 rounded-full shadow-lg z-10 whitespace-nowrap">
                Most Popular
              </div>
            )}
            
            {product.overlay && (
              <div className="absolute inset-0 bg-gsrp-dark-card/80 backdrop-blur-[2px] z-20 flex items-center justify-center rounded-2xl border border-gsrp-dark-border/50">
                <div className="bg-gsrp-dark-surface px-6 py-3 rounded-xl font-black text-xl text-gsrp-teal-light tracking-widest uppercase border border-gsrp-teal/30 shadow-[0_0_20px_rgba(20,184,166,0.2)] transform -rotate-12">
                  {product.overlay}
                </div>
              </div>
            )}

            <div className="p-6 flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl ${product.featured ? 'bg-gsrp-orange/10 text-gsrp-orange' : 'bg-gsrp-teal/10 text-gsrp-teal-light'}`}>
                  {product.icon ? <product.icon className="w-6 h-6" /> : <Heart className="w-6 h-6" />}
                </div>
                <div className="text-right">
                  <span className="block text-2xl font-black text-white">R$ {product.price}</span>
                </div>
              </div>
              
              <h3 className="text-xl font-bold text-white mb-2 group-hover:text-gsrp-orange transition-colors">{product.name}</h3>
              
              <div className="mt-4 flex-1">
                {(product.perks || DONATION_PERKS).map((perk, i) => (
                  <div key={i} className="flex items-start gap-3 mb-3 text-sm text-gsrp-teal-light/60">
                    <ChevronRight className={`w-4 h-4 mt-0.5 flex-shrink-0 ${product.featured ? 'text-gsrp-orange' : 'text-gsrp-teal'}`} />
                    <span>{perk}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 pt-0 mt-auto">
              {product.link && product.link !== "#" ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                    <a
                      href={product.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`w-full min-h-12 py-3 px-5 rounded-xl font-bold flex items-center justify-center gap-2 text-center text-sm transition-all duration-300
                        ${owned
                          ? 'bg-gsrp-teal/15 text-gsrp-teal-light border border-gsrp-teal/30'
                          : product.featured
                            ? 'bg-gradient-to-r from-gsrp-orange to-gsrp-warm text-white hover:shadow-lg hover:shadow-gsrp-orange/20 hover:scale-[1.02]'
                            : 'bg-gsrp-teal-light/10 text-gsrp-teal-light hover:bg-gsrp-teal-light hover:text-white hover:shadow-lg hover:shadow-gsrp-teal/20 hover:scale-[1.02]'
                        }
                      `}
                    >
                      {owned ? <CheckCircle2 className="w-5 h-5" /> : <ShoppingCart className="w-5 h-5" />}
                      {owned ? 'Thank you for purchasing!' : 'Purchase'}
                    </a>
                    <button
                      onClick={() => handleClaimPurchase(product)}
                      disabled={isClaiming || purchaseState.loading || !purchaseState.roblox?.id}
                      className="w-full min-h-12 py-3 px-5 rounded-xl font-bold flex items-center justify-center text-center text-sm bg-gsrp-dark-surface text-gsrp-teal-light/70 hover:text-white hover:border-gsrp-teal/50 border border-gsrp-dark-border/70 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                    >
                      {isClaiming ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Just bought it!'}
                    </button>
                  </div>
                  {productMessage && (
                    <p className="text-xs font-semibold leading-relaxed text-gsrp-teal-light/80">
                      {productMessage.text}
                    </p>
                  )}
                </div>
              ) : (
                <button
                  disabled
                  className="w-full py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 bg-gsrp-dark-surface text-gsrp-teal-light/30 cursor-not-allowed border border-gsrp-dark-border/50"
                >
                  Unavailable
                </button>
              )}
            </div>
          </div>
          );
        })}
      </div>

      {purchaseErrorModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          <button
            type="button"
            aria-label="Close purchase check message"
            onClick={() => setPurchaseErrorModal(null)}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <div className="relative w-full max-w-lg rounded-2xl border border-gsrp-orange/30 bg-gsrp-dark-card shadow-2xl shadow-black/40 overflow-hidden">
            <div className="p-6 border-b border-gsrp-dark-border/70 bg-gsrp-orange/10">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-gsrp-orange/15 text-gsrp-orange flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-white text-xl font-black">Purchase not verified</h2>
                  <p className="mt-1 text-sm font-semibold text-gsrp-teal-light/60">{purchaseErrorModal.productName}</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <p className="text-sm leading-relaxed text-gsrp-teal-light/80">
                {purchaseErrorModal.message}
              </p>

              <div className="mt-5 rounded-xl border border-gsrp-dark-border/70 bg-gsrp-dark-surface/70 p-4">
                <p className="text-xs font-black uppercase tracking-widest text-gsrp-teal-light/40 mb-3">Possible fixes</p>
                <div className="space-y-3 text-sm text-gsrp-teal-light/70">
                  <div className="flex gap-3">
                    <ChevronRight className="w-4 h-4 mt-0.5 text-gsrp-orange flex-shrink-0" />
                    <span>Confirm the Roblox account shown at the top is the account that bought the pass.</span>
                  </div>
                  <div className="flex gap-3">
                    <ChevronRight className="w-4 h-4 mt-0.5 text-gsrp-orange flex-shrink-0" />
                    <span>Wait a few seconds after purchasing, then press Refresh and try again.</span>
                  </div>
                  <div className="flex gap-3">
                    <ChevronRight className="w-4 h-4 mt-0.5 text-gsrp-orange flex-shrink-0" />
                    <span>If the wrong Roblox account is linked, unlink and verify the correct account in Discord.</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setPurchaseErrorModal(null)}
                className="mt-6 w-full min-h-12 rounded-xl bg-gsrp-orange px-5 py-3 text-sm font-black text-white hover:bg-gsrp-warm transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
