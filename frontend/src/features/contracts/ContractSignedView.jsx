import './ContractPage.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost/grape/backend/public';

/**
 * Post-signing view: shows pickup/return locations with maps + happy journey message.
 */
export default function ContractSignedView({ contract }) {
  const hasPickupMap = isValidCoord(contract.pickup_lat, contract.pickup_lng);
  const hasReturnMap = isValidCoord(contract.return_lat, contract.return_lng);

  const handleViewPdf = () => {
    window.open(`${API_BASE}/api/bookings/${contract.booking_id}/contract/pdf`, '_blank');
  };

  return (
    <div className="rc__signed-view">
      <div className="rc__success-banner">
        <span className="rc__success-icon">🎉</span>
        <h2 className="rc__success-title">Mietvertrag abgeschlossen!</h2>
        <p className="rc__success-text">
          Der Vertrag wurde von beiden Parteien unterschrieben. Hier finden Sie alle Informationen für Ihre Reise.
        </p>
        <button className="rc__pdf-btn" onClick={handleViewPdf}>
          📄 Vertrag als PDF anzeigen
        </button>
      </div>

      <section className="rc__section">
        <h2 className="rc__section-title">📍 Abholung</h2>
        <div className="rc__location-card">
          <p className="rc__location-date">📅 {formatGerman(contract.start_date)}</p>
          <p className="rc__location-address">{contract.pickup_address}</p>
          {contract.pickup_notes && <p className="rc__location-notes">📌 {contract.pickup_notes}</p>}
          {hasPickupMap && (
            <div className="rc__map-wrap">
              <iframe
                title="Abholort"
                className="rc__map"
                src={mapUrl(contract.pickup_lat, contract.pickup_lng)}
                loading="lazy"
                referrerPolicy="no-referrer"
              />
              <a
                href={osmLink(contract.pickup_lat, contract.pickup_lng)}
                target="_blank"
                rel="noopener noreferrer"
                className="rc__map-link"
              >
                Größere Karte anzeigen ↗
              </a>
            </div>
          )}
        </div>
      </section>

      {contract.key_handover_details && (
        <section className="rc__section">
          <h2 className="rc__section-title">🔑 Schlüsselübergabe</h2>
          <p className="rc__text">{contract.key_handover_details}</p>
        </section>
      )}

      <section className="rc__section">
        <h2 className="rc__section-title">📍 Rückgabe</h2>
        <div className="rc__location-card">
          <p className="rc__location-date">📅 {formatGerman(contract.end_date)}</p>
          <p className="rc__location-address">{contract.return_address}</p>
          {contract.return_notes && <p className="rc__location-notes">📌 {contract.return_notes}</p>}
          {hasReturnMap && (
            <div className="rc__map-wrap">
              <iframe
                title="Rückgabeort"
                className="rc__map"
                src={mapUrl(contract.return_lat, contract.return_lng)}
                loading="lazy"
                referrerPolicy="no-referrer"
              />
              <a
                href={osmLink(contract.return_lat, contract.return_lng)}
                target="_blank"
                rel="noopener noreferrer"
                className="rc__map-link"
              >
                Größere Karte anzeigen ↗
              </a>
            </div>
          )}
        </div>
      </section>

      <div className="rc__journey-banner">
        <span className="rc__journey-icon">🚐</span>
        <h2 className="rc__journey-title">Wir wünschen eine schöne Reise!</h2>
        <p className="rc__journey-text">
          Genießen Sie Ihr Abenteuer und kommen Sie sicher zurück. Bei Fragen wenden Sie sich an den Vermieter.
        </p>
      </div>
    </div>
  );
}

/** Check that lat/lng are real coordinates (not null, empty, or 0/0). */
function isValidCoord(lat, lng) {
  const fLat = parseFloat(lat);
  const fLng = parseFloat(lng);
  return Number.isFinite(fLat) && Number.isFinite(fLng) && (Math.abs(fLat) > 0.001 || Math.abs(fLng) > 0.001);
}

function mapUrl(lat, lng) {
  const fLat = parseFloat(lat);
  const fLng = parseFloat(lng);
  const bbox = `${(fLng - 0.008).toFixed(6)},${(fLat - 0.006).toFixed(6)},${(fLng + 0.008).toFixed(6)},${(fLat + 0.006).toFixed(6)}`;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${fLat.toFixed(6)}%2C${fLng.toFixed(6)}`;
}

function osmLink(lat, lng) {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`;
}

function formatGerman(dateStr) {
  if (!dateStr) return '—';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parseInt(parts[2], 10)}.${parseInt(parts[1], 10)}.${parts[0]}`;
}
