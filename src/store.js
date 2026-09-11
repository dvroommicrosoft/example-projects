// src/store.js
// A tiny, dependency-free in-memory store for Tiny Triage items.
// Kept intentionally small so agents can read and modify it quickly.

/**
 * @typedef {Object} Item
 * @property {string} id
 * @property {string} title
 * @property {boolean} done
 * @property {"low"|"medium"|"high"} priority
 * @property {string} createdAt - ISO timestamp
 */

export const PRIORITIES = ["low", "medium", "high"];
export const ACTIVITY_TYPES = ["created", "completed", "reopened", "deleted"];
export const SNAPSHOT_VERSION = 1;

function validatePriority(priority) {
  if (!PRIORITIES.includes(priority)) {
    throw new Error(`priority must be one of ${PRIORITIES.join(", ")}`);
  }
  return priority;
}

function cloneRecord(record) {
  return { ...record };
}

function isCanonicalIsoTimestamp(value) {
  if (typeof value !== "string") return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.toISOString() === value;
}

function validateTitle(title) {
  if (typeof title !== "string" || !title.trim()) {
    throw new Error("title is required");
  }
  if (title.length > 200) {
    throw new Error("title must be 200 characters or fewer");
  }
}

function validateId(id, field) {
  if (typeof id !== "string" || !id) {
    throw new Error(`${field} must be a nonempty string`);
  }
}

function numericId(id) {
  return /^[1-9]\d*$/.test(id) ? Number(id) : 0;
}

function validateKeys(record, expectedKeys, label) {
  const keys = Object.keys(record).sort();
  const expected = [...expectedKeys].sort();
  if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])) {
    throw new Error(`${label} must contain only ${expected.join(", ")}`);
  }
}

function validateSnapshot(snapshot) {
  if (!snapshot || Array.isArray(snapshot) || typeof snapshot !== "object") {
    throw new Error("snapshot must be an object");
  }
  const expectedKeys = ["activity", "items", "nextActivityId", "nextId", "version"];
  validateKeys(snapshot, expectedKeys, "snapshot");
  if (snapshot.version !== SNAPSHOT_VERSION) {
    throw new Error(`unsupported snapshot version: ${snapshot.version}`);
  }
  if (!Array.isArray(snapshot.items) || !Array.isArray(snapshot.activity)) {
    throw new Error("snapshot items and activity must be arrays");
  }

  const itemIds = new Set();
  for (const item of snapshot.items) {
    if (!item || Array.isArray(item) || typeof item !== "object") {
      throw new Error("snapshot item must be an object");
    }
    validateKeys(item, ["id", "title", "done", "priority", "createdAt"], "snapshot item");
    validateId(item.id, "item id");
    if (itemIds.has(item.id)) throw new Error(`duplicate item id: ${item.id}`);
    itemIds.add(item.id);
    validateTitle(item.title);
    if (item.title !== item.title.trim()) throw new Error("snapshot item title must be trimmed");
    if (typeof item.done !== "boolean") throw new Error("snapshot item done must be a boolean");
    validatePriority(item.priority);
    if (!isCanonicalIsoTimestamp(item.createdAt)) {
      throw new Error("snapshot item createdAt must be a canonical ISO timestamp");
    }
  }

  const activityIds = new Set();
  for (const entry of snapshot.activity) {
    if (!entry || Array.isArray(entry) || typeof entry !== "object") {
      throw new Error("snapshot activity entry must be an object");
    }
    validateKeys(entry, ["id", "type", "itemId", "title", "at"], "snapshot activity entry");
    validateId(entry.id, "activity id");
    if (activityIds.has(entry.id)) throw new Error(`duplicate activity id: ${entry.id}`);
    activityIds.add(entry.id);
    if (!ACTIVITY_TYPES.includes(entry.type)) {
      throw new Error(`activity type must be one of ${ACTIVITY_TYPES.join(", ")}`);
    }
    validateId(entry.itemId, "activity itemId");
    validateTitle(entry.title);
    if (entry.title !== entry.title.trim()) {
      throw new Error("snapshot activity title must be trimmed");
    }
    if (!isCanonicalIsoTimestamp(entry.at)) {
      throw new Error("snapshot activity at must be a canonical ISO timestamp");
    }
  }

  for (const [field, value] of [
    ["nextId", snapshot.nextId],
    ["nextActivityId", snapshot.nextActivityId],
  ]) {
    if (!Number.isSafeInteger(value) || value < 1) {
      throw new Error(`${field} must be a positive safe integer`);
    }
  }
  const highestItemId = [...snapshot.items, ...snapshot.activity].reduce(
    (max, record) => Math.max(max, numericId("itemId" in record ? record.itemId : record.id)),
    0,
  );
  const highestActivityId = snapshot.activity.reduce(
    (max, entry) => Math.max(max, numericId(entry.id)),
    0,
  );
  if (snapshot.nextId <= highestItemId) {
    throw new Error("nextId must be greater than every current or historical numeric item id");
  }
  if (snapshot.nextActivityId <= highestActivityId) {
    throw new Error("nextActivityId must be greater than every numeric activity id");
  }

  return {
    version: SNAPSHOT_VERSION,
    items: snapshot.items.map(cloneRecord),
    activity: snapshot.activity.map(cloneRecord),
    nextId: snapshot.nextId,
    nextActivityId: snapshot.nextActivityId,
  };
}

/**
 * @typedef {Object} ActivityEntry
 * @property {string} id
 * @property {"created"|"completed"|"reopened"|"deleted"} type
 * @property {string} itemId
 * @property {string} title
 * @property {string} at - ISO timestamp
 */

/**
 * Creates a fresh, isolated store instance. Useful for tests so state
 * doesn't leak between test files, and used once at server startup
 * for the live in-memory data.
 */
export function createStore(seed = [], restoredState) {
  /** @type {Item[]} */
  let items = restoredState
    ? restoredState.items.map(cloneRecord)
    : seed.map((item) => ({
        ...item,
        priority: item.priority === undefined ? "medium" : validatePriority(item.priority),
      }));

  // Start the id counter above any numeric-looking ids already present in
  // the seed data, so newly added items never collide with seeded ones.
  let nextId = restoredState
    ? restoredState.nextId
    : 1 +
      items.reduce((max, item) => {
        const n = Number(item.id);
        return Number.isFinite(n) && n > max ? n : max;
      }, 0);

  /** @type {ActivityEntry[]} */
  let activity = restoredState ? restoredState.activity.map(cloneRecord) : [];
  let nextActivityId = restoredState ? restoredState.nextActivityId : 1;

  function recordActivity(type, item) {
    activity.push({
      id: String(nextActivityId++),
      type,
      itemId: item.id,
      title: item.title,
      at: new Date().toISOString(),
    });
  }

  function list() {
    return items.slice();
  }

  function get(id) {
    return items.find((item) => item.id === id);
  }

  function add(title, priority = "medium") {
    const trimmed = typeof title === "string" ? title.trim() : "";
    validateTitle(trimmed);
    const validatedPriority = validatePriority(priority);
    const item = {
      id: String(nextId++),
      title: trimmed,
      done: false,
      priority: validatedPriority,
      createdAt: new Date().toISOString(),
    };
    items.push(item);
    recordActivity("created", item);
    return item;
  }

  function toggle(id) {
    const item = get(id);
    if (!item) return undefined;
    item.done = !item.done;
    recordActivity(item.done ? "completed" : "reopened", item);
    return item;
  }

  function setPriority(id, priority) {
    const validatedPriority = validatePriority(priority);
    const item = get(id);
    if (!item) return undefined;
    item.priority = validatedPriority;
    return item;
  }

  function remove(id) {
    const item = get(id);
    const before = items.length;
    items = items.filter((i) => i.id !== id);
    const removed = items.length < before;
    if (removed) {
      recordActivity("deleted", item);
    }
    return removed;
  }

  function clear() {
    items = [];
    activity = [];
  }

  /**
   * Returns activity log entries within an optional [from, to] ISO timestamp
   * range (inclusive), sorted chronologically. Omitted bounds are unbounded.
   *
   * @param {Object} [options]
   * @param {string} [options.from] - ISO timestamp lower bound (inclusive).
   * @param {string} [options.to] - ISO timestamp upper bound (inclusive).
   * @param {string} [options.itemId] - Restrict to entries for this item.
   */
  function getActivity({ from, to, itemId } = {}) {
    return activity
      .filter((entry) => (from ? entry.at >= from : true))
      .filter((entry) => (to ? entry.at <= to : true))
      .filter((entry) => (itemId ? entry.itemId === itemId : true))
      .slice()
      .sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
  }

  function exportSnapshot() {
    return {
      version: SNAPSHOT_VERSION,
      items: items.map(cloneRecord),
      activity: activity.map(cloneRecord),
      nextId,
      nextActivityId,
    };
  }

  return { list, get, add, toggle, setPriority, remove, clear, getActivity, exportSnapshot };
}

export function createStoreFromSnapshot(snapshot) {
  return createStore([], validateSnapshot(snapshot));
}
