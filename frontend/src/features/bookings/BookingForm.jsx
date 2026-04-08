import './BookingWizard.css';

const PAYMENT_METHODS = [
  { value: 'paypal', label: 'PayPal' },
  { value: 'stripe', label: 'Kreditkarte (Stripe)' },
  { value: 'bank_transfer', label: 'Überweisung' },
  { value: 'online_banking', label: 'Online-Banking' },
];

/**
 * Form fields for the booking wizard steps.
 * Renders different content based on `step`.
 *
 * @param {{ step: number, data: object, errors: object, onChange: (field, value) => void, vehicle: object }} props
 */
export default function BookingForm({ step, data, errors, onChange, vehicle }) {
  const renderField = (name, label, type = 'text', options = {}) => (
    <div className="bform__field">
      <label className="bform__label" htmlFor={`bf-${name}`}>{label}</label>
      {type === 'textarea' ? (
        <textarea
          id={`bf-${name}`}
          className={`bform__input bform__textarea ${errors[name] ? 'bform__input--error' : ''}`}
          value={data[name] || ''}
          onChange={(e) => onChange(name, e.target.value)}
          rows={3}
          {...options}
        />
      ) : type === 'select' ? (
        <select
          id={`bf-${name}`}
          className={`bform__input bform__select ${errors[name] ? 'bform__input--error' : ''}`}
          value={data[name] || ''}
          onChange={(e) => onChange(name, e.target.value)}
        >
          <option value="">Bitte wählen…</option>
          {options.choices?.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      ) : type === 'checkbox' ? (
        <label className="bform__checkbox">
          <input
            type="checkbox"
            checked={!!data[name]}
            onChange={(e) => onChange(name, e.target.checked)}
          />
          <span>{options.checkboxLabel || label}</span>
        </label>
      ) : (
        <input
          id={`bf-${name}`}
          type={type}
          className={`bform__input ${errors[name] ? 'bform__input--error' : ''}`}
          value={data[name] || ''}
          onChange={(e) => onChange(name, e.target.value)}
          {...options}
        />
      )}
      {errors[name] && <p className="bform__error">{errors[name]}</p>}
    </div>
  );

  // ── Step 2: Review booking data ──────────────────────────
  if (step === 2) {
    return (
      <div className="bform">
        <h3 className="bform__step-title">Buchungsdaten prüfen</h3>
        <p className="bform__step-desc">Überprüfe deine Daten und ergänze optionale Anmerkungen.</p>

        <div className="bform__review">
          <div className="bform__review-row">
            <span className="bform__review-label">Fahrzeug</span>
            <span className="bform__review-value">{vehicle?.title}</span>
          </div>
          <div className="bform__review-row">
            <span className="bform__review-label">Standort</span>
            <span className="bform__review-value">{vehicle?.location_city}, {vehicle?.location_country}</span>
          </div>
          <div className="bform__review-row">
            <span className="bform__review-label">Zeitraum</span>
            <span className="bform__review-value">
              {formatGerman(data.start_date)} – {formatGerman(data.end_date)}
            </span>
          </div>
        </div>

        {renderField('customer_notes', 'Anmerkungen für den Vermieter', 'textarea', {
          placeholder: 'z.B. Ankunftszeit, besondere Wünsche…',
        })}
      </div>
    );
  }

  // ── Step 4: Payment method ───────────────────────────────
  if (step === 4) {
    return (
      <div className="bform">
        <h3 className="bform__step-title">Zahlungsart</h3>
        <p className="bform__step-desc">Wähle aus, wie du bezahlen möchtest.</p>

        <div className="bform__payment-grid">
          {PAYMENT_METHODS.map((pm) => (
            <button
              key={pm.value}
              type="button"
              className={`bform__payment-option ${data.payment_method === pm.value ? 'bform__payment-option--active' : ''}`}
              onClick={() => onChange('payment_method', pm.value)}
            >
              <span className="bform__payment-icon">{paymentIcon(pm.value)}</span>
              <span className="bform__payment-label">{pm.label}</span>
            </button>
          ))}
        </div>
        {errors.payment_method && <p className="bform__error">{errors.payment_method}</p>}
      </div>
    );
  }

  return null;
}

// ── Helpers ────────────────────────────────────────────────

function formatGerman(dateStr) {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  return `${parseInt(d, 10)}.${parseInt(m, 10)}.${y}`;
}

function paymentIcon(method) {
  switch (method) {
    case 'paypal': return '🅿️';
    case 'stripe': return '💳';
    case 'bank_transfer': return '🏦';
    case 'online_banking': return '🌐';
    default: return '💰';
  }
}