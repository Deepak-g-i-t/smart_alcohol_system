/**
 * QuotaRingProgress — SVG circular progress rings (Priority 2.2)
 * Shows daily/weekly/monthly quota as ring gauges.
 */

const Ring = ({ label, used, total, color, size = 80, strokeWidth = 8 }) => {
  const safeTotal = total || 1;
  const pct = Math.min(100, Math.max(0, ((safeTotal - used) / safeTotal) * 100));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  const colorMap = {
    cyan:   { stroke: '#00e5ff', text: '#00e5ff' },
    green:  { stroke: '#00e676', text: '#00e676' },
    amber:  { stroke: '#ffab00', text: '#ffab00' },
    red:    { stroke: '#ff1744', text: '#ff1744' },
    purple: { stroke: '#7c4dff', text: '#7c4dff' },
  };
  const c = colorMap[color] || colorMap.cyan;

  // Auto-color based on remaining %
  const remaining = safeTotal - used;
  const autoPct = (remaining / safeTotal) * 100;
  const ringColor = !color
    ? autoPct > 50 ? colorMap.green.stroke : autoPct > 20 ? colorMap.amber.stroke : colorMap.red.stroke
    : c.stroke;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(45,53,85,0.5)"
            strokeWidth={strokeWidth}
          />
          {/* Progress arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={ringColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.6s ease-out' }}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm font-bold text-dark-100">{remaining}</span>
          <span className="text-[9px] text-dark-400">/{total}</span>
        </div>
      </div>
      <span className="text-xs text-dark-400 font-medium">{label}</span>
    </div>
  );
};

export default function QuotaRingProgress({ daily, weekly, monthly }) {
  return (
    <div className="flex items-center justify-around gap-4 flex-wrap">
      <Ring
        label="Daily"
        used={daily.limit - daily.remaining}
        total={daily.limit}
        size={80}
      />
      <Ring
        label="Weekly"
        used={weekly.limit - weekly.remaining}
        total={weekly.limit}
        size={80}
      />
      <Ring
        label="Monthly"
        used={monthly.limit - monthly.remaining}
        total={monthly.limit}
        size={80}
      />
    </div>
  );
}
