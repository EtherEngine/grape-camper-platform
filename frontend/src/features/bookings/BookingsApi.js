import api from '../../services/apiClient';

const BookingsApi = {
  /**
   * GET /api/vehicles/:id/availability — calendar data for a date range.
   */
  getAvailability(vehicleId, startDate, endDate) {
    return api.get(`/api/vehicles/${vehicleId}/availability`, {
      params: { start_date: startDate, end_date: endDate },
    });
  },

  /**
   * POST /api/vehicles/:id/check-availability — conflict check for a specific range.
   */
  checkAvailability(vehicleId, startDate, endDate, excludeBookingId = null) {
    return api.post(`/api/vehicles/${vehicleId}/check-availability`, {
      start_date: startDate,
      end_date: endDate,
      ...(excludeBookingId ? { exclude_booking_id: excludeBookingId } : {}),
    });
  },

  /**
   * POST /api/vehicles/:id/price-preview — price breakdown for a date range.
   */
  pricePreview(vehicleId, startDate, endDate) {
    return api.post(`/api/vehicles/${vehicleId}/price-preview`, {
      start_date: startDate,
      end_date: endDate,
    });
  },

  /**
   * POST /api/bookings — create a booking.
   */
  create(data) {
    return api.post('/api/bookings', data);
  },

  /**
   * GET /api/bookings — list my bookings.
   */
  list(params = {}) {
    return api.get('/api/bookings', { params });
  },

  /**
   * GET /api/bookings/:id — booking detail.
   */
  get(id) {
    return api.get(`/api/bookings/${id}`);
  },

  /**
   * PATCH /api/bookings/:id/cancel — cancel booking.
   */
  cancel(id, comment = null) {
    return api.patch(`/api/bookings/${id}/cancel`, { comment });
  },

  /**
   * PATCH /api/bookings/:id/confirm — confirm booking (payment received).
   */
  confirm(id) {
    return api.patch(`/api/bookings/${id}/confirm`);
  },

  // ── Owner endpoints ──────────────────────────────────────

  /**
   * GET /api/owner/bookings — list bookings on owner's vehicles.
   */
  ownerList(params = {}) {
    return api.get('/api/owner/bookings', { params });
  },

  /**
   * PATCH /api/owner/bookings/:id/approve — owner approves.
   */
  approve(id) {
    return api.patch(`/api/owner/bookings/${id}/approve`);
  },

  /**
   * PATCH /api/owner/bookings/:id/reject — owner rejects.
   */
  reject(id, reason = null) {
    return api.patch(`/api/owner/bookings/${id}/reject`, { reason });
  },

  /**
   * PATCH /api/owner/bookings/:id/complete — owner marks completed.
   */
  complete(id) {
    return api.patch(`/api/owner/bookings/${id}/complete`);
  },
};

export default BookingsApi;