/**
 * Display formatting for a session's calendar day.
 *
 * These screens used a bare `new Date(d).toLocaleDateString()` — no locale, no timezone — which
 * takes its format from the VIEWER's browser. The same session read "3/8/2026" on an en-IN
 * machine and "8/3/2026" on an en-US one, so day and month appeared to swap depending on who
 * was looking. Two fixes here:
 *
 *   1. Pin the locale AND use a named month, so D/M vs M/D cannot be misread at all.
 *   2. Anchor at IST midday. `scheduled_date` is a plain calendar day, and
 *      `new Date('2026-08-03')` parses as UTC midnight — which renders as the PREVIOUS day
 *      anywhere west of Greenwich.
 */
export const SESSION_DISPLAY_TIMEZONE = 'Asia/Kolkata';

/** "03 Aug 2026". Returns `fallback` for missing/unparseable input. */
export function formatSessionDate(dateString, fallback = '—') {
  if (!dateString) return fallback;
  const ymd = String(dateString).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return String(dateString);
  const dt = new Date(`${ymd}T12:00:00+05:30`);
  if (Number.isNaN(dt.getTime())) return ymd;
  return dt.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: SESSION_DISPLAY_TIMEZONE,
  });
}

/** "Sunday, 03 August 2026" — same guarantees, long form. */
export function formatSessionDateLong(dateString, fallback = '—') {
  if (!dateString) return fallback;
  const ymd = String(dateString).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return String(dateString);
  const dt = new Date(`${ymd}T12:00:00+05:30`);
  if (Number.isNaN(dt.getTime())) return ymd;
  return dt.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: SESSION_DISPLAY_TIMEZONE,
  });
}
