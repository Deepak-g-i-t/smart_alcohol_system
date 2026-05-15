// Authority Dashboard - Main overview page
import { useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import StatCard from '../../components/StatCard';
import ChartCard from '../../components/ChartCard';
import StatusBadge from '../../components/StatusBadge';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  Activity, TrendingUp, ShoppingCart, AlertTriangle, Users, ShieldAlert,
  Ban, CheckCircle, XCircle, Wine, Clock, Zap,
} from 'lucide-react';

const COLORS = ['#00e5ff', '#2979ff', '#7c4dff', '#ff4081', '#00e676', '#ffab00', '#ff1744'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-dark-800/95 backdrop-blur-md border border-dark-600/50 rounded-lg p-3 shadow-xl">
      <p className="text-xs text-dark-400 mb-1">{label}</p>
      {payload.map((entry, idx) => (
        <p key={idx} className="text-sm font-medium" style={{ color: entry.color }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
};

export default function AuthorityDashboard() {
  const { userProfile } = useAuth();
  const { transactions, buyerProfiles, policies, analytics } = useData();

  const stats = useMemo(() => {
    const approved = transactions.filter(t => t.status === 'approved');
    const rejected = transactions.filter(t => t.status === 'rejected');
    const profiles = Object.values(buyerProfiles);
    const highRisk = profiles.filter(p => p.riskScore >= 60);
    const blacklisted = profiles.filter(p => p.blacklistStatus);
    
    return {
      total: transactions.length,
      approved: approved.length,
      rejected: rejected.length,
      approvalRate: transactions.length > 0 ? ((approved.length / transactions.length) * 100).toFixed(1) : 0,
      totalBuyers: profiles.length,
      highRisk: highRisk.length,
      blacklisted: blacklisted.length,
      revenue: approved.reduce((sum, t) => sum + (t.amount || 0), 0),
    };
  }, [transactions, buyerProfiles]);

  const recentTransactions = useMemo(() => transactions.slice(0, 8), [transactions]);

  const riskData = useMemo(() => {
    const profiles = Object.values(buyerProfiles);
    return [
      { name: 'Low (0-20)', value: profiles.filter(p => p.riskScore <= 20).length, fill: '#00e676' },
      { name: 'Moderate (21-40)', value: profiles.filter(p => p.riskScore > 20 && p.riskScore <= 40).length, fill: '#ffab00' },
      { name: 'Elevated (41-60)', value: profiles.filter(p => p.riskScore > 40 && p.riskScore <= 60).length, fill: '#ff4081' },
      { name: 'High (61-80)', value: profiles.filter(p => p.riskScore > 60 && p.riskScore <= 80).length, fill: '#ff1744' },
      { name: 'Critical (81+)', value: profiles.filter(p => p.riskScore > 80).length, fill: '#d50000' },
    ].filter(d => d.value > 0);
  }, [buyerProfiles]);

  const formatCurrency = (val) => `₹${(val / 1000).toFixed(1)}K`;

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-100">Authority Dashboard</h1>
          <p className="text-sm text-dark-400 mt-1">Welcome back, {userProfile?.name}</p>
        </div>
        <div className="flex items-center gap-3">
          {policies?.emergencyFlag && (
            <div className="flex items-center gap-2 px-4 py-2 bg-accent-red/10 border border-accent-red/30 rounded-lg animate-pulse">
              <AlertTriangle className="w-4 h-4 text-accent-red" />
              <span className="text-sm text-accent-red font-semibold">Emergency Active</span>
            </div>
          )}
          <div className="flex items-center gap-2 px-3 py-2 glass-card">
            <div className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
            <span className="text-xs text-dark-400">System Online</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Transactions" value={stats.total.toLocaleString()} icon={ShoppingCart} color="cyan" trend={8.5} subtitle="All time" />
        <StatCard title="Approval Rate" value={`${stats.approvalRate}%`} icon={CheckCircle} color="green" trend={2.3} subtitle={`${stats.approved} approved`} />
        <StatCard title="Rejections" value={stats.rejected.toLocaleString()} icon={XCircle} color="red" trend={-5.1} subtitle="Policy violations" />
        <StatCard title="Revenue Generated" value={formatCurrency(stats.revenue)} icon={TrendingUp} color="purple" trend={12.4} subtitle="Approved sales" />
      </div>

      {/* Second Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Registered Buyers" value={stats.totalBuyers} icon={Users} color="blue" subtitle="Active accounts" />
        <StatCard title="High Risk Buyers" value={stats.highRisk} icon={ShieldAlert} color="amber" subtitle="Risk score > 60" />
        <StatCard title="Blacklisted" value={stats.blacklisted} icon={Ban} color="red" subtitle="Blocked from purchases" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Daily Trend Chart */}
        <ChartCard title="Transaction Trend" subtitle="Last 30 days">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={analytics?.dailyTrend?.slice(-14) || []}>
              <defs>
                <linearGradient id="gradApproved" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00e676" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00e676" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradRejected" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ff1744" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ff1744" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2440" />
              <XAxis dataKey="date" tick={{ fill: '#757fa2', fontSize: 10 }} tickFormatter={v => v.slice(5)} />
              <YAxis tick={{ fill: '#757fa2', fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="approved" stroke="#00e676" fill="url(#gradApproved)" strokeWidth={2} name="Approved" />
              <Area type="monotone" dataKey="rejected" stroke="#ff1744" fill="url(#gradRejected)" strokeWidth={2} name="Rejected" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Risk Distribution */}
        <ChartCard title="Buyer Risk Distribution" subtitle="Current risk scores">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={riskData}
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={100}
                paddingAngle={3}
                dataKey="value"
                stroke="none"
              >
                {riskData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                formatter={(value) => <span className="text-xs text-dark-300">{value}</span>}
                iconSize={8}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Alcohol Category & Hotspot */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Alcohol Distribution */}
        <ChartCard title="Top Alcohol Categories" subtitle="By transaction count">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={analytics?.alcoholDistribution || []} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2440" />
              <XAxis type="number" tick={{ fill: '#757fa2', fontSize: 10 }} />
              <YAxis type="category" dataKey="type" tick={{ fill: '#a3aac1', fontSize: 11 }} width={70} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" fill="#2979ff" radius={[0, 4, 4, 0]} barSize={20} name="Transactions">
                {(analytics?.alcoholDistribution || []).map((_, idx) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Hotspot Regions */}
        <ChartCard title="Regional Hotspots" subtitle="Transaction volume & violations">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={analytics?.hotspotAreas || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2440" />
              <XAxis dataKey="region" tick={{ fill: '#757fa2', fontSize: 10 }} />
              <YAxis tick={{ fill: '#757fa2', fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="transactions" fill="#00e5ff" radius={[4, 4, 0, 0]} barSize={24} name="Transactions" />
              <Bar dataKey="violations" fill="#ff1744" radius={[4, 4, 0, 0]} barSize={24} name="Violations" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Recent Transactions */}
      <div className="glass-card">
        <div className="flex items-center justify-between p-5 border-b border-dark-700/50">
          <div>
            <h3 className="text-sm font-semibold text-dark-100">Recent Transactions</h3>
            <p className="text-xs text-dark-400 mt-0.5">Latest activity across all shops</p>
          </div>
          <Activity className="w-4 h-4 text-accent-cyan" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-700/50">
                <th className="px-5 py-3 text-left text-xs font-semibold text-dark-400 uppercase tracking-wider">ID</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-dark-400 uppercase tracking-wider">Buyer</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-dark-400 uppercase tracking-wider">Type</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-dark-400 uppercase tracking-wider">Qty</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-dark-400 uppercase tracking-wider">Amount</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-dark-400 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-dark-400 uppercase tracking-wider">Time</th>
              </tr>
            </thead>
            <tbody>
              {recentTransactions.map((txn) => (
                <tr key={txn.id} className="table-row">
                  <td className="px-5 py-3 text-xs font-mono text-accent-cyan">{txn.id}</td>
                  <td className="px-5 py-3 text-sm text-dark-200">{txn.buyerName}</td>
                  <td className="px-5 py-3 text-sm text-dark-300">{txn.alcoholType}</td>
                  <td className="px-5 py-3 text-sm text-dark-300">{txn.quantity}</td>
                  <td className="px-5 py-3 text-sm text-dark-200 font-medium">₹{txn.amount}</td>
                  <td className="px-5 py-3"><StatusBadge status={txn.status} /></td>
                  <td className="px-5 py-3 text-xs text-dark-400">
                    {new Date(txn.timestamp).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
