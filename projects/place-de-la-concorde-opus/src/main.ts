import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createScene } from './scene';
import { createControls } from './controls';
import './style.css';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('The scene mount #app is missing.');

function showError(error: unknown): void {
  console.error('Place de la Concorde could not render:', error);
  const message = document.createElement('section');
  message.className = 'pc-error';
  message.setAttribute('role', 'alert');
  const title = document.createElement('h1');
  title.textContent = 'The 3D scene could not load';
  const detail = document.createElement('p');
  detail.textContent = 'WebGL 2 is required. Enable hardware acceleration or try a current browser, then reload.';
  const reload = document.createElement('button');
  reload.textContent = 'Reload scene';
  reload.addEventListener('click', () => window.location.reload());
  message.append(title, detail, reload);
  app!.replaceChildren(message);
}

function startScene(mount: HTMLDivElement): () => void {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  let world: ReturnType<typeof createScene> | undefined;
  let controls: ReturnType<typeof createControls> | undefined;
  let environment: THREE.WebGLRenderTarget | undefined;
  let frame = 0;
  let disposed = false;
  let needsRender = true;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const invalidate = () => { needsRender = true; };
  const lastPosition = new THREE.Vector3();
  const lastRotation = new THREE.Quaternion();
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frame);
    window.removeEventListener('resize', resize);
    reducedMotion.removeEventListener('change', invalidate);
    renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
    controls?.dispose();
    world?.dispose();
    environment?.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  };
  const resize = () => {
    if (!world) return;
    const width = mount.clientWidth;
    const height = mount.clientHeight;
    world.camera.aspect = width / Math.max(height, 1);
    world.camera.fov = width < height ? 64 : 45;
    world.camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setSize(width, height, false);
    needsRender = true;
  };
  const onContextLost = (event: Event) => {
    event.preventDefault();
    dispose();
    showError(new Error('WebGL context was lost.'));
  };
  try {
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // Only the water moves, and it casts no shadows.
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = true;
    renderer.domElement.dataset.testid = 'scene-canvas';
    renderer.domElement.setAttribute('aria-label', 'Interactive 3D view of Place de la Concorde');
    mount.append(renderer.domElement);
    world = createScene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    try {
      environment = pmrem.fromScene(room, 0.04);
      world.scene.environment = environment.texture;
      world.scene.environmentIntensity = 0.45;
    } finally {
      room.dispose();
      pmrem.dispose();
    }
    resize();
    controls = createControls({ camera: world.camera, renderer, scene: world.scene });
    window.addEventListener('resize', resize);
    reducedMotion.addEventListener('change', invalidate);
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    let previous = performance.now();
    let elapsed = 0;
    const render = (now: number) => {
      if (disposed || !world || !controls) return;
      try {
        const delta = Math.min(Math.max((now - previous) / 1000, 0), 0.1);
        previous = now;
        elapsed += delta;
        controls.update(delta);
        world.update(delta, elapsed);
        const cameraChanged = lastPosition.distanceToSquared(world.camera.position) > 1e-12
          || 1 - Math.abs(lastRotation.dot(world.camera.quaternion)) > 1e-12;
        if (needsRender || cameraChanged || !reducedMotion.matches) {
          renderer.render(world.scene, world.camera);
          lastPosition.copy(world.camera.position);
          lastRotation.copy(world.camera.quaternion);
          needsRender = false;
          renderer.domElement.dataset.ready = 'true';
        }
        frame = requestAnimationFrame(render);
      } catch (error) {
        dispose();
        showError(error);
      }
    };
    frame = requestAnimationFrame(render);
    return dispose;
  } catch (error) {
    dispose();
    throw error;
  }
}

try {
  const dispose = startScene(app);
  window.addEventListener('pagehide', (event) => {
    if (!event.persisted) dispose();
  });
  if (import.meta.hot) import.meta.hot.dispose(dispose);
} catch (error) {
  showError(error);
}
