/**
 * True when a bounded date range is selected (excludes "All dates": { all: true }).
 * Use before appending dateFrom/dateTo to API params.
 */
export function hasDateRangeBounds(range) {
  return !!(range && !range.all && range.from && range.to);
}
