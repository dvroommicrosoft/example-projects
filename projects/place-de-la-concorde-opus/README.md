# Place de la Concorde (Three.js)

An artistic, procedural 3D reconstruction of the Place de la Concorde in Paris
built with Vite, TypeScript and Three.js. It is a recognizable approximation,
not a survey: proportions, spacing and details are simplified for readability
and performance. All geometry is original and generated in code; there are no
downloaded models, textures, APIs or credentials.

## Scene contract

Units are meters, Y is up, the square is centered at `(0, 0, 0)`, north is `-Z`
and the ground is `Y = 0`. The Luxor Obelisk is about 23 m tall, the two
fountains sit near `Z = -42` and `Z = +42`, and the north facades are around
`Z = -100`.

Source layout (each module owns one area and has no import-time side effects):

| Module | Export |
| --- | --- |
| `src/main.ts`, `src/scene.ts` | canvas (`data-testid="scene-canvas"`, `data-ready="true"` after first render) mounted in `#app` |
| `src/landmarks/obelisk.ts` | `createObelisk(): THREE.Group` |
| `src/landmarks/fountains.ts` | `createFountains(): { group, update(deltaSeconds, elapsedSeconds) }` |
| `src/environment/ground.ts` | `createGround(): THREE.Group` |
| `src/environment/buildings.ts` | `createBuildings(): THREE.Group` |
| `src/environment/streetFurniture.ts` | `createStreetFurniture(): THREE.Group` |
| `src/controls.ts` | `createControls({ camera, renderer, scene }): { update(deltaSeconds), dispose() }` |
| `src/style.css` | page and control styling |

## Controls

Drag to orbit, scroll or pinch to zoom. Buttons: **Reset view**, **Obelisk**,
**Fountains** and **Grand overview** move the camera to presets.

## Setup

Requires Node.js 24 and npm.

```bash
npm ci
npm run dev          # local development server
npm run typecheck
npm test             # factory invariants (Vitest, no WebGL)
npm run build        # typecheck + production build in dist/
npx playwright install chromium
npm run test:e2e     # runs against the production preview; build first
```

The app is served under `/example-projects/place-de-la-concorde-opus/`. The
Pages workflow publishes `dist/` at `.pages/place-de-la-concorde-opus`.
