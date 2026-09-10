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

function validatePriority(priority) {
  if (!PRIORITIES.includes(priority)) {
    throw new Error(`priority must be one of ${PRIORITIES.join(", ")}`);
  }
  return priority;
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
export function createStore(seed = []) {
  /** @type {Item[]} */
  let items = seed.map((item) => ({
    ...item,
    priority: item.priority === undefined ? "medium" : validatePriority(item.priority),
  }));

  // Start the id counter above any numeric-looking ids already present in
  // the seed data, so newly added items never collide with seeded ones.
  let nextId =
    1 +
    items.reduce((max, item) => {
      const n = Number(item.id);
      return Number.isFinite(n) && n > max ? n : max;
    }, 0);

  /** @type {ActivityEntry[]} */
  let activity = [];
  let nextActivityId = 1;

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
    if (!trimmed) {
      throw new Error("title is required");
    }
    if (trimmed.length > 200) {
      throw new Error("title must be 200 characters or fewer");
    }
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

  return { list, get, add, toggle, setPriority, remove, clear, getActivity };
}
