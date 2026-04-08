import api from '../../services/apiClient';

const VehiclesApi = {
  /**
   * GET /api/vehicles — public listing with filters + pagination.
   * @param {Object} params  Query params (vehicle_type, location_city, min_price, …, page, per_page)
   */
  list(params = {}) {
    return api.get('/api/vehicles', { params });
  },

  /**
   * GET /api/vehicles/:id — single vehicle with images + features.
   */
  get(id) {
    return api.get(`/api/vehicles/${id}`);
  },
};

export default VehiclesApi;