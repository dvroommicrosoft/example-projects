# Tiny Triage

A tiny task/issue triage board: a plain-HTML/CSS/JS front end served by a
small Node HTTP server, with a minimal JSON API. Zero third-party
dependencies — everything uses Node's built-in `http`/`fs` modules and the
built-in test runner, so `npm install` isn't even required.

This project is intentionally small and self-contained, designed as a demo
target for agentic workflows (editing, testing, committing, opening PRs).

## Features

- List / add / prioritize / toggle / remove triage items
- In-memory store (resets on restart) with basic validation
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
