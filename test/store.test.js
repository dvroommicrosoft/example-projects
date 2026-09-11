// test/store.test.js
import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createStore, createStoreFromSnapshot } from "../src/store.js";

describe("store", () => {
  let store;

  beforeEach(() => {
    store = createStore();
  });

  test("starts empty", () => {
    assert.deepEqual(store.list(), []);
  });

  test("add() creates an item with trimmed title, done=false, and medium priority", () => {
    const item = store.add("  Write tests  ");
    assert.equal(item.title, "Write tests");
    assert.equal(item.done, false);
    assert.equal(item.priority, "medium");
    assert.ok(item.id);
    assert.ok(item.createdAt);
    assert.equal(store.list().length, 1);
  });

  test("add() accepts each explicit priority and rejects invalid values", () => {
    for (const priority of ["low", "medium", "high"]) {
      assert.equal(store.add(priority, priority).priority, priority);
    }
    assert.throws(() => store.add("Invalid", "urgent"), /priority must be one of/);
    assert.equal(store.list().length, 3);
  });

  test("legacy seeds default to medium priority", () => {
    const seeded = createStore([
      { id: "1", title: "Legacy", done: false, createdAt: new Date().toISOString() },
    ]);
    assert.equal(seeded.get("1").priority, "medium");
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

  test("setPriority() changes priority only and does not record activity", () => {
    const item = store.add("Prioritize me", "low");
    store.toggle(item.id);
    const activityBefore = store.getActivity();

    const updated = store.setPriority(item.id, "high");

    assert.equal(updated.priority, "high");
    assert.equal(updated.done, true);
    assert.deepEqual(store.getActivity(), activityBefore);
  });

  test("setPriority() validates before mutation", () => {
    const item = store.add("Keep me", "low");
    assert.throws(() => store.setPriority(item.id, "urgent"), /priority must be one of/);
    assert.equal(store.get(item.id).priority, "low");
    assert.equal(store.setPriority("nope", "high"), undefined);
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
    ]);
    const item = seeded.add("New item");
    assert.notEqual(item.id, "1");
    assert.notEqual(item.id, "2");
    assert.equal(seeded.list().length, 3);
  });

  test("add() records a created activity entry", () => {
    const item = store.add("Track me");
    const activity = store.getActivity();
    assert.equal(activity.length, 1);
    assert.equal(activity[0].type, "created");
    assert.equal(activity[0].itemId, item.id);
    assert.equal(activity[0].title, "Track me");
    assert.ok(activity[0].at);
  });

  test("toggle() records completed then reopened activity entries", () => {
    const item = store.add("Toggle me");
    store.toggle(item.id);
    store.toggle(item.id);
    const activity = store.getActivity();
    assert.deepEqual(
      activity.map((entry) => entry.type),
      ["created", "completed", "reopened"],
    );
  });

  test("toggle() with unknown id does not record activity", () => {
    store.toggle("nope");
    assert.deepEqual(store.getActivity(), []);
  });

  test("remove() records a deleted activity entry", () => {
    const item = store.add("Delete me");
    store.remove(item.id);
    const activity = store.getActivity();
    assert.deepEqual(
      activity.map((entry) => entry.type),
      ["created", "deleted"],
    );
    assert.equal(activity[1].title, "Delete me");
  });

  test("remove() with unknown id does not record activity", () => {
    store.remove("nope");
    assert.deepEqual(store.getActivity(), []);
  });

  test("getActivity() filters by from/to range", () => {
    const item = store.add("Item");
    const activity = store.getActivity();
    const at = activity[0].at;

    assert.equal(store.getActivity({ from: at }).length, 1);
    assert.equal(store.getActivity({ to: at }).length, 1);
    assert.equal(store.getActivity({ from: "2999-01-01T00:00:00.000Z" }).length, 0);
    assert.equal(store.getActivity({ to: "2000-01-01T00:00:00.000Z" }).length, 0);
    void item;
  });

  test("getActivity() filters by itemId", () => {
    const a = store.add("A");
    const b = store.add("B");
    assert.equal(store.getActivity({ itemId: a.id }).length, 1);
    assert.equal(store.getActivity({ itemId: b.id }).length, 1);
    assert.equal(store.getActivity({ itemId: "nope" }).length, 0);
  });

  test("clear() also clears the activity log", () => {
    store.add("Item");
    store.clear();
    assert.deepEqual(store.getActivity(), []);
  });

  test("complete snapshots preserve history and counters without replaying activity", () => {
    const first = store.add("First");
    store.toggle(first.id);
    store.remove(first.id);
    const snapshot = store.exportSnapshot();

    const restored = createStoreFromSnapshot(snapshot);
    assert.deepEqual(restored.exportSnapshot(), snapshot);
    assert.equal(restored.add("Second").id, "2");
    assert.deepEqual(
      restored.getActivity().map((entry) => entry.type),
      ["created", "completed", "deleted", "created"],
    );
  });

  test("snapshot export and restore do not share record references", () => {
    store.add("Stable");
    const snapshot = store.exportSnapshot();
    snapshot.items[0].title = "Changed outside";
    assert.equal(store.get("1").title, "Stable");

    const restored = createStoreFromSnapshot(store.exportSnapshot());
    const exported = restored.exportSnapshot();
    exported.activity[0].title = "Changed again";
    assert.equal(restored.getActivity()[0].title, "Stable");
  });

  test("snapshot validation rejects malformed state and unsafe counters", () => {
    const timestamp = new Date().toISOString();
    const valid = {
      version: 1,
      items: [{ id: "2", title: "Item", done: false, priority: "medium", createdAt: timestamp }],
      activity: [],
      nextId: 3,
      nextActivityId: 1,
    };
    assert.throws(() => createStoreFromSnapshot({ ...valid, version: 2 }), /unsupported/);
    assert.throws(() => createStoreFromSnapshot({ ...valid, nextId: 2 }), /nextId/);
    assert.throws(
      () => createStoreFromSnapshot({ ...valid, items: [...valid.items, { ...valid.items[0] }] }),
      /duplicate item id/,
    );
  });

  test("clear snapshots preserve counter progress", () => {
    store.add("Used id");
    store.clear();
    const restored = createStoreFromSnapshot(store.exportSnapshot());
    assert.equal(restored.add("After clear").id, "2");
    assert.equal(restored.getActivity()[0].id, "2");
  });
});
