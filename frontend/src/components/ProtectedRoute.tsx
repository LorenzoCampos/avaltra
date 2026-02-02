import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore, selectIsAuthenticated } from '@/stores/auth.store';

/**
 * ProtectedRoute component
 * Protects routes that require authentication
 * Redirects to login if user is not authenticated
 */
export const ProtectedRoute = () => {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);

  if (!isAuthenticated) {
    // Redirect to login if not authenticated
    return <Navigate to="/login" replace />;
  }

  // Render child routes if authenticated
  return <Outlet />;
};
