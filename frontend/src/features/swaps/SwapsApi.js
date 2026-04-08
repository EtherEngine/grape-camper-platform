import api from '../../services/apiClient';

const SwapsApi = {
  // ── User (own offers) ────────────────────────────────────
  list(params = {}) {
    return api.get('/api/swaps', { params });
  },

  get(id) {
    return api.get(`/api/swaps/${id}`);
  },

  create(data) {
    return api.post('/api/swaps', data);
  },

  update(id, data) {
    return api.put(`/api/swaps/${id}`, data);
  },

  cancel(id) {
    return api.patch(`/api/swaps/${id}/cancel`);
  },

  // ── Images ───────────────────────────────────────────────
  addImage(id, formData) {
    return api.post(`/api/swaps/${id}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  deleteImage(id, imageId) {
    return api.delete(`/api/swaps/${id}/images/${imageId}`);
  },

  // ── Owner ────────────────────────────────────────────────
  ownerList(params = {}) {
    return api.get('/api/owner/swaps', { params });
  },

  review(id) {
    return api.patch(`/api/owner/swaps/${id}/review`);
  },

  accept(id, comment = null) {
    return api.patch(`/api/owner/swaps/${id}/accept`, { comment });
  },

  reject(id, comment = null) {
    return api.patch(`/api/owner/swaps/${id}/reject`, { comment });
  },

  // ── Swap Unlock ───────────────────────────────────────────
  getUnlockProgress() {
    return api.get('/api/swap-unlock/progress');
  },

  redeemCode(code) {
    return api.post('/api/swap-unlock/redeem', { code });
  },
};

export default SwapsApi;