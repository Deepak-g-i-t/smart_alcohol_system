/**
 * useSocket — Socket.io consumer hook (Task 6)
 * Connects on mount with JWT, disconnects on unmount.
 * Returns { connected } so callers can show LIVE indicator.
 */
import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

export function useSocket(onTransaction, onEmergency) {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('slmrs_token');
    if (!token) return;

    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

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
      socketRef.current.on('transaction', onTransaction);
    }

    if (onEmergency) {
      socketRef.current.on('emergency_toggle', onEmergency);
    }

    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, []); // stable — callbacks are registered once; use refs if they change

  return { socketRef, connected };
}
