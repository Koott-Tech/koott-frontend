/**
 * Normalizes session completion fields for display.
 * Backend may store completion data as:
 * - New: summary, report, summary_notes (sessionController.completeSession)
 * - Legacy: session_summary, session_notes with "--- Report ---" separating private notes from report (psychologistController.completeSession)
 */

const REPORT_SEPARATOR = '\n\n--- Report ---\n';

/**
 * @param {object} session - Session object from API
 * @returns {{ summary: string|null, report: string|null, privateNotes: string|null }}
 */
export function getSessionCompletionFields(session) {
  if (!session) return { summary: null, report: null, privateNotes: null };

  // Prefer direct columns (new format)
  let summary = session.summary ?? session.session_summary ?? null;
  let report = session.report ?? null;
  let privateNotes = session.summary_notes ?? null;

  const combinedNotes = session.session_notes?.trim() || null;

  // If we have combined session_notes (legacy), split into private notes and report
  if (combinedNotes && (report == null || privateNotes == null)) {
    const idx = combinedNotes.indexOf(REPORT_SEPARATOR);
    if (idx >= 0) {
      const before = combinedNotes.slice(0, idx).trim();
      const after = combinedNotes.slice(idx + REPORT_SEPARATOR.length).trim();
      if (privateNotes == null && before) privateNotes = before;
      if (report == null && after) report = after;
    } else if (privateNotes == null) {
      privateNotes = combinedNotes;
    }
  }

  return {
    summary: summary && summary.trim() ? summary.trim() : null,
    report: report && report.trim() ? report.trim() : null,
    privateNotes: privateNotes && privateNotes.trim() ? privateNotes.trim() : null,
  };
}
