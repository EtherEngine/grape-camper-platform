import api from '../../services/apiClient';

const OwnerVehiclesApi = {
  list(params = {}) {
    return api.get('/api/owner/vehicles', { params });
  },

  create(data) {
    return api.post('/api/owner/vehicles', data);
  },

  update(id, data) {
    return api.put(`/api/owner/vehicles/${id}`, data);
  },

  activate(id) {
    return api.patch(`/api/owner/vehicles/${id}/activate`);
  },

  deactivate(id) {
    return api.patch(`/api/owner/vehicles/${id}/deactivate`);
  },

  archive(id) {
    return api.patch(`/api/owner/vehicles/${id}/archive`);
  },

  addImage(vehicleId, formData) {
    return api.post(`/api/owner/vehicles/${vehicleId}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  deleteImage(vehicleId, imageId) {
    return api.delete(`/api/owner/vehicles/${vehicleId}/images/${imageId}`);
  },

  // ── Availability rules ──────────────────────────────────

  getAvailabilityRules(vehicleId) {
    return api.get(`/api/owner/vehicles/${vehicleId}/availability-rules`);
  },

  createAvailabilityRule(vehicleId, rule) {
    return api.post(`/api/owner/vehicles/${vehicleId}/availability-rules`, rule);
  },

  updateAvailabilityRule(vehicleId, ruleId, rule) {
    return api.put(`/api/owner/vehicles/${vehicleId}/availability-rules/${ruleId}`, rule);
  },

  deleteAvailabilityRule(vehicleId, ruleId) {
    return api.delete(`/api/owner/vehicles/${vehicleId}/availability-rules/${ruleId}`);
  },

  bulkSaveAvailabilityRules(vehicleId, rules) {
    return api.put(`/api/owner/vehicles/${vehicleId}/availability-rules/bulk`, { rules });
  },
};

export default OwnerVehiclesApi;
