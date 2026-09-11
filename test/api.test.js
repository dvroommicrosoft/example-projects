// test/api.test.js
import { test, describe, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../server.js";
import { createStore } from "../src/store.js";
import { PersistenceError } from "../src/persistence.js";

describe("API", () => {
  let server;
  let baseUrl;
  let store;

  before(async () => {
    store = createStore();
    server = createApp(store);
    await new Promise((resolve) => server.listen(0, resolve));
    const { port } = server.address();
    baseUrl = `http://127.0.0.1:${port}`;
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  beforeEach(() => {
    store.clear();
  });

  test("GET /api/health returns ok", async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, "ok");
  });

  test("GET /api/items starts empty", async () => {
    const res = await fetch(`${baseUrl}/api/items`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.deepEqual(body.items, []);
  });

  test("POST /api/items adds an item", async () => {
    const res = await fetch(`${baseUrl}/api/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Review PR" }),
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.item.title, "Review PR");
    assert.equal(body.item.done, false);
    assert.equal(body.item.priority, "medium");
  });

  test("POST /api/items accepts each priority", async () => {
    for (const priority of ["low", "medium", "high"]) {
      const res = await fetch(`${baseUrl}/api/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: priority, priority }),
      });
      assert.equal(res.status, 201);
      assert.equal((await res.json()).item.priority, priority);
    }
  });

  test("POST /api/items rejects invalid priority without adding an item", async () => {
    const res = await fetch(`${baseUrl}/api/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Invalid", priority: "urgent" }),
    });
    assert.equal(res.status, 400);
    assert.deepEqual(store.list(), []);
  });

  test("POST /api/items rejects blank title", async () => {
    const res = await fetch(`${baseUrl}/api/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "   " }),
    });
    assert.equal(res.status, 400);
  });

  test("PATCH /api/items/:id toggles done", async () => {
    const created = await (
      await fetch(`${baseUrl}/api/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Toggle me" }),
      })
    ).json();

    const res = await fetch(`${baseUrl}/api/items/${created.item.id}`, { method: "PATCH" });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.item.done, true);
  });

  test("PATCH /api/items/:id with an empty object still toggles done", async () => {
    const item = store.add("Legacy toggle");
    const res = await fetch(`${baseUrl}/api/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    assert.equal(res.status, 200);
    assert.equal((await res.json()).item.done, true);
  });

  test("PATCH /api/items/:id updates priority without toggling or report activity", async () => {
    const item = store.add("Prioritize", "low");
    const activityBefore = store.getActivity();
    const res = await fetch(`${baseUrl}/api/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priority: "high" }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.item.priority, "high");
    assert.equal(body.item.done, false);
    assert.deepEqual(store.getActivity(), activityBefore);
  });

  test("PATCH /api/items/:id rejects invalid and unsupported bodies without mutation", async () => {
    const item = store.add("Keep stable", "low");
    for (const body of [{ priority: "urgent" }, { done: true }, { priority: "high", done: true }]) {
      const res = await fetch(`${baseUrl}/api/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      assert.equal(res.status, 400);
      assert.equal(store.get(item.id).priority, "low");
      assert.equal(store.get(item.id).done, false);
    }
  });

  test("PATCH /api/items/:id for unknown id returns 404", async () => {
    const res = await fetch(`${baseUrl}/api/items/does-not-exist`, { method: "PATCH" });
    assert.equal(res.status, 404);
  });

  test("DELETE /api/items/:id removes an item", async () => {
    const created = await (
      await fetch(`${baseUrl}/api/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Delete me" }),
      })
    ).json();

    const res = await fetch(`${baseUrl}/api/items/${created.item.id}`, { method: "DELETE" });
    assert.equal(res.status, 204);

    const listRes = await fetch(`${baseUrl}/api/items`);
    const body = await listRes.json();
    assert.deepEqual(body.items, []);
  });

  test("GET / serves the static HTML shell", async () => {
    const res = await fetch(`${baseUrl}/`);
    assert.equal(res.status, 200);
    const text = await res.text();
    assert.match(text, /Tiny Triage/);
  });

  test("GET /api/reports returns zeroed totals when there is no activity", async () => {
    const res = await fetch(`${baseUrl}/api/reports`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.deepEqual(body.totals, { created: 0, completed: 0, reopened: 0, deleted: 0 });
    assert.deepEqual(body.buckets, []);
    assert.ok(body.range.from);
    assert.ok(body.range.to);
  });

  test("GET /api/reports reflects created/completed/deleted activity", async () => {
    const created = await (
      await fetch(`${baseUrl}/api/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Report me" }),
      })
    ).json();
    await fetch(`${baseUrl}/api/items/${created.item.id}`, { method: "PATCH" });
    await fetch(`${baseUrl}/api/items/${created.item.id}`, { method: "DELETE" });

    const res = await fetch(`${baseUrl}/api/reports`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.totals.created, 1);
    assert.equal(body.totals.completed, 1);
    assert.equal(body.totals.deleted, 1);
  });

  test("GET /api/reports filters by type", async () => {
    const created = await (
      await fetch(`${baseUrl}/api/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Filter me" }),
      })
    ).json();
    await fetch(`${baseUrl}/api/items/${created.item.id}`, { method: "PATCH" });

    const res = await fetch(`${baseUrl}/api/reports?type=completed`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.totals.created, 0);
    assert.equal(body.totals.completed, 1);
  });

  test("GET /api/reports rejects an unknown type", async () => {
    const res = await fetch(`${baseUrl}/api/reports?type=bogus`);
    assert.equal(res.status, 400);
  });

  test("GET /api/reports rejects malformed from/to timestamps", async () => {
    const res = await fetch(`${baseUrl}/api/reports?from=not-a-date`);
    assert.equal(res.status, 400);
  });

  test("GET /api/reports rejects from after to", async () => {
    const res = await fetch(
      `${baseUrl}/api/reports?from=2026-01-02T00:00:00.000Z&to=2026-01-01T00:00:00.000Z`,
    );
    assert.equal(res.status, 400);
  });

  test("storage failures return a sanitized 500 response", async () => {
    const failingStore = createStore();
    failingStore.add = async () => {
      throw new PersistenceError("could not save /private/triage.json", {
        cause: new Error("disk full"),
      });
    };
    const failingServer = createApp(failingStore);
    await new Promise((resolve) => failingServer.listen(0, resolve));
    const failingUrl = `http://127.0.0.1:${failingServer.address().port}`;
    const originalError = console.error;
    console.error = () => {};
    try {
      const res = await fetch(`${failingUrl}/api/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Will fail" }),
      });
      assert.equal(res.status, 500);
      assert.deepEqual(await res.json(), { error: "could not save changes" });
    } finally {
      console.error = originalError;
      await new Promise((resolve) => failingServer.close(resolve));
    }
  });
});
