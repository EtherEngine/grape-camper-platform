import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import './AuthForms.css';

export default function RegisterForm() {
  const { register, loading, error, clearError } = useAuth();
  const navigate = useNavigate();

  const [ownerMode, setOwnerMode] = useState(false);
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    password_confirmation: '',
    phone: '',
    date_of_birth: '',
    street: '',
    house_number: '',
    postal_code: '',
    city: '',
    country: 'Deutschland',
  });
  const [fieldErrors, setFieldErrors] = useState({});

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (fieldErrors[e.target.name]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[e.target.name];
        return next;
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    setFieldErrors({});

    const payload = {
      first_name: form.first_name,
      last_name: form.last_name,
      email: form.email,
      password: form.password,
      password_confirmation: form.password_confirmation,
    };

    if (ownerMode) {
      payload.register_as = 'owner';
      payload.phone = form.phone;
      payload.date_of_birth = form.date_of_birth;
      payload.street = form.street;
      payload.house_number = form.house_number;
      payload.postal_code = form.postal_code;
      payload.city = form.city;
      payload.country = form.country;

      // Client-side validation for owner fields
      const errs = {};
      if (!/^\+?[\d\s\-/()]{6,}$/.test(form.phone)) {
        errs.phone = ['Bitte eine gültige Telefonnummer eingeben.'];
      }
      if (!form.date_of_birth) {
        errs.date_of_birth = ['Bitte Geburtsdatum angeben.'];
      }
      if (!/^\d{4,5}$/.test(form.postal_code)) {
        errs.postal_code = ['Bitte eine gültige PLZ eingeben (4–5 Ziffern).'];
      }
      if (Object.keys(errs).length) {
        setFieldErrors(errs);
        return;
      }
    }

    const result = await register(payload);
    if (result.success) {
      navigate('/login');
    } else if (result.details) {
      setFieldErrors(result.details);
    }
  };

  const renderFieldError = (field) => {
    const errors = fieldErrors[field];
    if (!errors?.length) return null;
    return <span className="auth-form__field-error">{errors[0]}</span>;
  };

  return (
    <div className="auth-page">
      <form className="auth-form" onSubmit={handleSubmit} style={ownerMode ? { maxWidth: 520 } : undefined}>
        <div className="auth-form__header">
          <h1 className="auth-form__title">Registrieren</h1>
          <p className="auth-form__subtitle">
            {ownerMode ? 'Erstelle dein Vermieter-Konto' : 'Erstelle dein GRAPE-Konto'}
          </p>
        </div>

        {error && (
          <div className="auth-form__error">
            {error}
          </div>
        )}

        <div className="auth-form__row">
          <div className="auth-form__field">
            <label htmlFor="first_name" className="auth-form__label">Vorname</label>
            <input
              id="first_name"
              name="first_name"
              type="text"
              className="auth-form__input"
              placeholder="Max"
              value={form.first_name}
              onChange={handleChange}
              required
              autoFocus
            />
            {renderFieldError('first_name')}
          </div>

          <div className="auth-form__field">
            <label htmlFor="last_name" className="auth-form__label">Nachname</label>
            <input
              id="last_name"
              name="last_name"
              type="text"
              className="auth-form__input"
              placeholder="Mustermann"
              value={form.last_name}
              onChange={handleChange}
              required
            />
            {renderFieldError('last_name')}
          </div>
        </div>

        <div className="auth-form__field">
          <label htmlFor="email" className="auth-form__label">E-Mail</label>
          <input
            id="email"
            name="email"
            type="email"
            className="auth-form__input"
            placeholder="name@beispiel.de"
            value={form.email}
            onChange={handleChange}
            required
            autoComplete="email"
          />
          {renderFieldError('email')}
        </div>

        <div className="auth-form__field">
          <label htmlFor="password" className="auth-form__label">Passwort</label>
          <input
            id="password"
            name="password"
            type="password"
            className="auth-form__input"
            placeholder="Mindestens 8 Zeichen"
            value={form.password}
            onChange={handleChange}
            required
            autoComplete="new-password"
          />
          {renderFieldError('password')}
        </div>

        <div className="auth-form__field">
          <label htmlFor="password_confirmation" className="auth-form__label">
            Passwort bestätigen
          </label>
          <input
            id="password_confirmation"
            name="password_confirmation"
            type="password"
            className="auth-form__input"
            placeholder="Passwort wiederholen"
            value={form.password_confirmation}
            onChange={handleChange}
            required
            autoComplete="new-password"
          />
          {renderFieldError('password_confirmation')}
        </div>

        {/* ── Owner section (expandable) ───────────────────── */}
        {ownerMode && (
          <div className="auth-form__owner-section">
            <div className="auth-form__section-divider">
              <span>Vermieter-Angaben</span>
            </div>

            <div className="auth-form__field">
              <label htmlFor="phone" className="auth-form__label">Telefonnummer</label>
              <input
                id="phone"
                name="phone"
                type="tel"
                className="auth-form__input"
                placeholder="+49 170 1234567"
                value={form.phone}
                onChange={handleChange}
                required
              />
              {renderFieldError('phone')}
            </div>

            <div className="auth-form__field">
              <label htmlFor="date_of_birth" className="auth-form__label">Geburtsdatum</label>
              <input
                id="date_of_birth"
                name="date_of_birth"
                type="date"
                className="auth-form__input"
                value={form.date_of_birth}
                onChange={handleChange}
                required
              />
              {renderFieldError('date_of_birth')}
            </div>

            <div className="auth-form__row">
              <div className="auth-form__field" style={{ flex: 3 }}>
                <label htmlFor="street" className="auth-form__label">Straße</label>
                <input
                  id="street"
                  name="street"
                  type="text"
                  className="auth-form__input"
                  placeholder="Musterstraße"
                  value={form.street}
                  onChange={handleChange}
                  required
                />
                {renderFieldError('street')}
              </div>
              <div className="auth-form__field" style={{ flex: 1 }}>
                <label htmlFor="house_number" className="auth-form__label">Nr.</label>
                <input
                  id="house_number"
                  name="house_number"
                  type="text"
                  className="auth-form__input"
                  placeholder="12a"
                  value={form.house_number}
                  onChange={handleChange}
                  required
                />
                {renderFieldError('house_number')}
              </div>
            </div>

            <div className="auth-form__row">
              <div className="auth-form__field">
                <label htmlFor="postal_code" className="auth-form__label">PLZ</label>
                <input
                  id="postal_code"
                  name="postal_code"
                  type="text"
                  className="auth-form__input"
                  placeholder="10115"
                  value={form.postal_code}
                  onChange={handleChange}
                  required
                />
                {renderFieldError('postal_code')}
              </div>
              <div className="auth-form__field">
                <label htmlFor="city" className="auth-form__label">Ort</label>
                <input
                  id="city"
                  name="city"
                  type="text"
                  className="auth-form__input"
                  placeholder="Berlin"
                  value={form.city}
                  onChange={handleChange}
                  required
                />
                {renderFieldError('city')}
              </div>
            </div>

            <div className="auth-form__field">
              <label htmlFor="country" className="auth-form__label">Land</label>
              <input
                id="country"
                name="country"
                type="text"
                className="auth-form__input"
                value={form.country}
                onChange={handleChange}
                required
              />
              {renderFieldError('country')}
            </div>

          </div>
        )}

        <button
          type="submit"
          className="auth-form__button"
          disabled={loading}
        >
          {loading
            ? 'Wird registriert...'
            : ownerMode
              ? 'Vermieter-Konto erstellen'
              : 'Konto erstellen'}
        </button>

        <p className="auth-form__footer">
          Bereits registriert?{' '}
          <Link to="/login" className="auth-form__link">
            Anmelden
          </Link>
        </p>

        {!ownerMode && (
          <p className="auth-form__owner-toggle">
            <button
              type="button"
              className="auth-form__owner-link"
              onClick={() => setOwnerMode(true)}
            >
              Als Vermieter registrieren
            </button>
          </p>
        )}
        {ownerMode && (
          <p className="auth-form__owner-toggle">
            <button
              type="button"
              className="auth-form__owner-link"
              onClick={() => setOwnerMode(false)}
            >
              ← Zurück zur normalen Registrierung
            </button>
          </p>
        )}
      </form>
    </div>
  );
}