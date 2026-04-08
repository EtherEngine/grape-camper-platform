import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import AdminApi from './AdminApi';
import Loader from '../../components/common/Loader';
import './Admin.css';

const ROLE_TABS = [
  { value: '', label: 'Alle' },
  { value: 'renter', label: 'Mieter' },
  { value: 'owner', label: 'Vermieter' },
  { value: 'admin', label: 'Admin' },
];

const ACTIVE_TABS = [
  { value: '', label: 'Alle' },
  { value: '1', label: 'Aktiv' },
  { value: '0', label: 'Inaktiv' },
];

export default function AdminUsersPage() {
  const [searchParams] = useSearchParams();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [roleFilter, setRoleFilter] = useState(searchParams.get('role') || '');
  const [activeFilter, setActiveFilter] = useState(searchParams.get('active') || '');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(null); // userId being toggled

  const perPage = 20;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, per_page: perPage };
      if (roleFilter) params.role = roleFilter;
      if (activeFilter !== '') params.is_active = activeFilter;
      const res = await AdminApi.listUsers(params);
      const d = res.data?.data || res.data;
      setUsers(d?.items || d || []);
      setTotal(d?.total ?? 0);
    } catch (err) {
      setError(err.message || 'Nutzer konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, [roleFilter, activeFilter, page]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleToggleActive = async (user) => {
    if (busy) return;
    setBusy(user.id);
    try {
      if (user.is_active) {
        await AdminApi.deactivateUser(user.id);
      } else {
        await AdminApi.activateUser(user.id);
      }
      await fetchUsers();
    } catch (err) {
      setError(err.message || 'Aktion fehlgeschlagen.');
    } finally {
      setBusy(null);
    }
  };

  const handleToggleVerify = async (user) => {
    if (busy) return;
    setBusy(user.id);
    try {
      if (Number(user.owner_verified)) {
        await AdminApi.unverifyOwner(user.id);
      } else {
        await AdminApi.verifyOwner(user.id);
      }
      await fetchUsers();
    } catch (err) {
      setError(err.message || 'Aktion fehlgeschlagen.');
    } finally {
      setBusy(null);
    }
  };

  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="adm container">
      <h1 className="adm__title">Nutzerverwaltung</h1>

      {/* Role filter */}
      <div className="adm__tabs">
        {ROLE_TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            className={`adm__tab ${roleFilter === t.value ? 'adm__tab--active' : ''}`}
            onClick={() => { setRoleFilter(t.value); setPage(1); }}
          >
            {t.label}
          </button>
        ))}

        <span style={{ width: '1px', background: 'var(--color-border)', margin: '0 var(--space-2)' }} />

        {ACTIVE_TABS.map((t) => (
          <button
            key={`a-${t.value}`}
            type="button"
            className={`adm__tab ${activeFilter === t.value ? 'adm__tab--active' : ''}`}
            onClick={() => { setActiveFilter(t.value); setPage(1); }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <Loader size="lg" text="Nutzer werden geladen…" />
      ) : error ? (
        <div className="adm__error">
          <p>{error}</p>
          <button type="button" className="adm__retry" onClick={fetchUsers}>Erneut versuchen</button>
        </div>
      ) : users.length === 0 ? (
        <div className="adm__empty"><p>Keine Nutzer gefunden.</p></div>
      ) : (
        <>
          <div className="adm__table-wrap">
            <table className="adm__table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>E-Mail</th>
                  <th>Rolle</th>
                  <th>Status</th>
                  <th>Verifiziert</th>
                  <th>Registriert</th>
                  <th>Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.id}</td>
                    <td>{u.first_name} {u.last_name}</td>
                    <td>{u.email}</td>
                    <td><span className={`adm__badge adm__badge--${u.role_name || 'renter'}`}>{u.role_name || u.role}</span></td>
                    <td>
                      <span className={`adm__badge ${u.is_active ? 'adm__badge--active' : 'adm__badge--inactive'}`}>
                        {u.is_active ? 'Aktiv' : 'Inaktiv'}
                      </span>
                    </td>
                    <td>
                      {u.role_name === 'owner' ? (
                        <span className={`adm__badge ${Number(u.owner_verified) ? 'adm__badge--active' : 'adm__badge--inactive'}`}>
                          {Number(u.owner_verified) ? 'Verifiziert' : 'Ausstehend'}
                        </span>
                      ) : (
                        <span className="adm__badge adm__badge--muted">–</span>
                      )}
                    </td>
                    <td>{u.created_at?.split(' ')[0]}</td>
                    <td>
                      <div className="adm__actions">
                        <button
                          type="button"
                          className={`adm__btn ${u.is_active ? 'adm__btn--danger' : 'adm__btn--success'}`}
                          disabled={busy === u.id}
                          onClick={() => handleToggleActive(u)}
                        >
                          {busy === u.id ? '…' : u.is_active ? 'Deaktivieren' : 'Aktivieren'}
                        </button>
                        {u.role_name === 'owner' && (
                          <button
                            type="button"
                            className={`adm__btn ${Number(u.owner_verified) ? 'adm__btn--danger' : 'adm__btn--primary'}`}
                            disabled={busy === u.id}
                            onClick={() => handleToggleVerify(u)}
                          >
                            {busy === u.id ? '…' : Number(u.owner_verified) ? 'Verifiz. widerrufen' : 'Verifizieren'}
                          </button>
                        )}
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
    </div>
  );
}