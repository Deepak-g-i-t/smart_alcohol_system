// Authority - Buyer Management
import { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import { Users, Shield, Ban, UserCheck, AlertTriangle, Eye, X } from 'lucide-react';

export default function AuthorityBuyers() {
  const { buyerProfiles, transactions, toggleBlacklist } = useData();
  const [selectedBuyer, setSelectedBuyer] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const buyers = Object.values(buyerProfiles);

  const getRiskLevel = (score) => {
    if (score <= 20) return 'low';
    if (score <= 40) return 'moderate';
    if (score <= 60) return 'warning';
    if (score <= 80) return 'high';
    return 'critical';
  };

  const columns = [
    {
      id: 'name',
      header: 'Buyer',
      accessor: 'name',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-cyan/20 to-accent-blue/20 flex items-center justify-center">
            <span className="text-xs font-semibold text-accent-cyan">
              {row.name?.split(' ').map(n => n[0]).join('')}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-dark-200">{row.name}</p>
            <p className="text-xs text-dark-400">{row.buyerId}</p>
          </div>
        </div>
      ),
    },
    {
      id: 'region',
      header: 'Region',
      accessor: 'region',
      cell: (row) => <span className="text-sm text-dark-300">{row.region || '—'}</span>,
    },
    {
      id: 'risk',
      header: 'Risk Score',
      accessor: 'riskScore',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <div className="w-16 h-1.5 bg-dark-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                row.riskScore <= 30 ? 'bg-accent-green' :
                row.riskScore <= 60 ? 'bg-accent-amber' : 'bg-accent-red'
              }`}
              style={{ width: `${row.riskScore}%` }}
            />
          </div>
          <span className={`text-xs font-mono font-medium ${
            row.riskScore <= 30 ? 'text-accent-green' :
            row.riskScore <= 60 ? 'text-accent-amber' : 'text-accent-red'
          }`}>{row.riskScore}</span>
        </div>
      ),
    },
    {
      id: 'quota',
      header: 'Quota (D/W/M)',
      accessor: 'dailyRemaining',
      cell: (row) => (
        <span className="text-xs font-mono text-dark-300">
          {row.dailyRemaining}/{row.weeklyRemaining}/{row.monthlyRemaining}
        </span>
      ),
    },
    {
      id: 'purchases',
      header: 'Total',
      accessor: 'totalPurchases',
    },
    {
      id: 'status',
      header: 'Status',
      accessor: (row) => row.blacklistStatus ? 'blacklisted' : 'active',
      cell: (row) => (
        <StatusBadge status={row.blacklistStatus ? 'blacklisted' : 'active'} />
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      sortable: false,
      cell: (row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); setSelectedBuyer(row); setShowModal(true); }}
            className="p-1.5 rounded-lg text-dark-400 hover:text-accent-cyan hover:bg-accent-cyan/10 transition-all"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); toggleBlacklist(row.buyerId); }}
            className={`p-1.5 rounded-lg transition-all ${
              row.blacklistStatus
                ? 'text-accent-green hover:bg-accent-green/10'
                : 'text-accent-red hover:bg-accent-red/10'
            }`}
            title={row.blacklistStatus ? 'Remove from Blacklist' : 'Blacklist Buyer'}
          >
            {row.blacklistStatus ? <UserCheck className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
          </button>
        </div>
      ),
    },
  ];

  const buyerTxns = selectedBuyer ? transactions.filter(t => t.buyerId === selectedBuyer.buyerId).slice(0, 10) : [];

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-accent-blue/10 flex items-center justify-center">
          <Users className="w-5 h-5 text-accent-blue" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-dark-100">Buyer Management</h1>
          <p className="text-sm text-dark-400">{buyers.length} registered buyers</p>
        </div>
      </div>

      {/* Risk Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Low Risk', count: buyers.filter(b => b.riskScore <= 20).length, color: 'text-accent-green', bg: 'bg-accent-green/10' },
          { label: 'Moderate', count: buyers.filter(b => b.riskScore > 20 && b.riskScore <= 50).length, color: 'text-accent-amber', bg: 'bg-accent-amber/10' },
          { label: 'High Risk', count: buyers.filter(b => b.riskScore > 50 && !b.blacklistStatus).length, color: 'text-accent-red', bg: 'bg-accent-red/10' },
          { label: 'Blacklisted', count: buyers.filter(b => b.blacklistStatus).length, color: 'text-accent-red', bg: 'bg-accent-red/10' },
        ].map(({ label, count, color, bg }) => (
          <div key={label} className="glass-card p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center`}>
              <span className={`text-lg font-bold ${color}`}>{count}</span>
            </div>
            <span className="text-xs text-dark-400 font-medium">{label}</span>
          </div>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={buyers}
        pageSize={10}
        searchPlaceholder="Search buyers by name, region, or ID..."
      />

      {/* Buyer Detail Modal */}
      {showModal && selectedBuyer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="glass-card w-full max-w-2xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-dark-700/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-cyan/20 to-accent-blue/20 flex items-center justify-center">
                  <span className="text-sm font-semibold text-accent-cyan">
                    {selectedBuyer.name?.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-dark-100">{selectedBuyer.name}</h3>
                  <p className="text-xs text-dark-400">{selectedBuyer.buyerId}</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-dark-700 transition-colors">
                <X className="w-5 h-5 text-dark-400" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Profile Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-dark-800 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-dark-100">{selectedBuyer.riskScore}</p>
                  <p className="text-xs text-dark-400 mt-1">Risk Score</p>
                </div>
                <div className="bg-dark-800 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-dark-100">{selectedBuyer.totalPurchases}</p>
                  <p className="text-xs text-dark-400 mt-1">Total Purchases</p>
                </div>
                <div className="bg-dark-800 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-dark-100">{selectedBuyer.dailyRemaining}</p>
                  <p className="text-xs text-dark-400 mt-1">Daily Remaining</p>
                </div>
              </div>
              {/* Quota Details */}
              <div className="bg-dark-800 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-dark-200 mb-3">Quota Status</h4>
                {[
                  { label: 'Daily', remaining: selectedBuyer.dailyRemaining, max: 2 },
                  { label: 'Weekly', remaining: selectedBuyer.weeklyRemaining, max: 7 },
                  { label: 'Monthly', remaining: selectedBuyer.monthlyRemaining, max: 15 },
                ].map(({ label, remaining, max }) => (
                  <div key={label} className="flex items-center gap-3 mb-2">
                    <span className="text-xs text-dark-400 w-16">{label}</span>
                    <div className="flex-1 h-2 bg-dark-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${remaining > max * 0.5 ? 'bg-accent-green' : remaining > 0 ? 'bg-accent-amber' : 'bg-accent-red'}`}
                        style={{ width: `${(remaining / max) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono text-dark-300">{remaining}/{max}</span>
                  </div>
                ))}
              </div>
              {/* Recent Transactions */}
              {buyerTxns.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-dark-200 mb-3">Recent Transactions</h4>
                  <div className="space-y-2">
                    {buyerTxns.map(txn => (
                      <div key={txn.id} className="flex items-center justify-between bg-dark-800 rounded-lg p-3">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-mono text-accent-cyan">{txn.id}</span>
                          <span className="text-sm text-dark-300">{txn.alcoholType}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-dark-300">₹{txn.amount}</span>
                          <StatusBadge status={txn.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
