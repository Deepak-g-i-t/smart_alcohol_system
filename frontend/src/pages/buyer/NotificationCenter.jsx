// Notification Center — buyer/authority notification list (Priority 2.5)
import { Bell, Check, CheckCheck, Trash2, AlertTriangle, TrendingUp, Shield, Package } from 'lucide-react';
import { useNotifications } from '../../contexts/NotificationContext';

const TYPE_CONFIG = {
  quota_warning:    { icon: TrendingUp, color: 'text-accent-amber', bg: 'bg-accent-amber/10', border: 'border-accent-amber/20' },
  risk_escalation:  { icon: AlertTriangle, color: 'text-accent-red', bg: 'bg-accent-red/10', border: 'border-accent-red/20' },
  emergency:        { icon: Shield, color: 'text-accent-red', bg: 'bg-accent-red/15', border: 'border-accent-red/30' },
  policy_change:    { icon: Shield, color: 'text-accent-purple', bg: 'bg-accent-purple/10', border: 'border-accent-purple/20' },
  inventory_low:    { icon: Package, color: 'text-accent-cyan', bg: 'bg-accent-cyan/10', border: 'border-accent-cyan/20' },
};

export default function NotificationCenter() {
  const { notifications, unreadCount, markRead, markAllRead, clearAll } = useNotifications();

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-100">Notifications</h1>
          <p className="text-sm text-dark-400 mt-1">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
        </div>
        <div className="flex gap-3">
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="btn-secondary flex items-center gap-2 text-sm">
              <CheckCheck className="w-4 h-4" />
              Mark All Read
            </button>
          )}
          {notifications.length > 0 && (
            <button onClick={clearAll} className="btn-danger flex items-center gap-2 text-sm">
              <Trash2 className="w-4 h-4" />
              Clear All
            </button>
          )}
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <Bell className="w-12 h-12 text-dark-600 mx-auto mb-4" />
          <p className="text-dark-400 font-medium">No notifications yet</p>
          <p className="text-dark-500 text-sm mt-1">System alerts will appear here</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((note) => {
            const config = TYPE_CONFIG[note.type] || TYPE_CONFIG.policy_change;
            const Icon = config.icon;
            return (
              <div
                key={note.id}
                onClick={() => markRead(note.id)}
                className={`glass-card p-4 flex items-start gap-4 cursor-pointer transition-all duration-200
                  hover:border-dark-500/60 ${note.read ? 'opacity-60' : ''} border ${config.border}`}
              >
                <div className={`w-9 h-9 rounded-lg ${config.bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-4 h-4 ${config.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm font-semibold ${note.read ? 'text-dark-300' : 'text-dark-100'}`}>
                      {note.title}
                    </p>
                    {!note.read && (
                      <span className="w-2 h-2 rounded-full bg-accent-cyan flex-shrink-0 animate-pulse" />
                    )}
                  </div>
                  <p className="text-xs text-dark-400 mt-0.5">{note.message}</p>
                  <p className="text-xs text-dark-500 mt-1">
                    {new Date(note.createdAt).toLocaleString('en-IN', {
                      month: 'short', day: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
                {note.read && <Check className="w-4 h-4 text-dark-600 flex-shrink-0" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
