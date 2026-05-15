// QR Scanner / Manual ID Entry for Shops (Priority 2.1)
import { useState, useRef } from 'react';
import { useData } from '../../contexts/DataContext';
import { QrCode, Search, CheckCircle, XCircle, User, ShoppingCart } from 'lucide-react';
import QuotaRingProgress from '../../components/QuotaRingProgress';
import toast from 'react-hot-toast';

export default function QRScanner() {
  const { buyerProfiles, validateTransaction, submitTransaction } = useData();
  const [buyerIdInput, setBuyerIdInput] = useState('');
  const [foundBuyer, setFoundBuyer] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [saleForm, setSaleForm] = useState({ alcoholType: 'Whiskey', quantity: 1 });
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const inputRef = useRef(null);

  const ALCOHOL_TYPES = ['Whiskey', 'Beer', 'Rum', 'Vodka', 'Wine', 'Brandy', 'Gin'];

  const handleLookup = () => {
    const id = buyerIdInput.trim();
    if (!id) return;

    // Try direct key lookup or search by name
    let profile = buyerProfiles[id];
    if (!profile) {
      profile = Object.values(buyerProfiles).find(
        (p) => p.buyerId === id || String(p.buyerId) === id
      );
    }

    if (profile) {
      setFoundBuyer(profile);
      setNotFound(false);
    } else {
      setFoundBuyer(null);
      setNotFound(true);
    }
    setLastResult(null);
  };

  const handleSale = async () => {
    if (!foundBuyer) return;
    setSubmitting(true);
    try {
      const result = await submitTransaction({
        buyerId: foundBuyer.buyerId,
        buyerName: foundBuyer.name,
        shopId: 'shop-001',
        alcoholType: saleForm.alcoholType,
        quantity: saleForm.quantity,
      });
      setLastResult(result);
      if (result.status === 'approved') {
        toast.success(`✅ Transaction approved for ${foundBuyer.name}`);
        // Optimistic quota update displayed via foundBuyer refresh
        setFoundBuyer((prev) => ({
          ...prev,
          dailyRemaining: Math.max(0, prev.dailyRemaining - saleForm.quantity),
          weeklyRemaining: Math.max(0, prev.weeklyRemaining - saleForm.quantity),
          monthlyRemaining: Math.max(0, prev.monthlyRemaining - saleForm.quantity),
        }));
      } else {
        toast.error(`❌ ${result.reason}`);
      }
    } catch (err) {
      toast.error('Transaction failed');
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setBuyerIdInput('');
    setFoundBuyer(null);
    setNotFound(false);
    setLastResult(null);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const validation = foundBuyer
    ? validateTransaction(foundBuyer.buyerId, saleForm.quantity, saleForm.alcoholType)
    : null;

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center gap-3">
        <QrCode className="w-6 h-6 text-accent-cyan" />
        <div>
          <h1 className="text-2xl font-bold text-dark-100">QR Scanner / Buyer Lookup</h1>
          <p className="text-sm text-dark-400 mt-1">Scan QR or enter buyer ID manually to verify and dispense</p>
        </div>
      </div>

      {/* Search bar */}
      <div className="glass-card p-5">
        <label className="block text-xs text-dark-400 uppercase tracking-wider mb-2">
          Buyer ID / QR Code
        </label>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Enter buyer ID (e.g. buyer-001) or paste QR token…"
              value={buyerIdInput}
              onChange={(e) => setBuyerIdInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
              className="input-field pl-9"
              autoFocus
            />
          </div>
          <button onClick={handleLookup} className="btn-primary">
            Lookup
          </button>
          {foundBuyer && (
            <button onClick={reset} className="btn-secondary">
              Clear
            </button>
          )}
        </div>
        <p className="text-xs text-dark-500 mt-2">
          Tip: In a full deployment, this field auto-fills when a QR code is scanned with a USB scanner.
        </p>
      </div>

      {/* Not found */}
      {notFound && (
        <div className="glass-card p-4 border border-accent-red/30 flex items-center gap-3">
          <XCircle className="w-5 h-5 text-accent-red" />
          <p className="text-sm text-accent-red">Buyer not found for ID: <span className="font-mono">{buyerIdInput}</span></p>
        </div>
      )}

      {/* Buyer found */}
      {foundBuyer && (
        <div className="space-y-4">
          {/* Profile card */}
          <div className="glass-card p-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-accent-green/10 border border-accent-green/20 flex items-center justify-center flex-shrink-0">
                <User className="w-6 h-6 text-accent-green" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-bold text-dark-100">{foundBuyer.name}</h3>
                  {foundBuyer.blacklistStatus ? (
                    <span className="badge-danger">Blacklisted</span>
                  ) : (
                    <span className="badge-success">Active</span>
                  )}
                </div>
                <p className="text-xs font-mono text-accent-cyan mt-0.5">{foundBuyer.buyerId}</p>
                <p className="text-xs text-dark-400 mt-1">Region: {foundBuyer.region || 'N/A'} · Risk Score: {foundBuyer.riskScore || 0}</p>
              </div>
            </div>

            {/* Quota rings */}
            <div className="mt-5 pt-4 border-t border-dark-700/40">
              <p className="text-xs text-dark-400 uppercase tracking-wider mb-3">Quota Remaining</p>
              <QuotaRingProgress
                daily={{ remaining: foundBuyer.dailyRemaining, limit: 2 }}
                weekly={{ remaining: foundBuyer.weeklyRemaining, limit: 10 }}
                monthly={{ remaining: foundBuyer.monthlyRemaining, limit: 30 }}
              />
            </div>
          </div>

          {/* Sale form */}
          {!foundBuyer.blacklistStatus && (
            <div className="glass-card p-5 space-y-4">
              <h3 className="text-sm font-semibold text-dark-100 flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-accent-cyan" />
                Dispense
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-dark-400 mb-1">Alcohol Type</label>
                  <select
                    value={saleForm.alcoholType}
                    onChange={(e) => setSaleForm((p) => ({ ...p, alcoholType: e.target.value }))}
                    className="select-field"
                  >
                    {ALCOHOL_TYPES.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-dark-400 mb-1">Quantity</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={saleForm.quantity}
                    onChange={(e) => setSaleForm((p) => ({ ...p, quantity: parseInt(e.target.value) || 1 }))}
                    className="input-field"
                  />
                </div>
              </div>

              {/* Validation result */}
              {validation && (
                <div className={`flex items-center gap-2 p-3 rounded-lg ${validation.valid ? 'bg-accent-green/10 border border-accent-green/20' : 'bg-accent-red/10 border border-accent-red/20'}`}>
                  {validation.valid
                    ? <CheckCircle className="w-4 h-4 text-accent-green flex-shrink-0" />
                    : <XCircle className="w-4 h-4 text-accent-red flex-shrink-0" />}
                  <p className={`text-sm ${validation.valid ? 'text-accent-green' : 'text-accent-red'}`}>
                    {validation.valid ? 'Transaction eligible — proceed to dispense' : validation.reason}
                  </p>
                </div>
              )}

              <button
                onClick={handleSale}
                disabled={submitting || !validation?.valid}
                className="btn-primary w-full disabled:opacity-50"
              >
                {submitting ? 'Processing…' : 'Confirm Dispense'}
              </button>
            </div>
          )}

          {/* Last result */}
          {lastResult && (
            <div className={`glass-card p-4 flex items-center gap-3 border ${
              lastResult.status === 'approved' ? 'border-accent-green/30' : 'border-accent-red/30'
            }`}>
              {lastResult.status === 'approved'
                ? <CheckCircle className="w-5 h-5 text-accent-green" />
                : <XCircle className="w-5 h-5 text-accent-red" />}
              <div>
                <p className={`text-sm font-semibold ${lastResult.status === 'approved' ? 'text-accent-green' : 'text-accent-red'}`}>
                  {lastResult.status === 'approved' ? 'Transaction Approved' : 'Transaction Rejected'}
                </p>
                {lastResult.reason && <p className="text-xs text-dark-400 mt-0.5">{lastResult.reason}</p>}
                <p className="text-xs font-mono text-dark-500 mt-0.5">Ref: {lastResult.id}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
