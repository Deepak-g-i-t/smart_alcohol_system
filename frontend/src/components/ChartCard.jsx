// Reusable Chart Card wrapper component
export default function ChartCard({ title, subtitle, children, className = '', actions }) {
  return (
    <div className={`glass-card p-5 ${className}`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-dark-100">{title}</h3>
          {subtitle && <p className="text-xs text-dark-400 mt-0.5">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <div className="w-full">{children}</div>
    </div>
  );
}
