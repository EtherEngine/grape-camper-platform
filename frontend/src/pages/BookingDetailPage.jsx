import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import BookingsApi from '../features/bookings/BookingsApi';
import PaymentsApi from '../features/payments/PaymentsApi';
import PaymentStatus from '../features/payments/PaymentStatus';
import BookingStatusBadge from '../features/bookings/BookingStatusBadge';
import Loader from '../components/common/Loader';
import useAuth from '../hooks/useAuth';
import './BookingDetailPage.css';

/** Statuses that allow renter cancellation */
const RENTER_CANCEL_STATUSES = ['pending_owner_review', 'pending_payment', 'pending_contract', 'confirmed'];
/** Statuses where renter can see owner contact + location */
const CONTACT_VISIBLE_STATUSES = ['confirmed', 'completed'];
/** Statuses where contract link should be shown */
const CONTRACT_STATUSES = ['pending_contract', 'confirmed', 'completed'];
/** Statuses that allow owner actions */
const OWNER_APPROVE_STATUS = 'pending_owner_review';
const OWNER_COMPLETE_STATUS = 'confirmed';

export default function BookingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Action states
  const [actionLoading, setActionLoading] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelComment, setCancelComment] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [paymentId, setPaymentId] = useState(null);

  const fetchBooking = useCallback(async () => {
    setLoading(true);
    setError(null);
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

  // ── Role checks ─────────────────────────────────────────
  const isRenter = booking && user && parseInt(booking.user_id) === user.id;
  const isOwner = booking && user && parseInt(booking.owner_id) === user.id;
  const canCancel = isRenter && RENTER_CANCEL_STATUSES.includes(booking?.status);
  const canApprove = isOwner && booking?.status === OWNER_APPROVE_STATUS;
  const canReject = isOwner && booking?.status === OWNER_APPROVE_STATUS;
  const canComplete = isOwner && booking?.status === OWNER_COMPLETE_STATUS;
  const canConfirm = isRenter && booking?.status === 'pending_payment';
  const showContact = isRenter && CONTACT_VISIBLE_STATUSES.includes(booking?.status);
  const showContract = CONTRACT_STATUSES.includes(booking?.status);

  // ── Actions ─────────────────────────────────────────────
  const handleCancel = async () => {
    setActionLoading(true);
    try {
      await BookingsApi.cancel(id, cancelComment || null);
      setShowCancelModal(false);
      setCancelComment('');
      await fetchBooking();
    } catch (err) {
      setError(err.message || 'Stornierung fehlgeschlagen.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      await BookingsApi.approve(id);
      await fetchBooking();
    } catch (err) {
      setError(err.message || 'Bestätigung fehlgeschlagen.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    setActionLoading(true);
    try {
      await BookingsApi.reject(id, rejectReason || null);
      setShowRejectModal(false);
      setRejectReason('');
      await fetchBooking();
    } catch (err) {
      setError(err.message || 'Ablehnung fehlgeschlagen.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async () => {
    setActionLoading(true);
    try {
      await BookingsApi.complete(id);
      await fetchBooking();
    } catch (err) {
      setError(err.message || 'Abschluss fehlgeschlagen.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirm = async () => {
    setActionLoading(true);
    try {
      const method = booking.payment_method && booking.payment_method !== 'none'
        ? booking.payment_method
        : 'paypal';
      const payRes = await PaymentsApi.initiate(booking.id, method);
      const pId = payRes.data?.data?.id || payRes.data?.data?.payment_id;
      setPaymentId(pId);
    } catch (err) {
      setError(err.message || 'Zahlung konnte nicht gestartet werden.');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePaymentPaid = async () => {
    setPaymentId(null);
    await fetchBooking();
  };

  const handlePaymentFailed = () => {
    // Stay on page so user can retry
  };

  // ── Render ──────────────────────────────────────────────
  if (loading) return <Loader size="lg" text="Buchung wird geladen…" />;
  if (error && !booking) return (
    <div className="bd container">
      <div className="bd__error">
        <p>{error}</p>
        <button type="button" className="bd__btn bd__btn--primary" onClick={() => navigate(-1)}>Zurück</button>
      </div>
    </div>
  );
  if (!booking) return (
    <div className="bd container">
      <div className="bd__error"><p>Buchung nicht gefunden.</p></div>
    </div>
  );

  return (
    <div className="bd container">
      {/* Modals */}
      {showCancelModal && (
        <div className="bd__modal-backdrop" onClick={() => setShowCancelModal(false)}>
          <div className="bd__modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="bd__modal-title">Buchung stornieren</h3>
            <p className="bd__modal-desc">Bist du sicher, dass du diese Buchung stornieren möchtest?</p>
            <textarea
              className="bd__modal-textarea"
              placeholder="Grund (optional)…"
              value={cancelComment}
              onChange={(e) => setCancelComment(e.target.value)}
              rows={3}
            />
            <div className="bd__modal-actions">
              <button type="button" className="bd__btn bd__btn--secondary" onClick={() => setShowCancelModal(false)}>
                Abbrechen
              </button>
              <button type="button" className="bd__btn bd__btn--danger" disabled={actionLoading} onClick={handleCancel}>
                {actionLoading ? 'Wird storniert…' : 'Stornieren'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRejectModal && (
        <div className="bd__modal-backdrop" onClick={() => setShowRejectModal(false)}>
          <div className="bd__modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="bd__modal-title">Buchung ablehnen</h3>
            <textarea
              className="bd__modal-textarea"
              placeholder="Grund für die Ablehnung (optional)…"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
            />
            <div className="bd__modal-actions">
              <button type="button" className="bd__btn bd__btn--secondary" onClick={() => setShowRejectModal(false)}>
                Abbrechen
              </button>
              <button type="button" className="bd__btn bd__btn--danger" disabled={actionLoading} onClick={handleReject}>
                {actionLoading ? 'Wird gesendet…' : 'Ablehnen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bd__header">
        <button type="button" className="bd__back" onClick={() => navigate(-1)}>← Zurück</button>
        <div className="bd__header-main">
          <h1 className="bd__title">Buchung #{booking.id}</h1>
          <BookingStatusBadge status={booking.status} size="lg" />
          <Link to={`/bookings/${booking.id}/print`} className="bd__print-link">🖨 Drucken</Link>
        </div>
      </div>

      {error && <div className="bd__error-msg">{error}</div>}

      {/* Payment flow in progress */}
      {paymentId && (
        <section className="bd__section" style={{ marginBottom: 'var(--space-6)' }}>
          <h2 className="bd__section-title">Zahlung</h2>
          <PaymentStatus
            paymentId={paymentId}
            onPaid={handlePaymentPaid}
            onFailed={handlePaymentFailed}
          />
        </section>
      )}

      <div className="bd__grid">
        {/* Main info */}
        <div className="bd__main">
          {/* Vehicle */}
          <section className="bd__section">
            <h2 className="bd__section-title">Fahrzeug</h2>
            <div className="bd__info-row">
              <span className="bd__label">Fahrzeug</span>
              <Link to={`/vehicles/${booking.vehicle_id}`} className="bd__vehicle-link">
                {booking.vehicle_title}
              </Link>
            </div>
          </section>

          {/* Dates */}
          <section className="bd__section">
            <h2 className="bd__section-title">Zeitraum</h2>
            <div className="bd__info-row">
              <span className="bd__label">Check-in</span>
              <span>{formatGerman(booking.start_date)}</span>
            </div>
            <div className="bd__info-row">
              <span className="bd__label">Check-out</span>
              <span>{formatGerman(booking.end_date)}</span>
            </div>
            <div className="bd__info-row">
              <span className="bd__label">Dauer</span>
              <span>{booking.days_count} {booking.days_count === 1 ? 'Nacht' : 'Nächte'}</span>
            </div>
          </section>

          {/* Pricing */}
          <section className="bd__section">
            <h2 className="bd__section-title">Kosten</h2>
            <div className="bd__info-row">
              <span className="bd__label">Grundpreis</span>
              <span>{fmt(booking.base_price)} €</span>
            </div>
            {parseFloat(booking.cleaning_fee) > 0 && (
              <div className="bd__info-row">
                <span className="bd__label">Reinigungsgebühr</span>
                <span>{fmt(booking.cleaning_fee)} €</span>
              </div>
            )}
            {parseFloat(booking.service_fee) > 0 && (
              <div className="bd__info-row">
                <span className="bd__label">Servicegebühr</span>
                <span>{fmt(booking.service_fee)} €</span>
              </div>
            )}
            <div className="bd__info-row bd__info-row--total">
              <span className="bd__label">Gesamtpreis</span>
              <span>{fmt(booking.total_price)} {booking.currency}</span>
            </div>
            {parseFloat(booking.deposit_amount) > 0 && (
              <div className="bd__info-row bd__info-row--muted">
                <span className="bd__label">Kaution</span>
                <span>{fmt(booking.deposit_amount)} €</span>
              </div>
            )}
          </section>

          {/* Notes */}
          {booking.customer_notes && (
            <section className="bd__section">
              <h2 className="bd__section-title">Anmerkungen</h2>
              <p className="bd__note-text">{booking.customer_notes}</p>
            </section>
          )}

          {booking.rejection_reason && (
            <section className="bd__section bd__section--danger">
              <h2 className="bd__section-title">Ablehnungsgrund</h2>
              <p className="bd__note-text">{booking.rejection_reason}</p>
            </section>
          )}

          {/* Owner contact & vehicle location — only for confirmed/completed bookings */}
          {showContact && (
            <section className="bd__section bd__section--contact">
              <h2 className="bd__section-title">Kontakt & Standort</h2>

              <div className="bd__contact-grid">
                <div className="bd__contact-card">
                  <h3 className="bd__contact-heading">Vermieter</h3>
                  <p className="bd__contact-name">
                    {booking.owner_first_name} {booking.owner_last_name}
                  </p>
                  {booking.owner_email && (
                    <a href={`mailto:${booking.owner_email}`} className="bd__contact-link">
                      ✉ {booking.owner_email}
                    </a>
                  )}
                  {booking.owner_phone && (
                    <a href={`tel:${booking.owner_phone}`} className="bd__contact-link">
                      ☎ {booking.owner_phone}
                    </a>
                  )}
                </div>

                <div className="bd__contact-card">
                  <h3 className="bd__contact-heading">Fahrzeugstandort</h3>
                  <p className="bd__contact-location">
                    📍 {booking.vehicle_city}{booking.vehicle_country ? `, ${booking.vehicle_country}` : ''}
                  </p>
                </div>
              </div>

              {booking.vehicle_lat && booking.vehicle_lng && (
                <div className="bd__map-wrap">
                  <iframe
                    title="Fahrzeugstandort"
                    className="bd__map"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${(parseFloat(booking.vehicle_lng) - 0.01).toFixed(6)}%2C${(parseFloat(booking.vehicle_lat) - 0.008).toFixed(6)}%2C${(parseFloat(booking.vehicle_lng) + 0.01).toFixed(6)}%2C${(parseFloat(booking.vehicle_lat) + 0.008).toFixed(6)}&layer=mapnik&marker=${parseFloat(booking.vehicle_lat).toFixed(6)}%2C${parseFloat(booking.vehicle_lng).toFixed(6)}`}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${booking.vehicle_lat}&mlon=${booking.vehicle_lng}#map=15/${booking.vehicle_lat}/${booking.vehicle_lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bd__map-link"
                  >
                    Größere Karte anzeigen ↗
                  </a>
                </div>
              )}
            </section>
          )}

          {/* History */}
          {booking.history?.length > 0 && (
            <section className="bd__section">
              <h2 className="bd__section-title">Verlauf</h2>
              <div className="bd__history">
                {booking.history.map((h, i) => (
                  <div key={i} className="bd__history-item">
                    <div className="bd__history-dot" />
                    <div className="bd__history-body">
                      <div className="bd__history-top">
                        {h.old_status && (
                          <BookingStatusBadge status={h.old_status} size="sm"
                            label={h.old_status === 'pending_payment' && booking.swap_offer_id ? 'Tauschangebot ausstehend' : undefined}
                          />
                        )}
                        {h.old_status && <span className="bd__history-arrow">→</span>}
                        <BookingStatusBadge status={h.new_status} size="sm"
                          label={h.new_status === 'pending_payment' && booking.swap_offer_id ? 'Tauschangebot ausstehend' : undefined}
                        />
                      </div>
                      {h.comment && <p className="bd__history-comment">{h.comment}</p>}
                      <span className="bd__history-meta">
                        {h.changed_by_name || `Nutzer #${h.changed_by}`} · {formatDateTime(h.created_at)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Sidebar: Actions */}
        <aside className="bd__sidebar">
          <div className="bd__actions-card">
            <h3 className="bd__actions-title">Aktionen</h3>

            {canConfirm && !paymentId && (
              <button
                type="button"
                className="bd__btn bd__btn--primary bd__btn--full"
                disabled={actionLoading}
                onClick={handleConfirm}
              >
                {actionLoading ? 'Wird gestartet…' : '💳 Jetzt bezahlen'}
              </button>
            )}

            {canApprove && (
              <button
                type="button"
                className="bd__btn bd__btn--success bd__btn--full"
                disabled={actionLoading}
                onClick={handleApprove}
              >
                Buchung bestätigen
              </button>
            )}

            {canReject && (
              <button
                type="button"
                className="bd__btn bd__btn--danger bd__btn--full"
                disabled={actionLoading}
                onClick={() => setShowRejectModal(true)}
              >
                Ablehnen
              </button>
            )}

            {canComplete && (
              <button
                type="button"
                className="bd__btn bd__btn--primary bd__btn--full"
                disabled={actionLoading}
                onClick={handleComplete}
              >
                Abschließen
              </button>
            )}

            {canCancel && (
              <button
                type="button"
                className="bd__btn bd__btn--danger-outline bd__btn--full"
                disabled={actionLoading}
                onClick={() => setShowCancelModal(true)}
              >
                Stornieren
              </button>
            )}

            {isRenter && booking?.status === 'pending_owner_review' && (
              <p className="bd__hint">⏳ Warte auf die Bestätigung des Vermieters. Du kannst bezahlen, sobald die Buchung freigegeben wurde.</p>
            )}

            {showContract && (
              <Link to={`/bookings/${booking.id}/contract`} className="bd__btn bd__btn--primary bd__btn--full bd__btn--contract">
                📄 Mietvertrag {booking.status === 'pending_contract' ? 'ausfüllen' : 'ansehen'}
              </Link>
            )}

            {!canConfirm && !canApprove && !canReject && !canComplete && !canCancel && !showContract && booking?.status !== 'pending_owner_review' && (
              <p className="bd__no-actions">Keine Aktionen verfügbar.</p>
            )}

            <div className="bd__meta-block">
              <div className="bd__meta-row">
                <span>Zahlungsstatus</span>
                <span>{paymentLabel(booking.payment_status)}</span>
              </div>
              <div className="bd__meta-row">
                <span>Erstellt</span>
                <span>{formatDateTime(booking.created_at)}</span>
              </div>
              {booking.confirmed_at && (
                <div className="bd__meta-row">
                  <span>Bestätigt</span>
                  <span>{formatDateTime(booking.confirmed_at)}</span>
                </div>
              )}
              {booking.completed_at && (
                <div className="bd__meta-row">
                  <span>Abgeschlossen</span>
                  <span>{formatDateTime(booking.completed_at)}</span>
                </div>
              )}
              {booking.cancelled_at && (
                <div className="bd__meta-row">
                  <span>Storniert</span>
                  <span>{formatDateTime(booking.cancelled_at)}</span>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────

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

function paymentLabel(status) {
  switch (status) {
    case 'unpaid': return 'Offen';
    case 'paid': return 'Bezahlt';
    case 'refunded': return 'Erstattet';
    case 'partially_refunded': return 'Teilerstattet';
    default: return status || '—';
  }
}
