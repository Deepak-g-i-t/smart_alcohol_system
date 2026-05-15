// Status Badge component
export default function StatusBadge({ status, size = 'sm' }) {
  const config = {
    approved: { label: 'Approved', classes: 'badge-success' },
    rejected: { label: 'Rejected', classes: 'badge-danger' },
    pending: { label: 'Pending', classes: 'badge-warning' },
    active: { label: 'Active', classes: 'badge-success' },
    inactive: { label: 'Inactive', classes: 'badge-danger' },
    blacklisted: { label: 'Blacklisted', classes: 'badge-danger' },
    warning: { label: 'Warning', classes: 'badge-warning' },
    low: { label: 'Low Risk', classes: 'badge-success' },
    moderate: { label: 'Moderate', classes: 'badge-warning' },
    high: { label: 'High Risk', classes: 'badge-danger' },
    critical: { label: 'Critical', classes: 'badge-danger' },
  };

  const { label, classes } = config[status] || { label: status, classes: 'badge-info' };

  return (
    <span className={`${classes} ${size === 'lg' ? 'px-3 py-1.5 text-sm' : ''}`}>
      <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${
        status === 'approved' || status === 'active' || status === 'low' ? 'bg-accent-green' :
        status === 'rejected' || status === 'blacklisted' || status === 'critical' || status === 'high' ? 'bg-accent-red' :
        status === 'pending' || status === 'warning' || status === 'moderate' ? 'bg-accent-amber' :
        'bg-accent-cyan'
      }`} />
      {label}
    </span>
  );
}
