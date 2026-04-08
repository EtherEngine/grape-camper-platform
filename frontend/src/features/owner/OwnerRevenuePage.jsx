import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/apiClient';
import Loader from '../../components/common/Loader';
import './OwnerRevenue.css';

function fmt(val) {
  return parseFloat(val).toLocaleString('de-DE', { minimumFractionDigits: 2 });
}

function fmtDate(dateStr) {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  return `${parseInt(d, 10)}.${parseInt(m, 10)}.${y}`;
}

const PAYMENT_STATUS_LABELS = {
  paid: 'Bezahlt',
  unpaid: 'Unbezahlt',
  initiated: 'Eingeleitet',
  pending: 'Ausstehend',
  refunded: 'Erstattet',
  failed: 'Fehlgeschlagen',
  partially_paid: 'Teilweise bezahlt',
};

const PAYMENT_STATUS_COLORS = {
  paid: 'var(--color-success)',
  unpaid: 'var(--color-text-muted)',
  initiated: 'var(--color-info)',
  pending: 'var(--color-warning)',
  refunded: 'var(--color-danger)',
  failed: 'var(--color-danger)',
  partially_paid: 'var(--color-warning)',
};

/* ── Simple SVG Bar Chart ──────────────────────────────── */
function BarChart({ data, height = 200 }) {
  const max = Math.max(...data.map(d => d.revenue), 1);
  const barWidth = 100 / data.length;

  return (
    <div className="rev__chart-wrap">
      <svg className="rev__chart" viewBox={`0 0 100 ${height}`} preserveAspectRatio="none">
        {data.map((d, i) => {
          const barH = (d.revenue / max) * (height - 30);
          return (
            <g key={d.month}>
              <rect
                x={i * barWidth + barWidth * 0.15}
                y={height - barH - 20}
                width={barWidth * 0.7}
                height={Math.max(barH, 1)}
                rx="1"
                className="rev__chart-bar"
              />
            </g>
          );
        })}
      </svg>
      <div className="rev__chart-labels">
        {data.map((d) => (
          <span key={d.month} className="rev__chart-label" style={{ width: `${barWidth}%` }}>
            {d.label.split(' ')[0]}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Donut Chart ───────────────────────────────────────── */
function DonutChart({ segments, size = 160 }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) return null;

  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="rev__donut-wrap">
      <svg width={size} height={size} viewBox="0 0 160 160" className="rev__donut">
        {segments.map((seg) => {
          const pct = seg.value / total;
          const dash = pct * circumference;
          const gap = circumference - dash;
          const currentOffset = offset;
          offset += dash;

          return (
            <circle
              key={seg.label}
              cx="80" cy="80" r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth="20"
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={-currentOffset}
              className="rev__donut-segment"
            />
          );
        })}
      </svg>
      <div className="rev__donut-legend">
        {segments.filter(s => s.value > 0).map((seg) => (
          <div key={seg.label} className="rev__donut-item">
            <span className="rev__donut-dot" style={{ background: seg.color }} />
            <span className="rev__donut-label">{seg.label}</span>
            <span className="rev__donut-value">{fmt(seg.value)} €</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Horizontal bar (vehicle breakdown) ────────────────── */
function VehicleBar({ vehicle, maxRevenue }) {
  const pct = maxRevenue > 0 ? (parseFloat(vehicle.revenue) / maxRevenue) * 100 : 0;

  return (
    <div className="rev__vbar">
      <div className="rev__vbar-header">
        <span className="rev__vbar-title">{vehicle.vehicle_title}</span>
        <span className="rev__vbar-amount">{fmt(vehicle.revenue)} €</span>
      </div>
      <div className="rev__vbar-track">
        <div className="rev__vbar-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="rev__vbar-meta">
        {vehicle.paid_bookings} Buchung{vehicle.paid_bookings !== 1 ? 'en' : ''}
      </div>
    </div>
  );
}

/* ── Main Page ─────────────────────────────────────────── */
export default function OwnerRevenuePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/api/owner/revenue');
        setData(res.data?.data || res.data);
      } catch (err) {
        setError(err.message || 'Einnahmen konnten nicht geladen werden.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const maxVehicleRevenue = useMemo(() => {
    if (!data?.by_vehicle) return 0;
    return Math.max(...data.by_vehicle.map(v => parseFloat(v.revenue)), 0);
  }, [data]);

  if (loading) return <div className="rev container"><Loader size="lg" text="Einnahmen werden geladen…" /></div>;
  if (error) return <div className="rev container"><div className="rev__error"><p>{error}</p></div></div>;
  if (!data) return null;

  const { summary, monthly, by_vehicle, recent_transactions, by_status, fee_breakdown } = data;

  const donutSegments = [
    { label: 'Mieteinnahmen', value: fee_breakdown.base_price, color: 'var(--color-primary)' },
    { label: 'Reinigungsgebühren', value: fee_breakdown.cleaning_fee, color: 'var(--color-success)' },
    { label: 'Servicegebühren', value: fee_breakdown.service_fee, color: 'var(--color-warning)' },
  ];

  const statusDonut = by_status.map((s) => ({
    label: PAYMENT_STATUS_LABELS[s.status] || s.status,
    value: s.total,
    color: PAYMENT_STATUS_COLORS[s.status] || 'var(--color-text-muted)',
  }));

  return (
    <div className="rev container">
      {/* Header */}
      <div className="rev__header">
        <div>
          <Link to="/dashboard" className="rev__back">← Dashboard</Link>
          <h1 className="rev__title">Einnahmen</h1>
          <p className="rev__subtitle">Detaillierte Übersicht deiner Einnahmen und Kosten.</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="rev__summary">
        <div className="rev__summary-card rev__summary-card--primary">
          <span className="rev__summary-label">Gesamteinnahmen</span>
          <span className="rev__summary-value">{fmt(summary.total_earned)} €</span>
          <span className="rev__summary-sub">{summary.paid_bookings} bezahlte Buchungen</span>
        </div>
        <div className="rev__summary-card">
          <span className="rev__summary-label">Netto (nach Gebühren)</span>
          <span className="rev__summary-value rev__summary-value--success">{fmt(summary.net_revenue)} €</span>
        </div>
        <div className="rev__summary-card">
          <span className="rev__summary-label">Ausstehend</span>
          <span className="rev__summary-value rev__summary-value--warning">{fmt(summary.total_pending)} €</span>
        </div>
        <div className="rev__summary-card">
          <span className="rev__summary-label">Erstattet</span>
          <span className="rev__summary-value rev__summary-value--muted">{fmt(summary.total_refunded)} €</span>
        </div>
      </div>

      {/* Charts row */}
      <div className="rev__charts-row">
        {/* Monthly revenue */}
        <div className="rev__card rev__card--wide">
          <h2 className="rev__card-title">Monatliche Einnahmen</h2>
          <BarChart data={monthly} />
        </div>

        {/* Fee breakdown donut */}
        <div className="rev__card">
          <h2 className="rev__card-title">Aufschlüsselung</h2>
          <DonutChart segments={donutSegments} />
        </div>
      </div>

      {/* Vehicle breakdown + Status donut */}
      <div className="rev__charts-row">
        <div className="rev__card rev__card--wide">
          <h2 className="rev__card-title">Einnahmen nach Fahrzeug</h2>
          {by_vehicle.length > 0 ? (
            <div className="rev__vbars">
              {by_vehicle.map((v) => (
                <VehicleBar key={v.vehicle_id} vehicle={v} maxRevenue={maxVehicleRevenue} />
              ))}
            </div>
          ) : (
            <p className="rev__empty-text">Noch keine Fahrzeug-Einnahmen.</p>
          )}
        </div>

        <div className="rev__card">
          <h2 className="rev__card-title">Zahlungsstatus</h2>
          {statusDonut.length > 0 ? (
            <DonutChart segments={statusDonut} />
          ) : (
            <p className="rev__empty-text">Keine Daten vorhanden.</p>
          )}
        </div>
      </div>

      {/* Recent transactions table */}
      {recent_transactions.length > 0 && (
        <div className="rev__card rev__card--full">
          <h2 className="rev__card-title">Letzte Transaktionen</h2>
          <div className="rev__table-wrap">
            <table className="rev__table">
              <thead>
                <tr>
                  <th>Fahrzeug</th>
                  <th>Mieter</th>
                  <th>Zeitraum</th>
                  <th>Grundpreis</th>
                  <th>Gebühren</th>
                  <th>Gesamt</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recent_transactions.map((t) => (
                  <tr key={t.booking_id} className="rev__table-row--clickable">
                    <td>
                      <Link to={`/bookings/${t.booking_id}`} className="rev__table-link">
                        {t.vehicle_title}
                      </Link>
                    </td>
                    <td>{t.renter_first_name} {t.renter_last_name}</td>
                    <td>{fmtDate(t.start_date)} – {fmtDate(t.end_date)}</td>
                    <td>{fmt(t.base_price)} €</td>
                    <td className="rev__table-fees">
                      {parseFloat(t.service_fee) > 0 && <span>Service: {fmt(t.service_fee)} €</span>}
                      {parseFloat(t.cleaning_fee) > 0 && <span>Reinigung: {fmt(t.cleaning_fee)} €</span>}
                    </td>
                    <td className="rev__table-total">{fmt(t.total_price)} {t.currency}</td>
                    <td>
                      <span
                        className="rev__status-dot"
                        style={{ background: PAYMENT_STATUS_COLORS[t.payment_status] }}
                      />
                      {PAYMENT_STATUS_LABELS[t.payment_status] || t.payment_status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
