import api from '../../services/apiClient';

const AdminApi = {
  /* ── Dashboard ────────────────────────────────────────── */
  getDashboard() {
    return api.get('/api/admin/dashboard');
  },

  /* ── Users ────────────────────────────────────────────── */
  listUsers(params = {}) {
    return api.get('/api/admin/users', { params });
  },
  getUser(id) {
    return api.get(`/api/admin/users/${id}`);
  },
  activateUser(id) {
    return api.patch(`/api/admin/users/${id}/activate`);
  },
  deactivateUser(id) {
    return api.patch(`/api/admin/users/${id}/deactivate`);
  },
  verifyOwner(id) {
    return api.patch(`/api/admin/users/${id}/verify-owner`);
  },
  unverifyOwner(id) {
    return api.patch(`/api/admin/users/${id}/unverify-owner`);
  },

  /* ── Bookings ─────────────────────────────────────────── */
  listBookings(params = {}) {
    return api.get('/api/admin/bookings', { params });
  },
  getBooking(id) {
    return api.get(`/api/admin/bookings/${id}`);
  },
  cancelBooking(id) {
    return api.patch(`/api/admin/bookings/${id}/cancel`);
  },

  /* ── Vehicles / Moderation ────────────────────────────── */
  moderateVehicle(id, data) {
    return api.patch(`/api/admin/vehicles/${id}/moderate`, data);
  },

  /* ── Reports ──────────────────────────────────────────── */
  listReports(params = {}) {
    return api.get('/api/admin/reports', { params });
  },
  getReportStats() {
    return api.get('/api/admin/reports/stats');
  },
  getReport(id) {
    return api.get(`/api/admin/reports/${id}`);
  },
  createReport(data) {
    return api.post('/api/admin/reports', data);
  },
  updateReport(id, data) {
    return api.patch(`/api/admin/reports/${id}`, data);
  },

  /* ── Swap Unlock Management ──────────────────────────── */
  listSwapUnlockOwners(params = {}) {
    return api.get('/api/admin/swap-unlock/owners', { params });
  },
  toggleSwapUnlock(userId, unlocked) {
    return api.patch(`/api/admin/swap-unlock/owners/${userId}/toggle`, { unlocked });
  },
  listSwapUnlockCodes(params = {}) {
    return api.get('/api/admin/swap-unlock/codes', { params });
  },
  createSwapUnlockCode(data) {
    return api.post('/api/admin/swap-unlock/codes', data);
  },
  deactivateSwapUnlockCode(id) {
    return api.patch(`/api/admin/swap-unlock/codes/${id}/deactivate`);
  },
};

export default AdminApi;
