import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import useAvailability from '../../hooks/useAvailability';
import {
  getMonthGrid,
  getMonthName,
  getDayLabels,
  isPast,
  isInRange,
  today,
  formatDisplayDate,
  diffDays,
  addDays,
} from '../../utils/date';
import './BookingCalendar.css';

/**
 * Interactive booking calendar with month navigation,
 * availability colour coding, and date-range selection.
 * Supports both click-click and click-drag to select a range.
 *
 * @param {{ vehicleId: number|string, minRentalDays?: number, maxRentalDays?: number|null, onSelectionChange?: (sel) => void }} props
 */
export default function BookingCalendar({ vehicleId, minRentalDays = 1, maxRentalDays = null, onSelectionChange, initialSelection = null }) {
  const now = new Date();
  const initMonth = initialSelection?.startDate
    ? new Date(initialSelection.startDate)
    : now;
  const [viewYear, setViewYear] = useState(initMonth.getFullYear());
  const [viewMonth, setViewMonth] = useState(initMonth.getMonth());

  // Drag-to-select state
  const [hoverDate, setHoverDate] = useState(null);
  const isDragging = useRef(false);
  const dragStartDate = useRef(null);
  const skipNextClick = useRef(false);

  const {
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
  } = useAvailability(vehicleId, initialSelection);

  // Load current and next month on mount / navigation
  useEffect(() => {
    loadMonth(viewYear, viewMonth);
    // Preload next month for smooth navigation
    const nextDate = new Date(viewYear, viewMonth + 1, 1);
    loadMonth(nextDate.getFullYear(), nextDate.getMonth());
  }, [viewYear, viewMonth, loadMonth]);

  // Notify parent of selection changes
  useEffect(() => {
    onSelectionChange?.({ ...selection, available: checkResult?.available ?? null, conflicts: checkResult?.conflicts ?? [] });
  }, [selection, checkResult, onSelectionChange]);

  const grid = useMemo(() => getMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);
  const dayLabels = getDayLabels();
  const todayStr = today();

  // ── Navigation ───────────────────────────────────────────
  const goToPrevMonth = () => {
    // Don't go before current month
    if (viewYear === now.getFullYear() && viewMonth === now.getMonth()) return;
    if (viewMonth === 0) {
      setViewYear(viewYear - 1);
      setViewMonth(11);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const goToNextMonth = () => {
    // Limit to 12 months ahead
    const maxDate = new Date(now.getFullYear() + 1, now.getMonth(), 1);
    const nextDate = new Date(viewYear, viewMonth + 1, 1);
    if (nextDate > maxDate) return;

    if (viewMonth === 11) {
      setViewYear(viewYear + 1);
      setViewMonth(0);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const canGoPrev = !(viewYear === now.getFullYear() && viewMonth === now.getMonth());
  const maxForward = new Date(now.getFullYear() + 1, now.getMonth(), 1);
  const canGoNext = new Date(viewYear, viewMonth + 1, 1) <= maxForward;

  // ── Day interaction logic (click + drag) ──────────────────

  /** Check if every day from start to end (inclusive) is available. */
  const isRangeAvailable = useCallback((startStr, endStr) => {
    let current = startStr;
    while (current <= endStr) {
      const status = days[current]?.status;
      if (status && status !== 'available') return false;
      current = addDays(current, 1);
    }
    return true;
  }, [days]);

  /** Is this date selectable? */
  const isDaySelectable = useCallback((dateStr) => {
    if (!dateStr) return false;
    if (isPast(dateStr)) return false;
    const status = days[dateStr]?.status;
    return !status || status === 'available';
  }, [days]);

  /** Complete a range selection (from startStr to endStr inclusive). */
  const finishRange = useCallback((startStr, endStr) => {
    if (endStr <= startStr) return;
    if (!isRangeAvailable(startStr, endStr)) return;
    selectStart(startStr);
    // end_date for API = day after last night (exclusive)
    const endApi = addDays(endStr, 1);
    // Use setTimeout so selectStart state settles first
    setTimeout(() => selectEnd(endApi), 0);
  }, [isRangeAvailable, selectStart, selectEnd]);

  // ── Mouse-down: start potential drag ──────────────────────
  const handleDayMouseDown = useCallback((dateStr, e) => {
    if (!isDaySelectable(dateStr)) return;
    e.preventDefault(); // prevent text selection
    isDragging.current = true;
    dragStartDate.current = dateStr;
    setHoverDate(dateStr);
  }, [isDaySelectable]);

  // ── Mouse-enter: update hover preview while dragging ──────
  const handleDayMouseEnter = useCallback((dateStr) => {
    if (!isDragging.current) return;
    if (!dateStr) return;
    // Allow hovering over any future date for visual feedback
    if (!isPast(dateStr) && dateStr > dragStartDate.current) {
      setHoverDate(dateStr);
    }
  }, []);

  // ── Mouse-up: finish drag or treat as click ───────────────
  const handleDayMouseUp = useCallback((dateStr) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const start = dragStartDate.current;

    // Dragged to a different, later day → complete range
    if (dateStr && dateStr !== start && dateStr > start && isDaySelectable(dateStr)) {
      finishRange(start, dateStr);
      skipNextClick.current = true;
      setHoverDate(null);
      return;
    }

    // Released on same day → treat as a click (handled in handleDayClick)
    setHoverDate(null);
  }, [isDaySelectable, finishRange]);

  // ── Global mouseup to cancel drag if released outside grid ─
  useEffect(() => {
    const onGlobalUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        setHoverDate(null);
      }
    };
    document.addEventListener('mouseup', onGlobalUp);
    return () => document.removeEventListener('mouseup', onGlobalUp);
  }, []);

  // ── Click: existing two-click behaviour ───────────────────
  const handleDayClick = useCallback((dateStr) => {
    // Skip if this click was the end of a drag
    if (skipNextClick.current) {
      skipNextClick.current = false;
      return;
    }

    if (!isDaySelectable(dateStr)) return;

    // No start selected, or both already selected → start new selection
    if (!selection.startDate || selection.endDate) {
      selectStart(dateStr);
      return;
    }

    // Start selected, now pick end
    if (dateStr <= selection.startDate) {
      selectStart(dateStr);
      return;
    }

    if (!isRangeAvailable(selection.startDate, dateStr)) return;

    const endDateForApi = addDays(dateStr, 1);
    selectEnd(endDateForApi);
  }, [days, selection, selectStart, selectEnd, isDaySelectable, isRangeAvailable]);

  // ── Day class resolution ─────────────────────────────────
  const getDayClass = (dateStr) => {
    if (!dateStr) return 'bcal__day bcal__day--empty';

    const classes = ['bcal__day'];
    const past = isPast(dateStr);
    const dayData = days[dateStr];
    const status = dayData?.status || 'unknown';

    if (past) {
      classes.push('bcal__day--past');
    } else if (dateStr === todayStr) {
      classes.push('bcal__day--today');
    }

    // Drag hover preview (shown while dragging, before mouse-up)
    if (hoverDate && dragStartDate.current && !selection.endDate) {
      if (dateStr === dragStartDate.current) {
        classes.push('bcal__day--hover-start');
      } else if (dateStr === hoverDate) {
        classes.push('bcal__day--hover-end');
      } else if (dateStr > dragStartDate.current && dateStr < hoverDate) {
        classes.push('bcal__day--hover-range');
      }
    }

    // Selection highlight (yellow)
    if (selection.startDate && !selection.endDate && dateStr === selection.startDate) {
      classes.push('bcal__day--selected-start');
    } else if (selection.startDate && selection.endDate) {
      // endDate in selection is exclusive (API format), so visually highlight up to day before
      const visualEnd = addDays(selection.endDate, -1);
      if (dateStr === selection.startDate) {
        classes.push('bcal__day--selected-start');
      } else if (dateStr === visualEnd) {
        classes.push('bcal__day--selected-end');
      } else if (isInRange(dateStr, selection.startDate, selection.endDate)) {
        classes.push('bcal__day--selected');
      }
    }

    // Status colour (only for non-selected, non-past days)
    if (!past) {
      if (status === 'available') {
        classes.push('bcal__day--available');
      } else if (status === 'booked') {
        classes.push('bcal__day--booked');
      } else if (status === 'blocked' || status === 'maintenance' || status === 'owner_reserved') {
        classes.push('bcal__day--blocked');
      }
    }

    // Clickable?
    if (!past && status === 'available') {
      classes.push('bcal__day--clickable');
    }

    return classes.join(' ');
  };

  // ── Selection info ───────────────────────────────────────
  const selectionDays = selection.startDate && selection.endDate
    ? diffDays(selection.startDate, selection.endDate)
    : null;

  return (
    <div className="bcal">
      <div className="bcal__header">
        <button
          className="bcal__nav-btn"
          onClick={goToPrevMonth}
          disabled={!canGoPrev}
          aria-label="Vorheriger Monat"
        >
          ‹
        </button>
        <h3 className="bcal__month-title">
          {getMonthName(viewMonth)} {viewYear}
        </h3>
        <button
          className="bcal__nav-btn"
          onClick={goToNextMonth}
          disabled={!canGoNext}
          aria-label="Nächster Monat"
        >
          ›
        </button>
      </div>

      {error && <p className="bcal__error">{error}</p>}

      <div className="bcal__grid" role="grid" aria-label="Buchungskalender"
        onMouseLeave={() => { if (isDragging.current) setHoverDate(null); }}
      >
        {dayLabels.map((label) => (
          <div key={label} className="bcal__day-label" role="columnheader">
            {label}
          </div>
        ))}

        {grid.map((dateStr, i) => (
          <button
            key={dateStr || `empty-${i}`}
            className={getDayClass(dateStr)}
            onClick={() => handleDayClick(dateStr)}
            onMouseDown={(e) => handleDayMouseDown(dateStr, e)}
            onMouseEnter={() => handleDayMouseEnter(dateStr)}
            onMouseUp={() => handleDayMouseUp(dateStr)}
            disabled={!dateStr || isPast(dateStr) || (days[dateStr]?.status && days[dateStr].status !== 'available')}
            title={dateStr ? (days[dateStr]?.reason || days[dateStr]?.status || '') : ''}
            role="gridcell"
            aria-selected={
              dateStr && selection.startDate && selection.endDate
                ? isInRange(dateStr, selection.startDate, selection.endDate) || dateStr === selection.startDate
                : dateStr === selection.startDate
            }
          >
            {dateStr ? parseInt(dateStr.split('-')[2], 10) : ''}
          </button>
        ))}
      </div>

      {loading && <div className="bcal__loading">Laden…</div>}

      {/* Legend */}
      <div className="bcal__legend">
        <span className="bcal__legend-item">
          <span className="bcal__legend-dot bcal__legend-dot--available" /> Verfügbar
        </span>
        <span className="bcal__legend-item">
          <span className="bcal__legend-dot bcal__legend-dot--booked" /> Belegt
        </span>
        <span className="bcal__legend-item">
          <span className="bcal__legend-dot bcal__legend-dot--selected" /> Ausgewählt
        </span>
        <span className="bcal__legend-item">
          <span className="bcal__legend-dot bcal__legend-dot--blocked" /> Blockiert
        </span>
      </div>

      {/* Selection summary */}
      {selection.startDate && (
        <div className="bcal__selection">
          <div className="bcal__selection-dates">
            <span className="bcal__selection-label">
              {selection.endDate ? 'Zeitraum' : 'Startdatum'}
            </span>
            <span className="bcal__selection-value">
              {formatDisplayDate(selection.startDate)}
              {selection.endDate && (
                <> – {formatDisplayDate(addDays(selection.endDate, -1))}</>
              )}
            </span>
            {selectionDays !== null && (
              <span className="bcal__selection-days">
                {selectionDays} {selectionDays === 1 ? 'Nacht' : 'Nächte'}
              </span>
            )}
          </div>

          <button className="bcal__selection-reset" onClick={resetSelection}>
            Zurücksetzen
          </button>
        </div>
      )}

      {/* Conflict check result */}
      {checking && (
        <div className="bcal__check bcal__check--loading">
          Verfügbarkeit wird geprüft…
        </div>
      )}

      {checkResult && !checking && (
        <div className={`bcal__check ${checkResult.available ? 'bcal__check--ok' : 'bcal__check--conflict'}`}>
          {checkResult.available ? (
            <span>✓ Zeitraum ist verfügbar</span>
          ) : (
            <div>
              <span>✗ Zeitraum nicht verfügbar</span>
              {checkResult.conflicts?.length > 0 && (
                <ul className="bcal__conflicts">
                  {checkResult.conflicts.map((c, i) => (
                    <li key={i}>{c.message}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {/* Min/max rental hint */}
      {(minRentalDays > 1 || maxRentalDays) && (
        <p className="bcal__hint">
          {minRentalDays > 1 && <>Min. {minRentalDays} Nächte</>}
          {minRentalDays > 1 && maxRentalDays && <> · </>}
          {maxRentalDays && <>Max. {maxRentalDays} Nächte</>}
        </p>
      )}
    </div>
  );
}
