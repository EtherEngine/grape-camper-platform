import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ContractApi from './ContractApi';
import ContractOwnerForm from './ContractOwnerForm';
import ContractRenterForm from './ContractRenterForm';
import ContractSignView from './ContractSignView';
import ContractSignedView from './ContractSignedView';
import Loader from '../../components/common/Loader';
import useAuth from '../../hooks/useAuth';
import './ContractPage.css';

const STATUS_LABELS = {
  pending_owner: 'Vermieter füllt Vertrag aus',
  pending_renter: 'Mieter füllt Daten aus',
  pending_signatures: 'Warten auf Unterschriften',
  signed: 'Vertrag unterschrieben',
  cancelled: 'Storniert',
};

export default function ContractPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchContract = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await ContractApi.get(id);
      setContract(res.data?.data || null);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Vertrag konnte nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchContract(); }, [fetchContract]);

  const isOwner = contract && user && parseInt(contract.owner_id) === user.id;
  const isRenter = contract && user && parseInt(contract.renter_id) === user.id;

  const handleSave = async (data) => {
    setSaving(true);
    setError(null);
    try {
      const res = await ContractApi.update(id, data);
      setContract(res.data?.data || contract);
    } catch (err) {
      setError(err.response?.data?.message || 'Speichern fehlgeschlagen.');
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await ContractApi.send(id);
      setContract(res.data?.data || contract);
    } catch (err) {
      setError(err.response?.data?.message || 'Senden fehlgeschlagen.');
    } finally {
      setSaving(false);
    }
  };

  const handleFill = async (data) => {
    setSaving(true);
    setError(null);
    try {
      const res = await ContractApi.fill(id, data);
      setContract(res.data?.data || contract);
    } catch (err) {
      setError(err.response?.data?.message || 'Speichern fehlgeschlagen.');
    } finally {
      setSaving(false);
    }
  };

  const handleSign = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await ContractApi.sign(id);
      setContract(res.data?.data || contract);
    } catch (err) {
      setError(err.response?.data?.message || 'Unterschrift fehlgeschlagen.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader size="lg" text="Mietvertrag wird geladen…" />;
  if (error && !contract) return (
    <div className="rc container">
      <div className="rc__error">
        <p>{error}</p>
        <button className="rc__btn rc__btn--primary" onClick={() => navigate(-1)}>Zurück</button>
      </div>
    </div>
  );
  if (!contract) return (
    <div className="rc container">
      <div className="rc__error"><p>Kein Vertrag vorhanden.</p></div>
    </div>
  );

  const statusLabel = STATUS_LABELS[contract.status] || contract.status;

  return (
    <div className="rc container">
      <div className="rc__header">
        <button className="rc__back" onClick={() => navigate(`/bookings/${id}`)}>← Zur Buchung</button>
        <div className="rc__header-main">
          <h1 className="rc__title">Mietvertrag</h1>
          <span className={`rc__status rc__status--${contract.status.replace('_', '-')}`}>
            {statusLabel}
          </span>
        </div>
        <p className="rc__subtitle">
          {contract.vehicle_title} · Buchung #{contract.booking_id}
        </p>
      </div>

      {error && <div className="rc__error-msg">{error}</div>}

      {contract.status === 'pending_owner' && isOwner && (
        <ContractOwnerForm contract={contract} onSave={handleSave} onSend={handleSend} saving={saving} />
      )}

      {contract.status === 'pending_owner' && isRenter && (
        <div className="rc__info-box">
          <p>⏳ Der Vermieter erstellt gerade den Mietvertrag. Sie werden benachrichtigt, sobald er bereit ist.</p>
        </div>
      )}

      {contract.status === 'pending_renter' && isRenter && (
        <ContractRenterForm contract={contract} onFill={handleFill} saving={saving} />
      )}

      {contract.status === 'pending_renter' && isOwner && (
        <div className="rc__info-box">
          <p>📤 Vertrag wurde an den Mieter gesendet. Warten auf seine persönlichen Daten.</p>
        </div>
      )}

      {contract.status === 'pending_signatures' && (
        <ContractSignView
          contract={contract}
          isOwner={isOwner}
          isRenter={isRenter}
          onSign={handleSign}
          signing={saving}
        />
      )}

      {contract.status === 'signed' && (
        <ContractSignedView contract={contract} />
      )}

      {contract.status === 'cancelled' && (
        <div className="rc__info-box rc__info-box--danger">
          <p>❌ Dieser Vertrag wurde storniert.</p>
        </div>
      )}
    </div>
  );
}
