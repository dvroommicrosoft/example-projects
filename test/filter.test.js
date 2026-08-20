import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { STATUS_FILTERS, filterItems, getEmptyStateMessage } from "../public/filter.js";

const items = [
  { id: "1", title: "Review PR", done: false },
  { id: "2", title: "Ship release", done: true },
  { id: "3", title: "Write regression tests", done: false },
];

describe("filterItems", () => {
  test("matches item titles case-insensitively", () => {
    assert.deepEqual(filterItems(items, { query: "pr" }), [items[0]]);
    assert.deepEqual(filterItems(items, { query: "REGRESSION" }), [items[2]]);
  });

  test("filters by active and completed status", () => {
    assert.deepEqual(filterItems(items, { status: STATUS_FILTERS.active }), [items[0], items[2]]);
    assert.deepEqual(filterItems(items, { status: STATUS_FILTERS.completed }), [items[1]]);
  });

  test("combines search and status filters", () => {
    assert.deepEqual(filterItems(items, { query: "ship", status: STATUS_FILTERS.active }), []);
    assert.deepEqual(filterItems(items, { query: "ship", status: STATUS_FILTERS.completed }), [items[1]]);
  });
});

describe("getEmptyStateMessage", () => {
  test("describes a board with no items", () => {
    assert.equal(getEmptyStateMessage([], {}), "No items yet. Add one above! 🎉");
  });

  test("describes search and status filters with no matches", () => {
    assert.equal(getEmptyStateMessage(items, { query: "docs" }), 'No items match "docs".');
    assert.equal(
      getEmptyStateMessage(items, { query: "docs", status: STATUS_FILTERS.active }),
      'No active items match "docs".',
    );
    assert.equal(getEmptyStateMessage(items, { status: STATUS_FILTERS.completed }), "No completed items to show.");
  });
});
