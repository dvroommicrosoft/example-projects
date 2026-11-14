# Place de la Concorde

A stylized, interactive 3D model of the Place de la Concorde in Paris, built
with [Three.js](https://threejs.org/), TypeScript and Vite.

**This is an artistic approximation**, not a survey-accurate reconstruction.
All geometry is generated procedurally in code; there are no external models,
textures, fonts, images or runtime APIs. It contains no private data and no
authentication.

Scene contents: the Luxor Obelisk with its gold pyramidion, the two fountains,
the paved square, the northern buildings including the Hôtel de Crillon, and
street furniture.

## Coordinates

Units are meters, Y is up and north is -Z. The obelisk is at the origin
`(0, 0, 0)`, the fountains at `(0, 0, -55)` and `(0, 0, 55)`, the northern
buildings stand around `Z = -115` facing +Z, and the paved square is about
180 x 220 m.

## Controls

- Mouse: drag to orbit, wheel to zoom, right-drag to pan
- Touch: drag to orbit, pinch to zoom, two-finger drag to pan
- Keyboard: arrow keys orbit, `+` / `-` zoom, number keys select view presets,
  `R` or `Home` resets the view, `Escape` closes help
- On-screen buttons select presets and reset the view

## Development

Requires Node.js 24 and npm. Dependencies are isolated from the Tiny Triage
app at the repository root.

```bash
npm ci
npm run dev        # dev server
npm run build      # tsc --noEmit && vite build
npm run preview    # serve the production build
npm run lint       # oxlint
npm test           # vitest unit/contract tests
npx playwright install chromium   # once
npm run test:e2e   # Playwright against the production preview
```

Build before `npm run test:e2e`: the browser tests run the production
preview and use software WebGL (SwiftShader) so they work without a GPU.

To allow a specific host on the dev or preview server, set `PREVIEW_HOST`:

```bash
PREVIEW_HOST=my-host.example npm run preview
```

## Layout

```
src/main.ts                  # entry point
src/core/scene.ts            # scene, camera, renderer
src/models/                  # obelisk, fountains, ground, buildings, street furniture
src/interactions/controls.ts # orbit controls, presets and overlay UI
src/style.css                # overlay styles
tests/unit/                  # vitest contract tests for the modules
tests/e2e/                   # Playwright browser tests
```

## Publishing

The Pages workflow builds this example and publishes it at
`/example-projects/place-de-la-concorde/`, so the Vite base is fixed to that
path.
