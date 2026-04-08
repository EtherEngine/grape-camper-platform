import { Navigate, useLocation } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';

/**
 * Route guard component.
 *
 * Usage:
 *   <Route element={<ProtectedRoute />} />                    — any authenticated user
 *   <Route element={<ProtectedRoute roles={['admin']} />} />  — admin only
 *   <Route element={<ProtectedRoute roles={['owner','admin']} />} /> — owner or admin
 */
export default function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, role, initializing } = useAuth();
  const location = useLocation();

  if (initializing) {
    return null; // or a loading spinner — handled by AppRouter wrapper
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && roles.length > 0 && !roles.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children ?? null;
}