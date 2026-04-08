import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import BookingsApi from './BookingsApi';
import useAuth from '../../hooks/useAuth';
import Loader from '../../components/common/Loader';
import './BookingPrintView.css';

const STATUS_LABELS = {
  pending_owner_review: 'Ausstehend',
  pending_payment: 'Zahlung offen',
  confirmed: 'Bestätigt',
  completed: 'Abgeschlossen',
  cancelled: 'Storniert',
};

const PAYMENT_LABELS = {
  unpaid: 'Offen',
  paid: 'Bezahlt',
  refunded: 'Erstattet',
  partially_refunded: 'Teilerstattet',
};

function formatGerman(dateStr) {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  return `${parseInt(d, 10)}.${parseInt(m, 10)}.${y}`;
}

function formatDateTime(dt) {
  if (!dt) return '—';
  const [date, time] = dt.split(' ');
  return `${formatGerman(date)}${time ? ` ${time.substring(0, 5)}` : ''}`;
}

function fmt(val) {
  return parseFloat(val).toLocaleString('de-DE', { minimumFractionDigits: 2 });
}

export default function BookingPrintView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchBooking = useCallback(async () => {
    setLoading(true);
    try {
      const res = await BookingsApi.get(id);
      setBooking(res.data?.data || null);
    } catch (err) {
      setError(err.message || 'Buchung konnte nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchBooking(); }, [fetchBooking]);

  if (loading) return <Loader size="lg" text="Wird geladen…" />;
  if (error) return (
    <div className="bpv__error">
      <p>{error}</p>
      <button type="button" onClick={() => navigate(-1)}>Zurück</button>
    </div>
  );
  if (!booking) return (
    <div className="bpv__error"><p>Buchung nicht gefunden.</p></div>
  );

  const b = booking;

  return (
    <div className="bpv">
      {/* Screen-only toolbar */}
      <div className="bpv__toolbar no-print">
        <button type="button" className="bpv__back" onClick={() => navigate(-1)}>
          ← Zurück zur Buchung
        </button>
        <button type="button" className="bpv__print-btn" onClick={() => window.print()}>
          🖨 Drucken
        </button>
      </div>

      {/* Print content */}
      <div className="bpv__page">
        {/* Header */}
        <header className="bpv__header">
          <div className="bpv__brand">
            <h1 className="bpv__logo">GRAPE</h1>
            <span className="bpv__brand-sub">Camper-Vermietung &amp; Tauschplattform</span>
          </div>
          <div className="bpv__doc-info">
            <h2 className="bpv__doc-title">Buchungsbestätigung</h2>
            <span className="bpv__doc-nr">Nr. {b.id}</span>
            <span className="bpv__doc-date">Erstellt: {formatDateTime(b.created_at)}</span>
          </div>
        </header>

        <hr className="bpv__divider" />

        {/* Status bar */}
        <div className="bpv__status-bar">
          <div className="bpv__status-item">
            <span className="bpv__status-label">Buchungsstatus</span>
            <span className={`bpv__status-value bpv__status-value--${b.status}`}>
              {STATUS_LABELS[b.status] || b.status}
            </span>
          </div>
          <div className="bpv__status-item">
            <span className="bpv__status-label">Zahlungsstatus</span>
            <span className={`bpv__status-value bpv__status-value--${b.payment_status}`}>
              {PAYMENT_LABELS[b.payment_status] || b.payment_status}
            </span>
          </div>
          {b.payment_method && (
            <div className="bpv__status-item">
              <span className="bpv__status-label">Zahlungsart</span>
              <span className="bpv__status-value">{b.payment_method}</span>
            </div>
          )}
        </div>

        {/* Two-column: Renter + Vehicle */}
        <div className="bpv__columns">
          <section className="bpv__col">
            <h3 className="bpv__section-title">Mieter</h3>
            {user && (
              <div className="bpv__kv-list">
                <div className="bpv__kv">
                  <span className="bpv__key">Name</span>
                  <span className="bpv__val">{user.first_name} {user.last_name}</span>
                </div>
                <div className="bpv__kv">
                  <span className="bpv__key">E-Mail</span>
                  <span className="bpv__val">{user.email}</span>
                </div>
                {user.phone && (
                  <div className="bpv__kv">
                    <span className="bpv__key">Telefon</span>
                    <span className="bpv__val">{user.phone}</span>
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="bpv__col">
            <h3 className="bpv__section-title">Fahrzeug</h3>
            <div className="bpv__kv-list">
              <div className="bpv__kv">
                <span className="bpv__key">Bezeichnung</span>
                <span className="bpv__val">{b.vehicle_title}</span>
              </div>
              <div className="bpv__kv">
                <span className="bpv__key">Fahrzeug-ID</span>
                <span className="bpv__val">{b.vehicle_id}</span>
              </div>
            </div>
          </section>
        </div>

        {/* Booking period */}
        <section className="bpv__section">
          <h3 className="bpv__section-title">Buchungszeitraum</h3>
          <div className="bpv__period">
            <div className="bpv__period-item">
              <span className="bpv__period-label">Check-in</span>
              <span className="bpv__period-value">{formatGerman(b.start_date)}</span>
            </div>
            <span className="bpv__period-arrow">→</span>
            <div className="bpv__period-item">
              <span className="bpv__period-label">Check-out</span>
              <span className="bpv__period-value">{formatGerman(b.end_date)}</span>
            </div>
            <div className="bpv__period-item">
              <span className="bpv__period-label">Dauer</span>
              <span className="bpv__period-value">
                {b.days_count} {b.days_count === 1 ? 'Nacht' : 'Nächte'}
              </span>
            </div>
          </div>
        </section>

        {/* Cost breakdown */}
        <section className="bpv__section">
          <h3 className="bpv__section-title">Kostenaufstellung</h3>
          <table className="bpv__cost-table">
            <tbody>
              <tr>
                <td>Grundpreis</td>
                <td className="bpv__cost-amt">{fmt(b.base_price)} €</td>
              </tr>
              {parseFloat(b.cleaning_fee) > 0 && (
                <tr>
                  <td>Reinigungsgebühr</td>
                  <td className="bpv__cost-amt">{fmt(b.cleaning_fee)} €</td>
                </tr>
              )}
              {parseFloat(b.service_fee) > 0 && (
                <tr>
                  <td>Servicegebühr</td>
                  <td className="bpv__cost-amt">{fmt(b.service_fee)} €</td>
                </tr>
              )}
              {parseFloat(b.swap_discount_value) > 0 && (
                <tr className="bpv__cost-discount">
                  <td>Tauschrabatt</td>
                  <td className="bpv__cost-amt">−{fmt(b.swap_discount_value)} €</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bpv__cost-total">
                <td>Gesamtpreis</td>
                <td className="bpv__cost-amt">{fmt(b.total_price)} {b.currency}</td>
              </tr>
              {parseFloat(b.deposit_amount) > 0 && (
                <tr className="bpv__cost-deposit">
                  <td>Kaution (wird separat erhoben)</td>
                  <td className="bpv__cost-amt">{fmt(b.deposit_amount)} €</td>
                </tr>
              )}
            </tfoot>
          </table>
        </section>

        {/* Timestamps */}
        <section className="bpv__section">
          <h3 className="bpv__section-title">Zeitstempel</h3>
          <div className="bpv__kv-list">
            <div className="bpv__kv">
              <span className="bpv__key">Erstellt</span>
              <span className="bpv__val">{formatDateTime(b.created_at)}</span>
            </div>
            {b.confirmed_at && (
              <div className="bpv__kv">
                <span className="bpv__key">Bestätigt</span>
                <span className="bpv__val">{formatDateTime(b.confirmed_at)}</span>
              </div>
            )}
            {b.completed_at && (
              <div className="bpv__kv">
                <span className="bpv__key">Abgeschlossen</span>
                <span className="bpv__val">{formatDateTime(b.completed_at)}</span>
              </div>
            )}
            {b.cancelled_at && (
              <div className="bpv__kv">
                <span className="bpv__key">Storniert</span>
                <span className="bpv__val">{formatDateTime(b.cancelled_at)}</span>
              </div>
            )}
          </div>
        </section>

        {/* Notes */}
        {b.customer_notes && (
          <section className="bpv__section">
            <h3 className="bpv__section-title">Anmerkungen des Mieters</h3>
            <p className="bpv__note">{b.customer_notes}</p>
          </section>
        )}

        {b.rejection_reason && (
          <section className="bpv__section bpv__section--danger">
            <h3 className="bpv__section-title">Ablehnungsgrund</h3>
            <p className="bpv__note">{b.rejection_reason}</p>
          </section>
        )}

        {/* Footer */}
        <footer className="bpv__footer">
          <p>GRAPE – Camper-Vermietung &amp; Tauschplattform</p>
          <p>Dieses Dokument wurde automatisch generiert und dient als Buchungsbestätigung.</p>
        </footer>
      </div>
    </div>
  );
}
