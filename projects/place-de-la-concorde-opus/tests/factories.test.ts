import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { createObelisk } from '../src/landmarks/obelisk'
import { createFountains } from '../src/landmarks/fountains'
import { createGround } from '../src/environment/ground'
import { createBuildings } from '../src/environment/buildings'
import { createStreetFurniture } from '../src/environment/streetFurniture'

const box = (o: THREE.Object3D) => new THREE.Box3().setFromObject(o)
const meshes = (o: THREE.Object3D) => {
  const out: THREE.Mesh[] = []
  o.traverse((c) => c instanceof THREE.Mesh && out.push(c))
  return out
}

describe('obelisk', () => {
  const group = createObelisk()
  it('is a group about 23m tall standing on the ground at the center', () => {
    expect(group).toBeInstanceOf(THREE.Group)
    const b = box(group)
    expect(b.max.y - b.min.y).toBeGreaterThan(20)
    expect(b.max.y - b.min.y).toBeLessThan(30)
    expect(b.min.y).toBeGreaterThanOrEqual(-0.5)
    const c = b.getCenter(new THREE.Vector3())
    expect(Math.hypot(c.x, c.z)).toBeLessThan(2)
  })
  it('returns independent groups', () => {
    expect(createObelisk()).not.toBe(group)
  })
})

describe('fountains', () => {
  const f = createFountains()
  it('places one fountain north and one south of the obelisk', () => {
    expect(f.group).toBeInstanceOf(THREE.Group)
    const zs = f.group.children.map((c) => box(c).getCenter(new THREE.Vector3()).z)
    expect(zs.some((z) => Math.abs(z + 42) < 8)).toBe(true)
    expect(zs.some((z) => Math.abs(z - 42) < 8)).toBe(true)
    const b = box(f.group)
    expect(b.min.y).toBeGreaterThanOrEqual(-1)
    expect(b.max.y).toBeLessThan(20)
  })
  it('animates without leaving non-finite transforms', () => {
    for (let i = 0; i < 120; i++) f.update(1 / 60, i / 60)
    f.update(0, 1000)
    f.group.updateMatrixWorld(true)
    const b = box(f.group)
    for (const v of [b.min, b.max]) expect([v.x, v.y, v.z].every(Number.isFinite)).toBe(true)
  })
})

describe('environment', () => {
  it('ground is a flat, finite plane region at Y=0', () => {
    const g = createGround()
    const b = box(g)
    expect(meshes(g).length).toBeGreaterThan(0)
    expect(b.max.y).toBeLessThan(3)
    expect(b.min.y).toBeGreaterThan(-3)
    expect(b.max.x - b.min.x).toBeGreaterThan(150)
    expect(b.max.z - b.min.z).toBeGreaterThan(150)
  })
  it('buildings frame the square on the north side', () => {
    const b = createBuildings()
    expect(meshes(b).length).toBeGreaterThan(0)
    const bb = box(b)
    expect(bb.min.z).toBeLessThan(-90)
    expect(bb.max.y).toBeGreaterThan(10)
    expect(bb.min.y).toBeGreaterThanOrEqual(-1)
  })
  it('street furniture exists and reuses shared geometries and materials', () => {
    const s = createStreetFurniture()
    const ms = meshes(s)
    expect(ms.length).toBeGreaterThan(10)
    expect(new Set(ms.map((m) => m.geometry)).size).toBeLessThan(ms.length)
    expect(new Set(ms.map((m) => m.material)).size).toBeLessThan(ms.length)
  })
  it.each([
    ['ground', createGround],
    ['buildings', createBuildings],
    ['furniture', createStreetFurniture],
    ['obelisk', createObelisk],
  ])('%s has finite geometry and no invisible cameras or lights', (_n, make) => {
    const g = make()
    for (const m of meshes(g)) {
      const p = m.geometry.getAttribute('position')
      expect(p.count).toBeGreaterThan(0)
      expect(Number.isFinite(p.array[0])).toBe(true)
    }
    g.traverse((c) => expect(c instanceof THREE.Camera).toBe(false))
  })
})
