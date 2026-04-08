import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import './AuthForms.css';

export default function LoginForm() {
  const { login, loading, error, clearError } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();

    const result = await login(email, password);
    if (result.success) {
      navigate('/dashboard');
    }
  };

  return (
    <div className="auth-page">
      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="auth-form__header">
          <h1 className="auth-form__title">Anmelden</h1>
          <p className="auth-form__subtitle">
            Willkommen zurück bei GRAPE
          </p>
        </div>

        {error && (
          <div className="auth-form__error">
            {error}
          </div>
        )}

        <div className="auth-form__field">
          <label htmlFor="email" className="auth-form__label">E-Mail</label>
          <input
            id="email"
            type="email"
            className="auth-form__input"
            placeholder="name@beispiel.de"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            autoFocus
          />
        </div>

        <div className="auth-form__field">
          <label htmlFor="password" className="auth-form__label">Passwort</label>
          <input
            id="password"
            type="password"
            className="auth-form__input"
            placeholder="Mindestens 8 Zeichen"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>

        <button
          type="submit"
          className="auth-form__button"
          disabled={loading}
        >
          {loading ? 'Wird angemeldet...' : 'Anmelden'}
        </button>

        <p className="auth-form__footer">
          Noch kein Konto?{' '}
          <Link to="/register" className="auth-form__link">
            Registrieren
          </Link>
        </p>
      </form>
    </div>
  );
}