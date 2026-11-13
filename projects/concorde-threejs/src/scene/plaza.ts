import * as THREE from 'three'

// Placeholder stub; replaced by the plaza PR.
export function createPlaza(): THREE.Group {
  const group = new THREE.Group()
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({ color: 0xb9b2a3 }),
  )
  ground.rotation.x = -Math.PI / 2
  group.add(ground)
  return group
}
