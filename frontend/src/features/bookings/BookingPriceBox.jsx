import './BookingWizard.css';

/**
 * Sticky price breakdown box shown alongside the wizard.
 *
 * @param {{ pricing: object|null, loading: boolean, vehicle: object|null }} props
 */
export default function BookingPriceBox({ pricing, loading, vehicle }) {
  if (loading) {
    return (
      <div className="bprice">
        <div className="bprice__loading">Preis wird berechnet…</div>
      </div>
    );
  }

  if (!pricing) {
    return (
      <div className="bprice">
        <p className="bprice__empty">Wähle einen Zeitraum, um den Preis zu sehen.</p>
      </div>
    );
  }

  const fmt = (val) => parseFloat(val).toLocaleString('de-DE', { minimumFractionDigits: 2 });

  return (
    <div className="bprice">
      <h3 className="bprice__title">Preisübersicht</h3>

      {/* Breakdown lines */}
      {pricing.breakdown?.length > 0 && (
        <div className="bprice__breakdown">
          {pricing.breakdown.map((line, i) => (
            <div key={i} className="bprice__row">
              <span>{line.label}</span>
              <span>{fmt(line.total)} €</span>
            </div>
          ))}
        </div>
      )}

      <div className="bprice__divider" />

      {/* Fees */}
      <div className="bprice__row">
        <span>Grundpreis</span>
        <span>{fmt(pricing.base_price)} €</span>
      </div>
      {parseFloat(pricing.cleaning_fee) > 0 && (
        <div className="bprice__row">
          <span>Reinigungsgebühr</span>
          <span>{fmt(pricing.cleaning_fee)} €</span>
        </div>
      )}
      {parseFloat(pricing.service_fee) > 0 && (
        <div className="bprice__row">
          <span>Servicegebühr</span>
          <span>{fmt(pricing.service_fee)} €</span>
        </div>
      )}

      <div className="bprice__divider" />

      {/* Total */}
      <div className="bprice__row bprice__row--total">
        <span>Gesamtpreis</span>
        <span>{fmt(pricing.total_price)} {pricing.currency}</span>
      </div>

      {parseFloat(pricing.deposit_amount) > 0 && (
        <div className="bprice__row bprice__row--deposit">
          <span>Kaution (rückerstattbar)</span>
          <span>{fmt(pricing.deposit_amount)} €</span>
        </div>
      )}

      <p className="bprice__nights">
        {pricing.days_count} {pricing.days_count === 1 ? 'Nacht' : 'Nächte'}
        {pricing.rate_type !== 'daily' && (
          <span className="bprice__rate-hint">
            {' '}· {pricing.rate_type === 'weekly' ? 'Wochenpreis' : 'Monatspreis'} angewendet
          </span>
        )}
      </p>
    </div>
  );
}