/**
 * Axios instance with JWT interceptors.
 * All API calls go through this instance.
 * Uses sessionStorage for tab isolation (Fix 3).
 */
import axios from 'axios';
import toast from 'react-hot-toast';

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

/* ─── Request interceptor: attach Bearer token ─────────── */
axiosInstance.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('slmrs_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/* ─── Response interceptor: handle 401 globally ───────── */
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Session expired — clear auth state and redirect
      sessionStorage.removeItem('slmrs_token');
      sessionStorage.removeItem('slmrs_user');
      toast.error('Session expired. Please sign in again.', {
        style: {
          background: 'rgba(15,18,38,0.95)',
          border: '1px solid rgba(255,23,68,0.3)',
          color: '#d1d5e0',
        },
      });
      // Redirect only if not already on auth pages
      if (!window.location.pathname.startsWith('/login') &&
          !window.location.pathname.startsWith('/register')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
