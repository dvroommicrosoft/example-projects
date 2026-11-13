import * as THREE from 'three'
import { expect, test } from 'vitest'
import { buildConcorde } from '../src/scene/index.ts'

test('buildConcorde adds its parts to the scene', () => {
  const scene = new THREE.Scene()
  const parts = buildConcorde(scene)
  expect(parts.length).toBeGreaterThan(0)
  parts.forEach((part) => expect(part.parent).toBe(scene))
})
