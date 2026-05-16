/**
 * Shop Dashboard — real data from API
 * Shows: today's transactions, quota fill, quick sale form, recent history
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { useSocket } from '../../hooks/useSocket';
import { submitTransaction } from '../../api/transactionService';
import { getCurrentPolicy } from '../../api/policyService';
import StatusBadge from '../../components/StatusBadge';
import {
  ShoppingCart, QrCode, Package, TrendingUp, CheckCircle,
  XCircle, Clock, AlertTriangle, Activity,
} from 'lucide-react';
import toast from 'react-hot-toast';

const ALCOHOL_TYPES = ['Whiskey', 'Beer', 'Rum', 'Vodka', 'Wine', 'Brandy', 'Gin'];

export default function ShopDashboard() {
  const { user } = useAuth();
  const { transactions, setTransactions, policies: ctxPolicies } = useData();
  const [policy, setPolicy] = useState(ctxPolicies);

  const [form, setForm] = useState({
    buyer_id: '', alcohol_type: 'Whiskey', quantity: 1,
  });
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  // Real-time socket — update live feed for authority, but shop also benefits
  const { connected } = useSocket(
    (txn) => setTransactions((prev) => [txn, ...prev.slice(0, 99)]),
    (data) => setPolicy((prev) => ({ ...prev, emergency_flag: data.flag }))
  );

  useEffect(() => {
    if (!ctxPolicies) {
      getCurrentPolicy().then(setPolicy).catch(() => {});
    } else {
      setPolicy(ctxPolicies);
    }
  }, [ctxPolicies]);

  // Today's stats
  const today = new Date().toDateString();
  const todayTxns  = transactions.filter(
    (t) => new Date(t.timestamp).toDateString() === today &&
           String(t.shop_id) === String(user?.id)
  );
  const todayApproved  = todayTxns.filter((t) => t.status === 'approved').length;
  const todayRejected  = todayTxns.filter((t) => t.status === 'rejected').length;
  const todayVolume    = todayTxns.filter((t) => t.status === 'approved')
                                   .reduce((s, t) => s + (t.quantity || 0), 0);

  const handleSale = async (e) => {
    e.preventDefault();
    if (!form.buyer_id.trim()) {
      toast.error('Enter a buyer ID');
      return;
    }
    setSubmitting(true);
    try {
      const result = await submitTransaction({
        buyer_id:     parseInt(form.buyer_id),
        alcohol_type: form.alcohol_type,
        quantity:     form.quantity,
      });

      const newTxn = {
        ...result,
        id:           result.transaction_id || `local-${Date.now()}`,
        buyer_id:     parseInt(form.buyer_id),
        shop_id:      user?.id,
        alcohol_type: form.alcohol_type,
        quantity:     form.quantity,
        status:       result.message?.includes('Approved') ? 'approved' : 'rejected',
        reason:       result.error || null,
        timestamp:    new Date().toISOString(),
      };

      setLastResult(newTxn);
      setTransactions((prev) => [newTxn, ...prev]);

      if (newTxn.status === 'approved') {
        toast.success(`✅ Transaction approved`);
        setForm((p) => ({ ...p, buyer_id: '' }));
      } else {
        toast.error(`❌ ${result.error || 'Transaction rejected'}`);
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Transaction failed';
      toast.error(msg);
      setLastResult({ status: 'rejected', reason: msg });
    } finally {
      setSubmitting(false);
    }
  };

  const emergencyFlag = policy?.emergency_flag || policy?.emergencyFlag;

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-100">Shop Dashboard</h1>
          <p className="text-sm text-dark-400 mt-1">{user?.name}</p>
        </div>
        <div className="flex items-center gap-3">
          {connected && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-accent-green/10 border border-accent-green/20 rounded-full">
              <div className="w-2 h-2 bg-accent-green rounded-full animate-pulse" />
              <span className="text-xs text-accent-green font-medium">LIVE</span>
            </div>
          )}
          <Link to="/shop/scanner" className="btn-secondary text-sm flex items-center gap-2">
            <QrCode className="w-4 h-4" />
            QR Scanner
          </Link>
        </div>
      </div>

      {/* Emergency banner */}
      {emergencyFlag && (
        <div className="glass-card p-4 border border-accent-red/40 flex items-center gap-3 bg-accent-red/5">
          <AlertTriangle className="w-5 h-5 text-accent-red animate-pulse flex-shrink-0" />
          <p className="text-sm font-semibold text-accent-red">
            Emergency restriction active — all sales suspended by authority
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Approved Today', value: todayApproved, icon: CheckCircle, color: 'text-accent-green', bg: 'bg-accent-green/10' },
          { label: 'Rejected Today', value: todayRejected, icon: XCircle, color: 'text-accent-red', bg: 'bg-accent-red/10' },
          { label: 'Volume Today', value: `${todayVolume} units`, icon: TrendingUp, color: 'text-accent-cyan', bg: 'bg-accent-cyan/10' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="glass-card p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div>
              <p className="text-xs text-dark-400">{label}</p>
              <p className={`text-xl font-bold ${color}`}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick sale form */}
        <div className="glass-card p-5">
          <h2 className="text-sm font-semibold text-dark-100 flex items-center gap-2 mb-4">
            <ShoppingCart className="w-4 h-4 text-accent-cyan" />
            Quick Sale
          </h2>
          <form onSubmit={handleSale} className="space-y-4">
            <div>
              <label className="block text-xs text-dark-400 mb-1.5">Buyer ID</label>
              <input
                type="number"
                min={1}
                value={form.buyer_id}
                onChange={(e) => setForm((p) => ({ ...p, buyer_id: e.target.value }))}
                placeholder="Enter buyer ID number"
                className="input-field"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-dark-400 mb-1.5">Alcohol Type</label>
                <select
                  value={form.alcohol_type}
                  onChange={(e) => setForm((p) => ({ ...p, alcohol_type: e.target.value }))}
                  className="select-field"
                >
                  {ALCOHOL_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-dark-400 mb-1.5">Quantity</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={form.quantity}
                  onChange={(e) => setForm((p) => ({ ...p, quantity: parseInt(e.target.value) || 1 }))}
                  className="input-field"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={submitting || emergencyFlag}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting
                ? <><div className="spinner w-4 h-4 border-2 border-dark-900/30 border-t-dark-900" /><span>Processing…</span></>
                : <><ShoppingCart className="w-4 h-4" /><span>Process Sale</span></>}
            </button>
          </form>

          {/* Last result */}
          {lastResult && (
            <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 border ${
              lastResult.status === 'approved'
                ? 'bg-accent-green/10 border-accent-green/20'
                : 'bg-accent-red/10 border-accent-red/20'
            }`}>
              {lastResult.status === 'approved'
                ? <CheckCircle className="w-4 h-4 text-accent-green flex-shrink-0" />
                : <XCircle    className="w-4 h-4 text-accent-red flex-shrink-0"   />}
              <div>
                <p className={`text-sm font-semibold ${lastResult.status === 'approved' ? 'text-accent-green' : 'text-accent-red'}`}>
                  {lastResult.status === 'approved' ? 'Approved' : 'Rejected'}
                </p>
                {lastResult.reason && <p className="text-xs text-dark-400">{lastResult.reason}</p>}
              </div>
            </div>
          )}
        </div>

        {/* Recent transactions */}
        <div className="glass-card overflow-hidden">
          <div className="px-5 py-4 border-b border-dark-700/50 flex items-center gap-2">
            <Activity className="w-4 h-4 text-accent-cyan" />
            <h2 className="text-sm font-semibold text-dark-100">Recent Transactions</h2>
          </div>
          <div className="overflow-y-auto max-h-72">
            {todayTxns.length === 0 ? (
              <div className="p-8 text-center text-dark-500 text-sm">No transactions today</div>
            ) : todayTxns.slice(0, 15).map((t, i) => (
              <div key={t.id || i} className="flex items-center gap-3 px-5 py-3 border-b border-dark-700/30 hover:bg-dark-800/40 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-dark-200">
                    Buyer #{t.buyer_id} — {t.alcohol_type} ×{t.quantity}
                  </p>
                  <p className="text-xs text-dark-500 flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" />
                    {new Date(t.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <StatusBadge status={t.status} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
