import { useParams, Link } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
import VehiclesApi from '../features/vehicles/VehiclesApi';
import VehicleGallery from '../features/vehicles/VehicleGallery';
import BookingCalendar from '../features/bookings/BookingCalendar';
import Loader from '../components/common/Loader';
import './VehicleDetailPage.css';

const TYPE_LABELS = {
  campervan: 'Campervan',
  motorhome: 'Wohnmobil',
  caravan: 'Wohnwagen',
  offroad: 'Offroad',
  other: 'Sonstiges',
};

const TRANSMISSION_LABELS = { manual: 'Schaltung', automatic: 'Automatik', other: 'Sonstiges' };
const FUEL_LABELS = { diesel: 'Diesel', petrol: 'Benzin', electric: 'Elektro', hybrid: 'Hybrid', gas: 'Gas', other: 'Sonstiges' };

export default function VehicleDetailPage() {
  const { id } = useParams();
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [calendarSelection, setCalendarSelection] = useState(null);

  const handleSelectionChange = useCallback((sel) => {
    setCalendarSelection(sel);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await VehiclesApi.get(id);
        if (!cancelled) setVehicle(res.data.data);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Fahrzeug konnte nicht geladen werden.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return (
      <div className="vdp container">
        <Loader size="lg" text="Fahrzeug wird geladen…" />
      </div>
    );
  }

  if (error || !vehicle) {
    return (
      <div className="vdp container">
        <div className="vdp__error">
          <p>{error || 'Fahrzeug nicht gefunden.'}</p>
          <Link to="/vehicles" className="vdp__back-link">← Zurück zur Übersicht</Link>
        </div>
      </div>
    );
  }

  const features = vehicle.features || [];
  const images = vehicle.images || [];

  return (
    <div className="vdp container">
      <Link to="/vehicles" className="vdp__back-link">← Alle Fahrzeuge</Link>

      <div className="vdp__layout">
        {/* Left: Gallery + Description */}
        <div className="vdp__main">
          <div style={{ position: 'relative' }}>
            <VehicleGallery images={images} />
            {(vehicle.owner_swap_unlocked === '1' || vehicle.owner_swap_unlocked === 1) && (
              <span className="grape-flex-badge grape-flex-badge--lg">Tauschpartner</span>
            )}
          </div>

          <div className="vdp__section">
            <h1 className="vdp__title">{vehicle.title}</h1>
            <p className="vdp__location">{vehicle.location_city}, {vehicle.location_country}</p>
            <span className="vdp__type-badge">
              {TYPE_LABELS[vehicle.vehicle_type] || vehicle.vehicle_type}
            </span>
          </div>

          <div className="vdp__section">
            <h2 className="vdp__section-title">Beschreibung</h2>
            <p className="vdp__description">{vehicle.description}</p>
          </div>

          {/* Vehicle specs */}
          <div className="vdp__section">
            <h2 className="vdp__section-title">Details</h2>
            <div className="vdp__specs">
              {vehicle.brand && (
                <div className="vdp__spec">
                  <span className="vdp__spec-label">Marke / Modell</span>
                  <span className="vdp__spec-value">{vehicle.brand} {vehicle.model}</span>
                </div>
              )}
              {vehicle.year_of_manufacture && (
                <div className="vdp__spec">
                  <span className="vdp__spec-label">Baujahr</span>
                  <span className="vdp__spec-value">{vehicle.year_of_manufacture}</span>
                </div>
              )}
              <div className="vdp__spec">
                <span className="vdp__spec-label">Sitzplätze</span>
                <span className="vdp__spec-value">{vehicle.seats}</span>
              </div>
              <div className="vdp__spec">
                <span className="vdp__spec-label">Schlafplätze</span>
                <span className="vdp__spec-value">{vehicle.sleeping_places}</span>
              </div>
              <div className="vdp__spec">
                <span className="vdp__spec-label">Getriebe</span>
                <span className="vdp__spec-value">{TRANSMISSION_LABELS[vehicle.transmission] || vehicle.transmission}</span>
              </div>
              <div className="vdp__spec">
                <span className="vdp__spec-label">Kraftstoff</span>
                <span className="vdp__spec-value">{FUEL_LABELS[vehicle.fuel_type] || vehicle.fuel_type}</span>
              </div>
              <div className="vdp__spec">
                <span className="vdp__spec-label">Haustiere</span>
                <span className="vdp__spec-value">{vehicle.pets_allowed === '1' ? 'Erlaubt' : 'Nicht erlaubt'}</span>
              </div>
              <div className="vdp__spec">
                <span className="vdp__spec-label">Rauchen</span>
                <span className="vdp__spec-value">{vehicle.smoking_allowed === '1' ? 'Erlaubt' : 'Nicht erlaubt'}</span>
              </div>
              {vehicle.minimum_rental_days && (
                <div className="vdp__spec">
                  <span className="vdp__spec-label">Min. Mietdauer</span>
                  <span className="vdp__spec-value">{vehicle.minimum_rental_days} Tag{vehicle.minimum_rental_days > 1 ? 'e' : ''}</span>
                </div>
              )}
            </div>
          </div>

          {/* Features */}
          {features.length > 0 && (
            <div className="vdp__section">
              <h2 className="vdp__section-title">Ausstattung</h2>
              <ul className="vdp__features">
                {features.map((f) => (
                  <li key={f.id} className="vdp__feature">
                    <span className="vdp__feature-key">{f.feature_key}</span>
                    <span className="vdp__feature-value">{f.feature_value}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right: Pricing sidebar */}
        <aside className="vdp__sidebar">
          <div className="vdp__price-card">
            <div className="vdp__price-main">
              {parseFloat(vehicle.daily_price).toLocaleString('de-DE')} €
              <small> / Tag</small>
            </div>

            {vehicle.weekly_price && (
              <div className="vdp__price-row">
                <span>Wochenpreis</span>
                <span>{parseFloat(vehicle.weekly_price).toLocaleString('de-DE')} €</span>
              </div>
            )}
            {vehicle.monthly_price && (
              <div className="vdp__price-row">
                <span>Monatspreis</span>
                <span>{parseFloat(vehicle.monthly_price).toLocaleString('de-DE')} €</span>
              </div>
            )}
            {parseFloat(vehicle.deposit_amount) > 0 && (
              <div className="vdp__price-row">
                <span>Kaution</span>
                <span>{parseFloat(vehicle.deposit_amount).toLocaleString('de-DE')} €</span>
              </div>
            )}
            {parseFloat(vehicle.cleaning_fee) > 0 && (
              <div className="vdp__price-row">
                <span>Reinigung</span>
                <span>{parseFloat(vehicle.cleaning_fee).toLocaleString('de-DE')} €</span>
              </div>
            )}
            {parseFloat(vehicle.service_fee) > 0 && (
              <div className="vdp__price-row">
                <span>Service</span>
                <span>{parseFloat(vehicle.service_fee).toLocaleString('de-DE')} €</span>
              </div>
            )}

            <Link
              to={`/vehicles/${vehicle.id}/book`}
              state={
                calendarSelection?.startDate && calendarSelection?.endDate
                  ? { start_date: calendarSelection.startDate, end_date: calendarSelection.endDate }
                  : undefined
              }
              className="vdp__book-btn"
            >
              Jetzt buchen
            </Link>


          </div>

          {/* Booking Calendar */}
          <BookingCalendar
            vehicleId={vehicle.id}
            minRentalDays={parseInt(vehicle.minimum_rental_days, 10) || 1}
            maxRentalDays={vehicle.maximum_rental_days ? parseInt(vehicle.maximum_rental_days, 10) : null}
            onSelectionChange={handleSelectionChange}
          />

          {/* Owner info */}
          <div className="vdp__owner-card">
            <span className="vdp__owner-label">Vermieter</span>
            <span className="vdp__owner-name">{vehicle.owner_first_name} {vehicle.owner_last_name?.charAt(0)}.</span>
          </div>
        </aside>
      </div>
    </div>
  );
}