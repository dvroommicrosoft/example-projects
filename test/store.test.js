// test/store.test.js
import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createStore } from "../src/store.js";

describe("store", () => {
  let store;
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "tiny-triage-"));
    store = createStore([], { filePath: path.join(tempDir, "items.json") });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test("starts empty", () => {
    assert.deepEqual(store.list(), []);
  });

  test("add() creates an item with trimmed title and done=false", () => {
    const item = store.add("  Write tests  ");
    assert.equal(item.title, "Write tests");
    assert.equal(item.done, false);
    assert.ok(item.id);
    assert.ok(item.createdAt);
    assert.equal(store.list().length, 1);
  });

  test("add() rejects empty or blank titles", () => {
    assert.throws(() => store.add(""), /title is required/);
    assert.throws(() => store.add("   "), /title is required/);
    assert.throws(() => store.add(undefined), /title is required/);
  });

  test("add() rejects overly long titles", () => {
    const long = "x".repeat(201);
    assert.throws(() => store.add(long), /200 characters or fewer/);
  });

  test("toggle() flips done state and returns the item", () => {
    const item = store.add("Ship it");
    const toggled = store.toggle(item.id);
    assert.equal(toggled.done, true);
    const toggledAgain = store.toggle(item.id);
    assert.equal(toggledAgain.done, false);
  });

  test("toggle() returns undefined for unknown id", () => {
    assert.equal(store.toggle("nope"), undefined);
  });

  test("remove() deletes an item and returns true", () => {
    const item = store.add("Delete me");
    assert.equal(store.remove(item.id), true);
    assert.deepEqual(store.list(), []);
  });

  test("remove() returns false for unknown id", () => {
    assert.equal(store.remove("nope"), false);
  });

  test("list() returns a copy, not a live reference", () => {
    store.add("Item one");
    const items = store.list();
    items.pop();
    assert.equal(store.list().length, 1);
  });

  test("add() generates ids that do not collide with seeded numeric ids", () => {
    const seeded = createStore([
      { id: "1", title: "Seeded one", done: false, createdAt: new Date().toISOString() },
      { id: "2", title: "Seeded two", done: false, createdAt: new Date().toISOString() },
    ], { filePath: path.join(tempDir, "seeded.json") });
    const item = seeded.add("New item");
    assert.notEqual(item.id, "1");
    assert.notEqual(item.id, "2");
    assert.equal(seeded.list().length, 3);
  });

  test("loads persisted items when a store is recreated", () => {
    const item = store.add("Survives restart");
    store.toggle(item.id);
    const restarted = createStore([], { filePath: path.join(tempDir, "items.json") });
    assert.deepEqual(restarted.list(), [{ ...item, done: true }]);
  });

  test("rejects malformed persisted data", () => {
    fs.writeFileSync(path.join(tempDir, "items.json"), "{not json");
    assert.throws(
      () => createStore([], { filePath: path.join(tempDir, "items.json") }),
      /Unable to parse persisted items/,
    );
  });

  test("rejects persisted items that violate store invariants", () => {
    fs.writeFileSync(
      path.join(tempDir, "items.json"),
      JSON.stringify([{ id: "1", title: "", done: false, createdAt: new Date().toISOString() }]),
    );
    assert.throws(
      () => createStore([], { filePath: path.join(tempDir, "items.json") }),
      /Invalid persisted items/,
    );
  });

  test("rejects persisted items with an empty id", () => {
    fs.writeFileSync(
      path.join(tempDir, "items.json"),
      JSON.stringify([{ id: "", title: "Unreachable", done: false, createdAt: new Date().toISOString() }]),
    );
    assert.throws(
      () => createStore([], { filePath: path.join(tempDir, "items.json") }),
      /Invalid persisted items/,
    );
  });

  test("surfaces storage read failures", () => {
    const blocker = path.join(tempDir, "blocker");
    fs.writeFileSync(blocker, "not a directory");
    assert.throws(
      () => createStore([], { filePath: path.join(blocker, "items.json") }),
      /Unable to read persisted items/,
    );
  });
});
