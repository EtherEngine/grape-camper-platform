import { useEffect, useState, useCallback } from 'react';
import AdminApi from './AdminApi';
import Loader from '../../components/common/Loader';
import './Admin.css';

const STATUS_TABS = [
  { value: '', label: 'Alle' },
  { value: 'open', label: 'Offen' },
  { value: 'in_progress', label: 'In Bearbeitung' },
  { value: 'resolved', label: 'Gelöst' },
  { value: 'closed', label: 'Geschlossen' },
];

const SEVERITY_TABS = [
  { value: '', label: 'Alle Schweregrade' },
  { value: 'critical', label: 'Kritisch' },
  { value: 'high', label: 'Hoch' },
  { value: 'medium', label: 'Mittel' },
  { value: 'low', label: 'Niedrig' },
];

const REPORT_TYPES = ['error', 'content', 'abuse', 'payment', 'technical', 'other'];
const STATUSES = ['open', 'in_progress', 'resolved', 'closed'];
const SEVERITIES = ['low', 'medium', 'high', 'critical'];

export default function AdminReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);

  const perPage = 20;

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, per_page: perPage };
      if (statusFilter) params.status = statusFilter;
      if (severityFilter) params.severity = severityFilter;
      const res = await AdminApi.listReports(params);
      const d = res.data?.data || res.data;
      setReports(d?.items || d || []);
      setTotal(d?.total ?? 0);
    } catch (err) {
      setError(err.message || 'Reports konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, severityFilter, page]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const openDetail = async (id) => {
    setDetailLoading(true);
    try {
      const res = await AdminApi.getReport(id);
      const r = res.data?.data || res.data;
      setSelected(r);
      setEditData({ status: r.status, severity: r.severity, admin_comment: r.admin_comment || '' });
    } catch (err) {
      setError(err.message || 'Report konnte nicht geladen werden.');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selected || saving) return;
    setSaving(true);
    try {
      await AdminApi.updateReport(selected.id, editData);
      setSelected(null);
      await fetchReports();
    } catch (err) {
      setError(err.message || 'Speichern fehlgeschlagen.');
    } finally {
      setSaving(false);
    }
  };

  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="adm container">
      <h1 className="adm__title">Reports</h1>

      {/* Filters */}
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

        {SEVERITY_TABS.map((t) => (
          <button
            key={`s-${t.value}`}
            type="button"
            className={`adm__tab ${severityFilter === t.value ? 'adm__tab--active' : ''}`}
            onClick={() => { setSeverityFilter(t.value); setPage(1); }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <Loader size="lg" text="Reports werden geladen…" />
      ) : error && !selected ? (
        <div className="adm__error">
          <p>{error}</p>
          <button type="button" className="adm__retry" onClick={fetchReports}>Erneut versuchen</button>
        </div>
      ) : reports.length === 0 ? (
        <div className="adm__empty"><p>Keine Reports gefunden.</p></div>
      ) : (
        <>
          <div className="adm__table-wrap">
            <table className="adm__table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Typ</th>
                  <th>Titel</th>
                  <th>Schweregrad</th>
                  <th>Status</th>
                  <th>Melder</th>
                  <th>Erstellt</th>
                  <th>Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.id}>
                    <td>{r.id}</td>
                    <td><span className="adm__badge">{r.report_type}</span></td>
                    <td>{r.title}</td>
                    <td><span className={`adm__badge adm__badge--${r.severity}`}>{r.severity}</span></td>
                    <td><span className={`adm__badge adm__badge--${r.status}`}>{r.status}</span></td>
                    <td>{r.reporter_first_name ? `${r.reporter_first_name} ${r.reporter_last_name}` : r.user_id}</td>
                    <td>{r.created_at?.split(' ')[0]}</td>
                    <td>
                      <div className="adm__actions">
                        <button type="button" className="adm__btn" onClick={() => openDetail(r.id)}>
                          Details
                        </button>
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

      {/* Detail / Edit modal */}
      {(selected || detailLoading) && (
        <div className="adm__overlay" onClick={() => !saving && setSelected(null)}>
          <div className="adm__modal" onClick={(e) => e.stopPropagation()}>
            {detailLoading ? (
              <Loader size="md" text="Wird geladen…" />
            ) : selected && (
              <>
                <h2 className="adm__modal-title">Report #{selected.id}: {selected.title}</h2>

                <div className="adm__detail-grid">
                  <span className="adm__detail-key">Typ</span>
                  <span className="adm__detail-val">{selected.report_type}</span>
                  <span className="adm__detail-key">Melder</span>
                  <span className="adm__detail-val">
                    {selected.reporter_first_name} {selected.reporter_last_name} ({selected.reporter_email})
                  </span>
                  {selected.booking_id && (<>
                    <span className="adm__detail-key">Buchung</span>
                    <span className="adm__detail-val">#{selected.booking_id}</span>
                  </>)}
                  {selected.vehicle_id && (<>
                    <span className="adm__detail-key">Fahrzeug</span>
                    <span className="adm__detail-val">#{selected.vehicle_id}</span>
                  </>)}
                  <span className="adm__detail-key">Beschreibung</span>
                  <span className="adm__detail-val">{selected.description}</span>
                  <span className="adm__detail-key">Erstellt</span>
                  <span className="adm__detail-val">{selected.created_at}</span>
                </div>

                <div className="adm__field">
                  <label className="adm__label">Status</label>
                  <select
                    className="adm__select"
                    value={editData.status}
                    onChange={(e) => setEditData((d) => ({ ...d, status: e.target.value }))}
                  >
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div className="adm__field">
                  <label className="adm__label">Schweregrad</label>
                  <select
                    className="adm__select"
                    value={editData.severity}
                    onChange={(e) => setEditData((d) => ({ ...d, severity: e.target.value }))}
                  >
                    {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div className="adm__field">
                  <label className="adm__label">Admin-Kommentar</label>
                  <textarea
                    className="adm__textarea"
                    value={editData.admin_comment}
                    onChange={(e) => setEditData((d) => ({ ...d, admin_comment: e.target.value }))}
                    rows={3}
                  />
                </div>

                <div className="adm__modal-actions">
                  <button type="button" className="adm__btn" onClick={() => setSelected(null)} disabled={saving}>
                    Abbrechen
                  </button>
                  <button type="button" className="adm__btn adm__btn--success" onClick={handleSave} disabled={saving}>
                    {saving ? 'Speichern…' : 'Speichern'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}