/**
 * NotificationContext — global notification state (Priority 2.5)
 * Persists to localStorage, routes alerts through react-hot-toast.
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';

const NotificationContext = createContext(null);

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}

const STORAGE_KEY = 'slmrs_notifications';

const loadFromStorage = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
};

const saveToStorage = (items) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 100))); // cap at 100
};

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState(loadFromStorage);

  // Persist on change
  useEffect(() => {
    saveToStorage(notifications);
  }, [notifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const addNotification = useCallback(({ type, title, message }) => {
    const note = {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type,
      title,
      message,
      read: false,
      createdAt: new Date().toISOString(),
    };

    setNotifications((prev) => [note, ...prev]);

    // Route through react-hot-toast
    const toastOptions = {
      duration: 5000,
      style: {
        background: 'rgba(15, 18, 38, 0.95)',
        border: '1px solid rgba(45, 53, 85, 0.6)',
        color: '#d1d5e0',
        backdropFilter: 'blur(20px)',
      },
    };

    switch (type) {
      case 'emergency':
        toast.error(`🚨 ${title}: ${message}`, toastOptions);
        break;
      case 'risk_escalation':
        toast(`⚠️ ${title}: ${message}`, { ...toastOptions, icon: '⚠️' });
        break;
      case 'quota_warning':
        toast(`📊 ${title}: ${message}`, toastOptions);
        break;
      case 'inventory_low':
        toast(`📦 ${title}: ${message}`, { ...toastOptions, icon: '📦' });
        break;
      default:
        toast(message, toastOptions);
    }

    return note;
  }, []);

  const markRead = useCallback((id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, addNotification, markRead, markAllRead, clearAll }}
    >
      {children}
    </NotificationContext.Provider>
  );
}
