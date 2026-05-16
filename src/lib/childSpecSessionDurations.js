/**
 * Per-session duration copy for child specialist public booking UI (product sheet).
 * Better Parenting / other specialists use uniform 1 hr elsewhere — not this map.
 */

/** Calendar/package list order: child → parent → family (initial + follow-up). */
export const CHILD_SPEC_VARIANT_DISPLAY_ORDER = ['child', 'parent', 'family'];

export const CHILD_SPEC_INITIAL_SESSION_DURATION = {
  parent: '1 hr',
  child: '1.5 hr',
  family: '2 hr',
};

export const CHILD_SPEC_FOLLOWUP_SESSION_DURATION = {
  parent: '1 hr',
  child: '1 hr',
  family: '1.5 hr',
};
