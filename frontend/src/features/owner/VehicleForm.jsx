import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import OwnerVehiclesApi from './OwnerVehiclesApi';
import VehiclesApi from '../vehicles/VehiclesApi';
import VehicleImagesForm from './VehicleImagesForm';
import VehicleFeaturesForm from './VehicleFeaturesForm';
import Loader from '../../components/common/Loader';
import './OwnerVehicles.css';

const VEHICLE_TYPES = [
  { value: 'campervan', label: 'Campervan' },
  { value: 'motorhome', label: 'Wohnmobil' },
  { value: 'caravan', label: 'Wohnwagen' },
  { value: 'offroad', label: 'Offroad' },
  { value: 'other', label: 'Sonstiges' },
];

const TRANSMISSIONS = [
  { value: 'manual', label: 'Schaltung' },
  { value: 'automatic', label: 'Automatik' },
  { value: 'other', label: 'Sonstiges' },
];

const FUEL_TYPES = [
  { value: 'diesel', label: 'Diesel' },
  { value: 'petrol', label: 'Benzin' },
  { value: 'electric', label: 'Elektro' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'gas', label: 'Gas' },
  { value: 'other', label: 'Sonstiges' },
];

const EMPTY_FORM = {
  title: '',
  description: '',
  vehicle_type: 'campervan',
  brand: '',
  model: '',
  year_of_manufacture: '',
  license_plate: '',
  location_city: '',
  location_country: 'Deutschland',
  seats: '2',
  sleeping_places: '2',
  transmission: 'manual',
  fuel_type: 'diesel',
  pets_allowed: false,
  smoking_allowed: false,
  minimum_rental_days: '1',
  maximum_rental_days: '',
  daily_price: '',
  weekly_price: '',
  monthly_price: '',
  deposit_amount: '',
  cleaning_fee: '',
  service_fee: '',
  instant_booking_enabled: false,
};

const SECTIONS = [
  { id: 'basic', icon: '🚐', label: 'Grunddaten' },
  { id: 'location', icon: '📍', label: 'Standort' },
  { id: 'equipment', icon: '⚙️', label: 'Ausstattung' },
  { id: 'pricing', icon: '💶', label: 'Preise' },
  { id: 'features', icon: '✨', label: 'Merkmale' },
  { id: 'images', icon: '📸', label: 'Bilder' },
];

export default function VehicleForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState(EMPTY_FORM);
  const [features, setFeatures] = useState([]);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [success, setSuccess] = useState(null);
  const [activeSection, setActiveSection] = useState('basic');
  const sectionRefs = useRef({});

  // Load existing vehicle for edit
  useEffect(() => {
    if (!isEdit) return;

    const load = async () => {
      try {
        const res = await VehiclesApi.get(id);
        const v = res.data.data;

        setForm({
          title: v.title || '',
          description: v.description || '',
          vehicle_type: v.vehicle_type || 'campervan',
          brand: v.brand || '',
          model: v.model || '',
          year_of_manufacture: v.year_of_manufacture || '',
          license_plate: v.license_plate || '',
          location_city: v.location_city || '',
          location_country: v.location_country || 'Deutschland',
          seats: String(v.seats || 2),
          sleeping_places: String(v.sleeping_places || 2),
          transmission: v.transmission || 'manual',
          fuel_type: v.fuel_type || 'diesel',
          pets_allowed: v.pets_allowed === '1' || v.pets_allowed === 1,
          smoking_allowed: v.smoking_allowed === '1' || v.smoking_allowed === 1,
          minimum_rental_days: String(v.minimum_rental_days || 1),
          maximum_rental_days: v.maximum_rental_days ? String(v.maximum_rental_days) : '',
          daily_price: v.daily_price || '',
          weekly_price: v.weekly_price || '',
          monthly_price: v.monthly_price || '',
          deposit_amount: v.deposit_amount || '',
          cleaning_fee: v.cleaning_fee || '',
          service_fee: v.service_fee || '',
          instant_booking_enabled: v.instant_booking_enabled === '1' || v.instant_booking_enabled === 1,
        });

        setFeatures((v.features || []).map((f) => ({ key: f.feature_key, value: f.feature_value })));
        setImages(v.images || []);
      } catch (err) {
        setError(err.message || 'Fahrzeug konnte nicht geladen werden.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id, isEdit]);

  // Intersection observer for section nav highlighting
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.dataset.section);
          }
        }
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: 0 }
    );

    Object.values(sectionRefs.current).forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [loading]);

  const scrollToSection = (sectionId) => {
    sectionRefs.current[sectionId]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setFieldErrors({});
    setSuccess(null);

    const payload = {
      ...form,
      pets_allowed: form.pets_allowed ? 1 : 0,
      smoking_allowed: form.smoking_allowed ? 1 : 0,
      instant_booking_enabled: form.instant_booking_enabled ? 1 : 0,
      seats: parseInt(form.seats, 10) || 2,
      sleeping_places: parseInt(form.sleeping_places, 10) || 2,
      minimum_rental_days: parseInt(form.minimum_rental_days, 10) || 1,
      maximum_rental_days: form.maximum_rental_days ? parseInt(form.maximum_rental_days, 10) : null,
      daily_price: parseFloat(form.daily_price) || 0,
      weekly_price: form.weekly_price ? parseFloat(form.weekly_price) : null,
      monthly_price: form.monthly_price ? parseFloat(form.monthly_price) : null,
      deposit_amount: form.deposit_amount ? parseFloat(form.deposit_amount) : 0,
      cleaning_fee: form.cleaning_fee ? parseFloat(form.cleaning_fee) : 0,
      service_fee: form.service_fee ? parseFloat(form.service_fee) : 0,
      year_of_manufacture: form.year_of_manufacture ? parseInt(form.year_of_manufacture, 10) : null,
      features: features.filter((f) => f.key.trim()),
    };

    try {
      if (isEdit) {
        await OwnerVehiclesApi.update(id, payload);
        setSuccess('Fahrzeug erfolgreich aktualisiert.');
      } else {
        const res = await OwnerVehiclesApi.create(payload);
        const newId = res.data.data?.id;
        setSuccess('Fahrzeug erfolgreich erstellt.');
        if (newId) {
          setTimeout(() => navigate(`/owner/vehicles/${newId}/edit`), 800);
        }
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      if (err.status === 422 && err.details) {
        setFieldErrors(err.details);
      } else {
        setError(err.message || 'Speichern fehlgeschlagen.');
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="vform container">
        <Loader size="lg" text="Fahrzeug wird geladen…" />
      </div>
    );
  }

  const visibleSections = isEdit ? SECTIONS : SECTIONS.filter((s) => s.id !== 'images');

  return (
    <div className="vform container">
      {/* ── Header ───────────────────────────────────── */}
      <div className="vform__header">
        <Link to="/owner/vehicles" className="vform__back">← Zurück zu meinen Fahrzeugen</Link>
        <h1 className="vform__title">{isEdit ? 'Fahrzeug bearbeiten' : 'Neues Fahrzeug anlegen'}</h1>
        <p className="vform__subtitle">
          {isEdit
            ? 'Aktualisiere die Daten deines Fahrzeugs in den verschiedenen Bereichen.'
            : 'Fülle die Angaben aus, um dein Fahrzeug für Mieter sichtbar zu machen.'}
        </p>
      </div>

      {/* ── Section nav ──────────────────────────────── */}
      <nav className="vform__nav">
        {visibleSections.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`vform__nav-btn ${activeSection === s.id ? 'vform__nav-btn--active' : ''}`}
            onClick={() => scrollToSection(s.id)}
          >
            <span className="vform__nav-icon">{s.icon}</span>
            <span className="vform__nav-label">{s.label}</span>
          </button>
        ))}
      </nav>

      {error && <div className="vform__alert vform__alert--error">{error}</div>}
      {success && <div className="vform__alert vform__alert--success">{success}</div>}

      <form onSubmit={handleSubmit}>
        {/* ── 1. Grunddaten ──────────────────────────── */}
        <div className="vform__card" data-section="basic" ref={(el) => (sectionRefs.current.basic = el)}>
          <div className="vform__card-header">
            <span className="vform__card-icon">🚐</span>
            <div>
              <h2 className="vform__card-title">Grunddaten</h2>
              <p className="vform__card-desc">Titel, Beschreibung und Fahrzeugdetails</p>
            </div>
          </div>

          <div className="vform__card-body">
            <Field label="Titel" name="title" error={fieldErrors.title} required hint="Ein aussagekräftiger Titel hilft Mietern bei der Suche.">
              <input
                type="text"
                className="vform__input"
                placeholder="z. B. Gemütlicher 3-Personen-Camper"
                value={form.title}
                onChange={(e) => handleChange('title', e.target.value)}
              />
            </Field>

            <Field label="Beschreibung" name="description" error={fieldErrors.description} required hint="Beschreibe Besonderheiten, Zustand und was dein Fahrzeug einzigartig macht.">
              <textarea
                className="vform__textarea"
                placeholder="Beschreibe dein Fahrzeug ausführlich…"
                value={form.description}
                onChange={(e) => handleChange('description', e.target.value)}
              />
            </Field>

            <div className="vform__grid vform__grid--3">
              <Field label="Fahrzeugtyp" name="vehicle_type" error={fieldErrors.vehicle_type}>
                <select
                  className="vform__select"
                  value={form.vehicle_type}
                  onChange={(e) => handleChange('vehicle_type', e.target.value)}
                >
                  {VEHICLE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </Field>

              <Field label="Marke" name="brand" error={fieldErrors.brand}>
                <input
                  type="text"
                  className="vform__input"
                  placeholder="z. B. VW"
                  value={form.brand}
                  onChange={(e) => handleChange('brand', e.target.value)}
                />
              </Field>

              <Field label="Modell" name="model" error={fieldErrors.model}>
                <input
                  type="text"
                  className="vform__input"
                  placeholder="z. B. California"
                  value={form.model}
                  onChange={(e) => handleChange('model', e.target.value)}
                />
              </Field>
            </div>

            <div className="vform__grid vform__grid--2">
              <Field label="Baujahr" name="year_of_manufacture" error={fieldErrors.year_of_manufacture}>
                <input
                  type="number"
                  className="vform__input"
                  min="1900"
                  max="2100"
                  placeholder="z. B. 2019"
                  value={form.year_of_manufacture}
                  onChange={(e) => handleChange('year_of_manufacture', e.target.value)}
                />
              </Field>

              <Field label="Kennzeichen" name="license_plate" error={fieldErrors.license_plate}>
                <input
                  type="text"
                  className="vform__input"
                  placeholder="z. B. B-AB 1234"
                  value={form.license_plate}
                  onChange={(e) => handleChange('license_plate', e.target.value)}
                />
              </Field>
            </div>
          </div>
        </div>

        {/* ── 2. Standort ────────────────────────────── */}
        <div className="vform__card" data-section="location" ref={(el) => (sectionRefs.current.location = el)}>
          <div className="vform__card-header">
            <span className="vform__card-icon">📍</span>
            <div>
              <h2 className="vform__card-title">Standort</h2>
              <p className="vform__card-desc">Wo steht das Fahrzeug zur Abholung bereit?</p>
            </div>
          </div>

          <div className="vform__card-body">
            <div className="vform__grid vform__grid--2">
              <Field label="Stadt" name="location_city" error={fieldErrors.location_city} required>
                <input
                  type="text"
                  className="vform__input"
                  placeholder="z. B. Berlin"
                  value={form.location_city}
                  onChange={(e) => handleChange('location_city', e.target.value)}
                />
              </Field>

              <Field label="Land" name="location_country" error={fieldErrors.location_country} required>
                <input
                  type="text"
                  className="vform__input"
                  value={form.location_country}
                  onChange={(e) => handleChange('location_country', e.target.value)}
                />
              </Field>
            </div>
          </div>
        </div>

        {/* ── 3. Ausstattung ─────────────────────────── */}
        <div className="vform__card" data-section="equipment" ref={(el) => (sectionRefs.current.equipment = el)}>
          <div className="vform__card-header">
            <span className="vform__card-icon">⚙️</span>
            <div>
              <h2 className="vform__card-title">Ausstattung &amp; Kapazität</h2>
              <p className="vform__card-desc">Technische Daten und Buchungseinstellungen</p>
            </div>
          </div>

          <div className="vform__card-body">
            <div className="vform__grid vform__grid--3">
              <Field label="Sitzplätze" name="seats" error={fieldErrors.seats}>
                <input
                  type="number"
                  className="vform__input"
                  min="1"
                  max="50"
                  value={form.seats}
                  onChange={(e) => handleChange('seats', e.target.value)}
                />
              </Field>

              <Field label="Schlafplätze" name="sleeping_places" error={fieldErrors.sleeping_places}>
                <input
                  type="number"
                  className="vform__input"
                  min="1"
                  max="30"
                  value={form.sleeping_places}
                  onChange={(e) => handleChange('sleeping_places', e.target.value)}
                />
              </Field>

              <Field label="Getriebe" name="transmission" error={fieldErrors.transmission}>
                <select
                  className="vform__select"
                  value={form.transmission}
                  onChange={(e) => handleChange('transmission', e.target.value)}
                >
                  {TRANSMISSIONS.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="vform__grid vform__grid--3">
              <Field label="Kraftstoff" name="fuel_type" error={fieldErrors.fuel_type}>
                <select
                  className="vform__select"
                  value={form.fuel_type}
                  onChange={(e) => handleChange('fuel_type', e.target.value)}
                >
                  {FUEL_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </Field>

              <Field label="Min. Mietdauer (Tage)" name="minimum_rental_days" error={fieldErrors.minimum_rental_days}>
                <input
                  type="number"
                  className="vform__input"
                  min="1"
                  value={form.minimum_rental_days}
                  onChange={(e) => handleChange('minimum_rental_days', e.target.value)}
                />
              </Field>

              <Field label="Max. Mietdauer (Tage)" name="maximum_rental_days" error={fieldErrors.maximum_rental_days}>
                <input
                  type="number"
                  className="vform__input"
                  min="1"
                  placeholder="unbegrenzt"
                  value={form.maximum_rental_days}
                  onChange={(e) => handleChange('maximum_rental_days', e.target.value)}
                />
              </Field>
            </div>

            <div className="vform__toggles">
              <ToggleField
                id="pets_allowed"
                label="Haustiere erlaubt"
                description="Dürfen Mieter Haustiere mitbringen?"
                checked={form.pets_allowed}
                onChange={(v) => handleChange('pets_allowed', v)}
              />
              <ToggleField
                id="smoking_allowed"
                label="Rauchen erlaubt"
                description="Ist Rauchen im Fahrzeug gestattet?"
                checked={form.smoking_allowed}
                onChange={(v) => handleChange('smoking_allowed', v)}
              />

            </div>
          </div>
        </div>

        {/* ── 4. Preise ──────────────────────────────── */}
        <div className="vform__card" data-section="pricing" ref={(el) => (sectionRefs.current.pricing = el)}>
          <div className="vform__card-header">
            <span className="vform__card-icon">💶</span>
            <div>
              <h2 className="vform__card-title">Preise</h2>
              <p className="vform__card-desc">Mietpreise und zusätzliche Gebühren in EUR</p>
            </div>
          </div>

          <div className="vform__card-body">
            <p className="vform__price-heading">Mietpreise</p>
            <div className="vform__grid vform__grid--3">
              <Field label="Tagespreis" name="daily_price" error={fieldErrors.daily_price} required>
                <div className="vform__input-group">
                  <span className="vform__input-prefix">€</span>
                  <input
                    type="number"
                    className="vform__input vform__input--prefixed"
                    min="0"
                    step="0.01"
                    placeholder="79.00"
                    value={form.daily_price}
                    onChange={(e) => handleChange('daily_price', e.target.value)}
                  />
                </div>
              </Field>

              <Field label="Wochenpreis" name="weekly_price" error={fieldErrors.weekly_price}>
                <div className="vform__input-group">
                  <span className="vform__input-prefix">€</span>
                  <input
                    type="number"
                    className="vform__input vform__input--prefixed"
                    min="0"
                    step="0.01"
                    placeholder="optional"
                    value={form.weekly_price}
                    onChange={(e) => handleChange('weekly_price', e.target.value)}
                  />
                </div>
              </Field>

              <Field label="Monatspreis" name="monthly_price" error={fieldErrors.monthly_price}>
                <div className="vform__input-group">
                  <span className="vform__input-prefix">€</span>
                  <input
                    type="number"
                    className="vform__input vform__input--prefixed"
                    min="0"
                    step="0.01"
                    placeholder="optional"
                    value={form.monthly_price}
                    onChange={(e) => handleChange('monthly_price', e.target.value)}
                  />
                </div>
              </Field>
            </div>

            <p className="vform__price-heading">Zusätzliche Gebühren</p>
            <div className="vform__grid vform__grid--3">
              <Field label="Kaution" name="deposit_amount" error={fieldErrors.deposit_amount}>
                <div className="vform__input-group">
                  <span className="vform__input-prefix">€</span>
                  <input
                    type="number"
                    className="vform__input vform__input--prefixed"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={form.deposit_amount}
                    onChange={(e) => handleChange('deposit_amount', e.target.value)}
                  />
                </div>
              </Field>

              <Field label="Reinigungspauschale" name="cleaning_fee" error={fieldErrors.cleaning_fee}>
                <div className="vform__input-group">
                  <span className="vform__input-prefix">€</span>
                  <input
                    type="number"
                    className="vform__input vform__input--prefixed"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={form.cleaning_fee}
                    onChange={(e) => handleChange('cleaning_fee', e.target.value)}
                  />
                </div>
              </Field>

              <Field label="Servicegebühr" name="service_fee" error={fieldErrors.service_fee}>
                <div className="vform__input-group">
                  <span className="vform__input-prefix">€</span>
                  <input
                    type="number"
                    className="vform__input vform__input--prefixed"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={form.service_fee}
                    onChange={(e) => handleChange('service_fee', e.target.value)}
                  />
                </div>
              </Field>
            </div>
          </div>
        </div>

        {/* ── 5. Features ────────────────────────────── */}
        <div className="vform__card" data-section="features" ref={(el) => (sectionRefs.current.features = el)}>
          <div className="vform__card-header">
            <span className="vform__card-icon">✨</span>
            <div>
              <h2 className="vform__card-title">Ausstattungsmerkmale</h2>
              <p className="vform__card-desc">Küche, Bad, Technik — was ist an Bord?</p>
            </div>
          </div>

          <div className="vform__card-body">
            <VehicleFeaturesForm features={features} onChange={setFeatures} />
          </div>
        </div>

        {/* ── 6. Images (edit only) ──────────────────── */}
        {isEdit && (
          <div className="vform__card" data-section="images" ref={(el) => (sectionRefs.current.images = el)}>
            <div className="vform__card-header">
              <span className="vform__card-icon">📸</span>
              <div>
                <h2 className="vform__card-title">Bilder</h2>
                <p className="vform__card-desc">Lade ansprechende Fotos deines Fahrzeugs hoch</p>
              </div>
            </div>

            <div className="vform__card-body">
              <VehicleImagesForm
                vehicleId={parseInt(id, 10)}
                images={images}
                onImagesChange={setImages}
              />
            </div>
          </div>
        )}

        {/* ── Sticky save bar ────────────────────────── */}
        <div className="vform__save-bar">
          <div className="vform__save-bar-inner">
            <Link to="/owner/vehicles" className="vform__cancel-btn">Abbrechen</Link>
            <button type="submit" className="vform__submit" disabled={saving}>
              {saving ? 'Wird gespeichert…' : isEdit ? 'Änderungen speichern' : 'Fahrzeug erstellen'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

/* ── Field helper ────────────────────────────────────────── */
function Field({ label, name, error, children, required, hint }) {
  const errors = Array.isArray(error) ? error : error ? [error] : [];
  return (
    <div className={`vform__field ${errors.length ? 'vform__field--error' : ''}`}>
      <label className="vform__label" htmlFor={name}>
        {label}
        {required && <span className="vform__required">*</span>}
      </label>
      {children}
      {hint && !errors.length && <span className="vform__hint">{hint}</span>}
      {errors.map((e, i) => (
        <span key={i} className="vform__field-error">{e}</span>
      ))}
    </div>
  );
}

/* ── Toggle switch helper ────────────────────────────────── */
function ToggleField({ id, label, description, checked, onChange }) {
  return (
    <div className="vform__toggle">
      <div className="vform__toggle-text">
        <span className="vform__toggle-label">{label}</span>
        {description && <span className="vform__toggle-desc">{description}</span>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        className={`vform__switch ${checked ? 'vform__switch--on' : ''}`}
        onClick={() => onChange(!checked)}
      >
        <span className="vform__switch-thumb" />
      </button>
    </div>
  );
}
