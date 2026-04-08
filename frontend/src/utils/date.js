/**
 * Date utility functions for the booking calendar.
 * All dates use 'YYYY-MM-DD' string format for API compatibility.
 */

const MONTH_NAMES = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];

const DAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

/**
 * Format a Date object to 'YYYY-MM-DD'.
 */
export function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Parse 'YYYY-MM-DD' to a Date at midnight local time.
 */
export function parseDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Get today as 'YYYY-MM-DD'.
 */
export function today() {
  return formatDate(new Date());
}

/**
 * Add days to a date string, return new date string.
 */
export function addDays(dateStr, days) {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() + days);
  return formatDate(d);
}

/**
 * Difference in days between two date strings (end - start).
 */
export function diffDays(startStr, endStr) {
  const s = parseDate(startStr);
  const e = parseDate(endStr);
  return Math.round((e - s) / (1000 * 60 * 60 * 24));
}

/**
 * Get all days in a month as an array of date strings.
 * Pads the start with null entries so the grid starts on Monday.
 */
export function getMonthGrid(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Monday=0, Sunday=6
  let startPad = firstDay.getDay() - 1;
  if (startPad < 0) startPad = 6;

  const days = [];

  // Leading empty cells
  for (let i = 0; i < startPad; i++) {
    days.push(null);
  }

  // Actual days
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(formatDate(new Date(year, month, d)));
  }

  return days;
}

/**
 * Get German month name.
 */
export function getMonthName(month) {
  return MONTH_NAMES[month];
}

/**
 * Get day-of-week labels (Mo–So).
 */
export function getDayLabels() {
  return DAY_LABELS;
}

/**
 * Check if date string is before today.
 */
export function isPast(dateStr) {
  return dateStr < today();
}

/**
 * Check if dateStr falls within [start, end) range (inclusive start, exclusive end).
 */
export function isInRange(dateStr, startStr, endStr) {
  if (!startStr || !endStr) return false;
  return dateStr >= startStr && dateStr < endStr;
}

/**
 * Format a date string to German display: "6. Apr 2026".
 */
export function formatDisplayDate(dateStr) {
  if (!dateStr) return '';
  const d = parseDate(dateStr);
  return d.toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' });
}