/**
 * Digital Buyer ID Card
 * - QR code fetched from backend (signed JWT)
 * - 60s countdown timer with auto-refresh
 * - SVG quota rings
 * - Print-ready CSS
 * - Download as PNG via html-to-image
 */
import { useRef, useState, useEffect, useCallback } from 'react';
import { toPng } from 'html-to-image';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { getBuyerQR } from '../../api/buyerService';
import QuotaRingProgress from '../../components/QuotaRingProgress';
import { Download, RefreshCw, Shield, Zap, Clock } from 'lucide-react';

const getRiskLabel = (score) => {
  if (score <= 20) return { label: 'Low Risk', color: 'text-accent-green', bg: 'bg-accent-green/10 border-accent-green/30' };
  if (score <= 40) return { label: 'Moderate', color: 'text-accent-cyan', bg: 'bg-accent-cyan/10 border-accent-cyan/30' };
  if (score <= 60) return { label: 'Elevated', color: 'text-accent-amber', bg: 'bg-accent-amber/10 border-accent-amber/30' };
  if (score <= 80) return { label: 'High Risk', color: 'text-accent-red', bg: 'bg-accent-red/10 border-accent-red/30' };
  return { label: 'Critical', color: 'text-red-400 animate-pulse', bg: 'bg-red-900/20 border-red-500/30' };
};

export default function DigitalIDCard() {
  const { userProfile } = useAuth();
  const { buyerProfiles } = useData();
  const cardRef = useRef(null);
  const countdownRef = useRef(null);

  const [downloading, setDownloading] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState(null);
  const [countdown, setCountdown] = useState(60);

  // buyerProfiles is keyed by the raw DB id
  const profile = buyerProfiles[userProfile?.id];
  const risk = getRiskLabel(profile?.riskScore || 0);
  const buyerCode = userProfile?.buyer_code || profile?.buyerCode || `USR-${userProfile?.id}`;

  // Fetch QR code from backend
  const fetchQR = useCallback(async () => {
    if (!userProfile?.id) return;
    setQrLoading(true);
    setQrError(null);
    try {
      const data = await getBuyerQR(userProfile.id);
      setQrDataUrl(data.qrDataUrl);
      setCountdown(60);
    } catch (err) {
      console.error('[DigitalIDCard] QR fetch failed:', err.message);
      setQrError('Failed to generate QR code. Please try again.');
    } finally {
      setQrLoading(false);
    }
  }, [userProfile?.id]);

  // Initial QR fetch on mount
  useEffect(() => {
    fetchQR();
  }, [fetchQR]);

  // Countdown timer — auto-refresh at 5s before expiry
  useEffect(() => {
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Auto-refresh QR
          fetchQR();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownRef.current);
  }, [fetchQR]);

  const handleRefreshQR = () => {
    fetchQR();
  };

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(cardRef.current, { quality: 0.95, pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = `slmrs-id-${buyerCode || 'buyer'}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setDownloading(false);
    }
  };

  // Countdown progress bar percentage
  const countdownPct = (countdown / 60) * 100;

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-100">Digital ID Card</h1>
          <p className="text-sm text-dark-400 mt-1">Your government-issued digital buyer identity</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleRefreshQR}
            disabled={qrLoading}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${qrLoading ? 'animate-spin' : ''}`} />
            Refresh QR
          </button>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Download className="w-4 h-4" />
            {downloading ? 'Downloading…' : 'Download PNG'}
          </button>
        </div>
      </div>

      {/* Card — matches @media print */}
      <div className="flex justify-center">
        <div
          ref={cardRef}
          id="buyer-id-card"
          className="w-full max-w-md bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 border border-dark-600/60 rounded-2xl overflow-hidden shadow-2xl"
          style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
        >
          {/* Header bar */}
          <div className="bg-gradient-to-r from-accent-cyan/20 via-accent-blue/20 to-accent-purple/20 border-b border-dark-600/40 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent-cyan to-accent-blue flex items-center justify-center">
                <Zap className="w-5 h-5 text-dark-900" />
              </div>
              <div>
                <p className="text-xs text-dark-400 uppercase tracking-widest">Government of Maharashtra</p>
                <p className="text-sm font-bold text-dark-100">Smart Liquor Mgmt System</p>
              </div>
              <div className="ml-auto">
                <Shield className="w-6 h-6 text-accent-cyan/50" />
              </div>
            </div>
          </div>

          <div className="px-6 py-5 flex gap-5">
            {/* Left — info */}
            <div className="flex-1 space-y-3">
              <div>
                <p className="text-xs text-dark-400 uppercase tracking-wider mb-1">Full Name</p>
                <p className="text-lg font-bold text-dark-100">{userProfile?.name || '—'}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-dark-400 uppercase tracking-wider mb-1">Buyer ID</p>
                  <p className="text-xs font-mono text-accent-cyan font-bold">{buyerCode}</p>
                </div>
                <div>
                  <p className="text-xs text-dark-400 uppercase tracking-wider mb-1">Aadhaar</p>
                  <p className="text-xs font-mono text-dark-300">
                    XXXX-XXXX-{profile?.aadhaarLast4 || '????'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-dark-400 uppercase tracking-wider mb-1">Region</p>
                  <p className="text-xs text-dark-200">{profile?.region || profile?.district || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-dark-400 uppercase tracking-wider mb-1">Risk Level</p>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${risk.bg} ${risk.color}`}>
                    {risk.label}
                  </span>
                </div>
              </div>
            </div>

            {/* Right — QR from API */}
            <div className="flex flex-col items-center gap-2">
              <div className="p-3 bg-white rounded-xl" style={{ width: 116, height: 116 }}>
                {qrLoading ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <RefreshCw className="w-6 h-6 text-dark-400 animate-spin" />
                  </div>
                ) : qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="Buyer QR Code"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-dark-500 text-xs text-center">
                    {qrError || 'QR unavailable'}
                  </div>
                )}
              </div>
              {/* Countdown */}
              <div className="w-full">
                <div className="h-1 bg-dark-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent-cyan rounded-full transition-all duration-1000 ease-linear"
                    style={{ width: `${countdownPct}%` }}
                  />
                </div>
                <div className="flex items-center justify-center gap-1 mt-1">
                  <Clock className="w-2.5 h-2.5 text-dark-400" />
                  <p className="text-[9px] text-dark-400">
                    {countdown > 0 ? `Expires in ${countdown}s` : 'Refreshing…'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Quota rings */}
          <div className="px-6 pb-5">
            <p className="text-xs text-dark-400 uppercase tracking-wider mb-3">Quota Remaining</p>
            {profile ? (
              <QuotaRingProgress
                daily={{ remaining: profile.dailyRemaining, limit: profile.dailyLimit || 2 }}
                weekly={{ remaining: profile.weeklyRemaining, limit: profile.weeklyLimit || 10 }}
                monthly={{ remaining: profile.monthlyRemaining, limit: profile.monthlyLimit || 30 }}
              />
            ) : (
              <p className="text-xs text-dark-500 text-center py-4">Profile not loaded</p>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 bg-dark-900/60 border-t border-dark-700/40 flex items-center justify-between">
            <p className="text-[9px] text-dark-500">Valid under SLMRS Act 2025 — Not Transferable</p>
            <p className="text-[9px] text-dark-500">Issued: {new Date().toLocaleDateString('en-IN')}</p>
          </div>
        </div>
      </div>

      {/* Print-specific styles injected at component level */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #buyer-id-card, #buyer-id-card * { visibility: visible; }
          #buyer-id-card { position: fixed; top: 0; left: 0; width: 100%; }
        }
      `}</style>

      <div className="glass-card p-4 text-center">
        <p className="text-xs text-dark-400">
          QR auto-refreshes every 60 seconds for security. Share only with authorized shop operators.
        </p>
      </div>
    </div>
  );
}
