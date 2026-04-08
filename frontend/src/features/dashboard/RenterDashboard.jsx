import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/apiClient';
import BookingStatusBadge from '../bookings/BookingStatusBadge';
import Loader from '../../components/common/Loader';
import useAuth from '../../hooks/useAuth';

function fmt(val) {
  return parseFloat(val).toLocaleString('de-DE', { minimumFractionDigits: 2 });
}

function fmtDate(dateStr) {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  return `${parseInt(d, 10)}.${parseInt(m, 10)}.${y}`;
}

export default function RenterDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/api/dashboard');
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
    { label: 'Aktive Buchungen', value: stats.bookings_active, accent: 'success' },
    { label: 'Ausstehend', value: stats.bookings_pending, accent: stats.bookings_pending > 0 ? 'warning' : undefined },
    { label: 'Abgeschlossen', value: stats.bookings_completed },
    { label: 'Gesamt', value: stats.bookings_total },
    { label: 'Ausgaben (bezahlt)', value: `${fmt(stats.total_spent)} €`, accent: 'primary' },
    { label: 'Tauschangebote', value: stats.swap_offers },
  ];

  return (
    <>
      {/* Header */}
      <div className="dash__header">
        <div>
          <h1 className="dash__greeting">Hallo, {user?.first_name}</h1>
          <p className="dash__subtitle">Hier ist dein Überblick über deine Buchungen und Aktivitäten.</p>
        </div>
        <span className="dash__role-badge">Mieter</span>
      </div>

      {/* Upcoming trip highlight */}
      {stats.upcoming_trip && (
        <div className="dash__highlight">
          <span className="dash__highlight-icon">🏕️</span>
          <div className="dash__highlight-body">
            <h3 className="dash__highlight-title">Nächste Reise</h3>
            <p className="dash__highlight-text">
              <strong>{stats.upcoming_trip.vehicle_title}</strong><br />
              {fmtDate(stats.upcoming_trip.start_date)} – {fmtDate(stats.upcoming_trip.end_date)}
            </p>
            <Link to={`/bookings/${stats.upcoming_trip.id}`} className="dash__highlight-link">
              Details anzeigen →
            </Link>
          </div>
        </div>
      )}

      {!stats.upcoming_trip && stats.bookings_total === 0 && (
        <div className="dash__highlight">
          <span className="dash__highlight-icon">🚐</span>
          <div className="dash__highlight-body">
            <h3 className="dash__highlight-title">Bereit für dein erstes Abenteuer?</h3>
            <p className="dash__highlight-text">
              Stöbere durch unsere Fahrzeuge und buche deinen ersten Camper-Trip!
            </p>
            <Link to="/vehicles" className="dash__highlight-link">
              Fahrzeuge entdecken →
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

      {/* Action needed */}
      {stats.action_needed?.length > 0 && (
        <>
          <h2 className="dash__section-title">Nächste Schritte</h2>
          <div className="dash__actions-list">
            {stats.action_needed.map((b) => {
              const actionLabel = b.status === 'pending_payment' ? 'Zahlung ausstehend'
                : b.status === 'pending_contract' ? 'Vertrag unterschreiben'
                : 'Aktion erforderlich';

              return (
                <Link to={`/bookings/${b.id}`} key={b.id} className="dash__action-item">
                  <div className="dash__action-body">
                    <span className="dash__action-vehicle">{b.vehicle_title}</span>
                    <span className="dash__action-dates">{fmtDate(b.start_date)} – {fmtDate(b.end_date)}</span>
                  </div>
                  <span className="dash__action-label">{actionLabel}</span>
                </Link>
              );
            })}
          </div>
        </>
      )}

      {/* Recent bookings table */}
      {stats.recent_bookings?.length > 0 && (
        <>
          <h2 className="dash__section-title">Letzte Buchungen</h2>
          <div className="dash__table-wrap">
            <table className="dash__table">
              <thead>
                <tr>
                  <th>Fahrzeug</th>
                  <th>Zeitraum</th>
                  <th>Preis</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent_bookings.map((b) => (
                  <tr key={b.id} className="dash__table-row--clickable" onClick={() => navigate(`/bookings/${b.id}`)}>
                    <td>
                      <Link to={`/bookings/${b.id}`} className="dash__table-link" onClick={e => e.stopPropagation()}>
                        {b.vehicle_title}
                      </Link>
                    </td>
                    <td>{fmtDate(b.start_date)} – {fmtDate(b.end_date)}</td>
                    <td>{fmt(b.total_price)} {b.currency}</td>
                    <td><BookingStatusBadge status={b.status} size="sm" /></td>
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
