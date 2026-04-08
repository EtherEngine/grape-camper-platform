import { useState } from 'react';
import './VehicleFilters.css';

const VEHICLE_TYPES = [
  { value: '', label: 'Alle Typen' },
  { value: 'campervan', label: 'Campervan' },
  { value: 'motorhome', label: 'Wohnmobil' },
  { value: 'caravan', label: 'Wohnwagen' },
  { value: 'offroad', label: 'Offroad' },
  { value: 'other', label: 'Sonstiges' },
];

const INITIAL_FILTERS = {
  location_city: '',
  vehicle_type: '',
  min_price: '',
  max_price: '',
  sleeping_places: '',
};

export default function VehicleFilters({ filters, onChange }) {
  const [open, setOpen] = useState(false);

  const handleChange = (key, value) => {
    onChange({ ...filters, [key]: value });
  };

  const handleReset = () => {
    onChange({ ...INITIAL_FILTERS });
  };

  const activeCount = Object.values(filters).filter((v) => v !== '' && v != null).length;

  return (
    <div className="vf">
      <button
        type="button"
        className="vf__toggle"
        onClick={() => setOpen((o) => !o)}
      >
        Filter {activeCount > 0 && <span className="vf__count">{activeCount}</span>}
        <span className={`vf__chevron ${open ? 'vf__chevron--open' : ''}`}>▾</span>
      </button>

      {open && (
        <div className="vf__panel">
          <div className="vf__grid">
            {/* Location */}
            <div className="vf__field">
              <label className="vf__label" htmlFor="vf-city">Ort</label>
              <input
                id="vf-city"
                type="text"
                className="vf__input"
                placeholder="z. B. Berlin"
                value={filters.location_city}
                onChange={(e) => handleChange('location_city', e.target.value)}
              />
            </div>

            {/* Vehicle type */}
            <div className="vf__field">
              <label className="vf__label" htmlFor="vf-type">Fahrzeugtyp</label>
              <select
                id="vf-type"
                className="vf__input"
                value={filters.vehicle_type}
                onChange={(e) => handleChange('vehicle_type', e.target.value)}
              >
                {VEHICLE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Min price */}
            <div className="vf__field">
              <label className="vf__label" htmlFor="vf-min">Preis ab (€)</label>
              <input
                id="vf-min"
                type="number"
                min="0"
                className="vf__input"
                placeholder="0"
                value={filters.min_price}
                onChange={(e) => handleChange('min_price', e.target.value)}
              />
            </div>

            {/* Max price */}
            <div className="vf__field">
              <label className="vf__label" htmlFor="vf-max">Preis bis (€)</label>
              <input
                id="vf-max"
                type="number"
                min="0"
                className="vf__input"
                placeholder="500"
                value={filters.max_price}
                onChange={(e) => handleChange('max_price', e.target.value)}
              />
            </div>

            {/* Sleeping places */}
            <div className="vf__field">
              <label className="vf__label" htmlFor="vf-sleep">Min. Schlafplätze</label>
              <input
                id="vf-sleep"
                type="number"
                min="1"
                max="30"
                className="vf__input"
                placeholder="1"
                value={filters.sleeping_places}
                onChange={(e) => handleChange('sleeping_places', e.target.value)}
              />
            </div>
          </div>

          {activeCount > 0 && (
            <button type="button" className="vf__reset" onClick={handleReset}>
              Filter zurücksetzen
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export { INITIAL_FILTERS };