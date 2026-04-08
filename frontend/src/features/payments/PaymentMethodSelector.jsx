import './PaymentMethodSelector.css';

const METHODS = [
  { value: 'paypal',         label: 'PayPal',               icon: '🅿️',  desc: 'Schnell & sicher bezahlen' },
  { value: 'stripe',         label: 'Kreditkarte (Stripe)',  icon: '💳',  desc: 'Visa, Mastercard, AMEX' },
  { value: 'bank_transfer',  label: 'Überweisung',           icon: '🏦',  desc: 'Manuelle Banküberweisung' },
  { value: 'online_banking', label: 'Online-Banking',        icon: '🌐',  desc: 'Sofortüberweisung / Giropay' },
];

/**
 * Zahlungsart-Auswahl als Grid-Karten.
 *
 * @param {{ value: string, onChange: (method: string) => void, error?: string, disabled?: boolean }} props
 */
export default function PaymentMethodSelector({ value, onChange, error, disabled }) {
  return (
    <div className="pms">
      <h3 className="pms__title">Zahlungsart wählen</h3>
      <p className="pms__desc">Wähle aus, wie du bezahlen möchtest.</p>

      <div className="pms__grid">
        {METHODS.map((m) => (
          <button
            key={m.value}
            type="button"
            disabled={disabled}
            className={`pms__card ${value === m.value ? 'pms__card--active' : ''}`}
            onClick={() => onChange(m.value)}
          >
            <span className="pms__icon">{m.icon}</span>
            <span className="pms__label">{m.label}</span>
            <span className="pms__card-desc">{m.desc}</span>
          </button>
        ))}
      </div>

      {error && <p className="pms__error">{error}</p>}
    </div>
  );
}