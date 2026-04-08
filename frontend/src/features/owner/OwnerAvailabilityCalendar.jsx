import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import OwnerVehiclesApi from './OwnerVehiclesApi';
import BookingsApi from '../bookings/BookingsApi';
import Loader from '../../components/common/Loader';
import {
  getMonthGrid,
  getMonthName,
  getDayLabels,
  isPast,
  today,
  formatDate,
} from '../../utils/date';
import './OwnerAvailabilityCalendar.css';

const RULE_TYPES = [
  { value: 'blocked', label: 'Blockiert', color: '#ef4444', icon: '🚫' },
  { value: 'maintenance', label: 'Wartung', color: '#f59e0b', icon: '🔧' },
  { value: 'owner_reserved', label: 'Privat reserviert', color: '#6366f1', icon: '🏠' },
  { value: 'available', label: 'Verfügbar', color: '#22c55e', icon: '✅' },
];

const MONTHS = Array.from({ length: 12 }, (_, i) => i);

function ruleLabel(type) {
  return RULE_TYPES.find((r) => r.value === type)?.label ?? type;
}

function ruleColor(type) {
  return RULE_TYPES.find((r) => r.value === type)?.color ?? '#94a3b8';
}

export default function OwnerAvailabilityCalendar() {
  const { id: vehicleId } = useParams();
  const navigate = useNavigate();

  // ── State ───────────────────────────────────────────────
  const [vehicle, setVehicle] = useState(null);
  const [rules, setRules] = useState([]);
  const [bookedDays, setBookedDays] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [dirty, setDirty] = useState(false);

  // Year navigation
  const [year, setYear] = useState(new Date().getFullYear());

  // Selection / drawing state  
  const [paintType, setPaintType] = useState('blocked');
  const [paintReason, setPaintReason] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState(null);
  const [drawEnd, setDrawEnd] = useState(null);
  const [hoverDate, setHoverDate] = useState(null);

  // Rule editor modal
  const [editingRule, setEditingRule] = useState(null);

  const dayLabels = getDayLabels();
  const todayStr = today();

  // ── Load data ───────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [vRes, rRes, calRes] = await Promise.all([
          OwnerVehiclesApi.list(),
          OwnerVehiclesApi.getAvailabilityRules(vehicleId),
          BookingsApi.getAvailability(vehicleId, `${year}-01-01`, `${year}-12-31`),
        ]);

        if (cancelled) return;

        const vehicles = vRes.data?.data ?? [];
        const found = vehicles.find((v) => String(v.id) === String(vehicleId));
        setVehicle(found || null);
        setRules(rRes.data?.data ?? []);

        // Extract booked days from calendar response
        const calDays = calRes.data?.data?.days ?? {};
        const booked = {};
        for (const [date, info] of Object.entries(calDays)) {
          if (info.status === 'booked') {
            booked[date] = info.reason || 'Gebucht';
          }
        }
        setBookedDays(booked);
        setDirty(false);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Daten konnten nicht geladen werden.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [vehicleId, year]);

  // ── Build day→rule map ──────────────────────────────────
  const dayRuleMap = useMemo(() => {
    const map = {};
    for (const rule of rules) {
      const start = new Date(rule.start_date);
      const end = new Date(rule.end_date);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const ds = formatDate(d);
        // Last rule wins, blocking > available
        if (!map[ds] || rule.rule_type !== 'available') {
          map[ds] = { ...rule };
        }
      }
    }
    return map;
  }, [rules]);

  // ── Drawing preview ─────────────────────────────────────
  const drawingRange = useMemo(() => {
    if (!drawStart) return {};
    const end = hoverDate || drawEnd || drawStart;
    const s = drawStart < end ? drawStart : end;
    const e = drawStart < end ? end : drawStart;
    const range = {};
    const d = new Date(s);
    const endD = new Date(e);
    while (d <= endD) {
      range[formatDate(d)] = true;
      d.setDate(d.getDate() + 1);
    }
    return range;
  }, [drawStart, drawEnd, hoverDate]);

  // ── Mouse handlers ──────────────────────────────────────
  const handleDayMouseDown = useCallback((dateStr) => {
    if (bookedDays[dateStr]) return; // can't paint over bookings
    setIsDrawing(true);
    setDrawStart(dateStr);
    setDrawEnd(dateStr);
  }, [bookedDays]);

  const handleDayMouseEnter = useCallback((dateStr) => {
    if (isDrawing) {
      setDrawEnd(dateStr);
    }
    setHoverDate(dateStr);
  }, [isDrawing]);

  const handleDayMouseLeave = useCallback(() => {
    if (!isDrawing) setHoverDate(null);
  }, [isDrawing]);

  const handleMouseUp = useCallback(() => {
    if (!isDrawing || !drawStart) {
      setIsDrawing(false);
      return;
    }

    const end = drawEnd || drawStart;
    const s = drawStart < end ? drawStart : end;
    const e = drawStart < end ? end : drawStart;

    setRules((prev) => {
      // 1. Always remove / trim / split existing rules that overlap the drawn range
      let updated = [];
      for (const r of prev) {
        // Fully inside drawn range → remove
        if (r.start_date >= s && r.end_date <= e) continue;

        // No overlap → keep
        if (r.end_date < s || r.start_date > e) {
          updated.push(r);
          continue;
        }

        // Partial overlap: rule extends before AND after drawn range → split into two
        if (r.start_date < s && r.end_date > e) {
          const dayBeforeS = new Date(s);
          dayBeforeS.setDate(dayBeforeS.getDate() - 1);
          const dayAfterE = new Date(e);
          dayAfterE.setDate(dayAfterE.getDate() + 1);
          updated.push({ ...r, end_date: formatDate(dayBeforeS), id: r.id });
          updated.push({ ...r, start_date: formatDate(dayAfterE), id: `split_${Date.now()}_${Math.random()}` });
          continue;
        }

        // Overlap on the right side → trim end
        if (r.start_date < s && r.end_date >= s) {
          const dayBeforeS = new Date(s);
          dayBeforeS.setDate(dayBeforeS.getDate() - 1);
          updated.push({ ...r, end_date: formatDate(dayBeforeS) });
          continue;
        }

        // Overlap on the left side → trim start
        if (r.start_date <= e && r.end_date > e) {
          const dayAfterE = new Date(e);
          dayAfterE.setDate(dayAfterE.getDate() + 1);
          updated.push({ ...r, start_date: formatDate(dayAfterE) });
          continue;
        }

        updated.push(r);
      }

      // 2. Add new rule only for blocking types (available = default, clear = remove only)
      if (paintType !== 'clear' && paintType !== 'available') {
        updated.push({
          id: `new_${Date.now()}`,
          start_date: s,
          end_date: e,
          rule_type: paintType,
          reason: paintReason || null,
          vehicle_id: parseInt(vehicleId, 10),
        });
      }

      return updated;
    });

    setDirty(true);
    setIsDrawing(false);
    setDrawStart(null);
    setDrawEnd(null);
    setHoverDate(null);
  }, [isDrawing, drawStart, drawEnd, paintType, paintReason, vehicleId]);

  // Global mouseup listener for drawing  
  useEffect(() => {
    if (isDrawing) {
      window.addEventListener('mouseup', handleMouseUp);
      return () => window.removeEventListener('mouseup', handleMouseUp);
    }
  }, [isDrawing, handleMouseUp]);

  // ── Save ────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = rules.map((r) => ({
        start_date: r.start_date,
        end_date: r.end_date,
        rule_type: r.rule_type,
        reason: r.reason || null,
      }));
      const res = await OwnerVehiclesApi.bulkSaveAvailabilityRules(vehicleId, payload);
      setRules(res.data?.data ?? []);
      setDirty(false);
      setSuccess('Verfügbarkeitsregeln erfolgreich gespeichert!');
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      setError(err.message || 'Speichern fehlgeschlagen.');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete single rule ──────────────────────────────────
  const handleDeleteRule = (ruleId) => {
    setRules((prev) => prev.filter((r) => r.id !== ruleId));
    setDirty(true);
    setEditingRule(null);
  };

  // ── Cell class resolution ───────────────────────────────
  const getDayCls = (dateStr) => {
    if (!dateStr) return '';
    const classes = ['ac__day'];

    if (dateStr === todayStr) classes.push('ac__day--today');
    if (isPast(dateStr)) classes.push('ac__day--past');

    if (bookedDays[dateStr]) {
      classes.push('ac__day--booked');
      return classes.join(' ');
    }

    if (drawingRange[dateStr]) {
      classes.push(`ac__day--painting`);
      classes.push(`ac__day--paint-${paintType === 'clear' ? 'clear' : paintType}`);
      return classes.join(' ');
    }

    const ruleInfo = dayRuleMap[dateStr];
    if (ruleInfo) {
      classes.push(`ac__day--${ruleInfo.rule_type}`);
    } else {
      classes.push('ac__day--free');
    }

    return classes.join(' ');
  };

  // ── Render ──────────────────────────────────────────────
  if (loading) return <div className="ac container"><Loader size="lg" text="Kalender wird geladen…" /></div>;

  return (
    <div className="ac container" onMouseUp={handleMouseUp}>
      {/* Header */}
      <div className="ac__header">
        <div className="ac__header-left">
          <Link to="/owner/vehicles" className="ac__back">← Zurück</Link>
          <h1 className="ac__title">
            Verfügbarkeit {vehicle ? `– ${vehicle.title}` : ''}
          </h1>
        </div>
        <div className="ac__header-right">
          {dirty && (
            <span className="ac__unsaved">● Ungespeicherte Änderungen</span>
          )}
          <button
            type="button"
            className="ac__save-btn"
            disabled={saving || !dirty}
            onClick={handleSave}
          >
            {saving ? 'Speichern…' : '💾 Speichern'}
          </button>
        </div>
      </div>

      {error && <div className="ac__alert ac__alert--error">{error}</div>}
      {success && <div className="ac__alert ac__alert--success">{success}</div>}

      {/* Toolbar */}
      <div className="ac__toolbar">
        <div className="ac__tool-group">
          <span className="ac__tool-label">Malen:</span>
          {RULE_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              className={`ac__tool-btn ${paintType === t.value ? 'ac__tool-btn--active' : ''}`}
              style={paintType === t.value ? { borderColor: t.color, background: t.color + '18' } : {}}
              onClick={() => setPaintType(t.value)}
              title={t.label}
            >
              <span className="ac__tool-dot" style={{ background: t.color }} />
              {t.label}
            </button>
          ))}
          <button
            type="button"
            className={`ac__tool-btn ${paintType === 'clear' ? 'ac__tool-btn--active' : ''}`}
            onClick={() => setPaintType('clear')}
            title="Regeln entfernen"
          >
            <span className="ac__tool-dot" style={{ background: '#e2e8f0' }} />
            Löschen
          </button>
        </div>

        <div className="ac__tool-group">
          <label className="ac__tool-label" htmlFor="paint-reason">Grund:</label>
          <input
            id="paint-reason"
            type="text"
            className="ac__reason-input"
            placeholder="Optional…"
            value={paintReason}
            onChange={(e) => setPaintReason(e.target.value)}
          />
        </div>
      </div>

      {/* Year navigation */}
      <div className="ac__year-nav">
        <button type="button" className="ac__year-btn" onClick={() => setYear((y) => y - 1)}>‹</button>
        <h2 className="ac__year-label">{year}</h2>
        <button type="button" className="ac__year-btn" onClick={() => setYear((y) => y + 1)}>›</button>
      </div>

      {/* Legend */}
      <div className="ac__legend">
        <span className="ac__legend-item"><span className="ac__legend-dot ac__legend-dot--free" /> Verfügbar</span>
        <span className="ac__legend-item"><span className="ac__legend-dot ac__legend-dot--booked" /> Gebucht</span>
        <span className="ac__legend-item"><span className="ac__legend-dot ac__legend-dot--blocked" /> Blockiert</span>
        <span className="ac__legend-item"><span className="ac__legend-dot ac__legend-dot--maintenance" /> Wartung</span>
        <span className="ac__legend-item"><span className="ac__legend-dot ac__legend-dot--owner_reserved" /> Privat</span>
        <span className="ac__legend-item"><span className="ac__legend-dot ac__legend-dot--today" /> Heute</span>
      </div>

      {/* 12-month grid */}
      <div className="ac__year-grid">
        {MONTHS.map((m) => {
          const grid = getMonthGrid(year, m);
          return (
            <div key={m} className="ac__month">
              <h3 className="ac__month-title">{getMonthName(m)}</h3>
              <div className="ac__grid">
                {dayLabels.map((l) => (
                  <div key={l} className="ac__day-label">{l}</div>
                ))}
                {grid.map((dateStr, i) => {
                  if (!dateStr) return <div key={`e${i}`} className="ac__day ac__day--empty" />;

                  const isBooked = !!bookedDays[dateStr];
                  const ruleInfo = dayRuleMap[dateStr];
                  const tooltip = isBooked
                    ? bookedDays[dateStr]
                    : ruleInfo
                      ? `${ruleLabel(ruleInfo.rule_type)}${ruleInfo.reason ? ': ' + ruleInfo.reason : ''}`
                      : 'Verfügbar';

                  return (
                    <div
                      key={dateStr}
                      className={getDayCls(dateStr)}
                      title={tooltip}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleDayMouseDown(dateStr);
                      }}
                      onMouseEnter={() => handleDayMouseEnter(dateStr)}
                      onMouseLeave={handleDayMouseLeave}
                    >
                      {parseInt(dateStr.split('-')[2], 10)}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Rules list */}
      <div className="ac__rules">
        <h2 className="ac__rules-title">Aktive Regeln ({rules.length})</h2>
        {rules.length === 0 && (
          <p className="ac__rules-empty">Keine Regeln definiert. Male im Kalender, um Verfügbarkeiten festzulegen.</p>
        )}
        <div className="ac__rules-list">
          {rules.map((r) => (
            <div key={r.id} className="ac__rule-card">
              <div className="ac__rule-dot" style={{ background: ruleColor(r.rule_type) }} />
              <div className="ac__rule-body">
                <span className="ac__rule-type">{ruleLabel(r.rule_type)}</span>
                <span className="ac__rule-dates">
                  {formatGerman(r.start_date)} – {formatGerman(r.end_date)}
                </span>
                {r.reason && <span className="ac__rule-reason">{r.reason}</span>}
              </div>
              <button
                type="button"
                className="ac__rule-delete"
                onClick={() => handleDeleteRule(r.id)}
                title="Regel entfernen"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function formatGerman(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${parseInt(d, 10)}.${parseInt(m, 10)}.${y}`;
}
