import { useEffect, useState, useCallback } from 'react';
import AdminApi from './AdminApi';
import Loader from '../../components/common/Loader';
import './Admin.css';

export default function AdminSwapUnlockPage() {
  const [tab, setTab] = useState('owners');

  return (
    <div className="adm container">
      <h1 className="adm__title">Tauschoption-Verwaltung</h1>

      <div className="adm__tabs">
        <button className={`adm__tab${tab === 'owners' ? ' adm__tab--active' : ''}`} onClick={() => setTab('owners')}>
          Vermieter-Status
        </button>
        <button className={`adm__tab${tab === 'codes' ? ' adm__tab--active' : ''}`} onClick={() => setTab('codes')}>
          Freischalt-Codes
        </button>
      </div>

      {tab === 'owners' && <OwnersList />}
      {tab === 'codes' && <CodesList />}
    </div>
  );
}

/* ── Owners List ────────────────────────────────────────── */
function OwnersList() {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await AdminApi.listSwapUnlockOwners({ page, per_page: 20 });
      const body = res.data;
      setData({ items: body.data ?? [], ...(body.meta ?? {}) });
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleToggle = async (userId, currentlyUnlocked) => {
    setToggling(userId);
    try {
      await AdminApi.toggleSwapUnlock(userId, !currentlyUnlocked);
      fetch();
    } catch {
      /* silent */
    } finally {
      setToggling(null);
    }
  };

  if (loading) return <Loader size="md" text="Wird geladen…" />;
  if (!data?.items?.length) return <div className="adm__empty"><p>Keine Vermieter gefunden.</p></div>;

  const totalPages = Math.ceil(data.total / data.per_page);

  return (
    <>
      <div className="adm__table-wrap">
        <table className="adm__table">
          <thead>
            <tr>
              <th>Vermieter</th>
              <th>E-Mail</th>
              <th>Einnahmen</th>
              <th>Buchungen (7+ Tage)</th>
              <th>Status</th>
              <th>Methode</th>
              <th>Aktion</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((o) => {
              const rev = parseFloat(o.revenue || 0);
              const bk = parseInt(o.completed_long_bookings || 0, 10);
              const unlocked = o.swap_unlocked === '1' || o.swap_unlocked === 1;

              return (
                <tr key={o.id}>
                  <td>{o.first_name} {o.last_name}</td>
                  <td>{o.email}</td>
                  <td>
                    <span className={rev >= 3000 ? 'adm__badge adm__badge--confirmed' : ''}>
                      {rev.toLocaleString('de-DE', { minimumFractionDigits: 0 })} €
                    </span>
                  </td>
                  <td>
                    <span className={bk >= 3 ? 'adm__badge adm__badge--confirmed' : ''}>
                      {bk} / 3
                    </span>
                  </td>
                  <td>
                    {unlocked
                      ? <span className="adm__badge adm__badge--active">Freigeschaltet</span>
                      : <span className="adm__badge adm__badge--inactive">Gesperrt</span>
                    }
                  </td>
                  <td>{o.swap_unlock_method || '—'}</td>
                  <td>
                    <button
                      className={`adm__btn ${unlocked ? 'adm__btn--danger' : 'adm__btn--success'}`}
                      onClick={() => handleToggle(o.id, unlocked)}
                      disabled={toggling === o.id}
                    >
                      {toggling === o.id ? '…' : unlocked ? 'Deaktivieren' : 'Freischalten'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="adm__pagination">
          <button className="adm__page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Zurück</button>
          <span className="adm__page-info">Seite {page} von {totalPages}</span>
          <button className="adm__page-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Weiter →</button>
        </div>
      )}
    </>
  );
}

/* ── Codes List ─────────────────────────────────────────── */
function CodesList() {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formEmail, setFormEmail] = useState('');
  const [formExpires, setFormExpires] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [lastCreated, setLastCreated] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await AdminApi.listSwapUnlockCodes({ page, per_page: 20 });
      setData(res.data?.data || res.data);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formEmail.trim()) return;
    setCreating(true);
    setCreateError('');
    try {
      const res = await AdminApi.createSwapUnlockCode({
        email: formEmail.trim(),
        expires_at: formExpires || null,
      });
      setLastCreated(res.data?.data || res.data);
      setFormEmail('');
      setFormExpires('');
      fetch();
    } catch (err) {
      setCreateError(err.response?.data?.message || 'Fehler beim Erstellen.');
    } finally {
      setCreating(false);
    }
  };

  const handleDeactivate = async (id) => {
    try {
      await AdminApi.deactivateSwapUnlockCode(id);
      fetch();
    } catch {
      /* silent */
    }
  };

  if (loading && !data) return <Loader size="md" text="Wird geladen…" />;

  const totalPages = data ? Math.ceil(data.total / data.per_page) : 0;

  return (
    <>
      {/* Create form */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        {!showForm ? (
          <button className="adm__btn adm__btn--primary" onClick={() => setShowForm(true)}>
            + Neuen Code erstellen
          </button>
        ) : (
          <div className="adm__modal" style={{ maxWidth: '100%', padding: 'var(--space-4)' }}>
            <form onSubmit={handleCreate}>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div className="adm__field" style={{ flex: '1 1 220px', marginBottom: 0 }}>
                  <label className="adm__label">E-Mail-Adresse des Empfängers</label>
                  <input
                    type="email"
                    className="adm__input"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="vermieter@example.com"
                    required
                  />
                </div>
                <div className="adm__field" style={{ flex: '0 0 160px', marginBottom: 0 }}>
                  <label className="adm__label">Ablaufdatum (optional)</label>
                  <input
                    type="date"
                    className="adm__input"
                    value={formExpires}
                    onChange={(e) => setFormExpires(e.target.value)}
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="submit" className="adm__btn adm__btn--success" disabled={creating}>
                    {creating ? '…' : 'Erstellen'}
                  </button>
                  <button type="button" className="adm__btn" onClick={() => { setShowForm(false); setLastCreated(null); }}>
                    Abbrechen
                  </button>
                </div>
              </div>
              {createError && <p style={{ color: 'var(--color-danger)', fontSize: 'var(--text-xs)', marginTop: '0.5rem' }}>{createError}</p>}
            </form>

            {lastCreated && (
              <div style={{
                marginTop: '0.75rem', padding: '0.75rem 1rem',
                background: 'rgba(34,197,94,0.08)', border: '1px solid var(--color-success)',
                borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)'
              }}>
                Code erstellt: <strong style={{ fontFamily: 'monospace', letterSpacing: '0.05em' }}>{lastCreated.code}</strong>
                <span style={{ marginLeft: '1rem', color: 'var(--color-text-muted)' }}>für {lastCreated.email}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Codes table */}
      {data?.items?.length > 0 ? (
        <div className="adm__table-wrap">
          <table className="adm__table">
            <thead>
              <tr>
                <th>Code</th>
                <th>E-Mail</th>
                <th>Status</th>
                <th>Eingelöst von</th>
                <th>Erstellt am</th>
                <th>Ablauf</th>
                <th>Aktion</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((c) => {
                const active = c.is_active === '1' || c.is_active === 1;
                const redeemed = !!c.redeemed_by;

                return (
                  <tr key={c.id}>
                    <td style={{ fontFamily: 'monospace', letterSpacing: '0.04em' }}>{c.code}</td>
                    <td>{c.email}</td>
                    <td>
                      {redeemed
                        ? <span className="adm__badge adm__badge--confirmed">Eingelöst</span>
                        : active
                          ? <span className="adm__badge adm__badge--pending">Aktiv</span>
                          : <span className="adm__badge adm__badge--inactive">Deaktiviert</span>
                      }
                    </td>
                    <td>{c.redeemer_email || '—'}</td>
                    <td>{new Date(c.created_at).toLocaleDateString('de-DE')}</td>
                    <td>{c.expires_at ? new Date(c.expires_at).toLocaleDateString('de-DE') : '—'}</td>
                    <td>
                      {active && !redeemed && (
                        <button
                          className="adm__btn adm__btn--danger"
                          onClick={() => handleDeactivate(c.id)}
                        >
                          Deaktivieren
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="adm__empty"><p>Noch keine Codes erstellt.</p></div>
      )}

      {totalPages > 1 && (
        <div className="adm__pagination">
          <button className="adm__page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Zurück</button>
          <span className="adm__page-info">Seite {page} von {totalPages}</span>
          <button className="adm__page-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Weiter →</button>
        </div>
      )}
    </>
  );
}
