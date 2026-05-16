import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { NotificationProvider } from './contexts/NotificationContext';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './components/DashboardLayout';

/* ─── Auth pages — eagerly loaded (small, critical path) ── */
import LoginPage    from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

/* ─── Lazy-loaded pages for code splitting ──────────────── */
const AuthorityDashboard    = lazy(() => import('./pages/authority/AuthorityDashboard'));
const AuthorityTransactions = lazy(() => import('./pages/authority/AuthorityTransactions'));
const AuthorityBuyers       = lazy(() => import('./pages/authority/AuthorityBuyers'));
const AuthorityPolicies     = lazy(() => import('./pages/authority/AuthorityPolicies'));
const AuthorityAnalytics    = lazy(() => import('./pages/authority/AuthorityAnalytics'));
const AuditLogs             = lazy(() => import('./pages/authority/AuditLogs'));
const ConsumptionHeatmap    = lazy(() => import('./pages/authority/ConsumptionHeatmap'));
const AuthorityInventory    = lazy(() => import('./pages/authority/AuthorityInventory'));

const ShopDashboard  = lazy(() => import('./pages/shop/ShopDashboard'));
const QRScanner      = lazy(() => import('./pages/shop/QRScanner'));
const ShopInventory  = lazy(() => import('./pages/shop/Inventory'));

const BuyerDashboard      = lazy(() => import('./pages/buyer/BuyerDashboard'));
const PurchaseHistory     = lazy(() => import('./pages/buyer/PurchaseHistory'));
const DigitalIDCard       = lazy(() => import('./pages/buyer/DigitalIDCard'));
const NotificationCenter  = lazy(() => import('./pages/buyer/NotificationCenter'));

/* ─── Page loading fallback ─────────────────────────────── */
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-dark-950">
    <div className="spinner" />
  </div>
);

function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <NotificationProvider>
          <Router>
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: 'rgba(15,18,38,0.95)',
                  border: '1px solid rgba(45,53,85,0.6)',
                  color: '#d1d5e0',
                  backdropFilter: 'blur(20px)',
                  fontSize: '13px',
                },
              }}
            />

            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public routes */}
                <Route path="/login"    element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/"         element={<Navigate to="/login" replace />} />

                {/* ── Authority ─────────────────────────────── */}
                <Route
                  path="/authority"
                  element={
                    <ProtectedRoute allowedRoles={['authority']}>
                      <DashboardLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index                 element={<AuthorityDashboard />} />
                  <Route path="transactions"   element={<AuthorityTransactions />} />
                  <Route path="buyers"         element={<AuthorityBuyers />} />
                  <Route path="policies"       element={<AuthorityPolicies />} />
                  <Route path="analytics"      element={<AuthorityAnalytics />} />
                  <Route path="heatmap"        element={<ConsumptionHeatmap />} />
                  <Route path="inventory"      element={<AuthorityInventory />} />
                  <Route path="audit-logs"     element={<AuditLogs />} />
                </Route>

                {/* ── Shop ──────────────────────────────────── */}
                <Route
                  path="/shop"
                  element={
                    <ProtectedRoute allowedRoles={['shop']}>
                      <DashboardLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index            element={<ShopDashboard />} />
                  <Route path="new-sale"  element={<ShopDashboard />} />
                  <Route path="scanner"   element={<QRScanner />} />
                  <Route path="inventory" element={<ShopInventory />} />
                  <Route path="history"   element={<ShopDashboard />} />
                </Route>

                {/* ── Buyer ─────────────────────────────────── */}
                <Route
                  path="/buyer"
                  element={
                    <ProtectedRoute allowedRoles={['buyer']}>
                      <DashboardLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index               element={<BuyerDashboard />} />
                  <Route path="history"      element={<PurchaseHistory />} />
                  <Route path="id-card"      element={<DigitalIDCard />} />
                  <Route path="notifications" element={<NotificationCenter />} />
                </Route>

                {/* Catch-all */}
                <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
            </Suspense>
          </Router>
        </NotificationProvider>
      </DataProvider>
    </AuthProvider>
  );
}

export default App;
