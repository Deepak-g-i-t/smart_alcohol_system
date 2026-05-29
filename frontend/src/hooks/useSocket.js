/**
 * useSocket — Socket.io consumer hook
 * Connects on mount with JWT from sessionStorage, disconnects on unmount.
 * Returns { connected } so callers can show LIVE indicator.
 * Handles: new_transaction, emergency_toggle, quota_updated events.
 */
import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

export function useSocket(onTransaction, onEmergency, onQuotaUpdated) {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const token = sessionStorage.getItem('slmrs_token');
    if (!token) return;

    const socketUrl = import.meta.env.VITE_SOCKET_URL || window.location.origin;

    socketRef.current = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socketRef.current.on('connect', () => {
      setConnected(true);
    });

    socketRef.current.on('disconnect', () => {
      setConnected(false);
    });

    socketRef.current.on('connect_error', (err) => {
      console.warn('[Socket.io] Connection error:', err.message);
      setConnected(false);
    });

    if (onTransaction) {
      socketRef.current.on('new_transaction', onTransaction);
    }

    if (onEmergency) {
      socketRef.current.on('emergency_toggle', onEmergency);
    }

    if (onQuotaUpdated) {
      socketRef.current.on('quota_updated', onQuotaUpdated);
    }

    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, []); // stable — callbacks are registered once; use refs if they change

  return { socketRef, connected };
}
