import './ContractPage.css';

/**
 * Read-only contract view with signature buttons.
 */
export default function ContractSignView({ contract, isOwner, isRenter, onSign, signing }) {
  const ownerSigned = !!contract.owner_signed_at;
  const renterSigned = !!contract.renter_signed_at;
  const canSign = (isOwner && !ownerSigned) || (isRenter && !renterSigned);

  return (
    <div className="rc__sign-view">
      <section className="rc__section">
        <h2 className="rc__section-title">📄 Vertragstext</h2>
        <pre className="rc__contract-preview">{contract.contract_text}</pre>
      </section>

      {contract.insurance_type && (
        <section className="rc__section">
          <h2 className="rc__section-title">🛡️ Versicherung</h2>
          <div className="rc__info-row">
            <span className="rc__info-label">Nutzungsart</span>
            <span>{contract.insurance_type === 'private' ? 'Privat' : 'Gewerblich'}</span>
          </div>
          {contract.insurance_details && (
            <div className="rc__info-row">
              <span className="rc__info-label">Details</span>
              <span>{contract.insurance_details}</span>
            </div>
          )}
        </section>
      )}

      {contract.special_conditions && (
        <section className="rc__section">
          <h2 className="rc__section-title">📋 Besondere Bedingungen</h2>
          <p className="rc__text">{contract.special_conditions}</p>
        </section>
      )}

      <section className="rc__section">
        <h2 className="rc__section-title">👤 Mieterdaten</h2>
        <div className="rc__info-row">
          <span className="rc__info-label">Name</span>
          <span>{contract.renter_full_name}</span>
        </div>
        <div className="rc__info-row">
          <span className="rc__info-label">Anschrift</span>
          <span>{contract.renter_address}</span>
        </div>
        <div className="rc__info-row">
          <span className="rc__info-label">Telefon</span>
          <span>{contract.renter_phone}</span>
        </div>
        <div className="rc__info-row">
          <span className="rc__info-label">Führerscheinnr.</span>
          <span>{contract.renter_license_number}</span>
        </div>
        <div className="rc__info-row">
          <span className="rc__info-label">Gültig bis</span>
          <span>{formatGerman(contract.renter_license_expiry)}</span>
        </div>
        {contract.renter_id_number && (
          <div className="rc__info-row">
            <span className="rc__info-label">Personalausweis</span>
            <span>{contract.renter_id_number}</span>
          </div>
        )}
      </section>

      <section className="rc__section rc__section--signatures">
        <h2 className="rc__section-title">✍️ Unterschriften</h2>
        <div className="rc__sig-grid">
          <div className={`rc__sig-card ${ownerSigned ? 'rc__sig-card--signed' : ''}`}>
            <span className="rc__sig-role">Vermieter</span>
            <span className="rc__sig-name">{contract.owner_first_name} {contract.owner_last_name}</span>
            {ownerSigned
              ? <span className="rc__sig-status rc__sig-status--done">✅ Unterschrieben am {formatDateTime(contract.owner_signed_at)}</span>
              : <span className="rc__sig-status rc__sig-status--pending">⏳ Ausstehend</span>
            }
          </div>
          <div className={`rc__sig-card ${renterSigned ? 'rc__sig-card--signed' : ''}`}>
            <span className="rc__sig-role">Mieter</span>
            <span className="rc__sig-name">{contract.renter_full_name}</span>
            {renterSigned
              ? <span className="rc__sig-status rc__sig-status--done">✅ Unterschrieben am {formatDateTime(contract.renter_signed_at)}</span>
              : <span className="rc__sig-status rc__sig-status--pending">⏳ Ausstehend</span>
            }
          </div>
        </div>
      </section>

      {canSign && (
        <div className="rc__actions">
          <p className="rc__sign-notice">
            Mit der Unterschrift bestätigen Sie, dass Sie den Vertrag gelesen haben und allen Bedingungen zustimmen.
          </p>
          <button className="rc__btn rc__btn--success rc__btn--large" onClick={onSign} disabled={signing}>
            {signing ? 'Wird unterschrieben…' : '✍️ Vertrag unterschreiben'}
          </button>
        </div>
      )}

      {!canSign && (
        <div className="rc__info-box">
          {(isOwner && ownerSigned && !renterSigned) && <p>✅ Sie haben unterschrieben. Warten auf die Unterschrift des Mieters.</p>}
          {(isRenter && renterSigned && !ownerSigned) && <p>✅ Sie haben unterschrieben. Warten auf die Unterschrift des Vermieters.</p>}
        </div>
      )}
    </div>
  );
}

function formatGerman(dateStr) {
  if (!dateStr) return '—';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parseInt(parts[2], 10)}.${parseInt(parts[1], 10)}.${parts[0]}`;
}

function formatDateTime(dt) {
  if (!dt) return '—';
  const [date, time] = dt.split(' ');
  return `${formatGerman(date)}${time ? ` ${time.substring(0, 5)}` : ''}`;
}
