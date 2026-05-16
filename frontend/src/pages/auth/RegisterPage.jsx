/**
 * Multi-Step Registration Page (Task 5)
 * Steps: 1. Role selection → 2. Common fields → 3. Role-specific → 4. Review + submit
 */
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Shield, Wine, User, Lock, Mail, Eye, EyeOff, Zap,
  AlertTriangle, ChevronRight, ChevronLeft, Check, Phone,
  Building, FileText, MapPin, Calendar, CreditCard,
} from 'lucide-react';

/* ─── Password strength ─────────────────────────────────── */
const calcStrength = (pw) => {
  let score = 0;
  if (pw.length >= 8)  score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score; // 0-5
};
const strengthLabel = (s) => ['Too short', 'Weak', 'Fair', 'Good', 'Strong', 'Very strong'][s] || '';
const strengthColor = (s) => ['bg-dark-600', 'bg-accent-red', 'bg-accent-amber', 'bg-yellow-400', 'bg-accent-green', 'bg-accent-cyan'][s] || '';

/* ─── Role config ─────────────────────────────────────────── */
const ROLES = [
  {
    key: 'buyer',
    label: 'Buyer / Consumer',
    icon: User,
    color: 'from-accent-green to-emerald-500',
    border: 'border-accent-green/40',
    desc: 'Purchase alcohol within regulated limits',
  },
  {
    key: 'shop',
    label: 'Shop Operator',
    icon: Wine,
    color: 'from-accent-cyan to-accent-blue',
    border: 'border-accent-cyan/40',
    desc: 'Licensed shop to dispense and track sales',
  },
  {
    key: 'authority',
    label: 'Authority / Regulator',
    icon: Shield,
    color: 'from-accent-purple to-violet-500',
    border: 'border-accent-purple/40',
    desc: 'Government excise authority with full access',
  },
];

const DISTRICTS = [
  'Mumbai City', 'Mumbai Suburban', 'Pune', 'Thane', 'Nagpur',
  'Nashik', 'Aurangabad', 'Solapur', 'Kolhapur', 'Satara',
  'Sangli', 'Ratnagiri', 'Sindhudurg', 'Raigad', 'Palghar',
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const { registerUser } = useAuth();

  const [step, setStep]     = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [form, setForm] = useState({
    // Step 1
    role: '',
    // Step 2 (common)
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    // Step 3 — buyer
    age: '',
    phone: '',
    address: '',
    govt_id_sim: '',
    // Step 3 — shop
    shop_name: '',
    license_number: '',
    shop_address: '',
    district: '',
    shop_phone: '',
    // Step 3 — authority
    department: '',
    designation: '',
    authority_code: '',
  });

  const [fieldErrors, setFieldErrors] = useState({});

  // Role-specific field defaults — used to reset on role switch
  const ROLE_FIELD_DEFAULTS = {
    buyer:     { age: '', phone: '', address: '', govt_id_sim: '' },
    shop:      { shop_name: '', license_number: '', shop_address: '', district: '', shop_phone: '' },
    authority: { department: '', designation: '', authority_code: '' },
  };

  const set = (key, val) => {
    setForm((prev) => ({ ...prev, [key]: val }));
    setFieldErrors((prev) => ({ ...prev, [key]: '' }));
  };

  // When role changes, wipe ALL role-specific fields to prevent bleed (Issue 2)
  const setRole = (newRole) => {
    const resetFields = {
      ...ROLE_FIELD_DEFAULTS.buyer,
      ...ROLE_FIELD_DEFAULTS.shop,
      ...ROLE_FIELD_DEFAULTS.authority,
    };
    setForm((prev) => ({ ...prev, role: newRole, ...resetFields }));
    setFieldErrors({});
    setError('');
  };

  /* ─── Validation per step ─────────────────────────────── */
  const validateStep = () => {
    const errs = {};

    if (step === 1 && !form.role) errs.role = 'Please select a role';

    if (step === 2) {
      if (!form.name.trim())           errs.name     = 'Name is required';
      if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Valid email required';
      if (form.password.length < 8)    errs.password = 'Minimum 8 characters';
      if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    }

    if (step === 3) {
      if (form.role === 'buyer') {
        if (!form.age || parseInt(form.age) < 21) errs.age = 'Must be 21 or older';
      }
      if (form.role === 'shop') {
        if (!form.shop_name.trim())       errs.shop_name       = 'Shop name is required';
        if (!form.license_number.trim())  errs.license_number  = 'License number is required';
        if (!form.shop_address.trim())    errs.shop_address    = 'Shop address is required';
        if (!form.district)               errs.district        = 'District is required';
        if (!form.shop_phone.trim())      errs.shop_phone      = 'Phone is required';
      }
      if (form.role === 'authority') {
        if (!form.department.trim())      errs.department      = 'Department is required';
        if (!form.authority_code.trim())  errs.authority_code  = 'Authority code is required';
      }
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const next = () => {
    if (validateStep()) setStep((s) => s + 1);
  };

  const back = () => {
    setError('');
    setFieldErrors({});
    const prevStep = step - 1;
    // Going back to role selection: wipe role-specific fields to prevent bleed
    if (prevStep === 1) {
      setForm((prev) => ({
        ...prev,
        ...ROLE_FIELD_DEFAULTS.buyer,
        ...ROLE_FIELD_DEFAULTS.shop,
        ...ROLE_FIELD_DEFAULTS.authority,
      }));
    }
    setStep(prevStep);
  };

  /* ─── Submit ────────────────────────────────────────────── */
  const handleSubmit = async () => {
    if (!validateStep()) return;
    setError('');
    setLoading(true);
    try {
      const payload = {
        name:     form.name.trim(),
        email:    form.email.trim().toLowerCase(),
        password: form.password,
        role:     form.role,
        // Buyer fields
        age:         form.role === 'buyer' ? parseInt(form.age) : undefined,
        phone:       form.role === 'buyer' ? form.phone        : undefined,
        address:     form.role === 'buyer' ? form.address      : undefined,
        govt_id_sim: form.role === 'buyer' ? form.govt_id_sim  : undefined,
        // Shop fields
        shop_name:      form.role === 'shop' ? form.shop_name      : undefined,
        license_number: form.role === 'shop' ? form.license_number  : undefined,
        shop_address:   form.role === 'shop' ? form.shop_address    : undefined,
        shop_phone:     form.role === 'shop' ? form.shop_phone      : undefined,
        district:       form.role === 'shop' ? form.district        : undefined,
        // Authority fields
        department:     form.role === 'authority' ? form.department     : undefined,
        designation:    form.role === 'authority' ? form.designation    : undefined,
        authority_code: form.role === 'authority' ? form.authority_code : undefined,
      };

      // Remove undefined keys before sending
      Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);

      console.log('[Register] Submitting payload:', { ...payload, password: '[REDACTED]' });

      const data = await registerUser(payload);
      console.log('[Register] Success:', data);
      const routes = { authority: '/authority', shop: '/shop', buyer: '/buyer' };
      navigate(routes[data.role || form.role] || '/');
    } catch (err) {
      console.error('[Register] Error:', err);
      // Extract meaningful message from API error response
      const apiError = err.response?.data?.error
        || err.response?.data?.fields?.[0]?.message
        || err.message
        || 'Registration failed. Please try again.';
      setError(apiError);
    } finally {
      setLoading(false);
    }
  };

  const strength = calcStrength(form.password);

  /* ─── Render ─────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-dark-950 bg-cyber-grid bg-grid-size flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-accent-purple/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent-cyan/5 rounded-full blur-[120px]" />

      <div className="w-full max-w-lg relative z-10 animate-in">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-purple to-accent-blue mb-3 shadow-glow-cyan">
            <Zap className="w-7 h-7 text-dark-900" />
          </div>
          <h1 className="text-xl font-bold text-dark-100">Create Account</h1>
          <p className="text-xs text-dark-400 mt-1">SLMRS — Smart Liquor Management System</p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                step > s ? 'bg-accent-green text-dark-900'
                : step === s ? 'bg-accent-cyan text-dark-900'
                : 'bg-dark-700 text-dark-500'
              }`}>
                {step > s ? <Check className="w-3 h-3" /> : s}
              </div>
              {s < 4 && <div className={`w-8 h-0.5 rounded transition-all duration-300 ${step > s ? 'bg-accent-green' : 'bg-dark-700'}`} />}
            </div>
          ))}
        </div>

        <div className="glass-card p-6">
          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 mb-4 bg-accent-red/10 border border-accent-red/20 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-accent-red flex-shrink-0" />
              <p className="text-xs text-accent-red">{error}</p>
            </div>
          )}

          {/* ── STEP 1: Role Selection ──────────────────────── */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-dark-100">Choose your role</h2>
              <p className="text-xs text-dark-400">Select the role that matches your position in the system.</p>
              <div className="space-y-3 mt-4">
                {ROLES.map(({ key, label, icon: Icon, color, border, desc }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setRole(key)}
                    className={`w-full glass-card p-4 flex items-center gap-4 transition-all duration-200 border-2 ${
                      form.role === key
                        ? `${border} bg-dark-700/40`
                        : 'border-transparent hover:border-dark-600/60'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center flex-shrink-0`}>
                      <Icon className="w-5 h-5 text-dark-900" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-semibold text-dark-100">{label}</p>
                      <p className="text-xs text-dark-400 mt-0.5">{desc}</p>
                    </div>
                    {form.role === key && <Check className="w-5 h-5 text-accent-green flex-shrink-0" />}
                  </button>
                ))}
              </div>
              {fieldErrors.role && <p className="text-xs text-accent-red">{fieldErrors.role}</p>}
            </div>
          )}

          {/* ── STEP 2: Common Fields ───────────────────────── */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-dark-100">Personal Details</h2>

              <div>
                <label className="block text-xs text-dark-300 mb-1.5">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => set('name', e.target.value)}
                    placeholder="As per official ID"
                    className="input-field pl-11"
                  />
                </div>
                {fieldErrors.name && <p className="text-xs text-accent-red mt-1">{fieldErrors.name}</p>}
              </div>

              <div>
                <label className="block text-xs text-dark-300 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => set('email', e.target.value)}
                    placeholder="official@email.com"
                    className="input-field pl-11"
                    autoComplete="email"
                  />
                </div>
                {fieldErrors.email && <p className="text-xs text-accent-red mt-1">{fieldErrors.email}</p>}
              </div>

              <div>
                <label className="block text-xs text-dark-300 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => set('password', e.target.value)}
                    placeholder="Min 8 characters"
                    className="input-field pl-11 pr-11"
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-200 transition-colors" tabIndex={-1}>
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {/* Strength bar */}
                {form.password && (
                  <div className="mt-2">
                    <div className="flex gap-1 mb-1">
                      {[1,2,3,4,5].map((i) => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= strength ? strengthColor(strength) : 'bg-dark-700'}`} />
                      ))}
                    </div>
                    <p className="text-[10px] text-dark-400">{strengthLabel(strength)}</p>
                  </div>
                )}
                {fieldErrors.password && <p className="text-xs text-accent-red mt-1">{fieldErrors.password}</p>}
              </div>

              <div>
                <label className="block text-xs text-dark-300 mb-1.5">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={form.confirmPassword}
                    onChange={(e) => set('confirmPassword', e.target.value)}
                    placeholder="Re-enter password"
                    className="input-field pl-11 pr-11"
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-200" tabIndex={-1}>
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {fieldErrors.confirmPassword && <p className="text-xs text-accent-red mt-1">{fieldErrors.confirmPassword}</p>}
              </div>
            </div>
          )}

          {/* ── STEP 3: Role-Specific Fields ────────────────── */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-dark-100">
                {form.role === 'buyer' ? 'Buyer Details' : form.role === 'shop' ? 'Shop Details' : 'Authority Details'}
              </h2>

              {/* BUYER fields */}
              {form.role === 'buyer' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-dark-300 mb-1.5">Age *</label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
                        <input type="number" min={21} max={100} value={form.age} onChange={(e) => set('age', e.target.value)} placeholder="21+" className="input-field pl-9" />
                      </div>
                      {fieldErrors.age && <p className="text-xs text-accent-red mt-1">{fieldErrors.age}</p>}
                    </div>
                    <div>
                      <label className="block text-xs text-dark-300 mb-1.5">Phone</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
                        <input type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+91 XXXXX XXXXX" className="input-field pl-9" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-dark-300 mb-1.5">Address (optional)</label>
                    <textarea value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Residential address" className="input-field min-h-[80px] resize-none" />
                  </div>
                  <div>
                    <label className="block text-xs text-dark-300 mb-1.5">Aadhaar / Voter ID (simulation)</label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
                      <input type="text" value={form.govt_id_sim} onChange={(e) => set('govt_id_sim', e.target.value)} placeholder="XXXX XXXX XXXX" className="input-field pl-9" />
                    </div>
                  </div>
                </>
              )}

              {/* SHOP fields */}
              {form.role === 'shop' && (
                <>
                  <div>
                    <label className="block text-xs text-dark-300 mb-1.5">Shop Name *</label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
                      <input type="text" value={form.shop_name} onChange={(e) => set('shop_name', e.target.value)} placeholder="Official shop name" className="input-field pl-9" />
                    </div>
                    {fieldErrors.shop_name && <p className="text-xs text-accent-red mt-1">{fieldErrors.shop_name}</p>}
                  </div>
                  <div>
                    <label className="block text-xs text-dark-300 mb-1.5">Excise License Number *</label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
                      <input type="text" value={form.license_number} onChange={(e) => set('license_number', e.target.value)} placeholder="MH-EXC-XXXXXXXX" className="input-field pl-9" />
                    </div>
                    {fieldErrors.license_number && <p className="text-xs text-accent-red mt-1">{fieldErrors.license_number}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-dark-300 mb-1.5">District *</label>
                      <select value={form.district} onChange={(e) => set('district', e.target.value)} className="select-field">
                        <option value="">Select district</option>
                        {DISTRICTS.map((d) => <option key={d}>{d}</option>)}
                      </select>
                      {fieldErrors.district && <p className="text-xs text-accent-red mt-1">{fieldErrors.district}</p>}
                    </div>
                    <div>
                      <label className="block text-xs text-dark-300 mb-1.5">Phone *</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
                        <input type="tel" value={form.shop_phone} onChange={(e) => set('shop_phone', e.target.value)} placeholder="+91 XXXXX XXXXX" className="input-field pl-9" />
                      </div>
                      {fieldErrors.shop_phone && <p className="text-xs text-accent-red mt-1">{fieldErrors.shop_phone}</p>}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-dark-300 mb-1.5">Shop Address *</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 w-4 h-4 text-dark-400" />
                      <textarea value={form.shop_address} onChange={(e) => set('shop_address', e.target.value)} placeholder="Full shop address" className="input-field pl-9 min-h-[70px] resize-none" />
                    </div>
                    {fieldErrors.shop_address && <p className="text-xs text-accent-red mt-1">{fieldErrors.shop_address}</p>}
                  </div>
                </>
              )}

              {/* AUTHORITY fields */}
              {form.role === 'authority' && (
                <>
                  <div>
                    <label className="block text-xs text-dark-300 mb-1.5">Department Name *</label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
                      <input type="text" value={form.department} onChange={(e) => set('department', e.target.value)} placeholder="e.g. Maharashtra State Excise" className="input-field pl-9" />
                    </div>
                    {fieldErrors.department && <p className="text-xs text-accent-red mt-1">{fieldErrors.department}</p>}
                  </div>
                  <div>
                    <label className="block text-xs text-dark-300 mb-1.5">Designation</label>
                    <input type="text" value={form.designation} onChange={(e) => set('designation', e.target.value)} placeholder="e.g. Senior Inspector" className="input-field" />
                  </div>
                  <div>
                    <label className="block text-xs text-dark-300 mb-1.5">Authority ID Code *</label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
                      <input type="text" value={form.authority_code} onChange={(e) => set('authority_code', e.target.value)} placeholder="Official authority code" className="input-field pl-9" />
                    </div>
                    {fieldErrors.authority_code && <p className="text-xs text-accent-red mt-1">{fieldErrors.authority_code}</p>}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── STEP 4: Review + Submit ──────────────────────── */}
          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-dark-100">Review &amp; Confirm</h2>
              <div className="space-y-2">
                {[
                  { label: 'Role',  value: ROLES.find((r) => r.key === form.role)?.label },
                  { label: 'Name',  value: form.name },
                  { label: 'Email', value: form.email },
                  form.role === 'buyer'     && { label: 'Age',    value: form.age },
                  form.role === 'buyer'     && { label: 'Govt ID', value: form.govt_id_sim || '—' },
                  form.role === 'shop'      && { label: 'Shop',   value: form.shop_name },
                  form.role === 'shop'      && { label: 'License', value: form.license_number },
                  form.role === 'shop'      && { label: 'District', value: form.district },
                  form.role === 'authority' && { label: 'Department', value: form.department },
                  form.role === 'authority' && { label: 'Auth Code', value: form.authority_code },
                ].filter(Boolean).map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between py-2 border-b border-dark-700/40">
                    <span className="text-xs text-dark-400">{label}</span>
                    <span className="text-xs font-medium text-dark-100 text-right max-w-[60%] truncate">{value}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-dark-500 mt-2">
                By creating an account you agree to comply with all applicable excise laws and regulations.
              </p>
            </div>
          )}

          {/* ── Navigation buttons ───────────────────────────── */}
          <div className="flex gap-3 mt-6">
            {step > 1 && (
              <button type="button" onClick={back} className="btn-secondary flex items-center gap-2 text-sm">
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            )}
            {step < 4 ? (
              <button type="button" onClick={next} className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm">
                Continue
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm disabled:opacity-60"
              >
                {loading ? (
                  <><div className="spinner w-4 h-4 border-2 border-dark-900/30 border-t-dark-900" /><span>Creating account…</span></>
                ) : (
                  <><Check className="w-4 h-4" /><span>Create Account</span></>
                )}
              </button>
            )}
          </div>

          {/* Sign in link */}
          <div className="mt-4 text-center">
            <p className="text-xs text-dark-400">
              Already have an account?{' '}
              <Link to="/login" className="text-accent-cyan hover:text-accent-blue font-medium transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
