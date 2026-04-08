import { useState, useEffect, useCallback, useRef } from 'react';
import BookingsApi from '../features/bookings/BookingsApi';
import { formatDate } from '../utils/date';

/**
 * Hook to manage availability data for a vehicle calendar.
 *
 * @param {number|string} vehicleId
 * @returns {{ days, loading, error, selection, loadMonth, selectStart, selectEnd, resetSelection, checkResult, checking }}
 */
export default function useAvailability(vehicleId, initialSelection = null) {
  // Day-by-day status map: { 'YYYY-MM-DD': { status, reason } }
  const [days, setDays] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Selection state
  const [selection, setSelection] = useState(
    initialSelection?.startDate && initialSelection?.endDate
      ? { startDate: initialSelection.startDate, endDate: initialSelection.endDate }
      : { startDate: null, endDate: null }
  );

  // Conflict check result
  const [checkResult, setCheckResult] = useState(null);
  const [checking, setChecking] = useState(false);

  // Track loaded month ranges to avoid duplicate fetches
  const loadedRanges = useRef(new Set());

  /**
   * Load availability data for a given month (year, monthIndex 0-11).
   * Fetches the full month range from the API and merges into `days`.
   */
  const loadMonth = useCallback(async (year, month) => {
    const key = `${year}-${month}`;
    if (loadedRanges.current.has(key)) return;

    const startDate = formatDate(new Date(year, month, 1));
    const endDate = formatDate(new Date(year, month + 1, 0)); // last day of month

    setLoading(true);
    setError(null);

    try {
      const res = await BookingsApi.getAvailability(vehicleId, startDate, endDate);
      const dayMap = res.data?.data?.days || {};

      setDays((prev) => ({ ...prev, ...dayMap }));
      loadedRanges.current.add(key);
    } catch (err) {
      setError(err.message || 'Verfügbarkeit konnte nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, [vehicleId]);

  /**
   * Set start date of selection. Clears end date.
   */
  const selectStart = useCallback((dateStr) => {
    setSelection({ startDate: dateStr, endDate: null });
    setCheckResult(null);
  }, []);

  /**
   * Set end date and trigger conflict check.
   */
  const selectEnd = useCallback(async (dateStr) => {
    setSelection((prev) => {
      const newSel = { ...prev, endDate: dateStr };
      // Trigger check after state update
      runCheck(prev.startDate, dateStr);
      return newSel;
    });
  }, [vehicleId]);

  /**
   * Reset selection.
   */
  const resetSelection = useCallback(() => {
    setSelection({ startDate: null, endDate: null });
    setCheckResult(null);
  }, []);

  /**
   * Run availability conflict check against the API.
   */
  const runCheck = async (startDate, endDate) => {
    if (!startDate || !endDate) return;

    setChecking(true);
    setCheckResult(null);

    try {
      const res = await BookingsApi.checkAvailability(vehicleId, startDate, endDate);
      setCheckResult(res.data?.data || null);
    } catch (err) {
      setCheckResult({
        available: false,
        conflicts: [{ type: 'error', message: err.message || 'Prüfung fehlgeschlagen.' }],
      });
    } finally {
      setChecking(false);
    }
  };

  // Reset everything when vehicleId changes (skip initial mount)
  const prevVehicleId = useRef(vehicleId);
  useEffect(() => {
    if (prevVehicleId.current === vehicleId) return;
    prevVehicleId.current = vehicleId;
    setDays({});
    setSelection({ startDate: null, endDate: null });
    setCheckResult(null);
    loadedRanges.current = new Set();
  }, [vehicleId]);

  // Run initial check if we have a pre-selected range
  const initialCheckRan = useRef(false);
  useEffect(() => {
    if (initialCheckRan.current) return;
    if (initialSelection?.startDate && initialSelection?.endDate) {
      initialCheckRan.current = true;
      runCheck(initialSelection.startDate, initialSelection.endDate);
    }
  }, [initialSelection]);

  return {
    days,
    loading,
    error,
    selection,
    loadMonth,
    selectStart,
    selectEnd,
    resetSelection,
    checkResult,
    checking,
  };
}