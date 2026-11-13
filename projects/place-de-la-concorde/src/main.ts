import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { createConcordeScene, type ConcordeScene } from './scene'
import './styles.css'

const HOME_POSITION = new THREE.Vector3(105, 75, 120)
const HOME_TARGET = new THREE.Vector3(0, 5, 0)
const MIN_DISTANCE = 30
const MAX_DISTANCE = 420
const MIN_POLAR = 0.08
const MAX_POLAR = Math.PI / 2 - 0.04
const PAN_LIMIT = new THREE.Box3(new THREE.Vector3(-110, 0, -130), new THREE.Vector3(110, 60, 130))
const MAX_DPR = 2
const KEY_ROTATE = 0.06
const KEY_PAN = 6
const KEY_ZOOM = 1.12

function must<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id)
  if (!el) throw new Error(`Missing #${id} in index.html`)
  return el as T
}

const canvas = must<HTMLCanvasElement>('scene')
const resetButton = must<HTMLButtonElement>('reset')
const pauseButton = must<HTMLButtonElement>('pause')
const statusEl = must<HTMLElement>('status')
const fallbackEl = must<HTMLElement>('fallback')
const fallbackTitle = must<HTMLElement>('fallback-title')
const fallbackBody = must<HTMLElement>('fallback-body')
const retryButton = must<HTMLButtonElement>('retry')
const help = document.querySelector<HTMLDetailsElement>('.help')

const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
const compactQuery = window.matchMedia('(max-width: 640px)')
if (compactQuery.matches && help) help.open = false

function showFailure(title: string, body: string, canRetry: boolean) {
  fallbackTitle.textContent = title
  fallbackBody.textContent = body
  retryButton.hidden = !canRetry
  fallbackEl.hidden = false
  canvas.dataset.state = 'error'
  for (const b of [resetButton, pauseButton]) b.disabled = true
}

function hideFailure() {
  fallbackEl.hidden = true
  for (const b of [resetButton, pauseButton]) b.disabled = false
}

retryButton.addEventListener('click', () => window.location.reload())

let announceTimer: number | undefined
function announce(message: string) {
  statusEl.textContent = message
  statusEl.hidden = false
  window.clearTimeout(announceTimer)
  announceTimer = window.setTimeout(() => {
    statusEl.hidden = true
  }, 2500)
}

function start() {
  let renderer: THREE.WebGLRenderer
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
  } catch (error) {
    console.error('WebGL initialisation failed', error)
    showFailure(
      'WebGL is unavailable',
      'This 3D view needs WebGL, which your browser or device could not start. Enable hardware acceleration or try a recent version of Chrome, Edge, Firefox or Safari, then reload.',
      true,
    )
    return
  }

  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 0.95

  const haze = new THREE.Color(0xe8c9a0)
  const scene = new THREE.Scene()
  scene.background = haze
  scene.fog = new THREE.Fog(haze, 220, 700)

  const camera = new THREE.PerspectiveCamera(42, 1, 1, 1500)
  camera.position.copy(HOME_POSITION)

  scene.add(new THREE.HemisphereLight(0xcfe0f5, 0x8a6a4a, 0.9))
  const sun = new THREE.DirectionalLight(0xffc88a, 3.2)
  sun.position.set(-140, 95, 110)
  sun.target.position.set(0, 0, 0)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  const shadowCam = sun.shadow.camera
  shadowCam.left = -170
  shadowCam.right = 170
  shadowCam.top = 170
  shadowCam.bottom = -170
  shadowCam.near = 10
  shadowCam.far = 500
  sun.shadow.bias = -0.0004
  sun.shadow.normalBias = 0.4
  scene.add(sun, sun.target)

  const horizon = new THREE.Mesh(
    new THREE.CircleGeometry(1400, 64).rotateX(-Math.PI / 2),
    new THREE.MeshLambertMaterial({ color: 0x9c8a74 }),
  )
  horizon.position.y = -0.5
  horizon.receiveShadow = true
  scene.add(horizon)

  const controls = new OrbitControls(camera, canvas)
  controls.target.copy(HOME_TARGET)
  controls.minDistance = MIN_DISTANCE
  controls.maxDistance = MAX_DISTANCE
  controls.minPolarAngle = MIN_POLAR
  controls.maxPolarAngle = MAX_POLAR
  controls.screenSpacePanning = false
  controls.enableDamping = !reducedMotionQuery.matches
  controls.dampingFactor = 0.08
  controls.update()

  let concorde: ConcordeScene
  try {
    concorde = createConcordeScene()
  } catch (error) {
    console.error('Scene construction failed', error)
    showFailure('The scene could not be built', 'Something went wrong while generating the plaza. Reload to try again.', true)
    controls.dispose()
    renderer.dispose()
    return
  }
  concorde.group.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.castShadow = true
      obj.receiveShadow = true
    }
  })
  scene.add(concorde.group)

  let paused = reducedMotionQuery.matches
  let elapsed = 0
  let last = performance.now()
  let contextLost = false

  function syncPauseButton() {
    pauseButton.setAttribute('aria-pressed', String(paused))
    pauseButton.textContent = paused ? 'Resume water' : 'Pause water'
  }
  syncPauseButton()

  reducedMotionQuery.addEventListener('change', () => {
    controls.enableDamping = !reducedMotionQuery.matches
    if (reducedMotionQuery.matches && !paused) {
      paused = true
      syncPauseButton()
      announce('Water animation paused to respect your reduced-motion setting')
    }
  })

  function clampTarget() {
    controls.target.clamp(PAN_LIMIT.min, PAN_LIMIT.max)
  }

  function resetView() {
    // Flush any damping inertia first so the camera cannot drift off the home view.
    controls.enableDamping = false
    controls.update()
    camera.position.copy(HOME_POSITION)
    controls.target.copy(HOME_TARGET)
    controls.update()
    controls.enableDamping = !reducedMotionQuery.matches
    announce('View reset')
  }

  function setSize() {
    const rect = canvas.getBoundingClientRect()
    const width = Math.max(1, Math.round(rect.width))
    const height = Math.max(1, Math.round(rect.height))
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_DPR))
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    // Keep the whole plaza framed on narrow portrait screens.
    camera.fov = camera.aspect < 0.8 ? 62 : 42
    camera.updateProjectionMatrix()
  }
  new ResizeObserver(setSize).observe(canvas)
  window.addEventListener('resize', setSize)
  setSize()

  resetButton.addEventListener('click', resetView)
  pauseButton.addEventListener('click', () => {
    paused = !paused
    syncPauseButton()
    announce(paused ? 'Water animation paused' : 'Water animation resumed')
  })

  const offset = new THREE.Vector3()
  const spherical = new THREE.Spherical()
  const right = new THREE.Vector3()
  const forward = new THREE.Vector3()

  window.addEventListener('keydown', (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey || contextLost) return
    const el = event.target as HTMLElement | null
    if (el && el.closest('summary, input, textarea, select')) return
    const key = event.key
    const isArrow = key.startsWith('Arrow')
    if (isArrow && el instanceof HTMLButtonElement) return

    if (key === 'r' || key === 'R') {
      resetView()
    } else if (key === '+' || key === '=' || key === '-' || key === '_') {
      offset.copy(camera.position).sub(controls.target)
      offset.multiplyScalar(key === '+' || key === '=' ? 1 / KEY_ZOOM : KEY_ZOOM)
      offset.clampLength(MIN_DISTANCE, MAX_DISTANCE)
      camera.position.copy(controls.target).add(offset)
    } else if (isArrow && event.shiftKey) {
      camera.getWorldDirection(forward)
      forward.y = 0
      forward.normalize()
      right.crossVectors(forward, camera.up).normalize()
      const move = new THREE.Vector3()
      if (key === 'ArrowLeft') move.addScaledVector(right, -KEY_PAN)
      if (key === 'ArrowRight') move.addScaledVector(right, KEY_PAN)
      if (key === 'ArrowUp') move.addScaledVector(forward, KEY_PAN)
      if (key === 'ArrowDown') move.addScaledVector(forward, -KEY_PAN)
      controls.target.add(move)
      clampTarget()
      camera.position.add(move)
    } else if (isArrow) {
      offset.copy(camera.position).sub(controls.target)
      spherical.setFromVector3(offset)
      if (key === 'ArrowLeft') spherical.theta -= KEY_ROTATE
      if (key === 'ArrowRight') spherical.theta += KEY_ROTATE
      if (key === 'ArrowUp') spherical.phi -= KEY_ROTATE
      if (key === 'ArrowDown') spherical.phi += KEY_ROTATE
      spherical.phi = THREE.MathUtils.clamp(spherical.phi, MIN_POLAR, MAX_POLAR)
      camera.position.copy(controls.target).add(offset.setFromSpherical(spherical))
    } else {
      return
    }
    event.preventDefault()
    controls.update()
  })

  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault()
    contextLost = true
    showFailure(
      'The 3D context was lost',
      'The graphics driver interrupted the 3D view, which can happen when the device is under memory pressure. We will try to restore it automatically; if nothing changes, reload.',
      true,
    )
  })
  canvas.addEventListener('webglcontextrestored', () => {
    contextLost = false
    hideFailure()
    canvas.dataset.state = 'ready'
    announce('3D view restored')
  })

  let lastCamera = ''
  function frame(now: number) {
    requestAnimationFrame(frame)
    const dt = Math.min((now - last) / 1000, 0.1)
    last = now
    if (contextLost) return
    if (!paused) elapsed += dt
    controls.update()
    clampTarget()
    concorde.update(elapsed)
    renderer.render(scene, camera)

    const p = camera.position
    const cam = `${p.x.toFixed(1)},${p.y.toFixed(1)},${p.z.toFixed(1)}`
    if (cam !== lastCamera) {
      lastCamera = cam
      canvas.dataset.camera = cam
      canvas.dataset.atHome = String(p.distanceTo(HOME_POSITION) < 0.05 && controls.target.distanceTo(HOME_TARGET) < 0.05)
    }
    canvas.dataset.animationTime = elapsed.toFixed(1)
    if (canvas.dataset.state !== 'ready') canvas.dataset.state = 'ready'
  }
  requestAnimationFrame(frame)

  window.addEventListener('pagehide', () => {
    concorde.dispose()
    controls.dispose()
    renderer.dispose()
  })
}

window.addEventListener('error', (event) => {
  console.error(event.error ?? event.message)
  if (fallbackEl.hidden) showFailure('Something went wrong', 'The viewer hit an unexpected error. Reload to try again.', true)
})
window.addEventListener('unhandledrejection', (event) => {
  console.error(event.reason)
  if (fallbackEl.hidden) showFailure('Something went wrong', 'The viewer hit an unexpected error. Reload to try again.', true)
})

start()
