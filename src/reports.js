// src/reports.js
// Aggregates activity log entries into a report over a timeframe.

const EVENT_TYPES = ["created", "completed", "reopened", "deleted"];

/**
 * Buckets activity entries by UTC day (YYYY-MM-DD).
 */
function bucketKey(isoTimestamp) {
  return isoTimestamp.slice(0, 10);
}

/**
 * Builds a report from activity entries already filtered to a [from, to]
 * range. Returns total counts per event type and a chronological list of
 * daily buckets, each with counts per event type.
 */
export function buildReport(entries) {
  const totals = Object.fromEntries(EVENT_TYPES.map((type) => [type, 0]));
  const bucketsByKey = new Map();

  for (const entry of entries) {
    if (!Object.prototype.hasOwnProperty.call(totals, entry.type)) continue;
    totals[entry.type] += 1;

    const key = bucketKey(entry.at);
    if (!bucketsByKey.has(key)) {
      bucketsByKey.set(key, { date: key, ...Object.fromEntries(EVENT_TYPES.map((type) => [type, 0])) });
    }
    bucketsByKey.get(key)[entry.type] += 1;
  }

  const buckets = Array.from(bucketsByKey.values()).sort((a, b) => (a.date < b.date ? -1 : 1));

  return { totals, buckets };
}
