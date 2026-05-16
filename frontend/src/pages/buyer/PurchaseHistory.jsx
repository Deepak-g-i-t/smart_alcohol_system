// PurchaseHistory — full paginated buyer purchase history
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getBuyerHistory } from '../../api/transactionService';
import StatusBadge from '../../components/StatusBadge';
import { ShoppingCart, Search, Calendar } from 'lucide-react';

const PAGE_SIZE = 20;

export default function PurchaseHistory() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [filter, setFilter]   = useState('all');
  const [page, setPage]       = useState(1);

  useEffect(() => {
    if (!user?.id) return;
    getBuyerHistory(user.id)
      .then((data) => setTransactions(data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user?.id]);

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (filter !== 'all' && t.status !== filter) return false;
      if (search) {
        const s = search.toLowerCase();
        return (
          t.alcohol_type?.toLowerCase().includes(s) ||
          String(t.id).includes(s)
        );
      }
      return true;
    });
  }, [transactions, search, filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (loading) return <div className="flex justify-center py-20"><div className="spinner" /></div>;

  return (
    <div className="space-y-6 animate-in">
      <div>
        <h1 className="text-2xl font-bold text-dark-100">Purchase History</h1>
        <p className="text-sm text-dark-400 mt-1">{filtered.length} transactions found</p>
      </div>

      <div className="glass-card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
          <input type="text" placeholder="Search by item or transaction ID…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="input-field pl-9" />
        </div>
        <select value={filter} onChange={(e) => { setFilter(e.target.value); setPage(1); }} className="select-field w-40">
          <option value="all">All Status</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-700/50">
                {['Date', 'Item', 'Qty', 'Status', 'Reason'].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-dark-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-dark-500">No transactions found</td></tr>
              ) : paginated.map((t, i) => (
                <tr key={t.id || i} className="table-row">
                  <td className="px-5 py-3 text-xs text-dark-400 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-dark-500" />
                      {new Date(t.timestamp).toLocaleString('en-IN', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-sm text-dark-200">{t.alcohol_type}</td>
                  <td className="px-5 py-3 text-sm font-semibold text-dark-100">{t.quantity}</td>
                  <td className="px-5 py-3"><StatusBadge status={t.status} /></td>
                  <td className="px-5 py-3 text-xs text-dark-400 max-w-xs truncate">{t.reason || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-t border-dark-700/50">
          <p className="text-xs text-dark-400">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40">Prev</button>
            <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
