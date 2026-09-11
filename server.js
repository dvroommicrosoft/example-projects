// server.js
// Tiny Triage: a minimal task/issue triage board.
// Zero third-party dependencies -- uses only Node's built-in http/fs modules.

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createStore } from "./src/store.js";
import { createPersistentStore, PersistenceError } from "./src/persistence.js";
import { buildReport, EVENT_TYPES } from "./src/reports.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, "public");
const PORT = Number(process.env.PORT) || 3000;

function createDemoSeed() {
  const createdAt = new Date().toISOString();
  return [
    { id: "1", title: "Triage incoming bug reports", done: false, createdAt },
    { id: "2", title: "Label good-first-issues", done: false, createdAt },
    { id: "3", title: "Say hello to Tiny Triage", done: true, createdAt },
  ];
}

const store = createStore(createDemoSeed());

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 10_000) {
        reject(new Error("payload too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

function serveStatic(req, res, pathname) {
  const relPath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.normalize(path.join(PUBLIC_DIR, relPath));

  if (!filePath.startsWith(PUBLIC_DIR)) {
    sendJson(res, 403, { error: "forbidden" });
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      sendJson(res, 404, { error: "not found" });
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
    res.end(data);
  });
}

export function createApp(appStore = store) {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const { pathname } = url;

    try {
      if (pathname === "/api/health" && req.method === "GET") {
        sendJson(res, 200, { status: "ok", uptime: process.uptime() });
        return;
      }

      if (pathname === "/api/reports" && req.method === "GET") {
        const now = new Date();
        const defaultFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const fromParam = url.searchParams.get("from");
        const toParam = url.searchParams.get("to");
        const itemId = url.searchParams.get("itemId") || undefined;
        const typeParam = url.searchParams.get("type");

        const from = fromParam ? new Date(fromParam) : defaultFrom;
        const to = toParam ? new Date(toParam) : now;

        if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
          sendJson(res, 400, { error: "from/to must be valid ISO 8601 timestamps" });
          return;
        }
        if (from.getTime() > to.getTime()) {
          sendJson(res, 400, { error: "from must not be after to" });
          return;
        }

        let types;
        if (typeParam) {
          types = typeParam
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean);
          const invalid = types.filter((t) => !EVENT_TYPES.includes(t));
          if (invalid.length) {
            sendJson(res, 400, { error: `type must be one of ${EVENT_TYPES.join(", ")}` });
            return;
          }
        }

        const entries = appStore.getActivity({ from: from.toISOString(), to: to.toISOString(), itemId });
        const report = buildReport(entries, { types });
        sendJson(res, 200, { range: { from: from.toISOString(), to: to.toISOString() }, ...report });
        return;
      }

      if (pathname === "/api/items" && req.method === "GET") {
        sendJson(res, 200, { items: appStore.list() });
        return;
      }

      if (pathname === "/api/items" && req.method === "POST") {
        const body = await readBody(req);
        const item = await appStore.add(body.title, body.priority);
        sendJson(res, 201, { item });
        return;
      }

      const itemMatch = pathname.match(/^\/api\/items\/([^/]+)$/);
      if (itemMatch && req.method === "PATCH") {
        const id = decodeURIComponent(itemMatch[1]);
        if (!appStore.get(id)) {
          sendJson(res, 404, { error: "item not found" });
          return;
        }

        const body = await readBody(req);
        if (!body || Array.isArray(body) || typeof body !== "object") {
          sendJson(res, 400, { error: "request body must be an object" });
          return;
        }

        const keys = Object.keys(body);
        let item;
        if (keys.length === 0) {
          item = await appStore.toggle(id);
        } else if (keys.length === 1 && keys[0] === "priority") {
          item = await appStore.setPriority(id, body.priority);
        } else {
          sendJson(res, 400, { error: "PATCH body must be empty or contain only priority" });
          return;
        }
        if (!item) {
          sendJson(res, 404, { error: "item not found" });
          return;
        }
        sendJson(res, 200, { item });
        return;
      }

      if (itemMatch && req.method === "DELETE") {
        const removed = await appStore.remove(decodeURIComponent(itemMatch[1]));
        if (!removed) {
          sendJson(res, 404, { error: "item not found" });
          return;
        }
        res.writeHead(204);
        res.end();
        return;
      }

      if (pathname.startsWith("/api/")) {
        sendJson(res, 404, { error: "not found" });
        return;
      }

      if (req.method === "GET") {
        serveStatic(req, res, pathname);
        return;
      }

      sendJson(res, 405, { error: "method not allowed" });
    } catch (err) {
      if (err instanceof PersistenceError) {
        console.error("Persistent storage operation failed:", err.cause || err);
        sendJson(res, 500, { error: "could not save changes" });
        return;
      }
      sendJson(res, 400, { error: err.message || "bad request" });
    }
  });
}

async function canonicalizeCandidate(filePath) {
  let current = filePath;
  const missingSegments = [];
  while (true) {
    try {
      const existingPath = await fs.promises.realpath(current);
      return path.join(existingPath, ...missingSegments);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      const parent = path.dirname(current);
      if (parent === current) throw error;
      missingSegments.unshift(path.basename(current));
      current = parent;
    }
  }
}

export async function createConfiguredStore(env = process.env, cwd = process.cwd()) {
  if (!Object.hasOwn(env, "TRIAGE_DATA_FILE")) {
    return { store: createStore(createDemoSeed()), mode: "memory" };
  }
  if (typeof env.TRIAGE_DATA_FILE !== "string" || !env.TRIAGE_DATA_FILE.trim()) {
    throw new PersistenceError("TRIAGE_DATA_FILE must be a nonblank path");
  }

  const filePath = path.resolve(cwd, env.TRIAGE_DATA_FILE);
  let canonicalFile;
  let canonicalPublic;
  try {
    [canonicalFile, canonicalPublic] = await Promise.all([
      canonicalizeCandidate(filePath),
      fs.promises.realpath(PUBLIC_DIR),
    ]);
  } catch (cause) {
    throw new PersistenceError("could not resolve data file path", { cause });
  }
  if (
    canonicalFile === canonicalPublic ||
    canonicalFile.startsWith(`${canonicalPublic}${path.sep}`)
  ) {
    throw new PersistenceError("TRIAGE_DATA_FILE must be outside the public directory");
  }

  return {
    store: await createPersistentStore({ filePath: canonicalFile, seed: createDemoSeed() }),
    mode: `file (${canonicalFile})`,
  };
}

export async function startServer(env = process.env, cwd = process.cwd()) {
  const configured = await createConfiguredStore(env, cwd);
  const port = Number(env.PORT) || PORT;
  const app = createApp(configured.store);
  await new Promise((resolve, reject) => {
    app.once("error", reject);
    app.listen(port, () => {
      app.off("error", reject);
      resolve();
    });
  });
  console.log(`Tiny Triage listening on http://localhost:${app.address().port}`);
  console.log(`Storage mode: ${configured.mode}`);
  return app;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (process.env.NODE_ENV !== "test" && isMain) {
  startServer().catch((error) => {
    console.error(`Tiny Triage failed to start: ${error.message}`);
    process.exitCode = 1;
  });
}
