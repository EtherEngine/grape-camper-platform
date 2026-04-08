import api from '../../services/apiClient';

const ContractApi = {
  /** GET /api/bookings/:id/contract */
  get(bookingId) {
    return api.get(`/api/bookings/${bookingId}/contract`);
  },

  /** PUT /api/bookings/:id/contract — Owner updates contract */
  update(bookingId, data) {
    return api.put(`/api/bookings/${bookingId}/contract`, data);
  },

  /** PATCH /api/bookings/:id/contract/send — Owner sends to renter */
  send(bookingId) {
    return api.patch(`/api/bookings/${bookingId}/contract/send`);
  },

  /** PUT /api/bookings/:id/contract/fill — Renter fills personal data */
  fill(bookingId, data) {
    return api.put(`/api/bookings/${bookingId}/contract/fill`, data);
  },

  /** PATCH /api/bookings/:id/contract/sign — Sign (both parties) */
  sign(bookingId) {
    return api.patch(`/api/bookings/${bookingId}/contract/sign`);
  },
};

export default ContractApi;
