import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import BookingsApi from '../bookings/BookingsApi';
import BookingStatusBadge from '../bookings/BookingStatusBadge';
import Loader from '../../components/common/Loader';
import './OwnerBookings.css';

const STATUS_TABS = [
  { value: '', label: 'Alle' },
  { value: 'pending_owner_review', label: 'Neue Anfragen' },
  { value: 'pending_payment', label: 'Zahlung offen' },
  { value: 'pending_contract', label: 'Vertrag offen' },
  { value: 'confirmed', label: 'Bestätigt' },
  { value: 'completed', label: 'Abgeschlossen' },
  { value: 'rejected', label: 'Abgelehnt' },
  { value: 'cancelled', label: 'Storniert' },
];

export default function OwnerBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionLoading, setActionLoading] = useState(null);
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const perPage = 10;

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, per_page: perPage };
      if (statusFilter) params.status = statusFilter;
      const res = await BookingsApi.ownerList(params);
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

  const handleFilterChange = (val) => {
    setStatusFilter(val);
    setPage(1);
  };

  // ── Actions ─────────────────────────────────────────────

  const handleApprove = async (id) => {
    setActionLoading(id);
    try {
      await BookingsApi.approve(id);
      await fetchBookings();
    } catch (err) {
      setError(err.message || 'Bestätigung fehlgeschlagen.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectId) return;
    setActionLoading(rejectId);
    try {
      await BookingsApi.reject(rejectId, rejectReason || null);
      setRejectId(null);
      setRejectReason('');
      await fetchBookings();
    } catch (err) {
      setError(err.message || 'Ablehnung fehlgeschlagen.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleComplete = async (id) => {
    setActionLoading(id);
    try {
      await BookingsApi.complete(id);
      await fetchBookings();
    } catch (err) {
      setError(err.message || 'Abschluss fehlgeschlagen.');
    } finally {
      setActionLoading(null);
    }
  };

  const totalPages = Math.ceil(total / perPage);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost/grape/backend/public';

  return (
    <div className="ob container">
      <h1 className="ob__title">Buchungsanfragen</h1>

      {/* Tabs */}
      <div className="ob__tabs">
        {STATUS_TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            className={`ob__tab ${statusFilter === t.value ? 'ob__tab--active' : ''}`}
            onClick={() => handleFilterChange(t.value)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Reject modal */}
      {rejectId && (
        <div className="ob__modal-backdrop" onClick={() => setRejectId(null)}>
          <div className="ob__modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="ob__modal-title">Buchung ablehnen</h3>
            <textarea
              className="ob__modal-textarea"
              placeholder="Grund für die Ablehnung (optional)…"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
            />
            <div className="ob__modal-actions">
              <button
                type="button"
                className="ob__btn ob__btn--secondary"
                onClick={() => { setRejectId(null); setRejectReason(''); }}
              >
                Abbrechen
              </button>
              <button
                type="button"
                className="ob__btn ob__btn--danger"
                disabled={actionLoading === rejectId}
                onClick={handleRejectSubmit}
              >
                {actionLoading === rejectId ? 'Wird gesendet…' : 'Ablehnen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <Loader size="lg" text="Buchungen werden geladen…" />
      ) : error ? (
        <div className="ob__error">
          <p>{error}</p>
          <button type="button" className="ob__retry" onClick={fetchBookings}>Erneut versuchen</button>
        </div>
      ) : bookings.length === 0 ? (
        <div className="ob__empty">
          <p>Keine Buchungsanfragen vorhanden.</p>
        </div>
      ) : (
        <>
          <div className="ob__list">
            {bookings.map((b) => {
              const isActing = actionLoading === b.id;
              const coverSrc = b.vehicle_cover ? `${API_URL}/${b.vehicle_cover}` : null;

              return (
                <div key={b.id} className="ob__card">
                  <div className="ob__card-image-wrap">
                    {coverSrc ? (
                      <img src={coverSrc} alt={b.vehicle_title} className="ob__card-image" />
                    ) : (
                      <div className="ob__card-placeholder">Kein Bild</div>
                    )}
                    {(b.owner_swap_unlocked === '1' || b.owner_swap_unlocked === 1) && (
                      <span className="grape-flex-badge grape-flex-badge--sm">Tauschpartner</span>
                    )}
                  </div>

                  <div className="ob__card-body">
                    <div className="ob__card-top">
                      <Link to={`/bookings/${b.id}`} className="ob__card-title">{b.vehicle_title}</Link>
                      <BookingStatusBadge status={b.status} size="sm" />
                    </div>

                    <div className="ob__card-renter">
                      Mieter: <strong>{b.renter_first_name} {b.renter_last_name}</strong>
                      <span className="ob__card-email">{b.renter_email}</span>
                    </div>

                    <div className="ob__card-meta">
                      <span>{formatGerman(b.start_date)} – {formatGerman(b.end_date)}</span>
                      <span>{b.days_count} {b.days_count === 1 ? 'Nacht' : 'Nächte'}</span>
                      <span className="ob__card-price">{fmt(b.total_price)} {b.currency}</span>
                    </div>

                    {b.customer_notes && (
                      <p className="ob__card-notes">"{b.customer_notes}"</p>
                    )}

                    {b.swap_title && (
                      <div className="ob__card-swap">
                        <span className="ob__card-swap-badge">🔄 Tauschangebot</span>
                        <span className="ob__card-swap-title">{b.swap_title}</span>
                        <span className="ob__card-swap-value">Wert: {fmt(b.swap_estimated_value)} {b.currency}</span>
                        {b.swap_status && (
                          <span className={`ob__card-swap-status ob__card-swap-status--${b.swap_status}`}>
                            {swapStatusLabel(b.swap_status)}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="ob__card-actions">
                      <Link to={`/bookings/${b.id}`} className="ob__btn ob__btn--secondary">
                        Details
                      </Link>

                      {['pending_contract', 'confirmed', 'completed'].includes(b.status) && (
                        <Link to={`/bookings/${b.id}/contract`} className="ob__btn ob__btn--primary">
                          📄 {b.status === 'pending_contract' ? 'Vertrag bearbeiten' : 'Vertrag ansehen'}
                        </Link>
                      )}

                      {b.status === 'pending_owner_review' && (
                        <>
                          <button
                            type="button"
                            className="ob__btn ob__btn--success"
                            disabled={isActing}
                            onClick={() => handleApprove(b.id)}
                          >
                            Bestätigen
                          </button>
                          <button
                            type="button"
                            className="ob__btn ob__btn--danger"
                            disabled={isActing}
                            onClick={() => setRejectId(b.id)}
                          >
                            Ablehnen
                          </button>
                        </>
                      )}

                      {b.status === 'confirmed' && (
                        <button
                          type="button"
                          className="ob__btn ob__btn--primary"
                          disabled={isActing}
                          onClick={() => handleComplete(b.id)}
                        >
                          Abschließen
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="ob__pagination">
              <button
                type="button"
                className="ob__page-btn"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ← Zurück
              </button>
              <span className="ob__page-info">Seite {page} von {totalPages}</span>
              <button
                type="button"
                className="ob__page-btn"
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

function swapStatusLabel(status) {
  switch (status) {
    case 'pending': return 'Ausstehend';
    case 'under_review': return 'In Prüfung';
    case 'accepted': return 'Akzeptiert';
    case 'rejected': return 'Abgelehnt';
    case 'cancelled': return 'Storniert';
    default: return status || '';
  }
}