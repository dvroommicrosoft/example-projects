# Place de la Concorde

A stylized, procedural 3D study of the Place de la Concorde in Paris at late
afternoon, built with Three.js, Vite and TypeScript. It is an artistic
interpretation, **not** a survey-accurate model, and uses no external models,
textures, fonts or CDN assets.

Published at `/example-projects/place-de-la-concorde/`.

## Layout

- `src/scene.ts` — procedural geometry (`createConcordeScene`): plaza,
  obelisk, fountains, palace facades. Returns `{ group, update, dispose }`.
- `src/main.ts` — the viewer: renderer, camera, lighting, fog, shadows,
  bounded orbit controls, keyboard controls, pause/reset, error handling.
- `src/styles.css`, `index.html` — editorial overlay using system fonts only.
- `tests/browser/` — Playwright end-to-end tests.

Units are meters, Y up, plaza centered at the origin.

## Setup and checks

Requires Node.js 24 and npm. From this directory:

```sh
npm ci
npm run check      # typecheck + Node geometry tests
npm run build      # typecheck + production build into dist/
npx playwright install chromium   # once
npm run test:e2e   # builds, then runs the production preview at the base path
npm run dev        # local development server
```

The e2e tests use real WebGL (software rendering flags are set in
`playwright.config.ts`) against `vite preview` on port 4176.

## Controls

| Action | Pointer / touch | Keyboard |
| --- | --- | --- |
| Orbit | drag | arrow keys |
| Pan | right-drag, two-finger drag | Shift + arrow keys |
| Zoom | wheel, pinch | `+` / `-` |
| Reset view | **Reset view** | `R` |
| Pause / resume water | **Pause water** button | Tab to the button, Enter |

The camera is bounded: zoom distance, polar angle (never below the ground)
and pan range are clamped so the plaza cannot be lost.

## Behavior notes

- Warm directional light, soft shadows and distance fog give the late-afternoon
  feel. The overlay follows the OS light/dark scheme; the scene itself stays at
  golden hour.
- `prefers-reduced-motion: reduce` starts with the water paused and disables
  camera damping. Water can still be resumed manually.
- Pixel ratio is capped at 2 and the canvas tracks its container size.
- If WebGL is unavailable, the scene fails to build, or the GPU context is
  lost, a visible message explains the problem (context loss recovers
  automatically when the browser restores it).

## Limitations

- Procedural and stylized: proportions, ornament and surroundings are
  simplified, and there is no real-world map or survey data.
- WebGL (preferably WebGL 2) is required; there is no 2D fallback.
- Static, client-side only; no backend or network access at runtime.
