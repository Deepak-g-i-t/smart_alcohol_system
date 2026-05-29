/**
 * QR Scanner / Manual ID Entry for Shops
 * States: idle → scanning → result
 * Uses html5-qrcode for camera-based scanning.
 * Verifies signed JWT tokens via /api/buyers/qr/verify.
 * Manual lookup via /api/buyers/by-code/:buyerCode.
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useData } from '../../contexts/DataContext';
import api from '../../api/axiosInstance';
import QuotaRingProgress from '../../components/QuotaRingProgress';
import toast from 'react-hot-toast';
import {
  QrCode, Search, CheckCircle, XCircle, User,
  ShoppingCart, Camera, X, RefreshCw, AlertTriangle,
} from 'lucide-react';

const ALCOHOL_TYPES = ['Whiskey', 'Beer', 'Rum', 'Vodka', 'Wine', 'Brandy', 'Gin'];

export default function QRScanner() {
  const { validateTransaction, submitTransaction, fetchBuyerProfile } = useData();

  const [mode, setMode]             = useState('idle');      // idle | scanning | result
  const [buyerIdInput, setBuyerIdInput] = useState('');
  const [foundBuyer, setFoundBuyer] = useState(null);
  const [error, setError]           = useState(null);
  const [saleForm, setSaleForm]     = useState({ alcoholType: 'Whiskey', quantity: 1 });
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  const html5QrCode = useRef(null);
  const inputRef    = useRef(null);

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      if (html5QrCode.current?.isScanning) {
        html5QrCode.current.stop().catch(() => {});
      }
    };
  }, []);

  /* ─── Camera scanning ──────────────────────────────────── */
  const startScan = useCallback(async () => {
    setError(null);
    setMode('scanning');

    // Small delay to let the DOM render the container
    await new Promise((r) => setTimeout(r, 200));

    html5QrCode.current = new Html5Qrcode('qr-reader');
    try {
      await html5QrCode.current.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          // Stop camera immediately on successful scan
          try {
            await html5QrCode.current.stop();
          } catch (_) {}
          toast.success('QR code scanned!');
          await verifyAndLoad(decodedText);
        },
        () => {} // ignore scan errors (noise)
      );
    } catch (err) {
      console.error('[QRScanner] Camera error:', err);
      setError('Camera permission denied or unavailable. Use manual entry below.');
      setMode('idle');
    }
  }, []);

  const stopScan = useCallback(async () => {
    if (html5QrCode.current?.isScanning) {
      try {
        await html5QrCode.current.stop();
      } catch (_) {}
    }
    setMode('idle');
  }, []);

  /* ─── Verify scanned QR token (signed JWT) ─────────────── */
  const verifyAndLoad = async (token) => {
    setError(null);
    try {
      const { data } = await api.post('/buyers/qr/verify', { qrToken: token });
      if (data.verified && data.profile) {
        const profile = normalizeScannedProfile(data.profile);
        setFoundBuyer(profile);
        setMode('result');
        setLastResult(null);
      } else {
        setError('QR verification failed. Ask the buyer to refresh their QR code.');
        setMode('idle');
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'QR verification failed';
      setError(msg);
      setMode('idle');
      toast.error(msg);
    }
  };

  /* ─── Manual buyer code lookup (BYR-XXXXX) ─────────────── */
  const handleManualLookup = async () => {
    const input = buyerIdInput.trim().toUpperCase();
    if (!input) return;

    setError(null);

    // If it looks like a BYR-XXXXX code, use by-code endpoint
    if (input.startsWith('BYR-')) {
      try {
        const { data } = await api.get(`/buyers/by-code/${input}`);
        if (data) {
          const profile = normalizeScannedProfile(data);
          setFoundBuyer(profile);
          setMode('result');
          setLastResult(null);
          return;
        }
      } catch (err) {
        if (err.response?.status === 404) {
          setError(`Buyer not found for code: ${input}`);
        } else {
          setError(err.response?.data?.error || 'Lookup failed');
        }
        return;
      }
    }

    // If it's a numeric ID, try profile fetch
    const numId = parseInt(input, 10);
    if (!isNaN(numId)) {
      const profile = await fetchBuyerProfile(numId);
      if (profile) {
        setFoundBuyer(profile);
        setMode('result');
        setLastResult(null);
      } else {
        setError(`Buyer not found for ID: ${input}`);
      }
      return;
    }

    setError('Enter a valid buyer code (BYR-XXXXX) or numeric ID.');
  };

  /* ─── Normalize profile from API response ──────────────── */
  const normalizeScannedProfile = (raw) => ({
    ...raw,
    buyerId:          String(raw.buyer_id),
    buyerCode:        raw.buyer_code || null,
    name:             raw.name,
    dailyRemaining:   raw.daily_remaining  ?? 0,
    weeklyRemaining:  raw.weekly_remaining ?? 0,
    monthlyRemaining: raw.monthly_remaining ?? 0,
    dailyLimit:       raw.daily_limit  ?? 2,
    weeklyLimit:      raw.weekly_limit ?? 10,
    monthlyLimit:     raw.monthly_limit ?? 30,
    riskScore:        raw.risk_score ?? 0,
    blacklistStatus:  raw.blacklist_status ?? false,
    blacklistReason:  raw.blacklist_reason || null,
    region:           raw.district || raw.shop_location || '',
  });

  /* ─── Sale submission ──────────────────────────────────── */
  const handleSale = async () => {
    if (!foundBuyer) return;
    setSubmitting(true);
    try {
      const result = await submitTransaction({
        buyerId: foundBuyer.buyerId,
        buyerName: foundBuyer.name,
        alcoholType: saleForm.alcoholType,
        quantity: saleForm.quantity,
      });
      setLastResult(result);
      if (result.status === 'approved') {
        toast.success(`✅ Transaction approved for ${foundBuyer.name}`);
        // Optimistic quota update
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

  /* ─── Reset to idle ────────────────────────────────────── */
  const reset = () => {
    setBuyerIdInput('');
    setFoundBuyer(null);
    setError(null);
    setLastResult(null);
    setSaleForm({ alcoholType: 'Whiskey', quantity: 1 });
    setMode('idle');
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const validation = foundBuyer
    ? validateTransaction(foundBuyer.buyerId, saleForm.quantity, saleForm.alcoholType)
    : null;

  // Eligibility summary for result view
  const isBlacklisted = foundBuyer?.blacklistStatus;
  const isQuotaExhausted = foundBuyer && foundBuyer.dailyRemaining <= 0;
  const isEligible = foundBuyer && !isBlacklisted && !isQuotaExhausted;

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center gap-3">
        <QrCode className="w-6 h-6 text-accent-cyan" />
        <div>
          <h1 className="text-2xl font-bold text-dark-100">QR Scanner / Buyer Lookup</h1>
          <p className="text-sm text-dark-400 mt-1">Scan QR or enter buyer ID manually to verify and dispense</p>
        </div>
      </div>

      {/* ── Error banner ───────────────────────────────────── */}
      {error && (
        <div className="glass-card p-4 border border-accent-red/30 flex items-center gap-3">
          <XCircle className="w-5 h-5 text-accent-red flex-shrink-0" />
          <p className="text-sm text-accent-red">{error}</p>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-dark-400 hover:text-dark-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── IDLE / SCANNING state ─────────────────────────── */}
      {mode !== 'result' && (
        <div className="glass-card p-5">
          <label className="block text-xs text-dark-400 uppercase tracking-wider mb-3">
            Buyer ID / QR Code
          </label>

          {mode === 'scanning' ? (
            <div className="mb-4">
              <div
                id="qr-reader"
                className="bg-dark-900 rounded-lg overflow-hidden border border-dark-600/60 w-full max-w-sm mx-auto"
                style={{ minHeight: 300 }}
              />
              <div className="flex gap-3 max-w-sm mx-auto mt-3">
                <button
                  onClick={stopScan}
                  className="btn-secondary flex-1 flex items-center justify-center gap-2"
                >
                  <X className="w-4 h-4" /> Stop Scanner
                </button>
              </div>
              <p className="text-xs text-dark-400 text-center mt-2">
                Point camera at buyer's QR code. Or{' '}
                <button
                  onClick={stopScan}
                  className="text-accent-cyan underline hover:text-accent-blue"
                >
                  enter ID manually
                </button>
              </p>
            </div>
          ) : (
            <div className="flex gap-3 mb-4">
              <button
                onClick={startScan}
                className="btn-secondary flex items-center justify-center gap-2 px-4 whitespace-nowrap bg-accent-cyan/10 text-accent-cyan border-accent-cyan/30 hover:bg-accent-cyan/20"
              >
                <Camera className="w-4 h-4" /> Scan QR Code
              </button>
              <div className="flex-1 text-center text-dark-400 text-sm flex items-center justify-center font-semibold">
                — OR —
              </div>
            </div>
          )}

          {/* Manual entry (always visible) */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Enter buyer code (e.g. BYR-00001)…"
                value={buyerIdInput}
                onChange={(e) => setBuyerIdInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleManualLookup()}
                className="input-field pl-9"
                autoFocus={mode === 'idle'}
              />
            </div>
            <button onClick={handleManualLookup} className="btn-primary">
              Lookup
            </button>
          </div>
        </div>
      )}

      {/* ── RESULT state ──────────────────────────────────── */}
      {mode === 'result' && foundBuyer && (
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
                  {isBlacklisted ? (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-accent-red/10 border border-accent-red/30 text-accent-red">
                      Blacklisted
                    </span>
                  ) : (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-accent-green/10 border border-accent-green/30 text-accent-green">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-xs font-mono text-accent-cyan mt-0.5 font-bold">
                  {foundBuyer.buyerCode || foundBuyer.buyerId}
                </p>
                <p className="text-xs text-dark-400 mt-1">
                  Region: {foundBuyer.region || 'N/A'} · Risk Score: {foundBuyer.riskScore || 0}
                </p>
              </div>
            </div>

            {/* Quota rings */}
            <div className="mt-5 pt-4 border-t border-dark-700/40">
              <p className="text-xs text-dark-400 uppercase tracking-wider mb-3">Quota Remaining</p>
              <QuotaRingProgress
                daily={{ remaining: foundBuyer.dailyRemaining, limit: foundBuyer.dailyLimit || 2 }}
                weekly={{ remaining: foundBuyer.weeklyRemaining, limit: foundBuyer.weeklyLimit || 10 }}
                monthly={{ remaining: foundBuyer.monthlyRemaining, limit: foundBuyer.monthlyLimit || 30 }}
              />
            </div>

            {/* Eligibility indicator */}
            <div className="mt-4">
              {isBlacklisted ? (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-accent-red/10 border border-accent-red/20">
                  <AlertTriangle className="w-4 h-4 text-accent-red flex-shrink-0" />
                  <p className="text-sm text-accent-red font-semibold">
                    Ineligible — Buyer is blacklisted: {foundBuyer.blacklistReason || 'Flagged by authority'}
                  </p>
                </div>
              ) : isQuotaExhausted ? (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-accent-amber/10 border border-accent-amber/20">
                  <AlertTriangle className="w-4 h-4 text-accent-amber flex-shrink-0" />
                  <p className="text-sm text-accent-amber font-semibold">
                    Ineligible — Daily quota exhausted
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-accent-green/10 border border-accent-green/20">
                  <CheckCircle className="w-4 h-4 text-accent-green flex-shrink-0" />
                  <p className="text-sm text-accent-green font-semibold">
                    Eligible — Buyer can purchase
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Sale form (only if eligible) */}
          {isEligible && (
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
                  <label className="block text-xs text-dark-400 mb-1">
                    Quantity (max {foundBuyer.dailyRemaining})
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={foundBuyer.dailyRemaining}
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

          {/* Last transaction result */}
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
                <p className="text-xs font-mono text-dark-500 mt-0.5">Ref: {lastResult.id || lastResult.transaction_id}</p>
              </div>
            </div>
          )}

          {/* Scan Next button */}
          <button
            onClick={reset}
            className="btn-secondary w-full flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Scan Next Buyer
          </button>
        </div>
      )}
    </div>
  );
}
