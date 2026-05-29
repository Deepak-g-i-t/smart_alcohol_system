/**
 * Buyer Dashboard (Task 4) — real data from API
 * Sections:
 * 1. Welcome header + account status
 * 2. Quota status cards with SVG rings
 * 3. Risk score panel
 * 4. Recent purchase history (last 10)
 * 5. Restriction warnings
 */
import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { getBuyerProfile } from '../../api/buyerService';
import { getBuyerHistory } from '../../api/transactionService';
import StatusBadge from '../../components/StatusBadge';
import {
  User, Shield, AlertTriangle, TrendingUp, Calendar,
  ShoppingCart, ChevronRight, RefreshCw, QrCode,
} from 'lucide-react';

/* ─── Risk level config ──────────────────────────────────── */
const RISK_LEVELS = [
  { max: 20,  label: 'Low Risk',   color: 'text-accent-green',  bar: 'bg-accent-green',  advice: 'Your consumption pattern is healthy and within normal ranges.' },
  { max: 40,  label: 'Moderate',   color: 'text-accent-cyan',   bar: 'bg-accent-cyan',   advice: 'Slight elevation noted. Consider spacing out purchases.' },
  { max: 60,  label: 'Elevated',   color: 'text-accent-amber',  bar: 'bg-accent-amber',  advice: 'Your risk score is elevated. Authorities may review your account.' },
  { max: 80,  label: 'High Risk',  color: 'text-accent-red',    bar: 'bg-accent-red',    advice: 'High risk detected. Your account is under enhanced monitoring.' },
  { max: 100, label: 'Critical',   color: 'text-red-400',       bar: 'bg-red-500',       advice: 'Critical risk level. Account suspension may follow. Contact your excise officer.' },
];

const getRiskLevel = (score) =>
  RISK_LEVELS.find((r) => score <= r.max) || RISK_LEVELS[RISK_LEVELS.length - 1];

/* ─── SVG Ring ───────────────────────────────────────────── */
const QuotaRing = ({ label, remaining, limit, size = 84 }) => {
  const pct = limit > 0 ? Math.min(100, (remaining / limit) * 100) : 0;
  const strokeW = 8;
  const radius = (size - strokeW) / 2;
  const circ   = 2 * Math.PI * radius;
  const offset = circ - (pct / 100) * circ;
  const color  = pct > 50 ? '#00e676' : pct > 20 ? '#ffab00' : '#ff1744';

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="rgba(45,53,85,0.5)" strokeWidth={strokeW} />
          <circle
            cx={size/2} cy={size/2} r={radius}
            fill="none" stroke={color} strokeWidth={strokeW}
            strokeDasharray={circ} strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.6s ease-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-base font-bold text-dark-100">{remaining}</span>
          <span className="text-[9px] text-dark-400">/{limit}</span>
        </div>
      </div>
      <span className="text-xs text-dark-400 font-medium">{label}</span>
    </div>
  );
};

export default function BuyerDashboard() {
  const { user } = useAuth();
  const { policies } = useData();

  const [profile, setProfile]   = useState(null);
  const [history, setHistory]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const buyerId = user?.id;

  const fetchData = async () => {
    if (!buyerId) return;
    try {
      const [profileData, historyData] = await Promise.allSettled([
        getBuyerProfile(buyerId),
        getBuyerHistory(buyerId),
      ]);
      if (profileData.status === 'fulfilled') setProfile(profileData.value);
      if (historyData.status === 'fulfilled') setHistory(historyData.value || []);
    } catch (err) {
      console.error('[BuyerDashboard] fetch error:', err.message);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchData().finally(() => setLoading(false));
  }, [buyerId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const riskLevel = getRiskLevel(profile?.risk_score || 0);
  const recentHistory = history.slice(0, 10);
  const formattedId = user?.buyer_code || user?.uid || `BYR-${String(buyerId).padStart(5, '0')}`;

  const accountStatus = profile?.blacklist_status
    ? { label: 'Blacklisted', cls: 'bg-accent-red/10 border-accent-red/30 text-accent-red' }
    : (profile?.risk_score || 0) >= 60
      ? { label: 'Under Review', cls: 'bg-accent-amber/10 border-accent-amber/30 text-accent-amber' }
      : { label: 'Active', cls: 'bg-accent-green/10 border-accent-green/30 text-accent-green' };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in">
      {/* ── 1. Welcome header ────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-green/20 to-accent-cyan/20 border border-accent-green/20 flex items-center justify-center">
            <User className="w-7 h-7 text-accent-green" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-dark-100">
              Welcome, {user?.name || 'Buyer'}
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs font-mono text-accent-cyan">{formattedId}</span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${accountStatus.cls}`}>
                {accountStatus.label}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn-secondary text-sm flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <Link to="/buyer/id-card" className="btn-primary text-sm flex items-center gap-2">
            <QrCode className="w-4 h-4" />
            My ID Card
          </Link>
        </div>
      </div>

      {/* ── Restriction banners ───────────────────────────────── */}
      {policies?.emergencyFlag && (
        <div className="glass-card p-4 border border-accent-red/40 flex items-center gap-3 bg-accent-red/5">
          <AlertTriangle className="w-5 h-5 text-accent-red animate-pulse flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-accent-red">Emergency Restriction Active</p>
            <p className="text-xs text-dark-400 mt-0.5">All purchases are suspended by authorities until further notice.</p>
          </div>
        </div>
      )}

      {profile?.blacklist_status && (
        <div className="glass-card p-4 border border-accent-red/40 bg-accent-red/5">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-accent-red flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-accent-red">Account Blacklisted</p>
              <p className="text-xs text-dark-400 mt-0.5">
                Reason: {profile.blacklist_reason || 'Flagged by authority'}. Contact your excise officer to appeal.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── 2. Quota cards ───────────────────────────────────── */}
      <div>
        <h2 className="text-sm font-semibold text-dark-300 uppercase tracking-wider mb-3">Quota Status</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              label:  'Today',
              period: 'Daily',
              remaining: profile?.daily_remaining ?? 0,
              limit:     profile?.daily_limit     ?? 2,
              sub: profile?.daily_remaining === 0 ? 'Daily quota exhausted' : null,
            },
            {
              label:  'This Week',
              period: 'Weekly',
              remaining: profile?.weekly_remaining ?? 0,
              limit:     profile?.weekly_limit     ?? 10,
              sub: null,
            },
            {
              label:  'This Month',
              period: 'Monthly',
              remaining: profile?.monthly_remaining ?? 0,
              limit:     profile?.monthly_limit     ?? 30,
              sub: null,
            },
          ].map(({ label, period, remaining, limit, sub }) => (
            <div key={period} className="glass-card p-5 flex flex-col items-center gap-3">
              <p className="text-xs text-dark-400 font-medium">{label}</p>
              <QuotaRing label={period} remaining={remaining} limit={limit} />
              <div className="text-center">
                <p className="text-sm font-semibold text-dark-100">
                  {remaining} <span className="text-dark-400 font-normal">units left</span>
                </p>
                {sub && (
                  <p className="text-xs text-accent-amber mt-1 flex items-center gap-1 justify-center">
                    <AlertTriangle className="w-3 h-3" />
                    {sub}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 3. Risk score ─────────────────────────────────────── */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-dark-100 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-accent-cyan" />
            Risk Assessment
          </h2>
          <span className={`text-sm font-bold ${riskLevel.color}`}>
            {profile?.risk_score ?? 0}/100
          </span>
        </div>

        {/* Progress bar */}
        <div className="relative h-2.5 bg-dark-700 rounded-full overflow-hidden mb-3">
          <div
            className={`h-full rounded-full transition-all duration-700 ${riskLevel.bar}`}
            style={{ width: `${profile?.risk_score ?? 0}%` }}
          />
        </div>

        <div className="flex items-center justify-between mb-3">
          <span className={`text-xs font-semibold ${riskLevel.color}`}>{riskLevel.label}</span>
          <span className="text-xs text-dark-400">Updated on each purchase</span>
        </div>

        <p className="text-xs text-dark-400 bg-dark-800/40 rounded-lg p-3 border border-dark-700/30">
          {riskLevel.advice}
        </p>
      </div>

      {/* ── 4. Recent purchases ───────────────────────────────── */}
      <div className="glass-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-dark-700/50">
          <h2 className="text-sm font-semibold text-dark-100 flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-accent-cyan" />
            Recent Purchases
          </h2>
          <Link to="/buyer/history" className="text-xs text-accent-cyan hover:text-accent-blue flex items-center gap-1 transition-colors">
            View all
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        {recentHistory.length === 0 ? (
          <div className="p-10 text-center">
            <ShoppingCart className="w-10 h-10 text-dark-600 mx-auto mb-3" />
            <p className="text-sm text-dark-400">No purchases yet</p>
            <p className="text-xs text-dark-500 mt-1">Visit an authorised shop to make your first purchase.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-700/30">
                  {['Date & Time', 'Item', 'Qty', 'Status', 'Reason'].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-dark-400 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentHistory.map((txn, i) => (
                  <tr key={txn.id || i} className="table-row">
                    <td className="px-5 py-3 text-xs text-dark-400 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 text-dark-500" />
                        {new Date(txn.timestamp).toLocaleString('en-IN', {
                          month: 'short', day: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-dark-200">{txn.alcohol_type}</td>
                    <td className="px-5 py-3 text-sm font-semibold text-dark-100">{txn.quantity}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={txn.status} />
                    </td>
                    <td className="px-5 py-3 text-xs text-dark-400 max-w-[200px] truncate">
                      {txn.reason || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
