# Agent guidance

## Existing application

Tiny Triage at the repository root is a zero-dependency Node HTTP application.
Preserve its API, persistence and existing `public/` frontend. Run `npm test`
and `npm run check` at the root for changes affecting it. It requires a server
and is not deployed to GitHub Pages.

## Static examples

`projects/teams-workbench/` is a standalone Vite, React and TypeScript mock.
Use Node.js 24 and npm. Its dependencies and lockfile are isolated from Tiny
Triage; run `npm ci`, `npm test`, `npm run lint`, `npm run build`, and
`npm run test:e2e` in that directory. Install Playwright Chromium when needed.
Browser tests run the production preview, so build before running them.

Preserve the `/example-projects/teams-workbench/` Vite base and hash routes.
Every task links to a same-channel Teams thread. All conversation, including
`@Workbench` bot interaction, lives in Teams threads, not task details.
Below 760px of board container width, stack groups and hide empty groups.
Both themes follow the OS color scheme and must remain usable on mobile.

This repository and its Pages output are public. Use fictional public-safe
fixtures only; no private source, real conversations, credentials or APIs.
Do not add real authentication, Graph/Workbench integration or identity
resources without owner approval. Do not present mock login as security.
The bot is scripted, clearly labeled and performs no real actions.

## Pages delivery

`pages/index.html` is the static entry point. The Pages workflow assembles only
that entry point and the built mock into `.pages/`; do not publish the entire
repository or the backend frontend as though its API works on Pages.
Use the PR workflow and verify checks before merging. Preserve existing
repository visibility, and ask before creating unrelated resources.
Do not edit an existing AGENTS.md without owner permission.
