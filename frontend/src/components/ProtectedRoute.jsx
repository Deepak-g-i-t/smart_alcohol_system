// Protected Route component with role-based access control
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, userProfile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-dark-400 animate-pulse">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && userProfile && !allowedRoles.includes(userProfile.role)) {
    // Redirect to appropriate dashboard based on role
    const dashboardRoutes = {
      authority: '/authority',
      shop: '/shop',
      buyer: '/buyer',
    };
    return <Navigate to={dashboardRoutes[userProfile.role] || '/login'} replace />;
  }

  return children;
}
