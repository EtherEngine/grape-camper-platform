import { Routes, Route } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import Loader from '../components/common/Loader';
import PageLayout from '../components/layout/PageLayout';
import ProtectedRoute from '../features/auth/ProtectedRoute';

// ── Pages ──────────────────────────────────────────────────
import HomePage from '../pages/HomePage';
import VehiclesPage from '../pages/VehiclesPage';
import VehicleDetailPage from '../pages/VehicleDetailPage';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import DashboardPage from '../pages/DashboardPage';
import MyBookingsPage from '../pages/MyBookingsPage';
import NotFoundPage from '../pages/NotFoundPage';

// ── Bookings ───────────────────────────────────────────────
import BookingWizard from '../features/bookings/BookingWizard';
import BookingDetailPage from '../pages/BookingDetailPage';
import BookingPrintView from '../features/bookings/BookingPrintView';
import ContractPage from '../features/contracts/ContractPage';

// ── Owner ──────────────────────────────────────────────────
import OwnerVehiclesPage from '../features/owner/OwnerVehiclesPage';
import OwnerBookingsPage from '../features/owner/OwnerBookingsPage';
import OwnerSwapReviewPage from '../features/owner/OwnerSwapReviewPage';
import OwnerRevenuePage from '../features/owner/OwnerRevenuePage';
import VehicleForm from '../features/owner/VehicleForm';
import OwnerAvailabilityCalendar from '../features/owner/OwnerAvailabilityCalendar';

// ── Admin ──────────────────────────────────────────────────
import AdminDashboard from '../features/admin/AdminDashboard';
import AdminUsersPage from '../features/admin/AdminUsersPage';
import AdminBookingsPage from '../features/admin/AdminBookingsPage';
import AdminReportsPage from '../features/admin/AdminReportsPage';
import AdminSwapUnlockPage from '../features/admin/AdminSwapUnlockPage';

export default function AppRouter() {
  const { initializing } = useAuth();

  if (initializing) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20vh' }}>
        <Loader size="lg" text="Wird geladen..." />
      </div>
    );
  }

  return (
    <Routes>
      <Route element={<PageLayout />}>
        {/* Public */}
        <Route path="/" element={<HomePage />} />
        <Route path="/vehicles" element={<VehiclesPage />} />
        <Route path="/vehicles/:id" element={<VehicleDetailPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Authenticated (any role) */}
        <Route path="/dashboard" element={
          <ProtectedRoute><DashboardPage /></ProtectedRoute>
        } />
        <Route path="/my-bookings" element={
          <ProtectedRoute><MyBookingsPage /></ProtectedRoute>
        } />
        <Route path="/vehicles/:id/book" element={
          <ProtectedRoute><BookingWizard /></ProtectedRoute>
        } />
        <Route path="/bookings/:id" element={
          <ProtectedRoute><BookingDetailPage /></ProtectedRoute>
        } />
        <Route path="/bookings/:id/print" element={
          <ProtectedRoute><BookingPrintView /></ProtectedRoute>
        } />
        <Route path="/bookings/:id/contract" element={
          <ProtectedRoute><ContractPage /></ProtectedRoute>
        } />

        {/* Owner */}
        <Route path="/owner/vehicles" element={
          <ProtectedRoute roles={['owner']}><OwnerVehiclesPage /></ProtectedRoute>
        } />
        <Route path="/owner/vehicles/new" element={
          <ProtectedRoute roles={['owner']}><VehicleForm /></ProtectedRoute>
        } />
        <Route path="/owner/vehicles/:id/edit" element={
          <ProtectedRoute roles={['owner']}><VehicleForm /></ProtectedRoute>
        } />
        <Route path="/owner/vehicles/:id/availability" element={
          <ProtectedRoute roles={['owner']}><OwnerAvailabilityCalendar /></ProtectedRoute>
        } />
        <Route path="/owner/bookings" element={
          <ProtectedRoute roles={['owner']}><OwnerBookingsPage /></ProtectedRoute>
        } />
        <Route path="/owner/revenue" element={
          <ProtectedRoute roles={['owner']}><OwnerRevenuePage /></ProtectedRoute>
        } />
        <Route path="/owner/swaps" element={
          <ProtectedRoute roles={['owner']}><OwnerSwapReviewPage /></ProtectedRoute>
        } />

        {/* Admin */}
        <Route path="/admin" element={
          <ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>
        } />
        <Route path="/admin/users" element={
          <ProtectedRoute roles={['admin']}><AdminUsersPage /></ProtectedRoute>
        } />
        <Route path="/admin/bookings" element={
          <ProtectedRoute roles={['admin']}><AdminBookingsPage /></ProtectedRoute>
        } />
        <Route path="/admin/reports" element={
          <ProtectedRoute roles={['admin']}><AdminReportsPage /></ProtectedRoute>
        } />
        <Route path="/admin/swap-unlock" element={
          <ProtectedRoute roles={['admin']}><AdminSwapUnlockPage /></ProtectedRoute>
        } />

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}