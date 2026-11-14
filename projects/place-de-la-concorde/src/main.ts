import * as THREE from 'three';
import './style.css';
import { createScene } from './core/scene';
import { createObelisk } from './models/obelisk';
import { createFountains } from './models/fountains';
import { createGround } from './models/ground';
import { createBuildings } from './models/buildings';
import { createStreetFurniture } from './models/streetFurniture';
import { createControls } from './interactions/controls';

const MAX_PIXEL_RATIO = 2;
const MAX_DELTA = 0.1;

function showError(host: HTMLElement, message: string): HTMLElement {
  const box = document.createElement('div');
  box.className = 'scene-error';
  box.setAttribute('role', 'alert');
  box.style.cssText =
    'position:absolute;inset:0;display:grid;place-content:center;padding:2rem;text-align:center;' +
    'font:1rem/1.5 system-ui,sans-serif;background:#f6efe2;color:#2b2118;';
  const title = document.createElement('h1');
  title.textContent = 'The 3D scene could not be shown';
  title.style.cssText = 'font-size:1.25rem;margin:0 0 .5rem;';
  const body = document.createElement('p');
  body.textContent = message;
  body.style.margin = '0';
  box.append(title, body);
  host.append(box);
  return box;
}

function disposeObject(root: THREE.Object3D): void {
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    mesh.geometry?.dispose();
    const materials = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
    for (const material of materials) {
      for (const value of Object.values(material)) {
        if (value instanceof THREE.Texture) value.dispose();
      }
      material.dispose();
    }
  });
}

function start(host: HTMLElement): () => void {
  let bundle: ReturnType<typeof createScene>;
  try {
    bundle = createScene();
  } catch (error) {
    console.error(error);
    const box = showError(
      host,
      'WebGL is unavailable in this browser or on this device. Try enabling hardware acceleration or using a current browser.',
    );
    return () => box.remove();
  }
  const { scene, camera, renderer } = bundle;
  const canvas = renderer.domElement;
  host.append(canvas);

  let fountains: ReturnType<typeof createFountains>;
  let controls: ReturnType<typeof createControls>;
  try {
    fountains = createFountains();
    scene.add(
      createGround(),
      createBuildings(),
      createStreetFurniture(),
      createObelisk(),
      fountains.group,
    );
    controls = createControls(camera, renderer);
  } catch (error) {
    console.error(error);
    disposeObject(scene);
    renderer.dispose();
    canvas.remove();
    const box = showError(host, 'Something went wrong while building the scene. Please reload the page.');
    return () => box.remove();
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const timer = new THREE.Timer();
  let elapsed = 0;
  let frame = 0;
  let running = true;
  let errorBox: HTMLElement | null = null;

  const resize = (): void => {
    const width = Math.max(1, window.innerWidth);
    const height = Math.max(1, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };

  const loop = (timestamp: number): void => {
    if (!running) return;
    frame = requestAnimationFrame(loop);
    timer.update(timestamp);
    const delta = Math.min(timer.getDelta(), MAX_DELTA);
    // Reduced motion holds the water at a fixed time instead of advancing it.
    if (!reducedMotion.matches) elapsed += delta;
    controls.update(delta);
    fountains.update(elapsed);
    renderer.render(scene, camera);
  };

  const onContextLost = (event: Event): void => {
    event.preventDefault();
    running = false;
    cancelAnimationFrame(frame);
    errorBox ??= showError(
      host,
      'The WebGL context was lost, so the 3D scene stopped. It will resume automatically if the browser restores it; otherwise reload the page.',
    );
  };

  const onContextRestored = (): void => {
    errorBox?.remove();
    errorBox = null;
    if (running) return;
    running = true;
    timer.update(performance.now());
    frame = requestAnimationFrame(loop);
  };

  window.addEventListener('resize', resize);
  canvas.addEventListener('webglcontextlost', onContextLost);
  canvas.addEventListener('webglcontextrestored', onContextRestored);
  resize();
  frame = requestAnimationFrame(loop);

  return () => {
    running = false;
    cancelAnimationFrame(frame);
    window.removeEventListener('resize', resize);
    canvas.removeEventListener('webglcontextlost', onContextLost);
    canvas.removeEventListener('webglcontextrestored', onContextRestored);
    controls.dispose();
    timer.dispose();
    disposeObject(scene);
    scene.clear();
    renderer.dispose();
    canvas.remove();
    errorBox?.remove();
  };
}

const host = document.querySelector<HTMLElement>('#app');
if (!host) {
  throw new Error('Missing #app element');
}

let stop: (() => void) | null = start(host);
const teardown = (): void => {
  stop?.();
  stop = null;
};

window.addEventListener('pagehide', (event) => {
  if (!event.persisted) teardown();
});
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    teardown();
  });
}
