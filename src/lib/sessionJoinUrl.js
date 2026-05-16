/**
 * Validates session / video join URLs stored in event CMS (https only in production use).
 * @param {unknown} s
 * @returns {boolean}
 */
export function isValidSessionJoinUrl(s) {
  const t = String(s || "").trim();
  if (!t) return false;
  try {
    const u = new URL(t);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}
