import useAuthStore from '../features/auth/AuthStore';

export default function useAuth() {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const error = useAuthStore((s) => s.error);
  const initializing = useAuthStore((s) => s.initializing);

  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);
  const logout = useAuthStore((s) => s.logout);
  const clearError = useAuthStore((s) => s.clearError);

  const isAuthenticated = !!user;
  const role = user?.role_name || null;

  const hasRole = (r) => role === r;
  const hasAnyRole = (...roles) => roles.includes(role);

  return {
    user,
    loading,
    error,
    initializing,
    isAuthenticated,
    role,
    hasRole,
    hasAnyRole,
    login,
    register,
    logout,
    clearError,
  };
}