import * as THREE from 'three'

// Placeholder stub; replaced by the environment/controls PR.
export function setupEnvironment(scene: THREE.Scene, _renderer: THREE.WebGLRenderer): void {
  scene.background = new THREE.Color(0xcfe3f5)
  scene.add(new THREE.HemisphereLight(0xffffff, 0x888888, 1.5))
  const sun = new THREE.DirectionalLight(0xffffff, 2)
  sun.position.set(40, 60, 30)
  scene.add(sun)
}

export function setupControls(
  camera: THREE.PerspectiveCamera,
  _dom: HTMLElement,
): { update(): void } {
  camera.position.set(60, 40, 60)
  camera.lookAt(0, 0, 0)
  return { update() {} }
}
