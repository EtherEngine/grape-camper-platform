import VehicleCard from './VehicleCard';
import './VehicleList.css';

export default function VehicleList({ vehicles, page, totalPages, onPageChange }) {
  if (vehicles.length === 0) {
    return (
      <div className="vl__empty">
        <p>Keine Fahrzeuge gefunden.</p>
        <p className="vl__empty-hint">Versuche andere Filtereinstellungen.</p>
      </div>
    );
  }

  return (
    <>
      <div className="vl__grid">
        {vehicles.map((v) => (
          <VehicleCard key={v.id} vehicle={v} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="vl__pagination">
          <button
            type="button"
            className="vl__page-btn"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            ← Zurück
          </button>

          <span className="vl__page-info">
            Seite {page} von {totalPages}
          </span>

          <button
            type="button"
            className="vl__page-btn"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Weiter →
          </button>
        </div>
      )}
    </>
  );
}