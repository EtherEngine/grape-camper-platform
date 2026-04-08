import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import AdminApi from './AdminApi';
import Loader from '../../components/common/Loader';
import './Admin.css';

const STATUS_TABS = [
  { value: '', label: 'Alle' },
  { value: 'pending_owner_review', label: 'Ausstehend' },
  { value: 'pending_payment', label: 'Zahlung offen' },
  { value: 'confirmed', label: 'Bestätigt' },
  { value: 'completed', label: 'Abgeschlossen' },
  { value: 'cancelled', label: 'Storniert' },
];

const PAYMENT_TABS = [
  { value: '', label: 'Alle Zahlungen' },
  { value: 'pending', label: 'Offen' },
  { value: 'paid', label: 'Bezahlt' },
  { value: 'refunded', label: 'Erstattet' },
];

const fmt = (v) => Number(v).toLocaleString('de-DE', { minimumFractionDigits: 2 });

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(null);

  const perPage = 20;

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, per_page: perPage };
      if (statusFilter) params.status = statusFilter;
      if (paymentFilter) params.payment_status = paymentFilter;
      const res = await AdminApi.listBookings(params);
      const d = res.data?.data || res.data;
      setBookings(d?.items || d || []);
      setTotal(d?.total ?? 0);
    } catch (err) {
      setError(err.message || 'Buchungen konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, paymentFilter, page]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const handleCancel = async (id) => {
    if (busy) return;
    if (!window.confirm('Buchung wirklich stornieren?')) return;
    setBusy(id);
    try {
      await AdminApi.cancelBooking(id);
      await fetchBookings();
    } catch (err) {
      setError(err.message || 'Stornierung fehlgeschlagen.');
    } finally {
      setBusy(null);
    }
  };

  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="adm container">
      <h1 className="adm__title">Buchungsmonitoring</h1>

      {/* Status filter */}
      <div className="adm__tabs">
        {STATUS_TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            className={`adm__tab ${statusFilter === t.value ? 'adm__tab--active' : ''}`}
            onClick={() => { setStatusFilter(t.value); setPage(1); }}
          >
            {t.label}
          </button>
        ))}

        <span style={{ width: '1px', background: 'var(--color-border)', margin: '0 var(--space-2)' }} />

        {PAYMENT_TABS.map((t) => (
          <button
            key={`p-${t.value}`}
            type="button"
            className={`adm__tab ${paymentFilter === t.value ? 'adm__tab--active' : ''}`}
            onClick={() => { setPaymentFilter(t.value); setPage(1); }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <Loader size="lg" text="Buchungen werden geladen…" />
      ) : error ? (
        <div className="adm__error">
          <p>{error}</p>
          <button type="button" className="adm__retry" onClick={fetchBookings}>Erneut versuchen</button>
        </div>
      ) : bookings.length === 0 ? (
        <div className="adm__empty"><p>Keine Buchungen gefunden.</p></div>
      ) : (
        <>
          <div className="adm__table-wrap">
            <table className="adm__table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Fahrzeug</th>
                  <th>Mieter</th>
                  <th>Vermieter</th>
                  <th>Zeitraum</th>
                  <th>Preis</th>
                  <th>Status</th>
                  <th>Zahlung</th>
                  <th>Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id}>
                    <td><Link to={`/bookings/${b.id}`}>{b.id}</Link></td>
                    <td>{b.vehicle_title || b.vehicle_id}</td>
                    <td>{b.renter_name || b.renter_id}</td>
                    <td>{b.owner_name || b.owner_id}</td>
                    <td>{b.start_date} – {b.end_date}</td>
                    <td>{fmt(b.total_price)} {b.currency}</td>
                    <td><span className={`adm__badge adm__badge--${b.status}`}>{b.status}</span></td>
                    <td><span className={`adm__badge adm__badge--${b.payment_status}`}>{b.payment_status}</span></td>
                    <td>
                      <div className="adm__actions">
                        {b.status !== 'cancelled' && b.status !== 'completed' && (
                          <button
                            type="button"
                            className="adm__btn adm__btn--danger"
                            disabled={busy === b.id}
                            onClick={() => handleCancel(b.id)}
                          >
                            {busy === b.id ? '…' : 'Stornieren'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="adm__pagination">
              <button type="button" className="adm__page-btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                ← Zurück
              </button>
              <span className="adm__page-info">Seite {page} von {totalPages}</span>
              <button type="button" className="adm__page-btn" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Weiter →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}