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
    store = createStore([], { filePath: path.join(tempDir, "items.json"), activityFilePath: path.join(tempDir, "activity.json") });
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

  test("add() records a created activity entry", () => {
    const item = store.add("Track me");
    const entries = store.getActivity();
    assert.equal(entries.length, 1);
    assert.equal(entries[0].type, "created");
    assert.equal(entries[0].itemId, item.id);
    assert.equal(entries[0].title, "Track me");
    assert.ok(entries[0].at);
  });

  test("toggle() records completed then reopened activity entries", () => {
    const item = store.add("Toggle me");
    store.toggle(item.id);
    store.toggle(item.id);
    const types = store.getActivity().map((entry) => entry.type);
    assert.deepEqual(types, ["created", "completed", "reopened"]);
  });

  test("toggle() with unknown id does not record activity", () => {
    store.toggle("nope");
    assert.deepEqual(store.getActivity(), []);
  });

  test("remove() records a deleted activity entry", () => {
    const item = store.add("Remove me");
    store.remove(item.id);
    const types = store.getActivity().map((entry) => entry.type);
    assert.deepEqual(types, ["created", "deleted"]);
  });

  test("getActivity() filters by from/to range", () => {
    const item = store.add("Ranged");
    const entries = store.getActivity();
    const createdAt = entries[0].at;
    const before = new Date(Date.parse(createdAt) - 1000).toISOString();
    const after = new Date(Date.parse(createdAt) + 1000).toISOString();

    assert.equal(store.getActivity({ from: before, to: after }).length, 1);
    assert.equal(store.getActivity({ from: after }).length, 0);
    assert.equal(store.getActivity({ to: before }).length, 0);
    void item;
  });

  test("clear() also clears the activity log", () => {
    store.add("Will be cleared");
    store.clear();
    assert.deepEqual(store.getActivity(), []);
  });

  test("add() still succeeds and commits the item even if the activity log write fails", () => {
    const activityDir = path.join(tempDir, "unwritable-activity-dir");
    const badStore = createStore([], {
      filePath: path.join(tempDir, "protected-items.json"),
      activityFilePath: path.join(activityDir, "activity.json"),
    });
    // Make the activity log's directory a file, so writes to it fail.
    fs.writeFileSync(activityDir, "not a directory");
    const item = badStore.add("Survives activity failure");
    assert.equal(item.title, "Survives activity failure");
    assert.equal(badStore.list().length, 1);
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
    const restarted = createStore([], { filePath: path.join(tempDir, "items.json"), activityFilePath: path.join(tempDir, "activity.json") });
    assert.deepEqual(restarted.list(), [{ ...item, done: true }]);
  });

  test("rejects malformed persisted data", () => {
    fs.writeFileSync(path.join(tempDir, "items.json"), "{not json");
    assert.throws(
      () => createStore([], { filePath: path.join(tempDir, "items.json"), activityFilePath: path.join(tempDir, "activity.json") }),
      /Unable to parse persisted items/,
    );
  });

  test("rejects persisted items that violate store invariants", () => {
    fs.writeFileSync(
      path.join(tempDir, "items.json"),
      JSON.stringify([{ id: "1", title: "", done: false, createdAt: new Date().toISOString() }]),
    );
    assert.throws(
      () => createStore([], { filePath: path.join(tempDir, "items.json"), activityFilePath: path.join(tempDir, "activity.json") }),
      /Invalid persisted items/,
    );
  });

  test("rejects persisted items with an empty id", () => {
    fs.writeFileSync(
      path.join(tempDir, "items.json"),
      JSON.stringify([{ id: "", title: "Unreachable", done: false, createdAt: new Date().toISOString() }]),
    );
    assert.throws(
      () => createStore([], { filePath: path.join(tempDir, "items.json"), activityFilePath: path.join(tempDir, "activity.json") }),
      /Invalid persisted items/,
    );
  });

  test("surfaces storage read failures", () => {
    const blocker = path.join(tempDir, "blocker");
    fs.writeFileSync(blocker, "not a directory");
    assert.throws(
      () => createStore([], { filePath: path.join(blocker, "items.json"), activityFilePath: path.join(tempDir, "activity.json") }),
      /Unable to read persisted items/,
    );
  });
});
