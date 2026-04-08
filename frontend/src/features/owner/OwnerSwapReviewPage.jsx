import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import SwapsApi from '../swaps/SwapsApi';
import SwapUnlockProgress from './SwapUnlockProgress';
import Loader from '../../components/common/Loader';
import './OwnerSwapReview.css';

const STATUS_TABS = [
  { value: '',             label: 'Alle' },
  { value: 'pending',      label: 'Offen' },
  { value: 'under_review', label: 'In Prüfung' },
  { value: 'accepted',     label: 'Angenommen' },
  { value: 'rejected',     label: 'Abgelehnt' },
  { value: 'cancelled',    label: 'Storniert' },
];

const STATUS_LABELS = {
  pending:      'Offen',
  under_review: 'In Prüfung',
  accepted:     'Angenommen',
  rejected:     'Abgelehnt',
  cancelled:    'Storniert',
};

const TYPE_LABELS = {
  vehicle:  '🚐 Fahrzeug',
  property: '🏠 Immobilie',
  other:    '📦 Sonstiges',
};

export default function OwnerSwapReviewPage() {
  const [unlockStatus, setUnlockStatus] = useState(null);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Detail panel
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Actions
  const [actionLoading, setActionLoading] = useState(null);
  const [comment, setComment] = useState('');
  const [actionModal, setActionModal] = useState(null); // { type: 'accept'|'reject', id }
  const [successMsg, setSuccessMsg] = useState(null);

  const perPage = 10;

  // ── Check unlock status ─────────────────────────────────
  useEffect(() => {
    SwapsApi.getUnlockProgress().then((res) => {
      setUnlockStatus(res.data?.data || res.data);
    }).catch(() => {});
  }, []);

  // ── Fetch list ──────────────────────────────────────────
  const fetchOffers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, per_page: perPage };
      if (statusFilter) params.status = statusFilter;
      const res = await SwapsApi.ownerList(params);
      const d = res.data?.data || res.data;
      setOffers(d?.items || d || []);
      setTotal(d?.total ?? 0);
    } catch (err) {
      setError(err.response?.data?.message || 'Tauschangebote konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => { fetchOffers(); }, [fetchOffers]);

  // ── Fetch detail ────────────────────────────────────────
  const handleSelectOffer = async (id) => {
    if (selected?.id === id) {
      setSelected(null);
      return;
    }
    setDetailLoading(true);
    try {
      const res = await SwapsApi.get(id);
      setSelected(res.data?.data || res.data);
    } catch {
      setSelected(null);
    } finally {
      setDetailLoading(false);
    }
  };

  // ── Filter ──────────────────────────────────────────────
  const handleFilterChange = (val) => {
    setStatusFilter(val);
    setPage(1);
    setSelected(null);
  };

  // ── Actions ─────────────────────────────────────────────
  const openActionModal = (type, id) => {
    setActionModal({ type, id });
    setComment('');
    setSuccessMsg(null);
  };

  const closeActionModal = () => {
    setActionModal(null);
    setComment('');
  };

  const handleReview = async (id) => {
    setActionLoading(id);
    try {
      await SwapsApi.review(id);
      setSuccessMsg('Angebot wird geprüft.');
      await fetchOffers();
      if (selected?.id === id) {
        const res = await SwapsApi.get(id);
        setSelected(res.data?.data || res.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Aktion fehlgeschlagen.');
    } finally {
      setActionLoading(null);
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  const handleActionSubmit = async () => {
    if (!actionModal) return;
    const { type, id } = actionModal;
    setActionLoading(id);

    try {
      if (type === 'accept') {
        await SwapsApi.accept(id, comment || null);
        setSuccessMsg('Tauschangebot angenommen.');
      } else {
        await SwapsApi.reject(id, comment || null);
        setSuccessMsg('Tauschangebot abgelehnt.');
      }
      closeActionModal();
      await fetchOffers();
      if (selected?.id === id) {
        const res = await SwapsApi.get(id);
        setSelected(res.data?.data || res.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Aktion fehlgeschlagen.');
    } finally {
      setActionLoading(null);
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  const totalPages = Math.ceil(total / perPage);

  if (unlockStatus && !unlockStatus.unlocked) {
    return (
      <div className="osr container">
        <h1 className="osr__title">Tauschangebote</h1>
        <SwapUnlockProgress />
        <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', marginTop: 'var(--space-4)' }}>
          Die Tauschoption ist noch nicht freigeschaltet. Erfülle die Bedingungen oder löse einen Freischalt-Code ein.
        </p>
      </div>
    );
  }

  return (
    <div className="osr container">
      <h1 className="osr__title">Tauschangebote prüfen</h1>

      {/* ── Success toast ──────────────────────────────── */}
      {successMsg && (
        <div className="osr__toast osr__toast--success">{successMsg}</div>
      )}

      {/* ── Status tabs ────────────────────────────────── */}
      <div className="osr__tabs">
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

      {/* ── Action modal (accept/reject) ───────────────── */}
      {actionModal && (
        <div className="ob__modal-backdrop" onClick={closeActionModal}>
          <div className="ob__modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="ob__modal-title">
              {actionModal.type === 'accept' ? 'Tauschangebot annehmen' : 'Tauschangebot ablehnen'}
            </h3>
            <p className="osr__modal-desc">
              {actionModal.type === 'accept'
                ? 'Bestätige das Angebot. Der geschätzte Wert wird als Rabatt auf die Buchung angerechnet.'
                : 'Lehne das Angebot ab. Du kannst dem Mieter einen Grund mitteilen.'
              }
            </p>
            <textarea
              className="ob__modal-textarea"
              placeholder="Kommentar (optional)…"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
            <div className="ob__modal-actions">
              <button
                type="button"
                className="ob__btn ob__btn--secondary"
                onClick={closeActionModal}
              >
                Abbrechen
              </button>
              <button
                type="button"
                className={`ob__btn ${actionModal.type === 'accept' ? 'ob__btn--success' : 'ob__btn--danger'}`}
                disabled={actionLoading === actionModal.id}
                onClick={handleActionSubmit}
              >
                {actionLoading === actionModal.id
                  ? 'Wird gesendet…'
                  : actionModal.type === 'accept' ? 'Annehmen' : 'Ablehnen'
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Content ────────────────────────────────────── */}
      {loading ? (
        <Loader size="lg" text="Tauschangebote werden geladen…" />
      ) : error ? (
        <div className="ob__error">
          <p>{error}</p>
          <button type="button" className="ob__retry" onClick={() => { setError(null); fetchOffers(); }}>
            Erneut versuchen
          </button>
        </div>
      ) : offers.length === 0 ? (
        <div className="ob__empty">
          <p>Keine Tauschangebote vorhanden.</p>
        </div>
      ) : (
        <div className="osr__layout">
          {/* ── Offer list ─────────────────────────────── */}
          <div className="osr__list">
            {offers.map((o) => {
              const isActive = selected?.id === o.id;
              const isActing = actionLoading === o.id;
              return (
                <div
                  key={o.id}
                  className={`osr__card ${isActive ? 'osr__card--active' : ''}`}
                  onClick={() => handleSelectOffer(o.id)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="osr__card-header">
                    <span className="osr__card-type">{TYPE_LABELS[o.type] || o.type}</span>
                    <span className={`osr__status osr__status--${o.status}`}>
                      {STATUS_LABELS[o.status] || o.status}
                    </span>
                  </div>

                  <h3 className="osr__card-title">{o.title}</h3>

                  <div className="osr__card-meta">
                    {o.first_name && (
                      <span className="osr__card-renter">
                        von {o.first_name} {o.last_name}
                      </span>
                    )}
                    {o.vehicle_title && (
                      <span className="osr__card-vehicle">
                        für {o.vehicle_title}
                      </span>
                    )}
                  </div>

                  <div className="osr__card-bottom">
                    <span className="osr__card-value">
                      {fmt(o.estimated_value)} {o.currency}
                    </span>
                    <span className="osr__card-date">{formatGerman(o.created_at?.split(' ')[0] || o.created_at)}</span>
                  </div>

                  {/* Quick actions */}
                  <div className="osr__card-actions" onClick={(e) => e.stopPropagation()}>
                    {o.status === 'pending' && (
                      <button
                        type="button"
                        className="ob__btn ob__btn--primary"
                        disabled={isActing}
                        onClick={() => handleReview(o.id)}
                      >
                        In Prüfung
                      </button>
                    )}
                    {(o.status === 'pending' || o.status === 'under_review') && (
                      <>
                        <button
                          type="button"
                          className="ob__btn ob__btn--success"
                          disabled={isActing}
                          onClick={() => openActionModal('accept', o.id)}
                        >
                          Annehmen
                        </button>
                        <button
                          type="button"
                          className="ob__btn ob__btn--danger"
                          disabled={isActing}
                          onClick={() => openActionModal('reject', o.id)}
                        >
                          Ablehnen
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Pagination */}
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
          </div>

          {/* ── Detail panel ───────────────────────────── */}
          {(selected || detailLoading) && (
            <aside className="osr__detail">
              {detailLoading ? (
                <Loader text="Wird geladen…" />
              ) : selected ? (
                <>
                  <div className="osr__detail-header">
                    <h2 className="osr__detail-title">{selected.title}</h2>
                    <button
                      type="button"
                      className="osr__detail-close"
                      onClick={() => setSelected(null)}
                      aria-label="Schließen"
                    >
                      ✕
                    </button>
                  </div>

                  <span className={`osr__status osr__status--${selected.status}`}>
                    {STATUS_LABELS[selected.status] || selected.status}
                  </span>

                  <div className="osr__detail-section">
                    <h4>Art</h4>
                    <p>{TYPE_LABELS[selected.type] || selected.type}</p>
                  </div>

                  <div className="osr__detail-section">
                    <h4>Beschreibung</h4>
                    <p>{selected.description || '—'}</p>
                  </div>

                  <div className="osr__detail-grid">
                    <div className="osr__detail-section">
                      <h4>Geschätzter Wert</h4>
                      <p className="osr__detail-value">{fmt(selected.estimated_value)} {selected.currency}</p>
                    </div>
                    <div className="osr__detail-section">
                      <h4>Zeitraum</h4>
                      <p>
                        {selected.available_from ? formatGerman(selected.available_from) : '—'}
                        {' – '}
                        {selected.available_to ? formatGerman(selected.available_to) : '—'}
                      </p>
                    </div>
                  </div>

                  <div className="osr__detail-section">
                    <h4>Anbieter</h4>
                    <p>
                      {selected.first_name} {selected.last_name}
                      <span className="osr__detail-email">{selected.user_email}</span>
                    </p>
                  </div>

                  {selected.booking_id && (
                    <div className="osr__detail-section">
                      <h4>Verknüpfte Buchung</h4>
                      <p>
                        {selected.vehicle_title || `Buchung #${selected.booking_id}`}
                        {selected.booking_start && (
                          <span className="osr__detail-sub">
                            {' '}({formatGerman(selected.booking_start)} – {formatGerman(selected.booking_end)})
                          </span>
                        )}
                      </p>
                      <Link to={`/bookings/${selected.booking_id}`} className="ob__btn ob__btn--secondary" style={{ marginTop: 8 }}>
                        Buchung ansehen
                      </Link>
                    </div>
                  )}

                  {selected.owner_comment && (
                    <div className="osr__detail-section">
                      <h4>Dein Kommentar</h4>
                      <p className="osr__detail-comment">{selected.owner_comment}</p>
                    </div>
                  )}

                  {/* Images */}
                  {selected.images && selected.images.length > 0 && (
                    <div className="osr__detail-section">
                      <h4>Bilder</h4>
                      <div className="osr__detail-images">
                        {selected.images.map((img) => (
                          <img
                            key={img.id}
                            src={`${import.meta.env.VITE_API_URL || 'http://localhost/grape/backend/public'}${img.file_path}`}
                            alt={img.alt_text || 'Tauschangebot'}
                            className="osr__detail-img"
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Detail actions */}
                  {(selected.status === 'pending' || selected.status === 'under_review') && (
                    <div className="osr__detail-actions">
                      {selected.status === 'pending' && (
                        <button
                          type="button"
                          className="ob__btn ob__btn--primary"
                          disabled={actionLoading === selected.id}
                          onClick={() => handleReview(selected.id)}
                        >
                          In Prüfung nehmen
                        </button>
                      )}
                      <button
                        type="button"
                        className="ob__btn ob__btn--success"
                        disabled={actionLoading === selected.id}
                        onClick={() => openActionModal('accept', selected.id)}
                      >
                        Annehmen
                      </button>
                      <button
                        type="button"
                        className="ob__btn ob__btn--danger"
                        disabled={actionLoading === selected.id}
                        onClick={() => openActionModal('reject', selected.id)}
                      >
                        Ablehnen
                      </button>
                    </div>
                  )}
                </>
              ) : null}
            </aside>
          )}
        </div>
      )}
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────

function formatGerman(dateStr) {
  if (!dateStr) return '—';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parseInt(parts[2], 10)}.${parseInt(parts[1], 10)}.${parts[0]}`;
}

function fmt(val) {
  return parseFloat(val).toLocaleString('de-DE', { minimumFractionDigits: 2 });
}
