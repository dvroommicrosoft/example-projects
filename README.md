# Tiny Triage

A tiny task/issue triage board: a plain-HTML/CSS/JS front end served by a
small Node HTTP server, with a minimal JSON API. Zero third-party
dependencies — everything uses Node's built-in `http`/`fs` modules and the
built-in test runner, so `npm install` isn't even required.

This project is intentionally small and self-contained, designed as a demo
target for agentic workflows (editing, testing, committing, opening PRs).

## Features

- List / add / prioritize / toggle / remove triage items
- Client-side title search and All/Open/Done filters with live item counts
- In-memory store by default, with optional file-backed persistence
- JSON API: `GET/POST /api/items`, `PATCH/DELETE /api/items/:id`, `GET /api/health`
- Live, accessible API health banner that refreshes without reloading
- Activity reporting: `GET /api/reports` aggregates created/completed/reopened/deleted
  events over a timeframe, with optional event-type filtering
- Static UI served from `public/`
- Configurable port via `PORT` env var (defaults to `3000`)

## Requirements

- Node.js 18+ (no `npm install` needed — no dependencies)

## Run it

```bash
npm start
# or: node server.js
```

Then open http://localhost:3000

To check the health endpoint:

```bash
curl http://localhost:3000/api/health
```

To use a different port:

```bash
PORT=4000 npm start
```

To retain items and activity across restarts, opt in with a private data file:

```bash
TRIAGE_DATA_FILE=./data/triage.json npm start
```

The first run creates the parent directory and a versioned JSON snapshot
containing the demo items. Later runs load that snapshot, including activity
history and ID counters. An existing empty board remains empty. If the variable
is unset, Tiny Triage stays entirely in memory and resets on restart; a blank
value is an error.

Keep the file outside `public/`; Tiny Triage rejects direct or symlinked paths
inside the static directory. A malformed, unreadable, or unsupported snapshot
stops startup without overwriting it or falling back to memory. Back up the file
before manually repairing it. File-backed mode supports one Tiny Triage process
per data file; multi-process writers and network-filesystem durability are not
supported.

For auto-restart on file changes during development:

```bash
npm run dev
```

## Test it

```bash
npm test
```

Runs the built-in Node test runner (`node --test`) against the store
and API. The suite uses Node's built-in test runner with no external dependencies required.

## Syntax check

```bash
npm run check
```

Runs `node --check` against the server, store, and reports modules (no
linter dependency required).

## Project layout

```
server.js        # HTTP server + routing + static file serving
src/store.js      # In-memory item store (domain logic + activity log)
src/persistence.js # Atomic, queued JSON snapshot persistence
src/reports.js    # Aggregates activity into totals/day-buckets for reports
public/           # Static front-end, including health-status.js and reports.js
test/             # node:test suites for the store, reports, and the API
```

## API reference

| Method | Path              | Description                     |
|--------|-------------------|----------------------------------|
| GET    | `/api/health`     | Health check                    |
| GET    | `/api/items`      | List all items                  |
| POST   | `/api/items`      | Add an item, body `{ "title": "...", "priority": "low" }` |
| PATCH  | `/api/items/:id`  | Toggle completion or update priority |
| DELETE | `/api/items/:id`  | Remove an item                  |
| GET    | `/api/reports`    | Activity report for a timeframe (see below) |

Priority may be `low`, `medium`, or `high`. Omitting it when creating an item
defaults to `medium`. For compatibility, a bodyless request or `{}` to
`PATCH /api/items/:id` toggles completion; `{ "priority": "high" }` changes
only priority. Other nonempty PATCH bodies are rejected.

Validation errors return `400`, missing items return `404`, and a failed
persistent write returns a generic `500` response while the server logs the
underlying cause. Failed writes do not publish partial state.

### `GET /api/reports`

Query params (all optional):

- `from`, `to` — ISO 8601 timestamps bounding the range (default: last 7 days)
- `type` — comma-separated subset of `created,completed,reopened,deleted` to
  restrict the report to

Response:

```json
{
  "range": { "from": "...", "to": "..." },
  "totals": { "created": 0, "completed": 0, "reopened": 0, "deleted": 0 },
  "buckets": [
    { "date": "YYYY-MM-DD", "created": 0, "completed": 0, "reopened": 0, "deleted": 0 }
  ]
}
```
