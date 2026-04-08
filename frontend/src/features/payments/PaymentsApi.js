import api from '../../services/apiClient';

const PaymentsApi = {
  /** POST /api/payments/initiate */
  initiate(bookingId, method) {
    return api.post('/api/payments/initiate', { booking_id: bookingId, method });
  },

  /** PATCH /api/payments/:id/confirm */
  confirm(id) {
    return api.patch(`/api/payments/${id}/confirm`);
  },

  /** PATCH /api/payments/:id/sync */
  sync(id) {
    return api.patch(`/api/payments/${id}/sync`);
  },

  /** GET /api/payments/:id */
  get(id) {
    return api.get(`/api/payments/${id}`);
  },

  /** GET /api/bookings/:id/payments */
  bookingPayments(bookingId) {
    return api.get(`/api/bookings/${bookingId}/payments`);
  },

  /** GET /api/payments */
  list(params = {}) {
    return api.get('/api/payments', { params });
  },

  /** POST /api/payments/:id/refund */
  refund(id, amount = null) {
    return api.post(`/api/payments/${id}/refund`, amount !== null ? { amount } : {});
  },
};

export default PaymentsApi;