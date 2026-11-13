import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { VIEWPOINTS, findViewpoint, viewpointForKey, type Viewpoint } from './viewpoints';
import { selectTheme, type ThemeSettings } from './theme';
import { webglAvailable } from './webgl';

const app = document.getElementById('app')!;
const message = document.getElementById('message')!;

function showMessage(text: string) {
  message.textContent = text;
  message.classList.add('show');
}

function addOptionalGroups(scene: THREE.Scene) {
  const mods = {
    ...import.meta.glob<{ createLandmarks?: () => THREE.Group }>('./landmarks/index.ts', { eager: true }),
    ...import.meta.glob<{ createSurroundings?: () => THREE.Group }>('./surroundings/index.ts', { eager: true }),
  } as Record<string, { createLandmarks?: () => THREE.Group; createSurroundings?: () => THREE.Group }>;
  for (const mod of Object.values(mods)) {
    const group = mod.createLandmarks?.() ?? mod.createSurroundings?.();
    if (group) scene.add(group);
  }
}

function init() {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  app.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 3000);

  // Sky dome with vertical gradient
  const skyUniforms = { top: { value: new THREE.Color() }, horizon: { value: new THREE.Color() } };
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(1500, 32, 16),
    new THREE.ShaderMaterial({
      uniforms: skyUniforms,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      vertexShader: 'varying float h; void main(){ h = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 horizon; varying float h; void main(){ gl_FragColor = vec4(mix(horizon, top, clamp(h*1.6,0.0,1.0)),1.0); }',
    }),
  );
  scene.add(sky);

  const hemi = new THREE.HemisphereLight();
  scene.add(hemi);
  const sun = new THREE.DirectionalLight();
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -200, right: 200, top: 200, bottom: -200, near: 1, far: 800 });
  sun.shadow.bias = -0.0005;
  scene.add(sun);

  const groundMat = new THREE.MeshStandardMaterial({ roughness: 0.95 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  ground.name = 'ground';
  scene.add(ground);

  function applyTheme(t: ThemeSettings) {
    skyUniforms.top.value.setHex(t.skyTop);
    skyUniforms.horizon.value.setHex(t.skyHorizon);
    scene.fog = new THREE.Fog(t.fog, 250, 1100);
    hemi.color.setHex(t.hemiSky);
    hemi.groundColor.setHex(t.hemiGround);
    hemi.intensity = t.hemiIntensity;
    sun.color.setHex(t.sunColor);
    sun.intensity = t.sunIntensity;
    sun.position.set(...t.sunPosition);
    groundMat.color.setHex(t.ground);
  }
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  applyTheme(selectTheme(mq.matches));
  mq.addEventListener('change', (e) => applyTheme(selectTheme(e.matches)));

  addOptionalGroups(scene);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.minDistance = 5;
  controls.maxDistance = 600;
  controls.maxPolarAngle = Math.PI / 2 - 0.02;

  const nav = document.getElementById('views')!;
  const buttons = new Map<string, HTMLButtonElement>();
  let transition: { from: THREE.Vector3; fromT: THREE.Vector3; to: Viewpoint; start: number } | null = null;

  function goTo(vp: Viewpoint, animate = true) {
    for (const [id, b] of buttons) b.setAttribute('aria-pressed', String(id === vp.id));
    if (!animate || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      camera.position.set(...vp.position);
      controls.target.set(...vp.target);
      transition = null;
      return;
    }
    transition = { from: camera.position.clone(), fromT: controls.target.clone(), to: vp, start: performance.now() };
  }

  for (const vp of VIEWPOINTS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = vp.label;
    b.title = `${vp.label} (key ${vp.key})`;
    b.addEventListener('click', () => goTo(vp));
    nav.appendChild(b);
    buttons.set(vp.id, b);
  }
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const vp = viewpointForKey(e.key);
    if (vp) goTo(vp);
  });

  function resize() {
    const w = app.clientWidth || window.innerWidth;
    const h = app.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();
  goTo(findViewpoint('overview'), false);

  renderer.setAnimationLoop((now) => {
    if (transition) {
      const k = Math.min((now - transition.start) / 1200, 1);
      const e = k * k * (3 - 2 * k);
      camera.position.lerpVectors(transition.from, new THREE.Vector3(...transition.to.position), e);
      controls.target.lerpVectors(transition.fromT, new THREE.Vector3(...transition.to.target), e);
      if (k >= 1) transition = null;
    }
    controls.update();
    renderer.render(scene, camera);
  });
}

if (webglAvailable()) {
  try {
    init();
  } catch (err) {
    console.error(err);
    showMessage('Sorry, the 3D scene could not be started in this browser.');
  }
} else {
  showMessage('WebGL is not available in this browser, so the 3D scene of Place de la Concorde cannot be shown.');
}
