import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/apiClient';
import BookingStatusBadge from '../bookings/BookingStatusBadge';
import Loader from '../../components/common/Loader';
import SwapUnlockProgress from './SwapUnlockProgress';
import useAuth from '../../hooks/useAuth';

function fmt(val) {
  return parseFloat(val).toLocaleString('de-DE', { minimumFractionDigits: 2 });
}

function fmtDate(dateStr) {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  return `${parseInt(d, 10)}.${parseInt(m, 10)}.${y}`;
}

export default function OwnerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/api/owner/dashboard');
        setStats(res.data?.data || res.data);
      } catch (err) {
        setError(err.message || 'Dashboard konnte nicht geladen werden.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <Loader size="lg" text="Dashboard wird geladen…" />;
  if (error) return <div className="dash__empty"><p>{error}</p></div>;

  const tiles = [
    { label: 'Fahrzeuge gesamt', value: stats.vehicles_total },
    { label: 'Fahrzeuge aktiv', value: stats.vehicles_active, accent: 'success' },
    { label: 'Offene Anfragen', value: stats.pending_requests, accent: stats.pending_requests > 0 ? 'warning' : undefined },
    { label: 'Aktive Buchungen', value: stats.active_bookings, accent: 'success' },
    { label: 'Abgeschlossen', value: stats.completed_bookings },
    { label: 'Offene Tauschangebote', value: stats.pending_swaps },
  ];

  return (
    <>
      {/* Header */}
      <div className="dash__header">
        <div>
          <h1 className="dash__greeting">Willkommen, {user?.first_name}</h1>
          <p className="dash__subtitle">Dein Vermieter-Dashboard – alle Anfragen und Fahrzeuge auf einen Blick.</p>
        </div>
        <span className="dash__role-badge">Vermieter</span>
      </div>

      {/* Pending requests highlight */}
      {stats.pending_requests > 0 && (
        <div className="dash__highlight">
          <span className="dash__highlight-icon">📬</span>
          <div className="dash__highlight-body">
            <h3 className="dash__highlight-title">Offene Buchungsanfragen</h3>
            <p className="dash__highlight-text">
              Du hast <strong>{stats.pending_requests}</strong> neue Anfrage{stats.pending_requests > 1 ? 'n' : ''}, die auf deine Bestätigung warten.
            </p>
            <Link to="/owner/bookings" className="dash__highlight-link">
              Anfragen ansehen →
            </Link>
          </div>
        </div>
      )}

      {stats.vehicles_total === 0 && (
        <div className="dash__highlight">
          <span className="dash__highlight-icon">🚐</span>
          <div className="dash__highlight-body">
            <h3 className="dash__highlight-title">Noch keine Fahrzeuge</h3>
            <p className="dash__highlight-text">
              Erstelle dein erstes Inserat und beginne, Einnahmen zu generieren!
            </p>
            <Link to="/owner/vehicles/new" className="dash__highlight-link">
              Fahrzeug anlegen →
            </Link>
          </div>
        </div>
      )}

      {/* Stat tiles */}
      <div className="dash__tiles">
        {tiles.map((t) => (
          <div key={t.label} className="dash__tile">
            <span className="dash__tile-label">{t.label}</span>
            <span className={`dash__tile-value${t.accent ? ` dash__tile-value--${t.accent}` : ''}`}>
              {t.value}
            </span>
          </div>
        ))}
      </div>

      {/* Revenue teaser */}
      <Link to="/owner/revenue" className="dash__revenue">
        <div className="dash__revenue-main">
          <span className="dash__revenue-label">Einnahmen (bezahlt)</span>
          <span className="dash__revenue-value">{fmt(stats.revenue)} €</span>
        </div>
        <span className="dash__revenue-action">Details anzeigen →</span>
      </Link>

      {/* Swap unlock gamification */}
      <SwapUnlockProgress />

      {/* Upcoming handovers */}
      {stats.upcoming_bookings?.length > 0 ? (
        <>
          <h2 className="dash__section-title">Anstehende Übergaben</h2>
          <div className="dash__upcoming">
            {stats.upcoming_bookings.map((b) => {
              const startDate = new Date(b.start_date);
              const now = new Date();
              const diffDays = Math.ceil((startDate - now) / (1000 * 60 * 60 * 24));
              const urgent = diffDays <= 3;

              return (
                <Link to={`/bookings/${b.id}`} key={b.id} className={`dash__upcoming-card${urgent ? ' dash__upcoming-card--urgent' : ''}`}>
                  <div className="dash__upcoming-date">
                    <span className="dash__upcoming-day">{startDate.getDate()}</span>
                    <span className="dash__upcoming-month">{startDate.toLocaleDateString('de-DE', { month: 'short' })}</span>
                  </div>
                  <div className="dash__upcoming-body">
                    <span className="dash__upcoming-vehicle">{b.vehicle_title}</span>
                    <span className="dash__upcoming-renter">{b.renter_first_name} {b.renter_last_name}</span>
                    <span className="dash__upcoming-range">{fmtDate(b.start_date)} – {fmtDate(b.end_date)}</span>
                  </div>
                  {urgent && <span className="dash__upcoming-badge">Bald</span>}
                </Link>
              );
            })}
          </div>
        </>
      ) : (
        stats.active_bookings > 0 ? null : (
          <div className="dash__upcoming-empty">
            <p className="dash__upcoming-empty-text">Keine anstehenden Übergaben</p>
          </div>
        )
      )}

      {/* Recent booking requests table */}
      {stats.recent_requests?.length > 0 && (
        <>
          <h2 className="dash__section-title">Neueste Buchungsanfragen</h2>
          <div className="dash__table-wrap">
            <table className="dash__table">
              <thead>
                <tr>
                  <th>Fahrzeug</th>
                  <th>Mieter</th>
                  <th>Zeitraum</th>
                  <th>Preis</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent_requests.map((r) => (
                  <tr key={r.id} className="dash__table-row--clickable" onClick={() => navigate(`/bookings/${r.id}`)}>
                    <td>
                      <Link to={`/bookings/${r.id}`} className="dash__table-link" onClick={e => e.stopPropagation()}>
                        {r.vehicle_title}
                      </Link>
                    </td>
                    <td>{r.renter_first_name} {r.renter_last_name}</td>
                    <td>{fmtDate(r.start_date)} – {fmtDate(r.end_date)}</td>
                    <td>{fmt(r.total_price)} {r.currency}</td>
                    <td><BookingStatusBadge status={r.status} size="sm" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
