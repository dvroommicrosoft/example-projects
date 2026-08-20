// src/store.js
// A tiny, dependency-free JSON-backed store for Tiny Triage items.
// Kept intentionally small so agents can read and modify it quickly.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_DATA_FILE = path.join(MODULE_DIR, "..", "data", "items.json");
export const DEFAULT_ACTIVITY_FILE = path.join(MODULE_DIR, "..", "data", "activity.json");

/**
 * @typedef {Object} Item
 * @property {string} id
 * @property {string} title
 * @property {boolean} done
 * @property {string} createdAt - ISO timestamp
 */

/**
 * @typedef {Object} ActivityEntry
 * @property {string} id
 * @property {string} itemId
 * @property {string} title
 * @property {"created"|"completed"|"reopened"|"deleted"} type
 * @property {string} at - ISO timestamp
 */

/**
 * Creates a fresh store instance. The optional filePath/activityFilePath are
 * useful for tests so state doesn't leak between test files.
 */
export function createStore(seed = [], options = {}) {
  const filePath = options.filePath || process.env.TRIAGE_DATA_FILE || DEFAULT_DATA_FILE;
  const activityFilePath =
    options.activityFilePath || process.env.TRIAGE_ACTIVITY_FILE || DEFAULT_ACTIVITY_FILE;
  /** @type {Item[]} */
  let items = loadItems(filePath, seed);
  /** @type {ActivityEntry[]} */
  let activity = loadActivity(activityFilePath);

  // Start the id counter above any numeric-looking ids already present in
  // the seed data, so newly added items never collide with seeded ones.
  let nextId =
    1 +
    items.reduce((max, item) => {
      const n = Number(item.id);
      return Number.isFinite(n) && n > max ? n : max;
    }, 0);

  let nextActivityId =
    1 +
    activity.reduce((max, entry) => {
      const n = Number(entry.id);
      return Number.isFinite(n) && n > max ? n : max;
    }, 0);

  function recordActivity(type, item) {
    const entry = {
      id: String(nextActivityId++),
      itemId: item.id,
      title: item.title,
      type,
      at: new Date().toISOString(),
    };
    const nextActivity = [...activity, entry];
    try {
      persist(nextActivity, activityFilePath, "activity");
      activity = nextActivity;
    } catch (error) {
      // The item mutation itself already succeeded and was persisted; a
      // failure to record activity is logged but must not be surfaced as a
      // failure of the (already-committed) item operation.
      console.error(error);
    }
    return entry;
  }

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
    const nextItems = [...items, item];
    persist(nextItems, filePath, "items");
    items = nextItems;
    recordActivity("created", item);
    return item;
  }

  function toggle(id) {
    const item = get(id);
    if (!item) return undefined;
    const nextItems = items.map((candidate) =>
      candidate.id === id ? { ...candidate, done: !candidate.done } : candidate,
    );
    persist(nextItems, filePath, "items");
    items = nextItems;
    const updated = get(id);
    recordActivity(updated.done ? "completed" : "reopened", updated);
    return updated;
  }

  function remove(id) {
    const item = get(id);
    const nextItems = items.filter((candidate) => candidate.id !== id);
    if (nextItems.length === items.length) return false;
    persist(nextItems, filePath, "items");
    items = nextItems;
    recordActivity("deleted", item);
    return true;
  }

  function clear() {
    persist([], filePath, "items");
    items = [];
    try {
      persist([], activityFilePath, "activity");
    } catch (error) {
      console.error(error);
    }
    activity = [];
  }

  /**
   * Returns activity log entries within an optional [from, to] ISO timestamp
   * range (inclusive), sorted chronologically. Omitted bounds are unbounded.
   */
  function getActivity({ from, to } = {}) {
    const fromMs = from ? Date.parse(from) : -Infinity;
    const toMs = to ? Date.parse(to) : Infinity;
    return activity
      .filter((entry) => {
        const at = Date.parse(entry.at);
        return at >= fromMs && at <= toMs;
      })
      .slice()
      .sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  }

  return { list, get, add, toggle, remove, clear, getActivity };
}

function loadActivity(filePath) {
  let raw;
  try {
    raw = fs.readFileSync(filePath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw storageError(`Unable to read persisted activity from ${filePath}`, error);
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw storageError(`Unable to parse persisted activity from ${filePath}`, error);
  }
  if (!Array.isArray(parsed)) {
    throw new Error(`Invalid persisted activity in ${filePath}`);
  }
  return parsed.map((entry) => ({ ...entry }));
}

function loadItems(filePath, seed) {
  let raw;
  try {
    raw = fs.readFileSync(filePath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return seed.map((item) => ({ ...item }));
    throw storageError(`Unable to read persisted items from ${filePath}`, error);
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw storageError(`Unable to parse persisted items from ${filePath}`, error);
  }
  if (!Array.isArray(parsed) || !hasValidItems(parsed)) {
    throw new Error(`Invalid persisted items in ${filePath}`);
  }
  return parsed.map((item) => ({ ...item }));
}

function hasValidItems(items) {
  const ids = new Set();
  return items.every((item) => {
    const valid =
      item &&
      typeof item === "object" &&
      typeof item.id === "string" &&
      item.id.length > 0 &&
      typeof item.title === "string" &&
      item.title.trim() === item.title &&
      item.title.length > 0 &&
      item.title.length <= 200 &&
      typeof item.done === "boolean" &&
      typeof item.createdAt === "string" &&
      !Number.isNaN(Date.parse(item.createdAt)) &&
      !ids.has(item.id);
    if (valid) ids.add(item.id);
    return valid;
  });
}

function persist(items, filePath, entityName = "items") {
  const directory = path.dirname(filePath);
  const temporaryPath = path.join(
    directory,
    `.${path.basename(filePath)}.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`,
  );
  try {
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(temporaryPath, `${JSON.stringify(items, null, 2)}\n`, "utf8");
    fs.renameSync(temporaryPath, filePath);
  } catch (error) {
    try {
      fs.rmSync(temporaryPath, { force: true });
    } catch {
      // Preserve the original storage error.
    }
    throw storageError(`Unable to persist ${entityName} to ${filePath}`, error);
  }
}

function storageError(message, cause) {
  const error = new Error(message, { cause });
  error.storage = true;
  return error;
}
