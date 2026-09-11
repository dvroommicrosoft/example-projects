import { afterEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import fs, { promises as fsPromises } from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { createApp, createConfiguredStore } from "../server.js";
import { createPersistentStore, PersistenceError } from "../src/persistence.js";

const ownedDirectories = [];

async function temporaryDirectory() {
  const directory = await fsPromises.mkdtemp(path.join(os.tmpdir(), "tiny-triage-"));
  ownedDirectories.push(directory);
  return directory;
}

afterEach(async () => {
  await Promise.all(
    ownedDirectories.splice(0).map((directory) =>
      fsPromises.rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("persistent store", () => {
  test("initializes a missing file and restores complete state", async () => {
    const directory = await temporaryDirectory();
    const filePath = path.join(directory, "nested", "triage.json");
    const createdAt = new Date().toISOString();
    const store = await createPersistentStore({
      filePath,
      seed: [{ id: "4", title: "Seeded", done: false, priority: "high", createdAt }],
    });

    const added = await store.add("Persist me", "low");
    await store.toggle(added.id);
    await store.setPriority(added.id, "high");
    await store.remove("4");

    const restored = await createPersistentStore({ filePath });
    assert.deepEqual(restored.list(), store.list());
    assert.deepEqual(restored.getActivity(), store.getActivity());
    assert.equal((await restored.add("Next")).id, "6");
  });

  test("loads a valid empty board without reseeding", async () => {
    const directory = await temporaryDirectory();
    const filePath = path.join(directory, "triage.json");
    await fsPromises.writeFile(
      filePath,
      JSON.stringify({ version: 1, items: [], activity: [], nextId: 1, nextActivityId: 1 }),
    );
    const store = await createPersistentStore({
      filePath,
      seed: [{ id: "1", title: "Do not seed", done: false, priority: "medium", createdAt: new Date().toISOString() }],
    });
    assert.deepEqual(store.list(), []);
  });

  test("rejects corrupt files without changing their bytes", async () => {
    const directory = await temporaryDirectory();
    const filePath = path.join(directory, "triage.json");
    const corrupt = "{\"version\":";
    await fsPromises.writeFile(filePath, corrupt);
    await assert.rejects(() => createPersistentStore({ filePath }), PersistenceError);
    assert.equal(await fsPromises.readFile(filePath, "utf8"), corrupt);
  });

  test("failed replacement keeps committed state and does not poison the queue", async () => {
    const directory = await temporaryDirectory();
    const filePath = path.join(directory, "triage.json");
    let failRename = false;
    const fileSystem = Object.create(fsPromises);
    fileSystem.rename = async (...args) => {
      if (failRename) throw Object.assign(new Error("injected rename failure"), { code: "EIO" });
      return fsPromises.rename(...args);
    };
    const store = await createPersistentStore({ filePath, fileSystem });
    const originalBytes = await fsPromises.readFile(filePath, "utf8");

    failRename = true;
    await assert.rejects(() => store.add("Rejected"), PersistenceError);
    assert.deepEqual(store.list(), []);
    assert.equal(await fsPromises.readFile(filePath, "utf8"), originalBytes);

    failRename = false;
    const item = await store.add("Accepted");
    assert.equal(item.id, "1");
    assert.equal((await createPersistentStore({ filePath })).list()[0].title, "Accepted");
  });

  test("write and flush failures preserve the prior file and state", async () => {
    for (const failedMethod of ["writeFile", "sync"]) {
      const directory = await temporaryDirectory();
      const filePath = path.join(directory, `${failedMethod}.json`);
      let failureEnabled = false;
      const fileSystem = Object.create(fsPromises);
      fileSystem.open = async (...args) => {
        const handle = await fsPromises.open(...args);
        return {
          writeFile: async (...writeArgs) => {
            if (failureEnabled && failedMethod === "writeFile") {
              throw Object.assign(new Error("injected write failure"), { code: "EIO" });
            }
            return handle.writeFile(...writeArgs);
          },
          sync: async () => {
            if (failureEnabled && failedMethod === "sync") {
              throw Object.assign(new Error("injected sync failure"), { code: "EIO" });
            }
            return handle.sync();
          },
          close: () => handle.close(),
        };
      };
      const store = await createPersistentStore({ filePath, fileSystem });
      const originalBytes = await fsPromises.readFile(filePath, "utf8");
      failureEnabled = true;
      await assert.rejects(() => store.add("Rejected"), PersistenceError);
      assert.deepEqual(store.list(), []);
      assert.equal(await fsPromises.readFile(filePath, "utf8"), originalBytes);
    }
  });

  test("reads see committed state until an in-flight save completes", async () => {
    const directory = await temporaryDirectory();
    const filePath = path.join(directory, "triage.json");
    let releaseRename;
    let renameStarted;
    let delayRename = false;
    const started = new Promise((resolve) => {
      renameStarted = resolve;
    });
    const gate = new Promise((resolve) => {
      releaseRename = resolve;
    });
    const fileSystem = Object.create(fsPromises);
    fileSystem.rename = async (...args) => {
      if (delayRename) {
        renameStarted();
        await gate;
      }
      return fsPromises.rename(...args);
    };
    const store = await createPersistentStore({ filePath, fileSystem });
    delayRename = true;
    const pending = store.add("Pending");
    await started;
    assert.deepEqual(store.list(), []);
    releaseRename();
    await pending;
    assert.equal(store.list()[0].title, "Pending");
  });

  test("serializes concurrent mutations without losing updates", async () => {
    const directory = await temporaryDirectory();
    const filePath = path.join(directory, "triage.json");
    const store = await createPersistentStore({ filePath });
    const items = await Promise.all(["A", "B", "C", "D"].map((title) => store.add(title)));
    assert.deepEqual(items.map((item) => item.id), ["1", "2", "3", "4"]);
    assert.equal((await createPersistentStore({ filePath })).list().length, 4);
  });

  test("rejects counter-exhausting mutations without committing or poisoning the queue", async () => {
    const cases = [
      {
        name: "item add",
        snapshot: { version: 1, items: [], activity: [], nextId: Number.MAX_SAFE_INTEGER, nextActivityId: 1 },
        mutate: (store) => store.add("Exhaust item ids"),
        recover: (store) => store.clear(),
      },
      {
        name: "activity add",
        snapshot: { version: 1, items: [], activity: [], nextId: 1, nextActivityId: Number.MAX_SAFE_INTEGER },
        mutate: (store) => store.add("Exhaust activity ids"),
        recover: (store) => store.clear(),
      },
      {
        name: "activity toggle",
        snapshot: {
          version: 1,
          items: [{ id: "1", title: "Existing", done: false, priority: "low", createdAt: new Date().toISOString() }],
          activity: [],
          nextId: 2,
          nextActivityId: Number.MAX_SAFE_INTEGER,
        },
        mutate: (store) => store.toggle("1"),
        recover: (store) => store.setPriority("1", "high"),
      },
      {
        name: "activity delete",
        snapshot: {
          version: 1,
          items: [{ id: "1", title: "Existing", done: false, priority: "low", createdAt: new Date().toISOString() }],
          activity: [],
          nextId: 2,
          nextActivityId: Number.MAX_SAFE_INTEGER,
        },
        mutate: (store) => store.remove("1"),
        recover: (store) => store.setPriority("1", "high"),
      },
    ];

    for (const testCase of cases) {
      const directory = await temporaryDirectory();
      const filePath = path.join(directory, `${testCase.name.replaceAll(" ", "-")}.json`);
      await fsPromises.writeFile(filePath, JSON.stringify(testCase.snapshot));
      const originalBytes = await fsPromises.readFile(filePath, "utf8");
      const store = await createPersistentStore({ filePath });

      await assert.rejects(() => testCase.mutate(store), PersistenceError);
      assert.deepEqual(store.exportSnapshot(), testCase.snapshot);
      assert.equal(await fsPromises.readFile(filePath, "utf8"), originalBytes);

      await testCase.recover(store);
      await createPersistentStore({ filePath });
    }
  });

  test("rejects an initialization seed that cannot produce a valid snapshot", async () => {
    const directory = await temporaryDirectory();
    const filePath = path.join(directory, "invalid-seed.json");
    await assert.rejects(
      () =>
        createPersistentStore({
          filePath,
          seed: [{ id: String(Number.MAX_SAFE_INTEGER), title: "Too high", done: false, createdAt: new Date().toISOString() }],
        }),
      /initial state is invalid/,
    );
    await assert.rejects(() => fsPromises.access(filePath), { code: "ENOENT" });
  });
});

describe("persistence configuration", () => {
  test("keeps memory mode opt-in and rejects blank configuration", async () => {
    assert.equal((await createConfiguredStore({}, process.cwd())).mode, "memory");
    await assert.rejects(
      () => createConfiguredStore({ TRIAGE_DATA_FILE: "  " }, process.cwd()),
      /nonblank/,
    );
  });

  test("rejects direct and symlinked paths under the public directory", async () => {
    await assert.rejects(
      () => createConfiguredStore({ TRIAGE_DATA_FILE: "public/triage.json" }, process.cwd()),
      /outside the public directory/,
    );

    const directory = await temporaryDirectory();
    const link = path.join(directory, "public-link");
    await fsPromises.symlink(path.resolve("public"), link, "dir");
    await assert.rejects(
      () => createConfiguredStore({ TRIAGE_DATA_FILE: path.join(link, "triage.json") }),
      /outside the public directory/,
    );
  });

  test("rejects outward public symlinks and never serves their snapshots", async () => {
    const directory = await temporaryDirectory();
    const filePath = path.join(directory, "private.json");
    await createPersistentStore({ filePath });
    const linkName = `persistence-test-${process.pid}-${Date.now()}`;
    const linkPath = path.resolve("public", linkName);
    await fsPromises.symlink(directory, linkPath, "dir");
    try {
      await assert.rejects(
        () => createConfiguredStore({ TRIAGE_DATA_FILE: path.join(linkPath, "other.json") }),
        /outside the public directory/,
      );

      const server = createApp();
      await new Promise((resolve) => server.listen(0, resolve));
      try {
        const response = await fetch(
          `http://127.0.0.1:${server.address().port}/${linkName}/private.json`,
        );
        assert.equal(response.status, 403);
        assert.doesNotMatch(await response.text(), /nextActivityId/);
      } finally {
        await new Promise((resolve) => server.close(resolve));
      }
    } finally {
      await fsPromises.unlink(linkPath);
    }
  });
});

async function unusedPort() {
  const server = net.createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  await new Promise((resolve) => server.close(resolve));
  return port;
}

function launchServer(port, filePath) {
  const child = spawn(process.execPath, ["server.js"], {
    cwd: path.resolve("."),
    env: { ...process.env, PORT: String(port), TRIAGE_DATA_FILE: filePath },
    stdio: ["ignore", "pipe", "pipe"],
  });
  return new Promise((resolve, reject) => {
    let output = "";
    const timeout = setTimeout(() => reject(new Error(`server startup timed out: ${output}`)), 5000);
    const onData = (chunk) => {
      output += chunk;
      if (output.includes("Tiny Triage listening")) {
        clearTimeout(timeout);
        resolve(child);
      }
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    child.once("exit", (code) => {
      clearTimeout(timeout);
      reject(new Error(`server exited with ${code}: ${output}`));
    });
  });
}

async function stopServer(child) {
  child.kill("SIGTERM");
  await new Promise((resolve) => child.once("exit", resolve));
}

test("configured server persists API changes across process restarts", async () => {
  const directory = await temporaryDirectory();
  const filePath = path.join(directory, "triage.json");
  const port = await unusedPort();
  let child = await launchServer(port, filePath);
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Across restart" }),
    });
    assert.equal(response.status, 201);
  } finally {
    await stopServer(child);
  }

  child = await launchServer(port, filePath);
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/items`);
    assert.equal(response.status, 200);
    assert.ok((await response.json()).items.some((item) => item.title === "Across restart"));
  } finally {
    await stopServer(child);
  }
});
