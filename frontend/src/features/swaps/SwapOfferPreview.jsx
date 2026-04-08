import './SwapOfferForm.css';

const TYPE_LABELS = {
  vehicle: 'Fahrzeug',
  property: 'Immobilie / Unterkunft',
  other: 'Sonstiges',
};

/**
 * Read-only preview card for a swap offer.
 * Used inside SwapOfferForm and BookingSummary.
 *
 * @param {{ data: object }} props  – wizard data with swap_* fields
 */
export default function SwapOfferPreview({ data }) {
  const typeLabel = TYPE_LABELS[data.swap_type] || data.swap_type || '—';
  const value = data.swap_estimated_value
    ? Number(data.swap_estimated_value).toLocaleString('de-DE', { minimumFractionDigits: 2 }) + ' €'
    : null;

  const from = data.swap_available_from ? formatGerman(data.swap_available_from) : null;
  const to = data.swap_available_to ? formatGerman(data.swap_available_to) : null;
  const dateRange = from && to ? `${from} – ${to}` : from || to || null;

  return (
    <div className="swap-preview">
      <span className="swap-preview__badge">{typeLabel}</span>
      <h4 className="swap-preview__title">{data.swap_title || 'Ohne Titel'}</h4>

      {data.swap_description && (
        <p className="swap-preview__desc">{data.swap_description}</p>
      )}

      <div className="swap-preview__meta">
        {value && (
          <span className="swap-preview__meta-item">
            💰 Wert: <span className="swap-preview__meta-value">{value}</span>
          </span>
        )}
        {dateRange && (
          <span className="swap-preview__meta-item">
            📅 Zeitraum: <span className="swap-preview__meta-value">{dateRange}</span>
          </span>
        )}
      </div>
    </div>
  );
}

function formatGerman(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${parseInt(d, 10)}.${parseInt(m, 10)}.${y}`;
}