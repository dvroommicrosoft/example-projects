import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { addItemRequest, createPriorityUpdater, setItemPriority } from "../public/items.js";

describe("item request handlers", () => {
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
    assert.deepEqual(requests.map(({ priority }) => priority), ["high"]);

    requests[0].resolve({ priority: "high" });
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(requests.map(({ priority }) => priority), ["high", "low"]);

    requests[1].reject(new Error("save failed"));
    await Promise.all([firstChange, secondChange]);

    assert.equal(updater.getConfirmed(), "high");
    assert.deepEqual(confirmed, ["high"]);
    assert.deepEqual(rejected, [{ message: "save failed", priority: "high", shouldRestore: true }]);
  });
});
