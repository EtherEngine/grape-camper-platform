import { useState } from 'react';
import './ContractPage.css';

/**
 * Owner edits contract text, insurance, locations — then sends to renter.
 */
export default function ContractOwnerForm({ contract, onSave, onSend, saving }) {
  const [form, setForm] = useState({
    contract_text: contract.contract_text || '',
    insurance_type: contract.insurance_type || 'private',
    insurance_details: contract.insurance_details || '',
    special_conditions: contract.special_conditions || '',
    pickup_address: contract.pickup_address || '',
    pickup_lat: contract.pickup_lat || '',
    pickup_lng: contract.pickup_lng || '',
    pickup_notes: contract.pickup_notes || '',
    key_handover_details: contract.key_handover_details || '',
    return_address: contract.return_address || '',
    return_lat: contract.return_lat || '',
    return_lng: contract.return_lng || '',
    return_notes: contract.return_notes || '',
  });

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSave = async () => {
    await onSave(form);
  };

  const handleSend = async () => {
    await onSave(form);
    await onSend();
  };

  return (
    <div className="rc__form">
      <section className="rc__section">
        <h2 className="rc__section-title">📝 Vertragstext</h2>
        <p className="rc__hint">Bearbeiten Sie den vorgefertigten Mietvertrag nach Ihren Wünschen.</p>
        <textarea
          className="rc__textarea rc__textarea--large"
          value={form.contract_text}
          onChange={e => set('contract_text', e.target.value)}
          rows={20}
        />
      </section>

      <section className="rc__section">
        <h2 className="rc__section-title">🛡️ Versicherung</h2>
        <div className="rc__field-row">
          <label className="rc__label">Nutzungsart</label>
          <select
            className="rc__select"
            value={form.insurance_type}
            onChange={e => set('insurance_type', e.target.value)}
          >
            <option value="private">Privat</option>
            <option value="commercial">Gewerblich</option>
          </select>
        </div>
        <div className="rc__field-row">
          <label className="rc__label">Versicherungsdetails</label>
          <textarea
            className="rc__textarea"
            value={form.insurance_details}
            onChange={e => set('insurance_details', e.target.value)}
            placeholder="z.B. Haftpflicht-Nr., Vollkasko-Selbstbeteiligung, Deckungssumme…"
            rows={4}
          />
        </div>
      </section>

      <section className="rc__section">
        <h2 className="rc__section-title">📍 Abholung</h2>
        <div className="rc__field-row">
          <label className="rc__label">Adresse *</label>
          <input
            className="rc__input"
            value={form.pickup_address}
            onChange={e => set('pickup_address', e.target.value)}
            placeholder="Straße, Hausnummer, PLZ Ort"
          />
        </div>
        <div className="rc__field-grid">
          <div className="rc__field-row">
            <label className="rc__label">Breitengrad</label>
            <input className="rc__input" type="number" step="any" value={form.pickup_lat} onChange={e => set('pickup_lat', e.target.value)} placeholder="z.B. 48.1351" />
          </div>
          <div className="rc__field-row">
            <label className="rc__label">Längengrad</label>
            <input className="rc__input" type="number" step="any" value={form.pickup_lng} onChange={e => set('pickup_lng', e.target.value)} placeholder="z.B. 11.5820" />
          </div>
        </div>
        <div className="rc__field-row">
          <label className="rc__label">Hinweise zur Abholung</label>
          <textarea className="rc__textarea" value={form.pickup_notes} onChange={e => set('pickup_notes', e.target.value)} placeholder="z.B. Parkplatz Nr. 5, Hof hinten rechts…" rows={2} />
        </div>
      </section>

      <section className="rc__section">
        <h2 className="rc__section-title">🔑 Schlüsselübergabe</h2>
        <div className="rc__field-row">
          <label className="rc__label">Details zur Übergabe</label>
          <textarea
            className="rc__textarea"
            value={form.key_handover_details}
            onChange={e => set('key_handover_details', e.target.value)}
            placeholder="z.B. Schlüsselbox an der Haustür, Code: 1234…"
            rows={3}
          />
        </div>
      </section>

      <section className="rc__section">
        <h2 className="rc__section-title">📍 Rückgabe</h2>
        <div className="rc__field-row">
          <label className="rc__label">Adresse *</label>
          <input
            className="rc__input"
            value={form.return_address}
            onChange={e => set('return_address', e.target.value)}
            placeholder="Straße, Hausnummer, PLZ Ort"
          />
        </div>
        <div className="rc__field-grid">
          <div className="rc__field-row">
            <label className="rc__label">Breitengrad</label>
            <input className="rc__input" type="number" step="any" value={form.return_lat} onChange={e => set('return_lat', e.target.value)} placeholder="z.B. 48.1351" />
          </div>
          <div className="rc__field-row">
            <label className="rc__label">Längengrad</label>
            <input className="rc__input" type="number" step="any" value={form.return_lng} onChange={e => set('return_lng', e.target.value)} placeholder="z.B. 11.5820" />
          </div>
        </div>
        <div className="rc__field-row">
          <label className="rc__label">Hinweise zur Rückgabe</label>
          <textarea className="rc__textarea" value={form.return_notes} onChange={e => set('return_notes', e.target.value)} placeholder="z.B. Bitte vollgetankt zurückgeben…" rows={2} />
        </div>
      </section>

      <section className="rc__section">
        <h2 className="rc__section-title">📋 Besondere Bedingungen</h2>
        <textarea
          className="rc__textarea"
          value={form.special_conditions}
          onChange={e => set('special_conditions', e.target.value)}
          placeholder="Weitere Vereinbarungen (optional)…"
          rows={4}
        />
      </section>

      <div className="rc__actions">
        <button className="rc__btn rc__btn--secondary" onClick={handleSave} disabled={saving}>
          {saving ? 'Speichern…' : '💾 Speichern'}
        </button>
        <button className="rc__btn rc__btn--primary" onClick={handleSend} disabled={saving}>
          {saving ? 'Wird gesendet…' : '📤 An Mieter senden'}
        </button>
      </div>
    </div>
  );
}
