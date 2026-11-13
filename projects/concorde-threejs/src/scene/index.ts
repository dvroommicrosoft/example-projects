import type * as THREE from 'three'
import { createObeliskAndFountains } from './obelisk.ts'
import { createPlaza } from './plaza.ts'

export function buildConcorde(scene: THREE.Scene): THREE.Group[] {
  const parts = [createPlaza(), createObeliskAndFountains()]
  parts.forEach((part) => scene.add(part))
  return parts
}
