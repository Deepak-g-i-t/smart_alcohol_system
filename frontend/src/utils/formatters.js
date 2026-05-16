/**
 * Formatting utilities — date, currency, risk level, buyer ID
 */

/* ─── Date/time ─────────────────────────────────────────── */
export const formatDate = (ts, opts = {}) => {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('en-IN', {
    year: 'numeric', month: 'short', day: 'numeric',
    ...opts,
  });
};

export const formatDateTime = (ts) => {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('en-IN', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

export const timeAgo = (ts) => {
  if (!ts) return '—';
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)   return 'just now';
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
};

/* ─── Buyer ID ───────────────────────────────────────────── */
export const formatBuyerId = (id) =>
  id ? `BYR-${String(id).padStart(5, '0')}` : '—';

/* ─── Risk level ─────────────────────────────────────────── */
const RISK_LEVELS = [
  { max: 20,  label: 'Low',      color: 'text-accent-green'  },
  { max: 40,  label: 'Moderate', color: 'text-accent-cyan'   },
  { max: 60,  label: 'Elevated', color: 'text-accent-amber'  },
  { max: 80,  label: 'High',     color: 'text-accent-red'    },
  { max: 100, label: 'Critical', color: 'text-red-400'       },
];

export const getRiskLevel = (score) =>
  RISK_LEVELS.find((r) => (score ?? 0) <= r.max) || RISK_LEVELS[RISK_LEVELS.length - 1];

/* ─── Number formatting ──────────────────────────────────── */
export const formatNumber = (n) =>
  typeof n === 'number' ? n.toLocaleString('en-IN') : (n || '—');

export const formatPct = (n, decimals = 1) =>
  typeof n === 'number' ? `${n.toFixed(decimals)}%` : '—';

/* ─── Status badge color ─────────────────────────────────── */
export const statusColor = (status) => {
  const map = {
    approved:  'text-accent-green',
    rejected:  'text-accent-red',
    pending:   'text-accent-amber',
    active:    'text-accent-green',
    suspended: 'text-accent-red',
    blacklisted: 'text-accent-red',
    authority: 'text-accent-purple',
    shop:      'text-accent-cyan',
    buyer:     'text-accent-green',
    system:    'text-dark-400',
  };
  return map[status?.toLowerCase()] || 'text-dark-300';
};
