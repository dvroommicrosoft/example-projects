# Teams Workbench

This public example lives in `dvroommicrosoft/example-projects` under
`projects/teams-workbench/`. Run the following commands from that directory.

A Teams-style workspace that adds an ADX Workbench board to channel conversations. Built with Vite, React, TypeScript, and Lucide icons.

## First milestone

An interactive mock with a Teams desktop shell, channel navigation, status-grouped task board, linked Teams threads, task details, checklists, and a simulated Workbench bot in Teams threads. Every task has a corresponding thread. Selecting a card opens that thread and its task details together; Teams threads replace all task conversation, including interaction with the bot. There is no separate Discussion or Agent chat in task details.

The Teams shell follows Microsoft's published desktop screenshots: light title bar with centered search, a Chat-selected app rail, combined chat/channel sidebar with quick views, and inline channel tabs. Channel conversations use message bubbles with replies in a dedicated thread pane. At narrower widths, the channel feed gives way to the selected thread rather than squeezing three panes together.

Light and dark themes automatically follow the operating system/browser appearance setting (`prefers-color-scheme`), including live changes without a reload. The dark theme covers the Teams shell, board cards, task details, thread messages, bot replies and form controls; no manual toggle or saved override is required.

The Workbench surfaces follow the inspected ADX design: bordered neutral board groups (with a tinted **Ready for you** group), compact cards with activity pill/ID, title, segmented checklist tracks with completion/check-in markers, and owner/repository/tag chips. Details use a compact title/owner header, an initially collapsed pinned checklist, and framed Properties with a Teams-thread action. Expand the checklist to change its steps. The mock reimplements that visual structure without importing private source or its backend.

The board responds to its **own pane width**, not only the viewport: below 760px, status groups stack vertically and empty groups disappear. On small screens, conversations and details share a vertically split view. Search, owner filtering, status changes, checklist changes, thread replies, and scripted bot responses work locally.

Groups run left to right as **Ready for you**, **Not Started**, **In Progress**, and **Completed**; there is no Blocked group or status. The 20 fictional tasks include 12 newly completed examples (13 completed tasks total), each linked to its own Teams thread. Product launch shows the completed work alongside active tasks. Checklists vary from one to seven steps: software delivery examples use **Investigate, Plan, Implement, Preview, Review, Merge, Deploy**, while design-only, brainstorming, writing, and review tasks have shorter, relevant workflows. For example, onboarding ends with prototype review, success-signal brainstorming only needs discussion and captured ideas, and notification copy is a single review step. Progress ranges from unstarted to fully checked.

To interact with the bot, write a reply such as **`@Workbench what should we do next?`**, or use the **@ Workbench** button in the thread composer to insert the mention. A case-insensitive, standalone `@Workbench` mention triggers one clearly labeled, deterministic bot reply in that same thread using the linked task's current status and checklist. Ordinary replies do not trigger it. Each seeded thread includes an example mention and bot reply. The bot does not change task state, run commands, or contact a service.

**This is a standalone mock, not a Teams app installation or live Workbench integration.** All names, messages, tasks and responses are fictional. There is no backend, real AI, authentication, Graph access, or connection to private Workbench APIs. State changes reset on reload. Decorative shell items are not implemented Teams features.

## Setup

Requires Node.js 24 and npm 11.

```sh
npm ci
npm run dev -- --host 0.0.0.0
```

Open the address printed by Vite, including `/example-projects/teams-workbench/`. No environment variables or credentials are required. For a trusted remote preview hostname, set `PREVIEW_HOST` to that exact hostname; the dev server rejects other non-local hostnames by default.

```sh
npm test
npm run lint
npm run build
npx playwright install chromium
npm run test:e2e
npm run preview -- --host 0.0.0.0
```

Model tests cover mock-data integrity, group order, checklist progress, and hash routes. Browser tests cover task/thread/detail navigation, refresh/back, replies, seven-stage checklists, completed tasks, filters, viewport and container responsiveness, thread-only bot interaction, and live OS theme switching. Playwright starts a production preview on port 4175; run `npm run build` first.

## Navigation

Routes live in the URL fragment so refresh and direct links work on GitHub Pages:

```text
/example-projects/teams-workbench/#/channels/launch/board
/example-projects/teams-workbench/#/channels/launch/threads/welcome-flow?task=101
```

Close details without leaving the thread, or return to Workbench with details still open to see the board adapt to the narrower pane. Unknown routes have an explicit recovery link.

## GitHub Pages

The repository-root `.github/workflows/pages.yml` checks Tiny Triage and this app, builds `dist`, tests the production preview, and assembles the Pages site with a landing page. It deploys on pushes to `main` or manual dispatch; pull requests run checks without deploying. Set **Settings > Pages > Build and deployment > Source** to **GitHub Actions**. Vite's base is `/example-projects/teams-workbench/`.

The intended URL is `https://dvroommicrosoft.github.io/example-projects/teams-workbench/`. Both source and site are public: keep this deployment strictly mock/public-safe. Never change repository visibility or add billing/identity/hosting resources without owner approval. Do not put credentials, real team conversations, or private repository code into browser bundles. The original private bootstrap remains separate; this copy is the owner-requested public Pages destination.

## Design references

Original implementation informed by [Microsoft's chat/channel desktop screenshots](https://adoption.microsoft.com/en-gb/microsoft-teams/new-chat-and-channels-experience/), [combined Chat view](https://support.microsoft.com/en-au/teams/teams-channels/explore-the-new-chat-and-channels-experience-in-microsoft-teams), [threaded channels](https://adoption.microsoft.com/en-us/microsoft-teams/new-chat-and-channels-experience/threads-in-channels/), [channel tabs](https://learn.microsoft.com/en-us/microsoftteams/platform/tabs/what-are-tabs), and [channel conversation links](https://learn.microsoft.com/en-us/microsoftteams/platform/concepts/build-and-test/deep-link-teams).

ADX visual references inspected read-only: `task-board-card.tsx`, `task-board.tsx`, `task-group-rows.tsx`, `task-checklist-summary.tsx`, `tabbed-task-detail.tsx`, `overview-section.tsx`, and the spacing/typography/color tokens in `styles.css`. Reference screenshots and private source are not included in the repository or browser bundle.

Immediate next step after the first milestone: review the navigation and pane behavior with stakeholders before considering real Teams app packaging or APIs. Real integration requires a separate scope, authentication design, and authorization.
