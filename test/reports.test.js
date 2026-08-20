// test/reports.test.js
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { buildReport } from "../src/reports.js";

describe("buildReport", () => {
  test("returns zeroed totals and no buckets for empty entries", () => {
    const report = buildReport([]);
    assert.deepEqual(report.totals, { created: 0, completed: 0, reopened: 0, deleted: 0 });
    assert.deepEqual(report.buckets, []);
  });

  test("aggregates totals per event type", () => {
    const entries = [
      { itemId: "1", title: "a", type: "created", at: "2026-01-01T00:00:00.000Z" },
      { itemId: "1", title: "a", type: "completed", at: "2026-01-01T01:00:00.000Z" },
      { itemId: "2", title: "b", type: "created", at: "2026-01-02T00:00:00.000Z" },
      { itemId: "2", title: "b", type: "deleted", at: "2026-01-02T01:00:00.000Z" },
    ];
    const report = buildReport(entries);
    assert.deepEqual(report.totals, { created: 2, completed: 1, reopened: 0, deleted: 1 });
  });

  test("buckets entries by UTC day, sorted chronologically", () => {
    const entries = [
      { itemId: "2", title: "b", type: "created", at: "2026-01-02T00:00:00.000Z" },
      { itemId: "1", title: "a", type: "created", at: "2026-01-01T00:00:00.000Z" },
      { itemId: "1", title: "a", type: "completed", at: "2026-01-01T12:00:00.000Z" },
    ];
    const report = buildReport(entries);
    assert.deepEqual(report.buckets, [
      { date: "2026-01-01", created: 1, completed: 1, reopened: 0, deleted: 0 },
      { date: "2026-01-02", created: 1, completed: 0, reopened: 0, deleted: 0 },
    ]);
  });

  test("ignores entries with an unrecognized type", () => {
    const report = buildReport([{ itemId: "1", title: "a", type: "unknown", at: "2026-01-01T00:00:00.000Z" }]);
    assert.deepEqual(report.totals, { created: 0, completed: 0, reopened: 0, deleted: 0 });
  });
});
