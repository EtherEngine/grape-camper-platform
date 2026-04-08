import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import OwnerVehiclesApi from './OwnerVehiclesApi';
import useAuthStore from '../auth/AuthStore';
import Loader from '../../components/common/Loader';
import './OwnerVehicles.css';

const STATUS_MAP = {
  draft: { label: 'Entwurf', cls: 'ov-badge--draft' },
  active: { label: 'Aktiv', cls: 'ov-badge--active' },
  inactive: { label: 'Inaktiv', cls: 'ov-badge--inactive' },
  archived: { label: 'Archiviert', cls: 'ov-badge--archived' },
};

export default function OwnerVehiclesPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const ownerVerified = Number(user?.owner_verified);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const res = await OwnerVehiclesApi.list(params);
      setVehicles(res.data.data ?? []);
    } catch (err) {
      setError(err.message || 'Fahrzeuge konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleStatusChange = async (id, action) => {
    setActionLoading(id);
    try {
      await OwnerVehiclesApi[action](id);
      await fetch();
    } catch (err) {
      setError(err.message || 'Aktion fehlgeschlagen.');
    } finally {
      setActionLoading(null);
    }
  };

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost/grape/backend/public';

  return (
    <div className="ov container">
      <div className="ov__header">
        <h1 className="ov__title">Meine Fahrzeuge</h1>
        <button
          type="button"
          className="ov__add-btn"
          onClick={() => navigate('/owner/vehicles/new')}
        >
          + Neues Fahrzeug
        </button>
      </div>

      {/* Status filter tabs */}
      <div className="ov__tabs">
        {[
          { value: '', label: 'Alle' },
          { value: 'draft', label: 'Entwürfe' },
          { value: 'active', label: 'Aktiv' },
          { value: 'inactive', label: 'Inaktiv' },
          { value: 'archived', label: 'Archiviert' },
        ].map((t) => (
          <button
            key={t.value}
            type="button"
            className={`ov__tab ${statusFilter === t.value ? 'ov__tab--active' : ''}`}
            onClick={() => setStatusFilter(t.value)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {!ownerVerified && (
        <div className="ov__verify-banner">
          <span className="ov__verify-icon">⏳</span>
          <div>
            <strong>Verifizierung ausstehend</strong>
            <p>Dein Vermieter-Konto muss zuerst vom Admin verifiziert werden, bevor du Fahrzeuge veröffentlichen kannst. Du kannst aber bereits Fahrzeuge anlegen und vorbereiten.</p>
          </div>
        </div>
      )}

      {loading ? (
        <Loader size="lg" text="Fahrzeuge werden geladen…" />
      ) : error ? (
        <div className="ov__error">
          <p>{error}</p>
          <button type="button" className="ov__retry" onClick={fetch}>Erneut versuchen</button>
        </div>
      ) : vehicles.length === 0 ? (
        <div className="ov__empty">
          <p>Noch keine Fahrzeuge vorhanden.</p>
          <button type="button" className="ov__add-btn" onClick={() => navigate('/owner/vehicles/new')}>
            Erstes Fahrzeug anlegen
          </button>
        </div>
      ) : (
        <div className="ov__list">
          {vehicles.map((v) => {
            const st = STATUS_MAP[v.status] || STATUS_MAP.draft;
            const isActing = actionLoading === v.id;
            const coverSrc = v.cover_image ? `${API_URL}/${v.cover_image}` : null;

            return (
              <div key={v.id} className="ov__card">
                <div className="ov__card-image-wrap">
                  {coverSrc ? (
                    <img src={coverSrc} alt={v.title} className="ov__card-image" />
                  ) : (
                    <div className="ov__card-placeholder">Kein Bild</div>
                  )}
                  {Number(user?.swap_unlocked) === 1 && (
                    <span className="grape-flex-badge grape-flex-badge--sm">Tauschpartner</span>
                  )}
                </div>

                <div className="ov__card-body">
                  <div className="ov__card-top">
                    <span className={`ov-badge ${st.cls}`}>{st.label}</span>
                    <span className="ov__card-price">
                      {parseFloat(v.daily_price).toLocaleString('de-DE')} € / Tag
                    </span>
                  </div>

                  <h3 className="ov__card-title">{v.title}</h3>
                  <p className="ov__card-location">{v.location_city}, {v.location_country}</p>

                  <div className="ov__card-actions">
                    <button
                      type="button"
                      className="ov__action-btn"
                      onClick={() => navigate(`/owner/vehicles/${v.id}/edit`)}
                    >
                      Bearbeiten
                    </button>
                    <button
                      type="button"
                      className="ov__action-btn"
                      onClick={() => navigate(`/owner/vehicles/${v.id}/availability`)}
                    >
                      📅 Verfügbarkeit
                    </button>

                    {/* Status actions */}
                    {v.status === 'draft' && (
                      <button
                        type="button"
                        className="ov__action-btn ov__action-btn--success"
                        disabled={isActing || !ownerVerified}
                        title={!ownerVerified ? 'Verifizierung durch Admin erforderlich' : ''}
                        onClick={() => handleStatusChange(v.id, 'activate')}
                      >
                        Aktivieren
                      </button>
                    )}
                    {v.status === 'active' && (
                      <button
                        type="button"
                        className="ov__action-btn ov__action-btn--warn"
                        disabled={isActing}
                        onClick={() => handleStatusChange(v.id, 'deactivate')}
                      >
                        Deaktivieren
                      </button>
                    )}
                    {v.status === 'inactive' && (
                      <>
                        <button
                          type="button"
                          className="ov__action-btn ov__action-btn--success"
                          disabled={isActing || !ownerVerified}
                          title={!ownerVerified ? 'Verifizierung durch Admin erforderlich' : ''}
                          onClick={() => handleStatusChange(v.id, 'activate')}
                        >
                          Wieder aktivieren
                        </button>
                        <button
                          type="button"
                          className="ov__action-btn ov__action-btn--danger"
                          disabled={isActing}
                          onClick={() => handleStatusChange(v.id, 'archive')}
                        >
                          Archivieren
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}