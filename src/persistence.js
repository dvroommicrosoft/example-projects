import crypto from "node:crypto";
import path from "node:path";
import { promises as defaultFs } from "node:fs";
import { createStore, createStoreFromSnapshot } from "./store.js";

export class PersistenceError extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = "PersistenceError";
  }
}

async function writeSnapshot(filePath, snapshot, fileSystem) {
  const directory = path.dirname(filePath);
  const tempPath = path.join(
    directory,
    `.${path.basename(filePath)}.${process.pid}.${crypto.randomUUID()}.tmp`,
  );
  let handle;
  try {
    handle = await fileSystem.open(tempPath, "wx", 0o600);
    await handle.writeFile(`${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
    await handle.sync();
    await handle.close();
    handle = undefined;
    await fileSystem.rename(tempPath, filePath);
  } catch (cause) {
    let cleanupError;
    try {
      if (handle) await handle.close();
    } catch (error) {
      cleanupError = error;
    }
    try {
      await fileSystem.unlink(tempPath);
    } catch (error) {
      if (error.code !== "ENOENT") cleanupError ||= error;
    }
    const message = cleanupError
      ? `could not save snapshot; temporary-file cleanup also failed: ${cleanupError.message}`
      : "could not save snapshot";
    throw new PersistenceError(message, { cause });
  }
}

async function readExistingStore(filePath, fileSystem) {
  let raw;
  try {
    raw = await fileSystem.readFile(filePath, "utf8");
  } catch (cause) {
    if (cause.code === "ENOENT") return undefined;
    throw new PersistenceError("could not read data file", { cause });
  }

  let snapshot;
  try {
    snapshot = JSON.parse(raw);
  } catch (cause) {
    throw new PersistenceError("data file is not valid JSON", { cause });
  }
  try {
    return createStoreFromSnapshot(snapshot);
  } catch (cause) {
    throw new PersistenceError(`data file is invalid: ${cause.message}`, { cause });
  }
}

function validatedStore(store, message) {
  try {
    return createStoreFromSnapshot(store.exportSnapshot());
  } catch (cause) {
    throw new PersistenceError(message, { cause });
  }
}

export async function createPersistentStore({
  filePath,
  seed = [],
  fileSystem = defaultFs,
}) {
  if (!path.isAbsolute(filePath)) {
    throw new PersistenceError("data file path must be absolute");
  }

  let committed = await readExistingStore(filePath, fileSystem);
  if (!committed) {
    try {
      await fileSystem.mkdir(path.dirname(filePath), { recursive: true, mode: 0o700 });
    } catch (cause) {
      throw new PersistenceError("could not create data directory", { cause });
    }
    committed = validatedStore(createStore(seed), "initial state is invalid");
    await writeSnapshot(filePath, committed.exportSnapshot(), fileSystem);
  }

  let queue = Promise.resolve();
  function mutate(method, args, isNoop) {
    const operation = queue.then(async () => {
      const draft = createStoreFromSnapshot(committed.exportSnapshot());
      const result = draft[method](...args);
      if (isNoop(result)) return result;
      const validatedDraft = validatedStore(draft, "mutation would exhaust persistent state");
      await writeSnapshot(filePath, validatedDraft.exportSnapshot(), fileSystem);
      committed = validatedDraft;
      return result;
    });
    queue = operation.catch(() => {});
    return operation;
  }

  return {
    list: (...args) => committed.list(...args),
    get: (...args) => committed.get(...args),
    getActivity: (...args) => committed.getActivity(...args),
    exportSnapshot: () => committed.exportSnapshot(),
    add: (...args) => mutate("add", args, () => false),
    toggle: (...args) => mutate("toggle", args, (result) => result === undefined),
    setPriority: (...args) => mutate("setPriority", args, (result) => result === undefined),
    remove: (...args) => mutate("remove", args, (result) => result === false),
    clear: (...args) => mutate("clear", args, () => false),
  };
}
