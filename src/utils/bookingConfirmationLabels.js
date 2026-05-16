/**
 * Mirrors backend/utils/sessionMeetDuration.js so confirmation UI matches Meet / emails.
 */
export function getSessionDurationMinutesFromPackageType(packageType) {
  if (!packageType || typeof packageType !== 'string') return 50;

  const pt = packageType.trim();

  if (pt.startsWith('cs_init_')) {
    if (pt.endsWith('_parent')) return 60;
    if (pt.endsWith('_child')) return 90;
    if (pt.endsWith('_family')) return 120;
  }

  if (pt.startsWith('cs_fu_')) {
    const m = /^cs_fu_[^_]+_(parent|child|family)$/.exec(pt);
    if (m) {
      if (m[1] === 'parent' || m[1] === 'child') return 60;
      if (m[1] === 'family') return 90;
    }
  }

  return 50;
}

/** Initial vs follow-up vs generic (child specialist catalog). */
export function getChildSpecialistBookingCategory(packageType) {
  if (!packageType || typeof packageType !== 'string') return null;
  const pt = packageType.trim();
  if (pt.startsWith('cs_init_')) return 'Initial session';
  if (pt.startsWith('cs_fu_')) return 'Follow-up package';
  return null;
}

/**
 * Removes parenthetical segments that denote session length, e.g. "(1.5 hr)", "(50 min)".
 * Keeps "(3 sessions)" — those do not match hr/min/hrs as duration tokens.
 */
export function stripDurationInParenthesesFromTitle(text) {
  if (!text || typeof text !== 'string') return text;
  let s = text.replace(/\s*\([^)]*\b(?:hr|hrs|min|mins)\b[^)]*\)/gi, '');
  s = s.replace(/\s{2,}/g, ' ').replace(/\s*—\s*$/u, '').trim();
  return s;
}

export function formatDurationHuman(minutes) {
  const m = Number(minutes);
  if (!Number.isFinite(m) || m <= 0) return null;
  if (m === 90) return '1.5 hrs';
  if (m % 60 === 0) {
    const h = m / 60;
    if (h === 1) return '1 hr';
    if (h === Math.floor(h)) return `${h} hrs`;
    return `${h} hrs`;
  }
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const rem = m % 60;
    if (rem === 0) return h === 1 ? '1 hr' : `${h} hrs`;
    return `${h} hr ${rem} min`;
  }
  return `${m} min`;
}

/**
 * Rich label for payment success / confirmation (better than "Package of 3").
 * Does not include "Session 2 of 3" — only package size (e.g. "3 sessions") when synthesizing.
 */
export function buildPaymentSuccessBookingSummary({
  packageName,
  packageType,
  totalSessions,
  sessionType
}) {
  const category = getChildSpecialistBookingCategory(packageType);
  const minutes = getSessionDurationMinutesFromPackageType(packageType);
  const durationLabel = formatDurationHuman(minutes);

  if (packageName && String(packageName).trim()) {
    return stripDurationInParenthesesFromTitle(String(packageName).trim());
  }

  const parts = [];
  if (category && totalSessions > 1) {
    parts.push(`${category} · ${totalSessions} sessions`);
  } else if (category) {
    parts.push(category);
  } else if (sessionType === 'Package Session' && totalSessions > 1) {
    parts.push(`Package · ${totalSessions} sessions`);
  } else if (sessionType) {
    parts.push(sessionType);
  } else {
    parts.push('Session');
  }

  if (durationLabel) {
    parts.push(`${durationLabel} per session`);
  }

  return parts.filter(Boolean).join(' · ');
}
