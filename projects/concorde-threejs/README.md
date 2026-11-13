# Concorde — Three.js

A static, stylized 3D model of Place de la Concorde (Paris) built with Three.js,
Vite and TypeScript. It uses fictional, public-safe geometry only: no external
assets, APIs, authentication or private data.

## Commands

Use Node.js 24 and npm. Dependencies are isolated from other projects.

```sh
npm ci
npm run dev
npm test
npm run lint
npm run build
```

The Vite base is `/example-projects/concorde-threejs/`. Pages publishes only
the built `dist/`.

## Layout

- `src/main.ts` – renderer, camera, resize and render loop
- `src/scene/index.ts` – `buildConcorde(scene)` composes the parts
- `src/scene/plaza.ts`, `obelisk.ts`, `environment.ts` – scene modules
