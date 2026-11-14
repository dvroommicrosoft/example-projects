import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export interface ControlsOptions {
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
}

export interface SceneControls {
  update(deltaSeconds: number): void;
  dispose(): void;
}

interface Pose {
  position: THREE.Vector3;
  target: THREE.Vector3;
}

interface Landmark {
  id: string;
  label: string;
  title: string;
  text: string;
  pose: Pose;
}

const MIN_DISTANCE = 8;
const MAX_DISTANCE = 280;
const MAX_TARGET_RADIUS = 140;
const TRANSITION_SECONDS = 1.6;

const pose = (p: [number, number, number], t: [number, number, number]): Pose => ({
  position: new THREE.Vector3(...p),
  target: new THREE.Vector3(...t),
});

const LANDMARKS: Landmark[] = [
  {
    id: 'obelisk',
    label: 'Obelisk',
    title: 'Luxor Obelisk',
    text: 'A 3,300-year-old red granite monolith from Luxor, about 23 m tall, crowned with a gilded pyramidion and set on a carved pedestal at the square’s centre.',
    pose: pose([30, 15, 38], [0, 11, 0]),
  },
  {
    id: 'fountains',
    label: 'Fountains',
    title: 'Fontaines de la Concorde',
    text: 'Two bronze and stone fountains stand north and south of the obelisk, with tritons, nereids and tiered basins, each some 42 m from the centre.',
    pose: pose([62, 16, 0], [0, 3, 0]),
  },
  {
    id: 'overview',
    label: 'Grand overview',
    title: 'Place de la Concorde',
    text: 'An artistic reconstruction of the square: obelisk, fountains, lamp posts and the limestone facades to the north, with the Tuileries and Champs-Élysées axis beyond.',
    pose: pose([110, 72, 150], [0, 6, -10]),
  },
];

const easeInOut = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function createControls({ camera, renderer }: ControlsOptions): SceneControls {
  const canvas = renderer.domElement;
  const orbit = new OrbitControls(camera, canvas);
  orbit.enableDamping = true;
  orbit.dampingFactor = 0.07;
  orbit.screenSpacePanning = false;
  orbit.minDistance = MIN_DISTANCE;
  orbit.maxDistance = MAX_DISTANCE;
  orbit.maxPolarAngle = Math.PI * 0.485;
  orbit.zoomSpeed = 0.8;
  orbit.rotateSpeed = 0.6;
  orbit.panSpeed = 0.7;
  orbit.keyPanSpeed = 14;
  if (orbit.target.lengthSq() === 0) orbit.target.set(0, 6, 0);
  orbit.update();

  const home: Pose = { position: camera.position.clone(), target: orbit.target.clone() };

  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reducedMotion = motionQuery.matches;
  const onMotionChange = (event: MediaQueryListEvent): void => {
    reducedMotion = event.matches;
    if (reducedMotion) transition = null;
    orbit.enableDamping = !reducedMotion;
  };
  motionQuery.addEventListener('change', onMotionChange);
  orbit.enableDamping = !reducedMotion;

  // Canvas keyboard support: arrows pan, +/- zoom, R resets.
  const previousTabIndex = canvas.getAttribute('tabindex');
  const previousLabel = canvas.getAttribute('aria-label');
  if (previousTabIndex === null) canvas.setAttribute('tabindex', '0');
  if (previousLabel === null) {
    canvas.setAttribute('aria-label', 'Interactive 3D view of Place de la Concorde');
  }
  orbit.listenToKeyEvents(canvas);

  // --- UI ---------------------------------------------------------------
  const root = document.createElement('section');
  root.className = 'pc-controls';
  root.setAttribute('aria-label', 'Scene controls');

  const toolbar = document.createElement('div');
  toolbar.className = 'pc-toolbar';
  toolbar.setAttribute('role', 'group');
  toolbar.setAttribute('aria-label', 'Camera views');

  const info = document.createElement('div');
  info.className = 'pc-info';
  info.setAttribute('role', 'status');
  info.setAttribute('aria-live', 'polite');
  const infoTitle = document.createElement('h2');
  infoTitle.className = 'pc-info-title';
  const infoText = document.createElement('p');
  infoText.className = 'pc-info-text';
  info.append(infoTitle, infoText);

  const hint = document.createElement('p');
  hint.className = 'pc-hint';
  hint.textContent =
    'Drag to orbit · scroll or pinch to zoom · right-drag or two fingers to pan · arrow keys, + / − and R on the view';

  const buttons = new Map<string, HTMLButtonElement>();
  const makeButton = (id: string, label: string, extraClass = ''): HTMLButtonElement => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `pc-button ${extraClass}`.trim();
    b.textContent = label;
    b.dataset.view = id;
    buttons.set(id, b);
    return b;
  };

  const resetButton = makeButton('reset', 'Reset view', 'pc-button-reset');
  toolbar.append(resetButton);
  for (const lm of LANDMARKS) toolbar.append(makeButton(lm.id, lm.label));

  root.append(toolbar, info, hint);
  (canvas.parentElement ?? document.body).append(root);

  const setInfo = (title: string, text: string, activeId: string | null): void => {
    infoTitle.textContent = title;
    infoText.textContent = text;
    for (const [id, b] of buttons) {
      if (id === 'reset') continue;
      b.setAttribute('aria-pressed', String(id === activeId));
    }
  };
  setInfo(
    'Place de la Concorde',
    'Choose a landmark below, or explore freely. Warm daylight, limestone facades, bronze and gold.',
    null,
  );

  // --- Transitions ------------------------------------------------------
  interface Transition {
    fromPos: THREE.Vector3;
    fromTarget: THREE.Vector3;
    to: Pose;
    elapsed: number;
  }
  let transition: Transition | null = null;
  const tmpPos = new THREE.Vector3();
  const tmpTarget = new THREE.Vector3();

  const goTo = (to: Pose): void => {
    if (reducedMotion) {
      transition = null;
      camera.position.copy(to.position);
      orbit.target.copy(to.target);
      orbit.update();
      return;
    }
    transition = {
      fromPos: camera.position.clone(),
      fromTarget: orbit.target.clone(),
      to,
      elapsed: 0,
    };
  };

  const cancelTransition = (): void => {
    transition = null;
  };

  const onUserStart = (): void => {
    cancelTransition();
  };
  orbit.addEventListener('start', onUserStart);

  const onToolbarClick = (event: Event): void => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-view]');
    if (!button) return;
    const id = button.dataset.view;
    if (id === 'reset') {
      goTo(home);
      setInfo('Place de la Concorde', 'View reset to the opening composition.', null);
      return;
    }
    const lm = LANDMARKS.find((l) => l.id === id);
    if (!lm) return;
    goTo(lm.pose);
    setInfo(lm.title, lm.text, lm.id);
  };
  toolbar.addEventListener('click', onToolbarClick);

  const onCanvasKey = (event: KeyboardEvent): void => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    switch (event.key) {
      case '+':
      case '=':
      case '-':
      case '_': {
        cancelTransition();
        const zoomIn = event.key === '+' || event.key === '=';
        const offset = tmpPos.copy(camera.position).sub(orbit.target);
        const dist = THREE.MathUtils.clamp(
          offset.length() * (zoomIn ? 0.85 : 1 / 0.85),
          MIN_DISTANCE,
          MAX_DISTANCE,
        );
        camera.position.copy(orbit.target).add(offset.setLength(dist));
        orbit.update();
        event.preventDefault();
        break;
      }
      case 'r':
      case 'R':
        resetButton.click();
        event.preventDefault();
        break;
      case 'ArrowUp':
      case 'ArrowDown':
      case 'ArrowLeft':
      case 'ArrowRight':
      case 'PageUp':
      case 'PageDown':
        cancelTransition();
        event.preventDefault();
        break;
    }
  };
  canvas.addEventListener('keydown', onCanvasKey);

  return {
    update(deltaSeconds: number): void {
      const dt = Math.min(Math.max(deltaSeconds, 0), 0.1);
      if (transition) {
        transition.elapsed += dt;
        const t = Math.min(transition.elapsed / TRANSITION_SECONDS, 1);
        const k = easeInOut(t);
        tmpPos.lerpVectors(transition.fromPos, transition.to.position, k);
        tmpTarget.lerpVectors(transition.fromTarget, transition.to.target, k);
        camera.position.copy(tmpPos);
        orbit.target.copy(tmpTarget);
        if (t >= 1) transition = null;
      }
      // Keep panning inside the square so the user cannot drift away.
      const radial = Math.hypot(orbit.target.x, orbit.target.z);
      if (radial > MAX_TARGET_RADIUS) {
        const s = MAX_TARGET_RADIUS / radial;
        orbit.target.x *= s;
        orbit.target.z *= s;
      }
      orbit.target.y = THREE.MathUtils.clamp(orbit.target.y, 0, 40);
      orbit.update();
    },

    dispose(): void {
      toolbar.removeEventListener('click', onToolbarClick);
      canvas.removeEventListener('keydown', onCanvasKey);
      orbit.removeEventListener('start', onUserStart);
      motionQuery.removeEventListener('change', onMotionChange);
      orbit.stopListenToKeyEvents();
      orbit.dispose();
      if (previousTabIndex === null) canvas.removeAttribute('tabindex');
      if (previousLabel === null) canvas.removeAttribute('aria-label');
      root.remove();
      buttons.clear();
      transition = null;
    },
  };
}
