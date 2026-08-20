// public/reports.js
// Helpers for building the /api/reports query string and rendering results.

/**
 * Builds a query string for GET /api/reports from UI filter state.
 * @param {Object} filters
 * @param {string} [filters.from] - YYYY-MM-DD
 * @param {string} [filters.to] - YYYY-MM-DD
 * @param {string[]} [filters.types] - subset of created/completed/reopened/deleted
 */
export function buildReportsQuery({ from, to, types } = {}) {
  const params = new URLSearchParams();
  if (from) params.set("from", new Date(`${from}T00:00:00.000Z`).toISOString());
  if (to) params.set("to", new Date(`${to}T23:59:59.999Z`).toISOString());
  if (types && types.length) params.set("type", types.join(","));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/**
 * Formats a report's totals into a compact summary string, e.g.
 * "3 created · 1 completed".
 */
export function formatTotals(totals) {
  return (
    Object.entries(totals)
      .filter(([, count]) => count > 0)
      .map(([type, count]) => `${count} ${type}`)
      .join(" · ") || "No activity"
  );
}
