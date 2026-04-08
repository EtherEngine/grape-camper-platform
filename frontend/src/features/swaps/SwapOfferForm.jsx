import { useState, useCallback } from 'react';
import SwapOfferPreview from './SwapOfferPreview';
import './SwapOfferForm.css';

const SWAP_TYPES = [
  { value: 'vehicle', label: 'Fahrzeug' },
  { value: 'property', label: 'Immobilie / Unterkunft' },
  { value: 'other', label: 'Sonstiges' },
];

/**
 * Swap offer sub-form for the BookingWizard (Step 3).
 *
 * @param {{ data: object, errors: object, onChange: (field, value) => void }} props
 */
export default function SwapOfferForm({ data, errors, onChange }) {
  const [showPreview, setShowPreview] = useState(false);

  const handleToggle = useCallback((e) => {
    onChange('swap_enabled', e.target.checked);
    if (!e.target.checked) {
      setShowPreview(false);
    }
  }, [onChange]);

  const handleField = useCallback((field) => (e) => {
    onChange(field, e.target.value);
  }, [onChange]);

  const canPreview = data.swap_enabled && data.swap_title?.trim();

  return (
    <div className="bform">
      <h3 className="bform__step-title">Tauschoption (optional)</h3>
      <p className="bform__step-desc">
        Biete dem Vermieter etwas im Tausch an, um den Mietpreis zu reduzieren.
      </p>

      {/* ── Toggle ─────────────────────────────────────── */}
      <div className="swap-toggle">
        <label className="swap-toggle__label">
          <input
            type="checkbox"
            className="swap-toggle__input"
            checked={!!data.swap_enabled}
            onChange={handleToggle}
          />
          <span className="swap-toggle__track">
            <span className="swap-toggle__thumb" />
          </span>
          <span className="swap-toggle__text">
            Ich möchte ein Tauschangebot machen
          </span>
        </label>
      </div>

      {/* ── Form fields ────────────────────────────────── */}
      {data.swap_enabled && (
        <div className="swap-form">
          {/* Type */}
          <div className="swap-form__field">
            <label className="bform__label" htmlFor="swap-type">Art des Angebots</label>
            <div className="swap-form__type-grid">
              {SWAP_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  className={`swap-form__type-btn ${data.swap_type === t.value ? 'swap-form__type-btn--active' : ''}`}
                  onClick={() => onChange('swap_type', t.value)}
                >
                  <span className="swap-form__type-icon">{typeIcon(t.value)}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
            {errors.swap_type && <p className="bform__error">{errors.swap_type}</p>}
          </div>

          {/* Title */}
          <div className="swap-form__field">
            <label className="bform__label" htmlFor="swap-title">Titel *</label>
            <input
              id="swap-title"
              type="text"
              className={`bform__input ${errors.swap_title ? 'bform__input--error' : ''}`}
              value={data.swap_title || ''}
              onChange={handleField('swap_title')}
              placeholder="z. B. Mein VW T5 Bulli, Ferienwohnung am See…"
              maxLength={150}
            />
            <div className="swap-form__hint">
              {(data.swap_title || '').length}/150 Zeichen
            </div>
            {errors.swap_title && <p className="bform__error">{errors.swap_title}</p>}
          </div>

          {/* Description */}
          <div className="swap-form__field">
            <label className="bform__label" htmlFor="swap-desc">Beschreibung *</label>
            <textarea
              id="swap-desc"
              className={`bform__input bform__textarea ${errors.swap_description ? 'bform__input--error' : ''}`}
              value={data.swap_description || ''}
              onChange={handleField('swap_description')}
              placeholder="Beschreibe dein Angebot: Zustand, Ausstattung, Besonderheiten…"
              rows={4}
            />
            {errors.swap_description && <p className="bform__error">{errors.swap_description}</p>}
          </div>

          {/* Estimated value */}
          <div className="swap-form__field">
            <label className="bform__label" htmlFor="swap-value">Geschätzter Wert (€) *</label>
            <div className="swap-form__value-wrap">
              <input
                id="swap-value"
                type="number"
                className={`bform__input ${errors.swap_estimated_value ? 'bform__input--error' : ''}`}
                value={data.swap_estimated_value || ''}
                onChange={handleField('swap_estimated_value')}
                placeholder="0,00"
                min="0.01"
                step="0.01"
              />
              <span className="swap-form__currency">EUR</span>
            </div>
            {errors.swap_estimated_value && <p className="bform__error">{errors.swap_estimated_value}</p>}
          </div>

          {/* Date range */}
          <div className="swap-form__row">
            <div className="swap-form__field">
              <label className="bform__label" htmlFor="swap-from">Verfügbar ab</label>
              <input
                id="swap-from"
                type="date"
                className={`bform__input ${errors.swap_available_from ? 'bform__input--error' : ''}`}
                value={data.swap_available_from || ''}
                onChange={handleField('swap_available_from')}
              />
              {errors.swap_available_from && <p className="bform__error">{errors.swap_available_from}</p>}
            </div>
            <div className="swap-form__field">
              <label className="bform__label" htmlFor="swap-to">Verfügbar bis</label>
              <input
                id="swap-to"
                type="date"
                className={`bform__input ${errors.swap_available_to ? 'bform__input--error' : ''}`}
                value={data.swap_available_to || ''}
                onChange={handleField('swap_available_to')}
                min={data.swap_available_from || undefined}
              />
              {errors.swap_available_to && <p className="bform__error">{errors.swap_available_to}</p>}
            </div>
          </div>

          {/* Preview toggle */}
          <div className="swap-form__actions">
            {canPreview && (
              <button
                type="button"
                className="swap-form__preview-btn"
                onClick={() => setShowPreview((v) => !v)}
              >
                {showPreview ? 'Vorschau ausblenden' : 'Vorschau anzeigen'}
              </button>
            )}
          </div>

          {showPreview && canPreview && (
            <SwapOfferPreview data={data} />
          )}
        </div>
      )}
    </div>
  );
}

function typeIcon(type) {
  switch (type) {
    case 'vehicle':  return '🚐';
    case 'property': return '🏠';
    case 'other':    return '📦';
    default:         return '❓';
  }
}