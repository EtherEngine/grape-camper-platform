import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost/grape/backend/public';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',   // CSRF protection
  },
});

// ── Response Interceptor ───────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    // Normalize error message from backend format
    const message =
      error.response?.data?.error?.message ||
      error.response?.data?.message ||
      error.message ||
      'Ein Fehler ist aufgetreten.';

    return Promise.reject({
      status,
      message,
      details: error.response?.data?.error?.details || null,
      raw: error,
    });
  }
);

export default api;