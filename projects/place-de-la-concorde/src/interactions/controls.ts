import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

interface Preset {
  id: string;
  label: string;
  description: string;
  position: THREE.Vector3;
  target: THREE.Vector3;
}

// Each camera sits at or above its target height, so with the polar clamp
// below the camera always stays above the ground.
const PRESETS: Preset[] = [
  {
    id: 'overview',
    label: 'Overview',
    description: 'Overview of the whole square from the south',
    position: new THREE.Vector3(0, 75, 190),
    target: new THREE.Vector3(0, 0, -15),
  },
  {
    id: 'obelisk',
    label: 'Luxor Obelisk',
    description: 'Luxor Obelisk at the centre of the square',
    position: new THREE.Vector3(26, 22, 28),
    target: new THREE.Vector3(0, 18, 0),
  },
  {
    id: 'north-fountain',
    label: 'North Fountain',
    description: 'North fountain',
    position: new THREE.Vector3(24, 10, -28),
    target: new THREE.Vector3(0, 4, -55),
  },
  {
    id: 'south-fountain',
    label: 'South Fountain',
    description: 'South fountain',
    position: new THREE.Vector3(-24, 10, 82),
    target: new THREE.Vector3(0, 4, 55),
  },
  {
    id: 'crillon',
    label: 'Hôtel de Crillon',
    description: 'Hôtel de Crillon on the north side of the square',
    position: new THREE.Vector3(30, 14, -66),
    target: new THREE.Vector3(45, 12, -115),
  },
];

const OVERVIEW = PRESETS[0];
const TWEEN_SECONDS = 1.6;
const MIN_DISTANCE = 8;
const MAX_DISTANCE = 320;
const MAX_POLAR = Math.PI / 2 - 0.04;
const PAN_LIMIT = { x: 95, z: 120, minY: 0, maxY: 45 };
const ORBIT_STEP = THREE.MathUtils.degToRad(5);
const ZOOM_FACTOR = 1.15;

const easeInOut = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
}

function make<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function createControls(
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer,
): { update: (delta: number) => void; dispose: () => void } {
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = MIN_DISTANCE;
  controls.maxDistance = MAX_DISTANCE;
  controls.minPolarAngle = 0.05;
  controls.maxPolarAngle = MAX_POLAR;
  controls.screenSpacePanning = false;

  const canvas = renderer.domElement;
  if (!canvas.hasAttribute('tabindex')) canvas.tabIndex = 0;
  canvas.setAttribute('role', 'application');
  canvas.setAttribute(
    'aria-label',
    'Interactive 3D model of Place de la Concorde. Arrow keys orbit, plus and minus zoom.',
  );

  // ---- State -------------------------------------------------------------
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reduced = motionQuery.matches;
  let activeId: string | null = OVERVIEW.id;
  let tween: {
    t: number;
    fromPos: THREE.Vector3;
    fromTarget: THREE.Vector3;
    toPos: THREE.Vector3;
    toTarget: THREE.Vector3;
  } | null = null;
  const tmp = new THREE.Vector3();
  const spherical = new THREE.Spherical();

  camera.position.copy(OVERVIEW.position);
  controls.target.copy(OVERVIEW.target);
  controls.update();

  // ---- DOM ---------------------------------------------------------------
  const root = make('div', 'pdc-ui');
  const panel = make('section', 'pdc-panel');
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-label', 'Place de la Concorde viewer');

  const header = make('div', 'pdc-header');
  const titleWrap = make('div', 'pdc-titles');
  titleWrap.append(
    make('h1', 'pdc-title', 'Place de la Concorde'),
    make('p', 'pdc-note', 'Paris · an artistic approximation, not a survey'),
  );
  const collapseBtn = make('button', 'pdc-btn pdc-collapse');
  collapseBtn.type = 'button';
  header.append(titleWrap, collapseBtn);

  const body = make('div', 'pdc-body');
  body.id = 'pdc-body';
  collapseBtn.setAttribute('aria-controls', body.id);

  const nav = make('nav', 'pdc-nav');
  nav.setAttribute('aria-label', 'Viewpoints');
  const list = make('div', 'pdc-presets');
  const presetButtons = new Map<string, HTMLButtonElement>();
  PRESETS.forEach((preset, i) => {
    const b = make('button', 'pdc-btn pdc-preset');
    b.type = 'button';
    b.dataset.preset = preset.id;
    b.setAttribute('aria-pressed', 'false');
    b.setAttribute('aria-keyshortcuts', String(i + 1));
    const key = make('span', 'pdc-key', String(i + 1));
    key.setAttribute('aria-hidden', 'true');
    b.append(key, make('span', 'pdc-label', preset.label));
    b.addEventListener('click', () => goTo(preset));
    presetButtons.set(preset.id, b);
    list.append(b);
  });
  nav.append(make('h2', 'pdc-heading', 'Viewpoints'), list);

  const actions = make('div', 'pdc-actions');
  const resetBtn = make('button', 'pdc-btn pdc-reset', 'Reset view');
  resetBtn.type = 'button';
  resetBtn.setAttribute('aria-keyshortcuts', 'R Home');
  const helpBtn = make('button', 'pdc-btn pdc-help-toggle', 'Controls help');
  helpBtn.type = 'button';
  helpBtn.setAttribute('aria-expanded', 'false');
  helpBtn.setAttribute('aria-controls', 'pdc-help');
  actions.append(resetBtn, helpBtn);

  const help = make('div', 'pdc-help');
  help.id = 'pdc-help';
  help.setAttribute('role', 'region');
  help.setAttribute('aria-label', 'Controls help');
  help.hidden = true;
  const helpList = make('ul', 'pdc-help-list');
  [
    'Mouse: drag to orbit, right-drag to pan, scroll to zoom.',
    'Touch: drag to orbit, two fingers to pan and pinch to zoom.',
    'Keyboard: arrow keys orbit, Shift + arrows pan, + / − or PageUp / PageDown zoom.',
    `Number keys 1–${PRESETS.length} jump to a viewpoint; R or Home resets; Esc closes this help.`,
  ].forEach((t) => helpList.append(make('li', undefined, t)));
  help.append(helpList);

  const status = make('p', 'pdc-status');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.setAttribute('aria-atomic', 'true');

  body.append(nav, actions, help, status);
  panel.append(header, body);
  root.append(panel);
  document.body.append(root);

  // ---- Behaviour ---------------------------------------------------------
  function markActive(id: string | null): void {
    activeId = id;
    presetButtons.forEach((b, key) => {
      const on = key === id;
      b.setAttribute('aria-pressed', String(on));
      if (on) b.setAttribute('aria-current', 'true');
      else b.removeAttribute('aria-current');
    });
  }

  function finishTween(): void {
    if (!tween) return;
    camera.position.copy(tween.toPos);
    controls.target.copy(tween.toTarget);
    tween = null;
    controls.update();
  }

  function applyReduced(value: boolean): void {
    reduced = value;
    controls.enableDamping = !value;
    if (value) finishTween();
  }

  function goTo(preset: Preset): void {
    markActive(preset.id);
    status.textContent = `Viewpoint: ${preset.label}. ${preset.description}.`;
    tween = {
      t: 0,
      fromPos: camera.position.clone(),
      fromTarget: controls.target.clone(),
      toPos: preset.position.clone(),
      toTarget: preset.target.clone(),
    };
    if (reduced) finishTween();
  }

  // Manual navigation cancels any running animation and the active preset.
  function userMoved(): void {
    tween = null;
    if (activeId !== null) {
      markActive(null);
      status.textContent = 'Free camera.';
    }
  }

  function clampPan(): void {
    const t = controls.target;
    tmp.set(
      THREE.MathUtils.clamp(t.x, -PAN_LIMIT.x, PAN_LIMIT.x) - t.x,
      THREE.MathUtils.clamp(t.y, PAN_LIMIT.minY, PAN_LIMIT.maxY) - t.y,
      THREE.MathUtils.clamp(t.z, -PAN_LIMIT.z, PAN_LIMIT.z) - t.z,
    );
    if (tmp.lengthSq() > 0) {
      t.add(tmp);
      camera.position.add(tmp);
    }
  }

  function orbitBy(dTheta: number, dPhi: number): void {
    tmp.copy(camera.position).sub(controls.target);
    spherical.setFromVector3(tmp);
    spherical.theta += dTheta;
    spherical.phi = THREE.MathUtils.clamp(
      spherical.phi + dPhi,
      controls.minPolarAngle,
      controls.maxPolarAngle,
    );
    tmp.setFromSpherical(spherical);
    camera.position.copy(controls.target).add(tmp);
  }

  function zoomBy(factor: number): void {
    tmp.copy(camera.position).sub(controls.target);
    tmp.setLength(THREE.MathUtils.clamp(tmp.length() * factor, MIN_DISTANCE, MAX_DISTANCE));
    camera.position.copy(controls.target).add(tmp);
  }

  function panBy(right: number, forward: number): void {
    const step = Math.max(2, camera.position.distanceTo(controls.target) * 0.06);
    const fwd = new THREE.Vector3();
    camera.getWorldDirection(fwd);
    fwd.y = 0;
    if (fwd.lengthSq() < 1e-6) fwd.set(0, 0, -1);
    fwd.normalize();
    const side = new THREE.Vector3().crossVectors(fwd, camera.up).normalize();
    const move = side.multiplyScalar(right * step).addScaledVector(fwd, forward * step);
    controls.target.add(move);
    camera.position.add(move);
    clampPan();
  }

  function setHelp(open: boolean): void {
    help.hidden = !open;
    helpBtn.setAttribute('aria-expanded', String(open));
  }

  function setCollapsed(collapsed: boolean): void {
    body.hidden = collapsed;
    panel.classList.toggle('is-collapsed', collapsed);
    collapseBtn.setAttribute('aria-expanded', String(!collapsed));
    collapseBtn.textContent = collapsed ? 'Show guide' : 'Hide guide';
  }
  setCollapsed(window.matchMedia('(max-width: 640px)').matches);

  const onCollapse = (): void => setCollapsed(!body.hidden);
  const onReset = (): void => goTo(OVERVIEW);
  const onHelp = (): void => setHelp(helpBtn.getAttribute('aria-expanded') !== 'true');
  collapseBtn.addEventListener('click', onCollapse);
  resetBtn.addEventListener('click', onReset);
  helpBtn.addEventListener('click', onHelp);

  const arrows: Record<string, [number, number]> = {
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
    ArrowUp: [0, 1],
    ArrowDown: [0, -1],
  };

  const onKeyDown = (e: KeyboardEvent): void => {
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
    if (isEditable(e.target)) return;
    const k = e.key;

    if (k === 'Escape') {
      if (!help.hidden) {
        setHelp(false);
        e.preventDefault();
      }
    } else if (/^[1-9]$/.test(k)) {
      const preset = PRESETS[Number(k) - 1];
      if (preset) {
        goTo(preset);
        e.preventDefault();
      }
    } else if (k === 'r' || k === 'R' || k === 'Home') {
      goTo(OVERVIEW);
      e.preventDefault();
    } else if (k === '+' || k === '=' || k === 'PageUp') {
      userMoved();
      zoomBy(1 / ZOOM_FACTOR);
      e.preventDefault();
    } else if (k === '-' || k === '_' || k === 'PageDown') {
      userMoved();
      zoomBy(ZOOM_FACTOR);
      e.preventDefault();
    } else if (arrows[k]) {
      const [x, y] = arrows[k];
      e.preventDefault();
      userMoved();
      if (e.shiftKey) panBy(x, y);
      else orbitBy(-x * ORBIT_STEP, -y * ORBIT_STEP);
    }
  };
  window.addEventListener('keydown', onKeyDown);

  const onMotionChange = (e: MediaQueryListEvent): void => applyReduced(e.matches);
  motionQuery.addEventListener('change', onMotionChange);
  applyReduced(reduced);
  markActive(OVERVIEW.id);
  status.textContent = `Viewpoint: ${OVERVIEW.label}. ${OVERVIEW.description}.`;

  // OrbitControls fires 'start' on pointer, wheel and touch interaction.
  controls.addEventListener('start', userMoved);

  // ---- Frame update ------------------------------------------------------
  function update(delta: number): void {
    if (tween) {
      tween.t = Math.min(1, tween.t + delta / TWEEN_SECONDS);
      const k = easeInOut(tween.t);
      camera.position.lerpVectors(tween.fromPos, tween.toPos, k);
      controls.target.lerpVectors(tween.fromTarget, tween.toTarget, k);
      if (tween.t >= 1) tween = null;
    }
    controls.update();
    clampPan();
  }

  function dispose(): void {
    window.removeEventListener('keydown', onKeyDown);
    motionQuery.removeEventListener('change', onMotionChange);
    collapseBtn.removeEventListener('click', onCollapse);
    resetBtn.removeEventListener('click', onReset);
    helpBtn.removeEventListener('click', onHelp);
    controls.removeEventListener('start', userMoved);
    controls.dispose();
    root.remove();
    tween = null;
  }

  return { update, dispose };
}
