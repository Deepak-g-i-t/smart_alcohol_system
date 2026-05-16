/**
 * NotificationContext — toast state + unread bell count
 */
import { createContext, useContext, useState, useCallback } from 'react';
import toast from 'react-hot-toast';

const NotificationContext = createContext(null);

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount]     = useState(0);

  const addNotification = useCallback((notification) => {
    const n = {
      id:        `n-${Date.now()}`,
      timestamp: new Date().toISOString(),
      read:      false,
      ...notification,
    };

    setNotifications((prev) => [n, ...prev.slice(0, 49)]);
    setUnreadCount((prev) => prev + 1);

    // Show toast based on type
    const opts = {
      style: {
        background: 'rgba(15,18,38,0.95)',
        border: `1px solid ${
          n.type === 'error'   ? 'rgba(255,23,68,0.3)' :
          n.type === 'warning' ? 'rgba(255,171,0,0.3)' :
                                 'rgba(0,230,118,0.3)'
        }`,
        color: '#d1d5e0',
      },
    };

    if (n.type === 'error')   toast.error(n.message, opts);
    else if (n.type === 'warning') toast(n.message, { ...opts, icon: '⚠️' });
    else                       toast.success(n.message, opts);
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      addNotification,
      markAllRead,
      clearAll,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}
