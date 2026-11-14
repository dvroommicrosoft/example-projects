import * as THREE from 'three';

export interface SceneBundle {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
}

const MAX_PIXEL_RATIO = 2;
const HORIZON_COLOR = 0xf3e6cf;

// Landmarks to keep in frame: obelisk (0,0,0), fountains (0,0,±55), Crillon (z≈-115).
const FRAME_TARGET = new THREE.Vector3(0, 12, -35);
const FRAME_DIRECTION = new THREE.Vector3(0.55, 0.42, 1).normalize();

export class WebGLUnavailableError extends Error {
  constructor() {
    super('WebGL is not available in this browser or on this device.');
    this.name = 'WebGLUnavailableError';
  }
}

function createSkyTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 2;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const gradient = ctx.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, '#6fa8dc');
    gradient.addColorStop(0.55, '#bcd8ee');
    gradient.addColorStop(1, '#f3e6cf');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 256);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function addLighting(scene: THREE.Scene): void {
  const hemisphere = new THREE.HemisphereLight(0xcfe4ff, 0xb59b78, 0.85);
  hemisphere.name = 'sky-fill-light';
  scene.add(hemisphere);

  const sun = new THREE.DirectionalLight(0xffe2b0, 2.6);
  sun.name = 'sun-light';
  sun.position.set(-90, 130, 80);
  sun.target.position.set(0, 0, -20);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -150;
  sun.shadow.camera.right = 150;
  sun.shadow.camera.top = 150;
  sun.shadow.camera.bottom = -150;
  sun.shadow.camera.near = 20;
  sun.shadow.camera.far = 400;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.5;
  scene.add(sun, sun.target);
}

/** Places the camera so the key landmarks fit for the given aspect ratio. */
export function frameCamera(camera: THREE.PerspectiveCamera): void {
  const aspect = camera.aspect;
  // Portrait/narrow viewports need to pull back so the wide square still fits.
  const distance = aspect >= 1.6 ? 190 : aspect >= 1 ? 190 + (1.6 - aspect) * 90 : 250 + (1 - aspect) * 220;
  camera.position.copy(FRAME_TARGET).addScaledVector(FRAME_DIRECTION, distance);
  camera.lookAt(FRAME_TARGET);
}

export function createScene(): SceneBundle {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  } catch {
    throw new WebGLUnavailableError();
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.setAttribute('role', 'img');
  renderer.domElement.setAttribute(
    'aria-label',
    'Interactive 3D artistic approximation of Place de la Concorde with the obelisk, two fountains and the northern Hotel de Crillon facade.',
  );
  renderer.domElement.tabIndex = 0;

  const scene = new THREE.Scene();
  scene.name = 'place-de-la-concorde';
  scene.background = createSkyTexture();
  scene.fog = new THREE.Fog(HORIZON_COLOR, 320, 760);
  addLighting(scene);

  const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 1, 1500);
  frameCamera(camera);

  return { scene, camera, renderer };
}
