import api from '../../services/apiClient';

const AuthApi = {
  login(email, password) {
    return api.post('/api/auth/login', { email, password });
  },

  register(data) {
    return api.post('/api/auth/register', data);
  },

  logout() {
    return api.post('/api/auth/logout');
  },

  me() {
    return api.get('/api/auth/me');
  },
};

export default AuthApi;