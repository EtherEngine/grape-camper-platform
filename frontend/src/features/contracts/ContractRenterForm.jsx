import { useState } from 'react';
import './ContractPage.css';

/**
 * Renter fills personal details then submits.
 */
export default function ContractRenterForm({ contract, onFill, saving }) {
  const [form, setForm] = useState({
    renter_full_name: contract.renter_full_name || '',
    renter_address: contract.renter_address || '',
    renter_phone: contract.renter_phone || '',
    renter_license_number: contract.renter_license_number || '',
    renter_license_expiry: contract.renter_license_expiry || '',
    renter_id_number: contract.renter_id_number || '',
  });

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onFill(form);
  };

  return (
    <form className="rc__form" onSubmit={handleSubmit}>
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

      <section className="rc__section rc__section--highlight">
        <h2 className="rc__section-title">👤 Ihre persönlichen Daten</h2>
        <p className="rc__hint">Bitte füllen Sie alle Pflichtfelder aus, um den Vertrag abzuschließen.</p>

        <div className="rc__field-row">
          <label className="rc__label">Vollständiger Name *</label>
          <input className="rc__input" required value={form.renter_full_name} onChange={e => set('renter_full_name', e.target.value)} placeholder="Vor- und Nachname" />
        </div>
        <div className="rc__field-row">
          <label className="rc__label">Anschrift *</label>
          <textarea className="rc__textarea" required value={form.renter_address} onChange={e => set('renter_address', e.target.value)} placeholder="Straße, Hausnr., PLZ Ort" rows={2} />
        </div>
        <div className="rc__field-row">
          <label className="rc__label">Telefon *</label>
          <input className="rc__input" required value={form.renter_phone} onChange={e => set('renter_phone', e.target.value)} placeholder="+49 …" />
        </div>
        <div className="rc__field-grid">
          <div className="rc__field-row">
            <label className="rc__label">Führerscheinnummer *</label>
            <input className="rc__input" required value={form.renter_license_number} onChange={e => set('renter_license_number', e.target.value)} />
          </div>
          <div className="rc__field-row">
            <label className="rc__label">Führerschein gültig bis *</label>
            <input className="rc__input" type="date" required value={form.renter_license_expiry} onChange={e => set('renter_license_expiry', e.target.value)} />
          </div>
        </div>
        <div className="rc__field-row">
          <label className="rc__label">Personalausweisnummer</label>
          <input className="rc__input" value={form.renter_id_number} onChange={e => set('renter_id_number', e.target.value)} placeholder="Optional" />
        </div>
      </section>

      <div className="rc__actions">
        <button type="submit" className="rc__btn rc__btn--primary" disabled={saving}>
          {saving ? 'Wird gespeichert…' : '✅ Daten absenden'}
        </button>
      </div>
    </form>
  );
}
