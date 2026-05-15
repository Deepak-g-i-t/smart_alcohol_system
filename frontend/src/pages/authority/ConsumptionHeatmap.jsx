// Consumption Heatmap — ScatterChart of region vs hour-of-day (Priority 3.3)
import { useMemo } from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { useData } from '../../contexts/DataContext';
import { Map } from 'lucide-react';

const REGIONS = ['Mumbai Central', 'Pune East', 'Mumbai South', 'Thane', 'Nagpur'];

const CustomDot = ({ cx, cy, payload, fill }) => {
  const r = Math.max(4, Math.min(22, payload.z / 2));
  return <circle cx={cx} cy={cy} r={r} fill={fill} fillOpacity={0.8} stroke="none" />;
};

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-dark-800/95 backdrop-blur-md border border-dark-600/50 rounded-lg p-3 shadow-xl">
      <p className="text-xs text-dark-400 mb-1">
        {d.region} — {String(d.hour).padStart(2, '0')}:00
      </p>
      <p className="text-sm font-semibold text-dark-100">{d.z} transactions</p>
      {d.violations > 0 && (
        <p className="text-xs text-accent-red mt-0.5">{d.violations} violations</p>
      )}
    </div>
  );
};

// Generate color from green → amber → red based on violation rate
const getDotColor = (transactions, violations) => {
  if (!transactions) return '#00e676';
  const rate = violations / transactions;
  if (rate < 0.1) return '#00e676';
  if (rate < 0.3) return '#ffab00';
  if (rate < 0.5) return '#ff4081';
  return '#ff1744';
};

export default function ConsumptionHeatmap() {
  const { transactions } = useData();

  // Build region × hour heatmap data
  const heatmapData = useMemo(() => {
    const map = {};
    transactions.forEach((t) => {
      const region = t.region || 'Unknown';
      const hour = new Date(t.timestamp).getHours();
      const key = `${region}::${hour}`;
      if (!map[key]) {
        map[key] = { region, hour, z: 0, violations: 0 };
      }
      map[key].z += 1;
      if (t.status === 'rejected') map[key].violations += 1;
    });
    return Object.values(map);
  }, [transactions]);

  // Region index for YAxis mapping
  const regionIndex = REGIONS.reduce((acc, r, i) => { acc[r] = i; return acc; }, {});

  // Bucketize into series per region for coloring
  const seriesByRegion = useMemo(() => {
    const byRegion = {};
    heatmapData.forEach((d) => {
      if (!byRegion[d.region]) byRegion[d.region] = [];
      byRegion[d.region].push({ ...d, regionIdx: regionIndex[d.region] ?? REGIONS.length });
    });
    return byRegion;
  }, [heatmapData]);

  const REGION_COLORS = ['#00e5ff', '#2979ff', '#7c4dff', '#ff4081', '#ffab00'];

  const summary = useMemo(() => {
    const total = transactions.length;
    const violations = transactions.filter((t) => t.status === 'rejected').length;
    // Peak hour
    const hourCounts = {};
    transactions.forEach((t) => {
      const h = new Date(t.timestamp).getHours();
      hourCounts[h] = (hourCounts[h] || 0) + 1;
    });
    const peakHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    return { total, violations, peakHour };
  }, [transactions]);

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center gap-3">
        <Map className="w-6 h-6 text-accent-cyan" />
        <div>
          <h1 className="text-2xl font-bold text-dark-100">Consumption Heatmap</h1>
          <p className="text-sm text-dark-400 mt-1">Region × Hour of day — bubble size = transaction count</p>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Transactions', value: summary.total.toLocaleString(), color: 'text-accent-cyan' },
          { label: 'Violations', value: summary.violations.toLocaleString(), color: 'text-accent-red' },
          { label: 'Peak Hour', value: summary.peakHour != null ? `${String(summary.peakHour).padStart(2, '0')}:00` : '—', color: 'text-accent-amber' },
        ].map((s) => (
          <div key={s.label} className="glass-card p-4">
            <p className="text-xs text-dark-400 mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Heatmap */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-dark-100 mb-4">
          Regional Activity by Hour
          <span className="ml-2 text-xs text-dark-400 font-normal">Bubble color: green=low / amber=moderate / red=high violations</span>
        </h3>
        <ResponsiveContainer width="100%" height={380}>
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 80 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2440" />
            <XAxis
              type="number"
              dataKey="hour"
              name="Hour"
              domain={[0, 23]}
              tickCount={24}
              tick={{ fill: '#757fa2', fontSize: 10 }}
              label={{ value: 'Hour of Day', position: 'insideBottom', offset: -10, fill: '#757fa2', fontSize: 11 }}
              tickFormatter={(v) => `${String(v).padStart(2, '0')}h`}
            />
            <YAxis
              type="number"
              dataKey="regionIdx"
              name="Region"
              domain={[-1, REGIONS.length]}
              tick={{ fill: '#a3aac1', fontSize: 11 }}
              tickFormatter={(v) => REGIONS[v] || ''}
              width={100}
            />
            <ZAxis type="number" dataKey="z" range={[20, 400]} />
            <Tooltip content={<CustomTooltip />} />

            {Object.entries(seriesByRegion).map(([region, points], idx) => (
              <Scatter
                key={region}
                name={region}
                data={points}
                fill={REGION_COLORS[idx % REGION_COLORS.length]}
              >
                {points.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={getDotColor(entry.z, entry.violations)}
                  />
                ))}
              </Scatter>
            ))}
          </ScatterChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-4 flex-wrap">
          {[
            { color: '#00e676', label: 'Low violations (<10%)' },
            { color: '#ffab00', label: 'Moderate (10-30%)' },
            { color: '#ff4081', label: 'High (30-50%)' },
            { color: '#ff1744', label: 'Critical (>50%)' },
          ].map((l) => (
            <div key={l.label} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ background: l.color }} />
              <span className="text-xs text-dark-400">{l.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
