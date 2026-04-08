import { useEffect, useState, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import BookingsApi from '../features/bookings/BookingsApi';
import BookingStatusBadge from '../features/bookings/BookingStatusBadge';
import Loader from '../components/common/Loader';
import './MyBookingsPage.css';

const STATUS_TABS = [
  { value: '', label: 'Alle' },
  { value: 'pending_owner_review', label: 'Ausstehend' },
  { value: 'pending_payment', label: 'Zahlung offen' },
  { value: 'pending_contract', label: 'Vertrag offen' },
  { value: 'confirmed', label: 'Bestätigt' },
  { value: 'completed', label: 'Abgeschlossen' },
  { value: 'cancelled', label: 'Storniert' },
];

export default function MyBookingsPage() {
  const location = useLocation();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [successMsg, setSuccessMsg] = useState(location.state?.success || null);

  const perPage = 10;

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, per_page: perPage };
      if (statusFilter) params.status = statusFilter;
      const res = await BookingsApi.list(params);
      const d = res.data?.data || res.data;
      setBookings(d?.items || d || []);
      setTotal(d?.total ?? 0);
    } catch (err) {
      setError(err.message || 'Buchungen konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  // Clear success message after 5s
  useEffect(() => {
    if (!successMsg) return;
    const t = setTimeout(() => setSuccessMsg(null), 5000);
    return () => clearTimeout(t);
  }, [successMsg]);

  const handleFilterChange = (val) => {
    setStatusFilter(val);
    setPage(1);
  };

  const totalPages = Math.ceil(total / perPage);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost/grape/backend/public';

  return (
    <div className="mb container">
      <h1 className="mb__title">Meine Buchungen</h1>

      {successMsg && (
        <div className="mb__success">{successMsg}</div>
      )}

      {/* Status filter tabs */}
      <div className="mb__tabs">
        {STATUS_TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            className={`mb__tab ${statusFilter === t.value ? 'mb__tab--active' : ''}`}
            onClick={() => handleFilterChange(t.value)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <Loader size="lg" text="Buchungen werden geladen…" />
      ) : error ? (
        <div className="mb__error">
          <p>{error}</p>
          <button type="button" className="mb__retry" onClick={fetchBookings}>Erneut versuchen</button>
        </div>
      ) : bookings.length === 0 ? (
        <div className="mb__empty">
          <p>Keine Buchungen gefunden.</p>
          <Link to="/vehicles" className="mb__cta">Fahrzeuge durchsuchen</Link>
        </div>
      ) : (
        <>
          <div className="mb__list">
            {bookings.map((b) => {
              const coverSrc = b.vehicle_cover ? `${API_URL}/${b.vehicle_cover}` : null;

              return (
                <Link key={b.id} to={`/bookings/${b.id}`} className="mb__card">
                  <div className="mb__card-image-wrap">
                    {coverSrc ? (
                      <img src={coverSrc} alt={b.vehicle_title} className="mb__card-image" />
                    ) : (
                      <div className="mb__card-placeholder">Kein Bild</div>
                    )}
                    {(b.owner_swap_unlocked === '1' || b.owner_swap_unlocked === 1) && (
                      <span className="grape-flex-badge grape-flex-badge--sm">Tauschpartner</span>
                    )}
                  </div>

                  <div className="mb__card-body">
                    <div className="mb__card-top">
                      <h3 className="mb__card-title">{b.vehicle_title}</h3>
                      <BookingStatusBadge status={b.status} size="sm" />
                    </div>

                    <div className="mb__card-meta">
                      <span>{formatGerman(b.start_date)} – {formatGerman(b.end_date)}</span>
                      <span>{b.days_count} {b.days_count === 1 ? 'Nacht' : 'Nächte'}</span>
                    </div>

                    <div className="mb__card-bottom">
                      <span className="mb__card-price">{fmt(b.total_price)} {b.currency}</span>
                      <span className="mb__card-date">Gebucht am {formatGerman(b.created_at?.split(' ')[0])}</span>
                    </div>

                    {['pending_contract', 'confirmed', 'completed'].includes(b.status) && (
                      <span
                        className="mb__card-contract"
                        onClick={(e) => { e.preventDefault(); window.location.href = `/bookings/${b.id}/contract`; }}
                      >
                        📄 {b.status === 'pending_contract' ? 'Vertrag ausfüllen' : 'Mietvertrag ansehen'}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mb__pagination">
              <button
                type="button"
                className="mb__page-btn"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ← Zurück
              </button>
              <span className="mb__page-info">Seite {page} von {totalPages}</span>
              <button
                type="button"
                className="mb__page-btn"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Weiter →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function formatGerman(dateStr) {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  return `${parseInt(d, 10)}.${parseInt(m, 10)}.${y}`;
}

function fmt(val) {
  return parseFloat(val).toLocaleString('de-DE', { minimumFractionDigits: 2 });
}