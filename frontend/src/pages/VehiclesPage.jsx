import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import VehiclesApi from '../features/vehicles/VehiclesApi';
import VehicleFilters, { INITIAL_FILTERS } from '../features/vehicles/VehicleFilters';
import VehicleList from '../features/vehicles/VehicleList';
import Loader from '../components/common/Loader';
import './VehiclesPage.css';

const PER_PAGE = 12;

export default function VehiclesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [vehicles, setVehicles] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Derive filters & page from URL
  const filters = {
    location_city: searchParams.get('location_city') || '',
    vehicle_type: searchParams.get('vehicle_type') || '',
    min_price: searchParams.get('min_price') || '',
    max_price: searchParams.get('max_price') || '',
    sleeping_places: searchParams.get('sleeping_places') || '',
  };
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));

  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Build query params — strip empty values
      const params = { page, per_page: PER_PAGE };
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== '' && v != null) params[k] = v;
      });

      const res = await VehiclesApi.list(params);
      setVehicles(res.data.data ?? []);
      setTotal(res.data.meta?.total ?? 0);
    } catch (err) {
      setError(err.message || 'Fahrzeuge konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, [searchParams.toString()]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  // Sync filters → URL
  const handleFiltersChange = (newFilters) => {
    const params = new URLSearchParams();
    Object.entries(newFilters).forEach(([k, v]) => {
      if (v !== '' && v != null) params.set(k, v);
    });
    params.set('page', '1'); // reset to page 1 on filter change
    setSearchParams(params, { replace: true });
  };

  const handlePageChange = (newPage) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', String(newPage));
    setSearchParams(params, { replace: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <div className="vehicles-page container">
      <div className="vehicles-page__header">
        <h1 className="vehicles-page__title">Fahrzeuge entdecken</h1>
        {!loading && (
          <span className="vehicles-page__count">{total} Ergebnis{total !== 1 ? 'se' : ''}</span>
        )}
      </div>

      <VehicleFilters filters={filters} onChange={handleFiltersChange} />

      {loading ? (
        <Loader size="lg" text="Fahrzeuge werden geladen…" />
      ) : error ? (
        <div className="vehicles-page__error">
          <p>{error}</p>
          <button type="button" className="vehicles-page__retry" onClick={fetchVehicles}>
            Erneut versuchen
          </button>
        </div>
      ) : (
        <VehicleList
          vehicles={vehicles}
          page={page}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
}