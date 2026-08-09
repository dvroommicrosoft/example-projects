// src/store.js
// A tiny, dependency-free in-memory store for Tiny Triage items.
// Kept intentionally small so agents can read and modify it quickly.

/**
 * @typedef {Object} Item
 * @property {string} id
 * @property {string} title
 * @property {boolean} done
 * @property {string} createdAt - ISO timestamp
 */

/**
 * Creates a fresh, isolated store instance. Useful for tests so state
 * doesn't leak between test files, and used once at server startup
 * for the live in-memory data.
 */
export function createStore(seed = []) {
  /** @type {Item[]} */
  let items = seed.map((item) => ({ ...item }));

  // Start the id counter above any numeric-looking ids already present in
  // the seed data, so newly added items never collide with seeded ones.
  let nextId =
    1 +
    items.reduce((max, item) => {
      const n = Number(item.id);
      return Number.isFinite(n) && n > max ? n : max;
    }, 0);

  function list() {
    return items.slice();
  }

  function get(id) {
    return items.find((item) => item.id === id);
  }

  function add(title) {
    const trimmed = typeof title === "string" ? title.trim() : "";
    if (!trimmed) {
      throw new Error("title is required");
    }
    if (trimmed.length > 200) {
      throw new Error("title must be 200 characters or fewer");
    }
    const item = {
      id: String(nextId++),
      title: trimmed,
      done: false,
      createdAt: new Date().toISOString(),
    };
    items.push(item);
    return item;
  }

  function toggle(id) {
    const item = get(id);
    if (!item) return undefined;
    item.done = !item.done;
    return item;
  }

  function remove(id) {
    const before = items.length;
    items = items.filter((item) => item.id !== id);
    return items.length < before;
  }

  function clear() {
    items = [];
  }

  return { list, get, add, toggle, remove, clear };
}
