import { Link } from 'react-router-dom';
import './VehicleCard.css';

const TYPE_LABELS = {
  campervan: 'Campervan',
  motorhome: 'Wohnmobil',
  caravan: 'Wohnwagen',
  offroad: 'Offroad',
  other: 'Sonstiges',
};

export default function VehicleCard({ vehicle }) {
  const coverSrc = vehicle.cover_image
    ? `${import.meta.env.VITE_API_URL || 'http://localhost/grape/backend/public'}/${vehicle.cover_image}`
    : null;

  return (
    <Link to={`/vehicles/${vehicle.id}`} className="vehicle-card">
      <div className="vehicle-card__image-wrap">
        {coverSrc ? (
          <img src={coverSrc} alt={vehicle.title} className="vehicle-card__image" loading="lazy" />
        ) : (
          <div className="vehicle-card__placeholder">
            <span>Kein Bild</span>
          </div>
        )}
        {vehicle.is_featured === '1' && (
          <span className="vehicle-card__badge">Empfohlen</span>
        )}
        {(vehicle.owner_swap_unlocked === '1' || vehicle.owner_swap_unlocked === 1) && (
          <span className="grape-flex-badge">Tauschpartner</span>
        )}
      </div>

      <div className="vehicle-card__body">
        <span className="vehicle-card__type">
          {TYPE_LABELS[vehicle.vehicle_type] || vehicle.vehicle_type}
        </span>

        <h3 className="vehicle-card__title">{vehicle.title}</h3>

        <p className="vehicle-card__location">
          {vehicle.location_city}, {vehicle.location_country}
        </p>

        <div className="vehicle-card__meta">
          {vehicle.brand && <span>{vehicle.brand} {vehicle.model}</span>}
          <span>{vehicle.seats} Sitze</span>
          <span>{vehicle.sleeping_places} Schlafplätze</span>
        </div>

        <div className="vehicle-card__footer">
          <span className="vehicle-card__price">
            {parseFloat(vehicle.daily_price).toLocaleString('de-DE', { minimumFractionDigits: 0 })} €
            <small> / Tag</small>
          </span>
          {vehicle.weekly_price && (
            <span className="vehicle-card__price-secondary">
              {parseFloat(vehicle.weekly_price).toLocaleString('de-DE', { minimumFractionDigits: 0 })} € / Woche
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}