import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export type TimeOfDay = 'day' | 'dusk';

interface Preset {
  skyTop: number;
  skyHorizon: number;
  fog: number;
  fogDensity: number;
  sun: number;
  sunIntensity: number;
  sunPosition: [number, number, number];
  hemiSky: number;
  hemiGround: number;
  hemiIntensity: number;
  exposure: number;
}

export const PRESETS: Record<TimeOfDay, Preset> = {
  day: {
    skyTop: 0x4a86c5,
    skyHorizon: 0xcfe3f2,
    fog: 0xcfe3f2,
    fogDensity: 0.0009,
    sun: 0xfff1d6,
    sunIntensity: 2.6,
    sunPosition: [220, 300, 160],
    hemiSky: 0xbcd6f0,
    hemiGround: 0x8a8576,
    hemiIntensity: 0.9,
    exposure: 1.0,
  },
  dusk: {
    skyTop: 0x1d2a52,
    skyHorizon: 0xf2a27a,
    fog: 0x8a6f7c,
    fogDensity: 0.0014,
    sun: 0xff9a5c,
    sunIntensity: 1.5,
    sunPosition: [-320, 70, 240],
    hemiSky: 0x5a6a9a,
    hemiGround: 0x3a3340,
    hemiIntensity: 0.55,
    exposure: 0.85,
  },
};

const SKY_RADIUS = 2500;

interface EnvironmentState {
  sky: THREE.Mesh;
  sun: THREE.DirectionalLight;
  hemi: THREE.HemisphereLight;
  renderer: THREE.WebGLRenderer;
  mode: TimeOfDay;
}

const states = new WeakMap<THREE.Scene, EnvironmentState>();

/** Initial mode follows the OS color scheme: light -> day, dark -> dusk. */
export function preferredTimeOfDay(): TimeOfDay {
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dusk' : 'day';
  }
  return 'day';
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function createSky(): THREE.Mesh {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      topColor: { value: new THREE.Color() },
      horizonColor: { value: new THREE.Color() },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 topColor;
      uniform vec3 horizonColor;
      varying vec3 vDir;
      void main() {
        float t = pow(clamp(vDir.y, 0.0, 1.0), 0.6);
        gl_FragColor = vec4(mix(horizonColor, topColor, t), 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(SKY_RADIUS, 32, 16), material);
  mesh.name = 'sky';
  mesh.renderOrder = -1;
  mesh.frustumCulled = false;
  return mesh;
}

export function getTimeOfDay(scene: THREE.Scene): TimeOfDay {
  return states.get(scene)?.mode ?? preferredTimeOfDay();
}

/** Switch lighting/sky/fog preset. No-op if setupEnvironment has not run. */
export function setTimeOfDay(scene: THREE.Scene, mode: TimeOfDay): void {
  const state = states.get(scene);
  if (!state) return;
  const p = PRESETS[mode];
  state.mode = mode;

  const uniforms = (state.sky.material as THREE.ShaderMaterial).uniforms;
  uniforms.topColor.value.set(p.skyTop);
  uniforms.horizonColor.value.set(p.skyHorizon);

  scene.background = new THREE.Color(p.skyHorizon);
  if (scene.fog instanceof THREE.FogExp2) {
    scene.fog.color.set(p.fog);
    scene.fog.density = p.fogDensity;
  }

  state.sun.color.set(p.sun);
  state.sun.intensity = p.sunIntensity;
  state.sun.position.set(...p.sunPosition);
  state.hemi.color.set(p.hemiSky);
  state.hemi.groundColor.set(p.hemiGround);
  state.hemi.intensity = p.hemiIntensity;
  state.renderer.toneMappingExposure = p.exposure;
}

export function toggleTimeOfDay(scene: THREE.Scene): TimeOfDay {
  const next: TimeOfDay = getTimeOfDay(scene) === 'day' ? 'dusk' : 'day';
  setTimeOfDay(scene, next);
  return next;
}

export function setupEnvironment(scene: THREE.Scene, renderer: THREE.WebGLRenderer): void {
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const existing = states.get(scene);
  if (existing) {
    scene.remove(existing.sky, existing.sun, existing.sun.target, existing.hemi);
  }

  const sky = createSky();
  const hemi = new THREE.HemisphereLight(0xffffff, 0x888888, 1);
  hemi.name = 'hemisphere';

  const sun = new THREE.DirectionalLight(0xffffff, 1);
  sun.name = 'sun';
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const cam = sun.shadow.camera;
  cam.left = -260;
  cam.right = 260;
  cam.top = 260;
  cam.bottom = -260;
  cam.near = 10;
  cam.far = 1200;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.5;
  sun.target.position.set(0, 0, 0);

  scene.fog = new THREE.FogExp2(0xffffff, 0.001);
  scene.add(sky, hemi, sun, sun.target);

  states.set(scene, { sky, sun, hemi, renderer, mode: preferredTimeOfDay() });
  setTimeOfDay(scene, states.get(scene)!.mode);
}

/** Default framing: ~45 m from the obelisk (origin), on the Champs-Élysées (west) side. */
export const DEFAULT_CAMERA_POSITION = new THREE.Vector3(-55, 22, 0);
export const DEFAULT_TARGET = new THREE.Vector3(0, 11, 0);

export function setupControls(
  camera: THREE.PerspectiveCamera,
  dom: HTMLElement,
): { update(): void } {
  camera.position.copy(DEFAULT_CAMERA_POSITION);
  camera.near = 0.5;
  camera.far = 4000;
  camera.updateProjectionMatrix();

  const controls = new OrbitControls(camera, dom);
  controls.target.copy(DEFAULT_TARGET);
  controls.enableDamping = !prefersReducedMotion();
  controls.dampingFactor = 0.08;
  controls.minDistance = 8;
  controls.maxDistance = 450;
  controls.minPolarAngle = 0.05;
  controls.maxPolarAngle = Math.PI / 2 - 0.03; // keep camera above ground
  controls.enablePan = true;
  controls.screenSpacePanning = false;
  controls.rotateSpeed = 0.6;
  controls.zoomSpeed = 0.8;
  controls.panSpeed = 0.7;
  controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
  dom.style.touchAction = 'none'; // let OrbitControls own touch gestures on mobile

  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change', (e) => {
      controls.enableDamping = !e.matches;
    });
  }

  controls.update();
  return { update: () => void controls.update() };
}
