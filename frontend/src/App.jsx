import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { NotificationProvider } from './contexts/NotificationContext';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './components/DashboardLayout';

// Eagerly loaded
import LoginPage from './pages/LoginPage';

// Lazy-loaded pages for code splitting
const AuthorityDashboard  = lazy(() => import('./pages/authority/AuthorityDashboard'));
const AuthorityTransactions = lazy(() => import('./pages/authority/AuthorityTransactions'));
const AuthorityBuyers     = lazy(() => import('./pages/authority/AuthorityBuyers'));
const AuthorityPolicies   = lazy(() => import('./pages/authority/AuthorityPolicies'));
const AuthorityAnalytics  = lazy(() => import('./pages/authority/AuthorityAnalytics'));
const AuditLogs           = lazy(() => import('./pages/authority/AuditLogs'));
const ConsumptionHeatmap  = lazy(() => import('./pages/authority/ConsumptionHeatmap'));
const AuthorityInventory  = lazy(() => import('./pages/authority/AuthorityInventory'));

const ShopDashboard       = lazy(() => import('./components/ShopDashboard'));
const QRScanner           = lazy(() => import('./pages/shop/QRScanner'));
const ShopInventory       = lazy(() => import('./pages/shop/Inventory'));

const BuyerDashboard      = lazy(() => import('./components/BuyerDashboard'));
const DigitalIDCard       = lazy(() => import('./pages/buyer/DigitalIDCard'));
const NotificationCenter  = lazy(() => import('./pages/buyer/NotificationCenter'));

// Loading spinner for Suspense fallback
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
                className: 'toast-custom',
                duration: 4000,
              }}
            />
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/" element={<Navigate to="/login" replace />} />

                {/* Authority routes */}
                <Route
                  path="/authority"
                  element={
                    <ProtectedRoute allowedRoles={['authority']}>
                      <DashboardLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<AuthorityDashboard />} />
                  <Route path="transactions" element={<AuthorityTransactions />} />
                  <Route path="buyers" element={<AuthorityBuyers />} />
                  <Route path="policies" element={<AuthorityPolicies />} />
                  <Route path="analytics" element={<AuthorityAnalytics />} />
                  <Route path="heatmap" element={<ConsumptionHeatmap />} />
                  <Route path="inventory" element={<AuthorityInventory />} />
                  <Route path="audit-logs" element={<AuditLogs />} />
                </Route>

                {/* Shop routes */}
                <Route
                  path="/shop"
                  element={
                    <ProtectedRoute allowedRoles={['shop']}>
                      <DashboardLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<ShopDashboard />} />
                  <Route path="new-sale" element={<ShopDashboard />} />
                  <Route path="scanner" element={<QRScanner />} />
                  <Route path="inventory" element={<ShopInventory />} />
                  <Route path="history" element={<ShopDashboard />} />
                </Route>

                {/* Buyer routes */}
                <Route
                  path="/buyer"
                  element={
                    <ProtectedRoute allowedRoles={['buyer']}>
                      <DashboardLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<BuyerDashboard />} />
                  <Route path="history" element={<BuyerDashboard />} />
                  <Route path="id-card" element={<DigitalIDCard />} />
                  <Route path="notifications" element={<NotificationCenter />} />
                </Route>

                {/* Legacy dashboard route — redirect to role-specific */}
                <Route path="/dashboard/*" element={<Navigate to="/login" replace />} />

                {/* 404 */}
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
