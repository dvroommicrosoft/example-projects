# Place de la Concorde — three.js scene

Standalone Vite + TypeScript + three.js example of Place de la Concorde, Paris.
Dependencies are isolated in this directory (Node 24, npm).

```sh
npm ci
npm run dev      # local dev server
npm test         # vitest unit tests
npm run lint
npm run build    # type-check + production build into dist/
npm run preview
```

Vite `base` is `/example-projects/concorde-scene/`. GitHub Pages publishing is not wired up here.

## Controls

Drag to orbit, scroll/pinch to zoom, right-drag/two-finger to pan. Viewpoint buttons or keys `1`–`4`
(overview, street level, toward Tuileries, toward La Madeleine). Light/dark themes follow the OS
color scheme (dusk sky in dark). A message is shown if WebGL is unavailable.

## Shared contract

- Units are meters, Y up. World origin = the Luxor Obelisk base.
- +X = east (Tuileries Garden), -X = west (Champs-Élysées), -Z = north (rue Royale / La Madeleine), +Z = south (Seine / Assemblée Nationale).
- `src/landmarks/index.ts` exports `createLandmarks(): THREE.Group` (obelisk, fountains, plaza details).
- `src/surroundings/index.ts` exports `createSurroundings(): THREE.Group` (Hôtel de la Marine and Hôtel de Crillon, Seine edge, statues, lamps, trees, avenue edges, distant Arc de Triomphe/Madeleine).
- `src/main.ts` loads both optionally via `import.meta.glob`, so the app runs without them.
- The shell owns everything else (camera, sky, lighting, ground plane, HUD, themes).
