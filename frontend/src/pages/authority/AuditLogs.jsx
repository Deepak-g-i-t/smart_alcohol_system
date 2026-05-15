// Authority Audit Logs — paginated MongoDB audit log viewer (Priority 2.x)
import { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { FileText, Search, Filter, Download } from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';

const EVENT_COLORS = {
  LOGIN:          'text-accent-cyan',
  login_success:  'text-accent-cyan',
  login_failed:   'text-accent-red',
  TRANSACTION:    'text-accent-green',
  transaction_approved: 'text-accent-green',
  transaction_rejected: 'text-accent-red',
  REJECTION:      'text-accent-red',
  POLICY_UPDATE:  'text-accent-purple',
  policy_change:  'text-accent-purple',
  BLACKLIST:      'text-accent-amber',
  EMERGENCY:      'text-accent-red',
  quota_reset_daily:   'text-accent-blue',
  quota_reset_weekly:  'text-accent-blue',
  quota_reset_monthly: 'text-accent-blue',
  otp_sent:       'text-accent-cyan',
  user_registered:'text-accent-green',
};

const PAGE_SIZE = 20;

export default function AuditLogs() {
  const { auditLogs } = useData();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState(1);

  const eventTypes = useMemo(() => {
    const types = new Set(auditLogs.map((l) => l.eventType || l.event_type));
    return ['all', ...Array.from(types).sort()];
  }, [auditLogs]);

  const filtered = useMemo(() => {
    return auditLogs.filter((log) => {
      const type = log.eventType || log.event_type || '';
      if (typeFilter !== 'all' && type !== typeFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        return (
          type.toLowerCase().includes(s) ||
          String(log.userId || log.user_id || '').includes(s) ||
          String(log.details || '').toLowerCase().includes(s) ||
          String(log.role || log.user_role || '').includes(s)
        );
      }
      return true;
    });
  }, [auditLogs, search, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleExport = () => {
    const csv = [
      'timestamp,event_type,user_id,role,details,ip',
      ...filtered.map((l) =>
        [
          new Date(l.timestamp).toISOString(),
          l.eventType || l.event_type,
          l.userId || l.user_id,
          l.role || l.user_role,
          `"${String(l.details || '').replace(/"/g, '""')}"`,
          l.ipAddress || l.ip_address,
        ].join(',')
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${Date.now()}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-100">Audit Logs</h1>
          <p className="text-sm text-dark-400 mt-1">
            {filtered.length.toLocaleString()} events logged
          </p>
        </div>
        <button onClick={handleExport} className="btn-secondary flex items-center gap-2 text-sm">
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
          <input
            type="text"
            placeholder="Search events, users, details…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input-field pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-dark-400" />
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className="select-field w-48"
          >
            {eventTypes.map((t) => (
              <option key={t} value={t}>{t === 'all' ? 'All Event Types' : t}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-700/50">
                {['Timestamp', 'Event', 'User ID', 'Role', 'Details', 'IP Address'].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-dark-400 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-dark-500">
                    No logs match the current filter
                  </td>
                </tr>
              ) : (
                paginated.map((log, idx) => {
                  const type = log.eventType || log.event_type || '';
                  const color = EVENT_COLORS[type] || 'text-dark-300';
                  return (
                    <tr key={log.id || idx} className="table-row">
                      <td className="px-5 py-3 text-xs text-dark-400 whitespace-nowrap">
                        {log.timestamp
                          ? new Date(log.timestamp).toLocaleString('en-IN', {
                              month: 'short', day: 'numeric',
                              hour: '2-digit', minute: '2-digit', second: '2-digit',
                            })
                          : '—'}
                      </td>
                      <td className={`px-5 py-3 text-xs font-mono font-semibold ${color}`}>{type}</td>
                      <td className="px-5 py-3 text-xs font-mono text-dark-300">
                        {log.userId || log.user_id || '—'}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={log.role || log.user_role || 'system'} />
                      </td>
                      <td className="px-5 py-3 text-xs text-dark-400 max-w-xs truncate">
                        {typeof log.details === 'object'
                          ? JSON.stringify(log.details)
                          : log.details || '—'}
                      </td>
                      <td className="px-5 py-3 text-xs font-mono text-dark-500">
                        {log.ipAddress || log.ip_address || '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-dark-700/50">
          <p className="text-xs text-dark-400">
            Page {page} of {totalPages} ({filtered.length} total)
          </p>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
