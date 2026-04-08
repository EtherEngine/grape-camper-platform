import { Navigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import RenterDashboard from '../features/dashboard/RenterDashboard';
import OwnerDashboard from '../features/owner/OwnerDashboard';
import '../pages/Dashboard.css';

export default function DashboardPage() {
  const { user, hasRole } = useAuth();

  if (hasRole('admin')) return <Navigate to="/admin" replace />;

  return (
    <div className="dash container">
      {hasRole('owner') ? <OwnerDashboard /> : <RenterDashboard />}
    </div>
  );
}