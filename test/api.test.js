// test/api.test.js
import { test, describe, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../server.js";
import { createStore } from "../src/store.js";

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
});
