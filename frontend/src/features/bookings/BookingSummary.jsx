import BookingPriceBox from './BookingPriceBox';
import SwapOfferPreview from '../swaps/SwapOfferPreview';
import './BookingWizard.css';

/**
 * Final review step – shows all booking details before submission.
 *
 * @param {{ data: object, vehicle: object, pricing: object|null, pricingLoading: boolean }} props
 */
export default function BookingSummary({ data, vehicle, pricing, pricingLoading }) {
  return (
    <div className="bsummary">
      <h3 className="bform__step-title">Übersicht &amp; Absenden</h3>
      <p className="bform__step-desc">Prüfe alle Angaben und bestätige die Buchung.</p>

      {/* Vehicle */}
      <section className="bsummary__section">
        <h4 className="bsummary__heading">Fahrzeug</h4>
        <div className="bsummary__row">
          <span>Fahrzeug</span>
          <span>{vehicle?.title}</span>
        </div>
        <div className="bsummary__row">
          <span>Standort</span>
          <span>{vehicle?.location_city}, {vehicle?.location_country}</span>
        </div>
      </section>

      {/* Dates */}
      <section className="bsummary__section">
        <h4 className="bsummary__heading">Zeitraum</h4>
        <div className="bsummary__row">
          <span>Von</span>
          <span>{formatGerman(data.start_date)}</span>
        </div>
        <div className="bsummary__row">
          <span>Bis</span>
          <span>{formatGerman(data.end_date)}</span>
        </div>
      </section>

      {/* Customer notes */}
      {data.customer_notes && (
        <section className="bsummary__section">
          <h4 className="bsummary__heading">Anmerkungen</h4>
          <p className="bsummary__text">{data.customer_notes}</p>
        </section>
      )}

      {/* Swap */}
      {data.swap_enabled && (
        <section className="bsummary__section">
          <h4 className="bsummary__heading">Tauschangebot</h4>
          <SwapOfferPreview data={data} />
        </section>
      )}

      {/* Payment */}
      {data.swap_enabled ? (
        <section className="bsummary__section">
          <h4 className="bsummary__heading">Zahlungsart</h4>
          <div className="bsummary__row">
            <span>Methode</span>
            <span className="bsummary__text--muted">Wird nach Prüfung des Tauschangebots durch den Vermieter festgelegt</span>
          </div>
          <p className="bsummary__hint">
            Der Vermieter prüft dein Tauschangebot. Deckt es den Gesamtpreis ab, entfällt die Zahlung.
            Bei einem Restbetrag wirst du zur Zahlung aufgefordert.
          </p>
        </section>
      ) : (
        <section className="bsummary__section">
          <h4 className="bsummary__heading">Zahlungsart</h4>
          <div className="bsummary__row">
            <span>Methode</span>
            <span>{paymentLabel(data.payment_method)}</span>
          </div>
        </section>
      )}

      {/* Price */}
      <section className="bsummary__section">
        <h4 className="bsummary__heading">Preis</h4>
        <BookingPriceBox pricing={pricing} loading={pricingLoading} startDate={data.start_date} endDate={data.end_date} />
      </section>

      <p className="bsummary__legal">
        Mit dem Absenden bestätigst du die&nbsp;
        <strong>Allgemeinen Mietbedingungen</strong> und die&nbsp;
        <strong>Datenschutzrichtlinie</strong>.
      </p>
    </div>
  );
}

function formatGerman(dateStr) {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  return `${parseInt(d, 10)}.${parseInt(m, 10)}.${y}`;
}

function paymentLabel(method) {
  switch (method) {
    case 'paypal': return 'PayPal';
    case 'stripe': return 'Kreditkarte (Stripe)';
    case 'bank_transfer': return 'Überweisung';
    case 'online_banking': return 'Online-Banking';
    case 'none': return 'Noch nicht festgelegt';
    default: return method || '—';
  }
}