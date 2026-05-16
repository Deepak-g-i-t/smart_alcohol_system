/**
 * AuthContext — pure Express/JWT authentication (no Firebase).
 *
 * Storage:
 *   localStorage('slmrs_token')  — raw JWT string
 *   localStorage('slmrs_user')   — JSON { id, role, name, email }
 *
 * Exported interface is identical to the old Firebase version so all
 * consuming components continue to work without changes.
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';
import * as authService from '../api/authService';

const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

/* ─── Helpers ─────────────────────────────────────────────── */

const STORAGE_TOKEN = 'slmrs_token';
const STORAGE_USER  = 'slmrs_user';

const readStoredUser = () => {
  try {
    const token = localStorage.getItem(STORAGE_TOKEN);
    if (!token) return null;

    const decoded = jwtDecode(token);

    // Validate expiry
    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      localStorage.removeItem(STORAGE_TOKEN);
      localStorage.removeItem(STORAGE_USER);
      return null;
    }

    // Prefer the full profile stored at login (has email, name)
    const stored = localStorage.getItem(STORAGE_USER);
    if (stored) return JSON.parse(stored);

    // Fallback to decoded payload
    return { id: decoded.id, role: decoded.role, name: decoded.name || '' };
  } catch {
    localStorage.removeItem(STORAGE_TOKEN);
    localStorage.removeItem(STORAGE_USER);
    return null;
  }
};

const persistAuth = (token, profile) => {
  localStorage.setItem(STORAGE_TOKEN, token);
  localStorage.setItem(STORAGE_USER, JSON.stringify(profile));
};

const clearAuth = () => {
  localStorage.removeItem(STORAGE_TOKEN);
  localStorage.removeItem(STORAGE_USER);
};

/* ─── Provider ─────────────────────────────────────────────── */

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(readStoredUser);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  // Re-read on mount in case another tab changed storage
  useEffect(() => {
    const stored = readStoredUser();
    setUser(stored);
  }, []);

  /* ─── signIn ─────────────────────────────────────────────── */
  const signIn = useCallback(async (email, password) => {
    setError(null);
    setLoading(true);
    try {
      const data = await authService.login(email, password);
      // data = { token, role, name, id }
      const profile = { id: data.id, role: data.role, name: data.name, email };
      persistAuth(data.token, profile);
      setUser(profile);
      return { role: data.role };
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Login failed';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  /* ─── signOut ────────────────────────────────────────────── */
  const signOut = useCallback(() => {
    clearAuth();
    setUser(null);
    setError(null);
    // Navigate happens in the caller (Sidebar) via navigate('/login')
  }, []);

  /* ─── registerUser ───────────────────────────────────────── */
  const registerUser = useCallback(async (userData) => {
    setError(null);
    setLoading(true);
    try {
      const data = await authService.register(userData);
      // Backend returns { token, role, name, id } on success (auto-login)
      if (data.token) {
        const profile = {
          id: data.id,
          role: data.role,
          name: data.name,
          email: userData.email,
        };
        persistAuth(data.token, profile);
        setUser(profile);
      }
      return data;
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.fields?.[0]?.message ||
        err.message ||
        'Registration failed';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  /* ─── Context value ─────────────────────────────────────── */
  const value = {
    user,
    userProfile: user,       // alias — DataContext reads userProfile
    loading,
    error,
    signIn,
    signOut,
    registerUser,
    isAuthenticated: !!user,
    isAuthority: user?.role === 'authority',
    isShop:      user?.role === 'shop',
    isBuyer:     user?.role === 'buyer',
    isDemoMode:  false,      // Firebase demo mode permanently removed
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
