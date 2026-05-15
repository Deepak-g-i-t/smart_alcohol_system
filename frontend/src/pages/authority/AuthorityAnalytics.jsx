// Authority - Analytics Dashboard
import { useData } from '../../contexts/DataContext';
import ChartCard from '../../components/ChartCard';
import StatCard from '../../components/StatCard';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  BarChart3, TrendingUp, Activity, Map, Shield, Zap,
  PieChart as PieIcon, AlertTriangle,
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

export default function AuthorityAnalytics() {
  const { analytics, transactions, buyerProfiles } = useData();

  const statusData = [
    { name: 'Approved', value: analytics?.approvedCount || 0, fill: '#00e676' },
    { name: 'Rejected', value: analytics?.rejectedCount || 0, fill: '#ff1744' },
  ];

  const profiles = Object.values(buyerProfiles);
  const avgRisk = profiles.length > 0 ? (profiles.reduce((s, p) => s + p.riskScore, 0) / profiles.length).toFixed(1) : 0;

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-cyan/20 to-accent-purple/20 flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-accent-cyan" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-dark-100">Analytics Dashboard</h1>
          <p className="text-sm text-dark-400">Real-time insights and intelligence</p>
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Volume" value={analytics?.totalTransactions || 0} icon={Activity} color="cyan" subtitle="All transactions" />
        <StatCard title="Total Revenue" value={`₹${((analytics?.totalRevenue || 0) / 1000).toFixed(1)}K`} icon={TrendingUp} color="green" subtitle="Approved sales" />
        <StatCard title="Rejection Rate" value={`${analytics?.totalTransactions ? ((analytics.rejectedCount / analytics.totalTransactions) * 100).toFixed(1) : 0}%`} icon={AlertTriangle} color="red" subtitle={`${analytics?.rejectedCount || 0} rejected`} />
        <StatCard title="Avg Risk Score" value={avgRisk} icon={Shield} color="purple" subtitle={`${profiles.length} buyers`} />
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Transaction Trend */}
        <ChartCard title="30-Day Transaction Trend" subtitle="Daily approved vs rejected" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={analytics?.dailyTrend || []}>
              <defs>
                <linearGradient id="areaGreen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00e676" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00e676" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="areaRed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ff1744" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ff1744" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2440" />
              <XAxis dataKey="date" tick={{ fill: '#757fa2', fontSize: 10 }} tickFormatter={v => v.slice(5)} />
              <YAxis tick={{ fill: '#757fa2', fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} formatter={v => <span className="text-xs text-dark-300">{v}</span>} />
              <Area type="monotone" dataKey="approved" stroke="#00e676" fill="url(#areaGreen)" strokeWidth={2} name="Approved" />
              <Area type="monotone" dataKey="rejected" stroke="#ff1744" fill="url(#areaRed)" strokeWidth={2} name="Rejected" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Status Pie */}
        <ChartCard title="Approval Ratio" subtitle="Overall distribution">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="45%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={4}
                dataKey="value"
                stroke="none"
              >
                {statusData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} formatter={v => <span className="text-xs text-dark-300">{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Alcohol Distribution */}
        <ChartCard title="Alcohol Type Distribution" subtitle="By transaction count">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={analytics?.alcoholDistribution || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2440" />
              <XAxis dataKey="type" tick={{ fill: '#757fa2', fontSize: 10 }} />
              <YAxis tick={{ fill: '#757fa2', fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={30} name="Count">
                {(analytics?.alcoholDistribution || []).map((_, idx) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Risk Distribution */}
        <ChartCard title="Risk Score Distribution" subtitle="Buyer risk categories">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={analytics?.riskDistribution || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2440" />
              <XAxis dataKey="range" tick={{ fill: '#757fa2', fontSize: 10 }} />
              <YAxis tick={{ fill: '#757fa2', fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={35} name="Buyers">
                {(analytics?.riskDistribution || []).map((entry, idx) => (
                  <Cell key={idx} fill={
                    idx === 0 ? '#00e676' :
                    idx === 1 ? '#ffab00' :
                    idx === 2 ? '#ff4081' :
                    idx === 3 ? '#ff1744' : '#d50000'
                  } />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Third Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Regional Hotspots */}
        <ChartCard title="Regional Hotspots" subtitle="Transaction volume & violations by region">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={analytics?.hotspotAreas || []} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2440" />
              <XAxis type="number" tick={{ fill: '#757fa2', fontSize: 10 }} />
              <YAxis type="category" dataKey="region" tick={{ fill: '#a3aac1', fontSize: 11 }} width={100} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} formatter={v => <span className="text-xs text-dark-300">{v}</span>} />
              <Bar dataKey="transactions" fill="#00e5ff" radius={[0, 4, 4, 0]} barSize={14} name="Transactions" />
              <Bar dataKey="violations" fill="#ff1744" radius={[0, 4, 4, 0]} barSize={14} name="Violations" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Shop Activity Comparison */}
        <ChartCard title="Shop Performance" subtitle="Comparison of shop activity">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={analytics?.shopActivity || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2440" />
              <XAxis dataKey="name" tick={{ fill: '#757fa2', fontSize: 10 }} />
              <YAxis tick={{ fill: '#757fa2', fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} formatter={v => <span className="text-xs text-dark-300">{v}</span>} />
              <Bar dataKey="approved" fill="#00e676" radius={[4, 4, 0, 0]} barSize={28} name="Approved" />
              <Bar dataKey="rejected" fill="#ff1744" radius={[4, 4, 0, 0]} barSize={28} name="Rejected" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Weekly Comparison */}
      <ChartCard title="Weekly Performance Comparison" subtitle="Current vs previous period">
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={analytics?.weeklyComparison || []}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2440" />
            <XAxis dataKey="week" tick={{ fill: '#757fa2', fontSize: 10 }} />
            <YAxis tick={{ fill: '#757fa2', fontSize: 10 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend iconType="circle" iconSize={8} formatter={v => <span className="text-xs text-dark-300">{v}</span>} />
            <Line type="monotone" dataKey="current" stroke="#00e5ff" strokeWidth={2.5} dot={{ fill: '#00e5ff', r: 4 }} name="Current" />
            <Line type="monotone" dataKey="previous" stroke="#7c4dff" strokeWidth={2.5} dot={{ fill: '#7c4dff', r: 4 }} name="Previous" strokeDasharray="5 5" />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
