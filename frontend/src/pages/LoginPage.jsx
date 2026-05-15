// Login Page
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { DEMO_CREDENTIALS } from '../data/demoData';
import { Shield, Wine, User, Lock, Mail, Eye, EyeOff, Zap, AlertTriangle, ChevronRight } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signIn, isDemoMode } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await signIn(email, password);
      const routes = { authority: '/authority', shop: '/shop', buyer: '/buyer' };
      navigate(routes[user.role] || '/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCredentials = (role) => {
    const creds = DEMO_CREDENTIALS[role];
    if (creds) {
      setEmail(creds.email);
      setPassword(creds.password);
      setError('');
    }
  };

  const demoRoles = [
    { key: 'authority', label: 'Authority Admin', icon: Shield, color: 'from-accent-purple to-violet-500', desc: 'Full system control' },
    { key: 'shop', label: 'Shop Operator', icon: Wine, color: 'from-accent-cyan to-accent-blue', desc: 'Process sales' },
    { key: 'buyer', label: 'Buyer / User', icon: User, color: 'from-accent-green to-emerald-400', desc: 'View quota & history' },
  ];

  return (
    <div className="min-h-screen bg-dark-950 bg-cyber-grid bg-grid-size flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-accent-cyan/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent-purple/5 rounded-full blur-[120px]" />
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent-blue/3 rounded-full blur-[150px]" />

      <div className="w-full max-w-md relative z-10 animate-in">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-cyan to-accent-blue mb-4 shadow-glow-cyan">
            <Zap className="w-8 h-8 text-dark-900" />
          </div>
          <h1 className="text-2xl font-bold text-dark-100 mb-1">SLMRS</h1>
          <p className="text-sm text-dark-400">Smart Liquor Management & Rationing System</p>
          {isDemoMode && (
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-accent-amber/10 border border-accent-amber/30 rounded-full">
              <AlertTriangle className="w-3 h-3 text-accent-amber" />
              <span className="text-xs text-accent-amber font-medium">Demo Mode — No Firebase Required</span>
            </div>
          )}
        </div>

        {/* Login Card */}
        <div className="glass-card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-dark-300 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-dark-400" />
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="input-field pl-11"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-dark-300 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-dark-400" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="input-field pl-11 pr-11"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 transform -translate-y-1/2 text-dark-400 hover:text-dark-200 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-accent-red/10 border border-accent-red/20 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-accent-red flex-shrink-0" />
                <p className="text-xs text-accent-red">{error}</p>
              </div>
            )}

            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="spinner w-4 h-4 border-2 border-dark-900/30 border-t-dark-900"></div>
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Secure Sign In</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Demo Credentials */}
        {isDemoMode && (
          <div className="mt-5">
            <p className="text-xs text-dark-400 text-center mb-3">Quick Access — Demo Accounts</p>
            <div className="space-y-2">
              {demoRoles.map(({ key, label, icon: Icon, color, desc }) => (
                <button
                  key={key}
                  onClick={() => fillDemoCredentials(key)}
                  className="w-full glass-card p-3 flex items-center gap-3 hover:border-dark-500/60 transition-all duration-200 group cursor-pointer"
                >
                  <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-4 h-4 text-dark-900" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-dark-200 group-hover:text-dark-100">{label}</p>
                    <p className="text-xs text-dark-400">{desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-dark-500 group-hover:text-dark-300 transition-colors" />
                </button>
              ))}
            </div>
            <div className="mt-4 p-3 bg-dark-800/40 rounded-lg border border-dark-700/30">
              <p className="text-[10px] text-dark-500 text-center leading-relaxed">
                Demo mode uses in-memory data. All changes are temporary and reset on page reload.
                <br />Connect Firebase for persistent data storage.
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-[10px] text-dark-500 mt-6">
          Government of India — Excise Department • Secure Access Portal v2.0
        </p>
      </div>
    </div>
  );
}
