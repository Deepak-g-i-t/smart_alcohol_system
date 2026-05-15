// Reusable Stat Card component
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function StatCard({ title, value, subtitle, icon: Icon, trend, trendValue, color = 'cyan', className = '' }) {
  const colorMap = {
    cyan: { gradient: 'from-accent-cyan to-accent-blue', glow: 'shadow-glow-cyan', text: 'text-accent-cyan', bg: 'bg-accent-cyan/10' },
    green: { gradient: 'from-accent-green to-emerald-400', glow: 'shadow-glow-green', text: 'text-accent-green', bg: 'bg-accent-green/10' },
    red: { gradient: 'from-accent-red to-accent-pink', glow: 'shadow-glow-red', text: 'text-accent-red', bg: 'bg-accent-red/10' },
    purple: { gradient: 'from-accent-purple to-violet-400', glow: 'shadow-glow-purple', text: 'text-accent-purple', bg: 'bg-accent-purple/10' },
    amber: { gradient: 'from-accent-amber to-yellow-400', glow: '', text: 'text-accent-amber', bg: 'bg-accent-amber/10' },
    blue: { gradient: 'from-accent-blue to-blue-400', glow: 'shadow-glow-blue', text: 'text-accent-blue', bg: 'bg-accent-blue/10' },
  };

  const colors = colorMap[color] || colorMap.cyan;

  return (
    <div className={`glass-card p-5 relative overflow-hidden group hover:border-dark-500/60 transition-all duration-300 ${className}`}>
      {/* Top gradient line */}
      <div className={`absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r ${colors.gradient} opacity-60`} />
      
      {/* Glow effect on hover */}
      <div className={`absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br ${colors.gradient} rounded-full opacity-0 group-hover:opacity-5 blur-3xl transition-opacity duration-500`} />

      <div className="flex items-start justify-between relative z-10">
        <div className="flex-1">
          <p className="text-dark-400 text-xs font-medium uppercase tracking-wider mb-1">{title}</p>
          <p className="text-2xl font-bold text-dark-100 mt-1">{value}</p>
          {subtitle && <p className="text-dark-400 text-xs mt-1">{subtitle}</p>}
          {trend !== undefined && (
            <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend > 0 ? 'text-accent-green' : trend < 0 ? 'text-accent-red' : 'text-dark-400'}`}>
              {trend > 0 ? <TrendingUp className="w-3 h-3" /> : trend < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
              <span>{trendValue || `${Math.abs(trend)}%`}</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className={`w-11 h-11 rounded-xl ${colors.bg} flex items-center justify-center`}>
            <Icon className={`w-5 h-5 ${colors.text}`} />
          </div>
        )}
      </div>
    </div>
  );
}
