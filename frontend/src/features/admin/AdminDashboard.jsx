import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminApi from './AdminApi';
import Loader from '../../components/common/Loader';
import useAuth from '../../hooks/useAuth';
import '../../pages/Dashboard.css';
import './Admin.css';

function fmt(v) {
  return parseFloat(v).toLocaleString('de-DE', { minimumFractionDigits: 2 });
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
function monthLabel(ym) {
  const [, m] = ym.split('-');
  return MONTH_LABELS[parseInt(m, 10) - 1] || ym;
}

const STATUS_LABELS = {
  draft: 'Entwurf',
  pending_owner_review: 'Warte auf Owner',
  pending_payment: 'Warte auf Zahlung',
  pending_contract: 'Warte auf Vertrag',
  confirmed: 'Bestätigt',
  completed: 'Abgeschlossen',
  cancelled: 'Storniert',
  rejected: 'Abgelehnt',
};
const STATUS_COLORS = {
  draft: '#94a3b8',
  pending_owner_review: '#f59e0b',
  pending_payment: '#3b82f6',
  pending_contract: '#8b5cf6',
  confirmed: '#10b981',
  completed: '#6C3461',
  cancelled: '#ef4444',
  rejected: '#dc2626',
};

const TYPE_LABELS = {
  campervan: 'Campervan',
  motorhome: 'Wohnmobil',
  caravan: 'Wohnwagen',
  offroad: 'Offroad',
  other: 'Sonstige',
};
const TYPE_COLORS = {
  campervan: '#6C3461',
  motorhome: '#3b82f6',
  caravan: '#10b981',
  offroad: '#f59e0b',
  other: '#94a3b8',
};

const PROVIDER_LABELS = {
  paypal: 'PayPal',
  stripe: 'Stripe',
  bank_transfer: 'Überweisung',
  online_banking: 'Online-Banking',
  manual: 'Manuell',
};
const PROVIDER_COLORS = {
  paypal: '#0070ba',
  stripe: '#635bff',
  bank_transfer: '#10b981',
  online_banking: '#3b82f6',
  manual: '#94a3b8',
};

/* ── SVG Bar Chart ──────────────────────────────────────── */
function BarChart({ data, height = 120 }) {
  if (!data?.length) return <p className="adm__chart-empty">Keine Daten vorhanden.</p>;
  const max = Math.max(...data.map(d => d.value), 1);
  const w = data.length * 40;
  const barW = 32;
  const gap = 8;

  return (
    <div className="adm__bar-wrap">
      <svg className="adm__bar-svg" viewBox={`0 0 ${w} ${height}`} style={{ maxHeight: `${height}px` }}>
        {data.map((d, i) => {
          const barH = (d.value / max) * (height - 24);
          return (
            <g key={d.label}>
              <rect
                x={i * (barW + gap) + gap / 2}
                y={height - barH - 16}
                width={barW}
                height={Math.max(barH, 2)}
                rx="3"
                className="adm__bar-rect"
              />
            </g>
          );
        })}
      </svg>
      <div className="adm__bar-labels">
        {data.map((d) => (
          <span key={d.label} className="adm__bar-label" style={{ width: `${100 / data.length}%` }}>
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Stacked Bar Chart (2 series) ──────────────────────── */
function StackedBarChart({ data, height = 120 }) {
  if (!data?.length) return <p className="adm__chart-empty">Keine Daten vorhanden.</p>;
  const max = Math.max(...data.map(d => d.v1 + d.v2), 1);
  const w = data.length * 40;
  const barW = 32;
  const gap = 8;

  return (
    <div className="adm__bar-wrap">
      <svg className="adm__bar-svg" viewBox={`0 0 ${w} ${height}`} style={{ maxHeight: `${height}px` }}>
        {data.map((d, i) => {
          const h1 = (d.v1 / max) * (height - 24);
          const h2 = (d.v2 / max) * (height - 24);
          const x = i * (barW + gap) + gap / 2;
          return (
            <g key={d.label}>
              <rect x={x} y={height - h1 - h2 - 16} width={barW} height={Math.max(h2, 1)} rx="3" className="adm__bar-rect adm__bar-rect--secondary" />
              <rect x={x} y={height - h1 - 16} width={barW} height={Math.max(h1, 1)} rx="3" className="adm__bar-rect" />
            </g>
          );
        })}
      </svg>
      <div className="adm__bar-labels">
        {data.map((d) => (
          <span key={d.label} className="adm__bar-label" style={{ width: `${100 / data.length}%` }}>{d.label}</span>
        ))}
      </div>
    </div>
  );
}

/* ── Donut Chart ──────────────────────────────────────── */
function DonutChart({ segments, size = 120 }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return <p className="adm__chart-empty">Keine Daten vorhanden.</p>;

  const r = 42;
  const circ = 2 * Math.PI * r;
  let off = 0;

  return (
    <div className="adm__donut-wrap">
      <svg width={size} height={size} viewBox="0 0 120 120" className="adm__donut-svg">
        {segments.filter(s => s.value > 0).map((seg) => {
          const pct = seg.value / total;
          const dash = pct * circ;
          const gap = circ - dash;
          const cur = off;
          off += dash;
          return (
            <circle key={seg.label} cx="60" cy="60" r={r} fill="none"
              stroke={seg.color} strokeWidth="14"
              strokeDasharray={`${dash} ${gap}`} strokeDashoffset={-cur}
              className="adm__donut-seg" />
          );
        })}
        <text x="60" y="60" textAnchor="middle" dominantBaseline="central" className="adm__donut-total">
          {total}
        </text>
      </svg>
      <div className="adm__donut-legend">
        {segments.filter(s => s.value > 0).map((seg) => (
          <div key={seg.label} className="adm__donut-item">
            <span className="adm__donut-dot" style={{ background: seg.color }} />
            <span className="adm__donut-label">{seg.label}</span>
            <span className="adm__donut-val">{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Horizontal Bars ─────────────────────────────────── */
function HBarList({ items }) {
  if (!items?.length) return <p className="adm__chart-empty">Keine Daten vorhanden.</p>;
  const max = Math.max(...items.map(i => parseFloat(i.value)), 1);
  return (
    <div className="adm__hbar-list">
      {items.map((item) => {
        const pct = (parseFloat(item.value) / max) * 100;
        return (
          <div key={item.label} className="adm__hbar">
            <div className="adm__hbar-head">
              <span className="adm__hbar-name">{item.label}</span>
              <span className="adm__hbar-val">{item.display}</span>
            </div>
            <div className="adm__hbar-track">
              <div className="adm__hbar-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Main Component ──────────────────────────────────── */
export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await AdminApi.getDashboard();
        setStats(res.data?.data || res.data);
      } catch (err) {
        setError(err.message || 'Dashboard konnte nicht geladen werden.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="dash container"><Loader size="lg" text="Dashboard wird geladen…" /></div>;
  if (error) return (
    <div className="dash container">
      <div className="dash__empty"><p>{error}</p></div>
    </div>
  );

  const tiles = [
    { icon: '👥', label: 'Nutzer gesamt', value: stats.users_total },
    { icon: '✅', label: 'Nutzer aktiv', value: stats.users_active, accent: 'success' },
    { icon: '🚐', label: 'Fahrzeuge gesamt', value: stats.vehicles_total },
    { icon: '🟢', label: 'Fahrzeuge aktiv', value: stats.vehicles_active, accent: 'success' },
    { icon: '📊', label: 'Buchungen gesamt', value: stats.bookings_total },
    { icon: '🚨', label: 'Offene Reports', value: stats.reports_open, accent: stats.reports_open > 0 ? 'danger' : undefined },
    { icon: '⏳', label: 'Vermieter ausstehend', value: stats.owners_pending_verification, accent: stats.owners_pending_verification > 0 ? 'warning' : undefined },
  ];

  // Revenue trend data
  const revTrend = (stats.revenue_trend || []).map(r => ({
    label: monthLabel(r.month),
    value: parseFloat(r.revenue),
  }));

  // Bookings trend (same months)
  const bookingsTrend = (stats.revenue_trend || []).map(r => ({
    label: monthLabel(r.month),
    value: parseInt(r.bookings, 10),
  }));

  // Bookings by status donut
  const bookingStatusSegs = (stats.bookings_by_status || []).map(b => ({
    label: STATUS_LABELS[b.status] || b.status,
    value: parseInt(b.count, 10),
    color: STATUS_COLORS[b.status] || '#94a3b8',
  }));

  // User registration trend (stacked owner + renter)
  const userTrend = (stats.user_trend || []).map(u => ({
    label: monthLabel(u.month),
    v1: parseInt(u.renters, 10),
    v2: parseInt(u.owners, 10),
  }));

  // Vehicle type donut
  const vehicleTypeSegs = (stats.vehicle_types || []).map(v => ({
    label: TYPE_LABELS[v.vehicle_type] || v.vehicle_type,
    value: parseInt(v.count, 10),
    color: TYPE_COLORS[v.vehicle_type] || '#94a3b8',
  }));

  // Revenue by provider donut
  const providerSegs = (stats.revenue_by_provider || []).map(p => ({
    label: PROVIDER_LABELS[p.provider] || p.provider,
    value: parseFloat(p.total),
    color: PROVIDER_COLORS[p.provider] || '#94a3b8',
  }));

  // Top vehicles horizontal bars
  const topVehicles = (stats.top_vehicles || []).map(v => ({
    label: v.title,
    value: parseFloat(v.revenue),
    display: `${fmt(v.revenue)} € (${v.bookings} Buchungen)`,
  }));

  const revenueTotal = Number(stats.revenue_total);

  return (
    <div className="dash container">
      {/* Header */}
      <div className="dash__header">
        <div>
          <h1 className="dash__greeting">Admin-Bereich</h1>
          <p className="dash__subtitle">Plattform-Übersicht und Verwaltung</p>
        </div>
        <span className="dash__role-badge">Admin</span>
      </div>

      {/* Alerts */}
      {stats.owners_pending_verification > 0 && (
        <div className="dash__highlight dash__highlight--warning">
          <span className="dash__highlight-icon">⏳</span>
          <div className="dash__highlight-body">
            <h3 className="dash__highlight-title">Verifizierungsanfragen</h3>
            <p className="dash__highlight-text">
              Es {stats.owners_pending_verification === 1 ? 'wartet' : 'warten'} <strong>{stats.owners_pending_verification}</strong> neu registrierte{stats.owners_pending_verification === 1 ? 'r Vermieter' : ' Vermieter'} auf Freigabe.
            </p>
            <Link to="/admin/users?role=owner&active=1" className="dash__highlight-link">
              Zur Nutzerverwaltung →
            </Link>
          </div>
        </div>
      )}
      {stats.reports_open > 0 && (
        <div className="dash__highlight">
          <span className="dash__highlight-icon">🚨</span>
          <div className="dash__highlight-body">
            <h3 className="dash__highlight-title">Offene Reports</h3>
            <p className="dash__highlight-text">
              Es gibt <strong>{stats.reports_open}</strong> offene{stats.reports_open > 1 ? ' Reports' : 'n Report'}, die bearbeitet werden müssen.
            </p>
            <Link to="/admin/reports" className="dash__highlight-link">
              Reports ansehen →
            </Link>
          </div>
        </div>
      )}

      {/* Stat tiles (without revenue) */}
      <div className="dash__tiles">
        {tiles.map((t) => (
          <div key={t.label} className="dash__tile">
            <span className="dash__tile-icon">{t.icon}</span>
            <span className={`dash__tile-value${t.accent ? ` dash__tile-value--${t.accent}` : ''}`}>
              {t.value}
            </span>
            <span className="dash__tile-label">{t.label}</span>
          </div>
        ))}
      </div>

      {/* Revenue hero card */}
      <div className="adm__revenue-hero">
        <div className="adm__revenue-hero-left">
          <span className="adm__revenue-hero-label">Gesamtumsatz (bezahlt)</span>
          <span className="adm__revenue-hero-value">{fmt(revenueTotal)} €</span>
          <span className="adm__revenue-hero-sub">
            aus {stats.bookings_total} Buchungen
          </span>
        </div>
      </div>

      {/* Charts grid */}
      <div className="adm__charts">
        {/* Revenue trend */}
        <div className="adm__chart-card adm__chart-card--wide">
          <h3 className="adm__chart-title">Umsatzverlauf (12 Monate)</h3>
          <BarChart data={revTrend} />
        </div>

        {/* Bookings trend */}
        <div className="adm__chart-card adm__chart-card--wide">
          <h3 className="adm__chart-title">Buchungen pro Monat</h3>
          <BarChart data={bookingsTrend} />
        </div>

        {/* Bookings by status */}
        <div className="adm__chart-card">
          <h3 className="adm__chart-title">Buchungen nach Status</h3>
          <DonutChart segments={bookingStatusSegs} />
        </div>

        {/* Vehicle types */}
        <div className="adm__chart-card">
          <h3 className="adm__chart-title">Fahrzeugtypen</h3>
          <DonutChart segments={vehicleTypeSegs} />
        </div>

        {/* User registrations */}
        <div className="adm__chart-card adm__chart-card--wide">
          <h3 className="adm__chart-title">Nutzer-Registrierungen (12 Monate)</h3>
          <div className="adm__chart-legend-inline">
            <span className="adm__legend-item"><span className="adm__legend-dot adm__legend-dot--primary" /> Mieter</span>
            <span className="adm__legend-item"><span className="adm__legend-dot adm__legend-dot--secondary" /> Vermieter</span>
          </div>
          <StackedBarChart data={userTrend} />
        </div>

        {/* Revenue by provider */}
        <div className="adm__chart-card">
          <h3 className="adm__chart-title">Umsatz nach Zahlungsart</h3>
          <DonutChart segments={providerSegs} />
        </div>

        {/* Top vehicles */}
        <div className="adm__chart-card">
          <h3 className="adm__chart-title">Top 5 Fahrzeuge (Umsatz)</h3>
          <HBarList items={topVehicles} />
        </div>
      </div>
    </div>
  );
}