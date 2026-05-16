/**
 * Child specialist detection — matches public therapist booking (profile pages).
 * Category wins; otherwise structured child_specialist_pricing.initial implies child specialist
 * unless explicitly better_parent.
 */
export function isChildSpecialistProfile(doctor) {
  if (!doctor) return false;
  if (doctor.specialist_category === 'child_specialist') return true;
  if (doctor.specialist_category === 'better_parent') return false;
  const init = doctor.child_specialist_pricing?.initial;
  return !!(init && typeof init === 'object');
}

export function specialistCategoryLabel(doctor) {
  if (!doctor) return '—';
  if (doctor.specialist_category === 'better_parent') return 'Better parenting';
  if (doctor.specialist_category === 'child_specialist') return 'Child specialist';
  if (isChildSpecialistProfile(doctor)) return 'Child specialist (from pricing data)';
  return 'Standard / unset';
}
