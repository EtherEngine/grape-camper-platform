import { create } from 'zustand';
import AuthApi from './AuthApi';

const useAuthStore = create((set, get) => ({
  user: null,
  loading: false,
  initializing: true,
  error: null,

  // ── Init: restore session on app start ───────────────────
  init: async () => {
    try {
      const res = await AuthApi.me();
      set({ user: res.data.data, initializing: false });
    } catch {
      set({ user: null, initializing: false });
    }
  },

  // ── Login ────────────────────────────────────────────────
  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const res = await AuthApi.login(email, password);
      const user = res.data.data;

      set({ user, loading: false });

      return { success: true };
    } catch (err) {
      const message = err.message || 'Login fehlgeschlagen.';
      set({ loading: false, error: message });
      return { success: false, message };
    }
  },

  // ── Register ─────────────────────────────────────────────
  register: async (data) => {
    set({ loading: true, error: null });
    try {
      await AuthApi.register(data);
      set({ loading: false });
      return { success: true };
    } catch (err) {
      const message = err.message || 'Registrierung fehlgeschlagen.';
      const details = err.details || null;
      set({ loading: false, error: message });
      return { success: false, message, details };
    }
  },

  // ── Logout ───────────────────────────────────────────────
  logout: async () => {
    try {
      await AuthApi.logout();
    } catch {
      // ignore — session may already be invalid
    }

    set({ user: null, error: null });
  },

  // ── Helpers ──────────────────────────────────────────────
  clearError: () => set({ error: null }),

  isAuthenticated: () => get().user !== null,

  hasRole: (role) => get().user?.role_name === role,

  hasAnyRole: (...roles) => roles.includes(get().user?.role_name),
}));

export default useAuthStore;