// Login Page — clean, no Firebase, no demo shortcuts
import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Shield, Lock, Mail, Eye, EyeOff, Zap, AlertTriangle, UserPlus,
} from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const { signIn }                      = useAuth();
  const navigate                        = useNavigate();
  const emailRef                        = useRef(null);

  // Auto-focus email on mount (Task 9)
  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await signIn(email, password);
      const routes = { authority: '/authority', shop: '/shop', buyer: '/buyer' };
      navigate(routes[result.role] || '/');
    } catch (err) {
      setError(err.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 bg-cyber-grid bg-grid-size flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient glow effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-accent-cyan/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent-purple/5 rounded-full blur-[120px]" />
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent-blue/3 rounded-full blur-[150px]" />

      <div className="w-full max-w-md relative z-10 animate-in">
        {/* Logo + Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-cyan to-accent-blue mb-4 shadow-glow-cyan">
            <Zap className="w-8 h-8 text-dark-900" />
          </div>
          <h1 className="text-2xl font-bold text-dark-100 mb-1">SLMRS</h1>
          <p className="text-sm text-dark-400">Smart Liquor Management &amp; Rationing System</p>
          <p className="text-xs text-dark-500 mt-1">Government of India — Excise Department</p>
        </div>

        {/* Login Card */}
        <div className="glass-card p-6">
          <h2 className="text-base font-semibold text-dark-200 mb-5 flex items-center gap-2">
            <Shield className="w-4 h-4 text-accent-cyan" />
            Secure Sign In
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Email */}
            <div>
              <label htmlFor="login-email" className="block text-xs font-medium text-dark-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-dark-400" />
                <input
                  ref={emailRef}
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your official email"
                  className="input-field pl-11"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="login-password" className="block text-xs font-medium text-dark-300">
                  Password
                </label>
                <span className="text-xs text-dark-500 cursor-not-allowed select-none">
                  Forgot password?
                </span>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-dark-400" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="input-field pl-11 pr-11"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 transform -translate-y-1/2 text-dark-400 hover:text-dark-200 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-accent-red/10 border border-accent-red/20 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-accent-red flex-shrink-0" />
                <p className="text-xs text-accent-red">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              id="login-submit"
              type="submit"
              disabled={loading || !email || !password}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <div className="spinner w-4 h-4 border-2 border-dark-900/30 border-t-dark-900" />
                  <span>Authenticating…</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          {/* Register link */}
          <div className="mt-5 pt-4 border-t border-dark-700/40 text-center">
            <p className="text-xs text-dark-400">
              New to SLMRS?{' '}
              <Link
                to="/register"
                className="text-accent-cyan hover:text-accent-blue font-medium transition-colors inline-flex items-center gap-1"
              >
                <UserPlus className="w-3 h-3" />
                Create an account
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-[10px] text-dark-600 mt-6">
          Secure Access Portal v2.0 • All activity is monitored and logged.
        </p>
      </div>
    </div>
  );
}
