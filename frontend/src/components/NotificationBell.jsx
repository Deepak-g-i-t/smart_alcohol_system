// NotificationBell — sidebar bell icon with unread badge (Priority 2.5)
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';

export default function NotificationBell() {
  const { unreadCount } = useNotifications();
  const { userProfile } = useAuth();
  const navigate = useNavigate();

  const href = userProfile?.role === 'buyer'
    ? '/buyer/notifications'
    : '/authority/audit-logs';

  return (
    <button
      onClick={() => navigate(href)}
      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-dark-400 hover:text-accent-cyan hover:bg-dark-700/60 transition-all duration-200 relative"
      title="Notifications"
    >
      <div className="relative">
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 bg-accent-red text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </div>
      <span className="text-sm">Notifications</span>
    </button>
  );
}
