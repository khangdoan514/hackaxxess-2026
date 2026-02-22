import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Require auth; optionally require role (doctor | patient).
 * Redirect to /login if not authenticated.
 */
export function ProtectedRoute({ children, role }) {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (role && user.role !== role) {
    return <Navigate to={user.role === 'doctor' ? '/record' : '/dashboard'} replace />;
  }
  
  return children;
}
