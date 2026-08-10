# Tiny Triage

A tiny task/issue triage board: a plain-HTML/CSS/JS front end served by a
small Node HTTP server, with a minimal JSON API. Zero third-party
dependencies — everything uses Node's built-in `http`/`fs` modules and the
built-in test runner, so `npm install` isn't even required.

This project is intentionally small and self-contained, designed as a demo
target for agentic workflows (editing, testing, committing, opening PRs).

## Features

- List / add / toggle / remove triage items
- In-memory store (resets on restart) with basic validation
- JSON API: `GET/POST /api/items`, `PATCH/DELETE /api/items/:id`, `GET /api/health`
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
and API.

## Syntax check

```bash
npm run check
```

Runs `node --check` against the server and store modules (no linter
dependency required).

## Project layout

```
server.js        # HTTP server + routing + static file serving
src/store.js      # In-memory item store (domain logic)
public/           # Static front-end: index.html, style.css, app.js
test/             # node:test suites for the store and the API
```

## API reference

| Method | Path              | Description                     |
|--------|-------------------|----------------------------------|
| GET    | `/api/health`     | Health check                    |
| GET    | `/api/items`      | List all items                  |
| POST   | `/api/items`      | Add an item, body `{ "title": "..." }` |
| PATCH  | `/api/items/:id`  | Toggle an item's `done` state   |
| DELETE | `/api/items/:id`  | Remove an item                  |
