import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  addItemRequest,
  countItemsByStatus,
  createPriorityUpdater,
  filterItems,
  listItemsRequest,
  setItemPriority,
} from "../public/items.js";

describe("item filters", () => {
  const items = [
    { id: "1", title: "First OPEN item", done: false },
    { id: "2", title: "Fix [literal].", done: true },
    { id: "3", title: "Another open item", done: false },
  ];

  test("combines trimmed case-insensitive literal title search with status", () => {
    assert.deepEqual(
      filterItems(items, "  OPEN  ", "open").map(({ id }) => id),
      ["1", "3"],
    );
    assert.deepEqual(
      filterItems(items, "[LITERAL].", "done").map(({ id }) => id),
      ["2"],
    );
  });

  test("preserves source order without mutating the canonical array", () => {
    const filtered = filterItems(items, "item", "all");
    assert.deepEqual(filtered.map(({ id }) => id), ["1", "3"]);
    assert.deepEqual(items.map(({ id }) => id), ["1", "2", "3"]);
  });

  test("counts statuses from the full item list", () => {
    assert.deepEqual(countItemsByStatus(items), { all: 3, open: 2, done: 1 });
  });
});

describe("item request handlers", () => {
  test("listItemsRequest validates success and the item array", async () => {
    const items = await listItemsRequest(async () => ({
      ok: true,
      json: async () => ({ items: [{ id: "1", title: "One", done: false }] }),
    }));
    assert.deepEqual(items, [{ id: "1", title: "One", done: false }]);

    await assert.rejects(
      listItemsRequest(async () => ({ ok: true, json: async () => ({ items: null }) })),
      /Failed to load items/,
    );
    await assert.rejects(
      listItemsRequest(async () => ({
        ok: true,
        json: async () => ({ items: [{ id: "1", title: "Incomplete" }] }),
      })),
      /Failed to load items/,
    );
    await assert.rejects(
      listItemsRequest(async () => ({
        ok: false,
        json: async () => ({ error: "Items unavailable" }),
      })),
      /Items unavailable/,
    );
  });

  test("addItemRequest sends the selected priority", async () => {
    let request;
    const item = await addItemRequest(async (url, options) => {
      request = { url, options };
      return { ok: true, json: async () => ({ item: { id: "1", priority: "high" } }) };
    }, "Fix bug", "high");

    assert.equal(request.url, "/api/items");
    assert.deepEqual(JSON.parse(request.options.body), { title: "Fix bug", priority: "high" });
    assert.equal(item.priority, "high");
  });

  test("setItemPriority sends an isolated priority PATCH", async () => {
    let request;
    const item = await setItemPriority(async (url, options) => {
      request = { url, options };
      return { ok: true, json: async () => ({ item: { id: "a/b", priority: "low" } }) };
    }, "a/b", "low");

    assert.equal(request.url, "/api/items/a%2Fb");
    assert.equal(request.options.method, "PATCH");
    assert.deepEqual(JSON.parse(request.options.body), { priority: "low" });
    assert.equal(item.priority, "low");
  });

  test("request handlers surface API errors", async () => {
    const fetchFn = async () => ({
      ok: false,
      json: async () => ({ error: "priority must be one of low, medium, high" }),
    });

    await assert.rejects(
      setItemPriority(fetchFn, "1", "urgent"),
      /priority must be one of low, medium, high/,
    );
  });

  test("overlapping changes restore the latest confirmed priority after failure", async () => {
    const requests = [];
    const confirmed = [];
    const rejected = [];
    const updater = createPriorityUpdater({
      initialPriority: "medium",
      save(priority) {
        return new Promise((resolve, reject) => {
          requests.push({ priority, resolve, reject });
        });
      },
      onConfirmed: (item) => confirmed.push(item.priority),
      onRejected: (error, priority, shouldRestore) => {
        rejected.push({ message: error.message, priority, shouldRestore });
      },
    });

    const firstChange = updater.change("high");
    const secondChange = updater.change("low");
    assert.equal(updater.isPending(), true);
    assert.equal(updater.getDesired(), "low");
    assert.deepEqual(requests.map(({ priority }) => priority), ["high"]);

    requests[0].resolve({ priority: "high" });
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(requests.map(({ priority }) => priority), ["high", "low"]);

    requests[1].reject(new Error("save failed"));
    await Promise.all([firstChange, secondChange]);

    assert.equal(updater.getConfirmed(), "high");
    assert.equal(updater.getDesired(), "high");
    assert.equal(updater.isPending(), false);
    assert.deepEqual(confirmed, ["high"]);
    assert.deepEqual(rejected, [{ message: "save failed", priority: "high", shouldRestore: true }]);
  });

  test("pending desired priority remains available across UI rerenders", async () => {
    let resolveSave;
    const updater = createPriorityUpdater({
      initialPriority: "medium",
      save: () =>
        new Promise((resolve) => {
          resolveSave = resolve;
        }),
      onConfirmed() {},
      onRejected() {},
    });

    const saving = updater.change("high");
    assert.equal(updater.getDesired(), "high");
    assert.equal(updater.isPending(), true);

    resolveSave({ priority: "high" });
    await saving;
    assert.equal(updater.getDesired(), "high");
    assert.equal(updater.isPending(), false);
  });
});
