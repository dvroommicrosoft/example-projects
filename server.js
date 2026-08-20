// server.js
// Tiny Triage: a minimal task/issue triage board.
// Zero third-party dependencies -- uses only Node's built-in http/fs modules.

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createStore } from "./src/store.js";
import { buildReport } from "./src/reports.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, "public");
const PORT = Number(process.env.PORT) || 3000;

const store = createStore([
  { id: "1", title: "Triage incoming bug reports", done: false, createdAt: new Date().toISOString() },
  { id: "2", title: "Label good-first-issues", done: false, createdAt: new Date().toISOString() },
  { id: "3", title: "Say hello to Tiny Triage", done: true, createdAt: new Date().toISOString() },
]);

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
    let bytes = 0;
    let rejected = false;
    req.on("data", (chunk) => {
      bytes += chunk.byteLength;
      if (bytes > 10_000) {
        rejected = true;
        reject(new Error("payload too large"));
        return;
      }
      raw += chunk;
    });
    req.on("end", () => {
      if (rejected) return;
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
  const relativePath = path.relative(PUBLIC_DIR, filePath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
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

        const entries = appStore.getActivity({ from: from.toISOString(), to: to.toISOString() });
        const report = buildReport(entries);
        sendJson(res, 200, { range: { from: from.toISOString(), to: to.toISOString() }, ...report });
        return;
      }

      if (pathname === "/api/items" && req.method === "GET") {
        sendJson(res, 200, { items: appStore.list() });
        return;
      }

      if (pathname === "/api/items" && req.method === "POST") {
        const body = await readBody(req);
        const item = appStore.add(body.title);
        sendJson(res, 201, { item });
        return;
      }

      const itemMatch = pathname.match(/^\/api\/items\/([^/]+)$/);
      if (itemMatch && req.method === "PATCH") {
        const item = appStore.toggle(decodeURIComponent(itemMatch[1]));
        if (!item) {
          sendJson(res, 404, { error: "item not found" });
          return;
        }
        sendJson(res, 200, { item });
        return;
      }

      if (itemMatch && req.method === "DELETE") {
        const removed = appStore.remove(decodeURIComponent(itemMatch[1]));
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
      sendJson(res, err.storage ? 500 : 400, { error: err.message || "bad request" });
    }
  });
}

if (process.env.NODE_ENV !== "test" && import.meta.url === `file://${process.argv[1]}`) {
  const app = createApp();
  app.listen(PORT, () => {
    console.log(`Tiny Triage listening on http://localhost:${PORT}`);
  });
}
