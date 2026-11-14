import { Group, Object3D, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'
import { createBuildings } from '../../src/models/buildings'
import { createFountains } from '../../src/models/fountains'
import { createGround } from '../../src/models/ground'
import { createObelisk } from '../../src/models/obelisk'
import { createStreetFurniture } from '../../src/models/streetFurniture'
import { allFinite, expectFiniteBox, namedObjects, worldBox } from './helpers'

function worldPosition(o: Object3D): Vector3 {
  o.updateWorldMatrix(true, false)
  return o.getWorldPosition(new Vector3())
}

describe('contract shapes', () => {
  it.each([
    ['createObelisk', createObelisk],
    ['createGround', createGround],
    ['createBuildings', createBuildings],
    ['createStreetFurniture', createStreetFurniture],
  ])('%s returns a non-empty Group', (_name, factory) => {
    const group = factory()
    expect(group).toBeInstanceOf(Group)
    expect(group.children.length).toBeGreaterThan(0)
  })

  it('createFountains returns { group, update }', () => {
    const fountains = createFountains()
    expect(fountains.group).toBeInstanceOf(Group)
    expect(typeof fountains.update).toBe('function')
  })
})

describe('geometry is finite', () => {
  const groups: [string, () => Group][] = [
    ['obelisk', createObelisk],
    ['fountains', () => createFountains().group],
    ['ground', createGround],
    ['buildings', createBuildings],
    ['street furniture', createStreetFurniture],
  ]
  it.each(groups)('%s has finite bounding boxes and transforms', (_name, factory) => {
    const group = factory()
    expectFiniteBox(worldBox(group))
    expect(allFinite(group)).toBe(true)
  })
})

describe('obelisk', () => {
  const obelisk = createObelisk()

  it('has named shaft, pyramidion and pedestal parts', () => {
    expect(namedObjects(obelisk, /shaft/i).length).toBeGreaterThan(0)
    expect(namedObjects(obelisk, /pyramidion/i).length).toBeGreaterThan(0)
    expect(namedObjects(obelisk, /pedestal/i).length).toBeGreaterThan(0)
  })

  it('stacks pedestal, shaft and pyramidion upward', () => {
    const y = (re: RegExp) => worldBox(namedObjects(obelisk, re)[0]).getCenter(new Vector3()).y
    expect(y(/pedestal/i)).toBeLessThan(y(/shaft/i))
    expect(y(/shaft/i)).toBeLessThan(y(/pyramidion/i))
  })

  it('has a gold pyramidion', () => {
    const [top] = namedObjects(obelisk, /pyramidion/i)
    const materials: { color?: { r: number; b: number } }[] = []
    top.traverse((o) => {
      const m = (o as { material?: unknown }).material
      if (m) materials.push(...(Array.isArray(m) ? m : [m]))
    })
    const color = materials.find((m) => m.color)?.color
    expect(color).toBeDefined()
    // Gold is warm: red clearly exceeds blue.
    expect(color!.r).toBeGreaterThan(color!.b)
  })

  it('is centered on the origin and tall', () => {
    const box = worldBox(obelisk)
    const center = box.getCenter(new Vector3())
    expect(Math.abs(center.x)).toBeLessThan(2)
    expect(Math.abs(center.z)).toBeLessThan(2)
    expect(box.max.y).toBeGreaterThan(15)
  })
})

describe('fountains', () => {
  it('has exactly two fountain groups at (0,0,-55) and (0,0,55)', () => {
    const { group } = createFountains()
    expect(group.children).toHaveLength(2)
    const positions = group.children.map((c) => worldPosition(c)).sort((a, b) => a.z - b.z)
    expect(positions[0].toArray()).toEqual([0, 0, -55])
    expect(positions[1].toArray()).toEqual([0, 0, 55])
  })

  it('update() is finite and deterministic', () => {
    const snapshot = (elapsed: number): number[] => {
      const { group, update } = createFountains()
      update(elapsed)
      group.updateWorldMatrix(true, true)
      const values: number[] = []
      group.traverse((o) => values.push(...o.position.toArray(), ...o.scale.toArray(), o.rotation.x, o.rotation.y, o.rotation.z))
      return values
    }
    for (const t of [0, 0.016, 1.5, 12.25, 3600]) {
      const a = snapshot(t)
      expect(a.every(Number.isFinite)).toBe(true)
      expect(snapshot(t)).toEqual(a)
    }
    const { group, update } = createFountains()
    for (let t = 0; t < 5; t += 0.1) update(t)
    expect(allFinite(group)).toBe(true)
  })
})

describe('ground', () => {
  it('covers roughly a 180 x 220 m square', () => {
    const size = worldBox(createGround()).getSize(new Vector3())
    expect(size.x).toBeGreaterThanOrEqual(150)
    expect(size.z).toBeGreaterThanOrEqual(190)
  })
})

describe('buildings', () => {
  const buildings = createBuildings()

  it('places the Hôtel de Crillon on the north side near Z=-115', () => {
    const [crillon] = namedObjects(buildings, /crillon/i)
    expect(crillon).toBeDefined()
    const box = worldBox(crillon)
    const center = box.getCenter(new Vector3())
    expect(center.z).toBeLessThan(-95)
    expect(center.z).toBeGreaterThan(-135)
    expect(box.getSize(new Vector3()).x).toBeGreaterThan(20)
  })

  it('faces +Z (toward the square)', () => {
    const [crillon] = namedObjects(buildings, /crillon/i)
    crillon.updateWorldMatrix(true, false)
    const forward = new Vector3(0, 0, 1).transformDirection(crillon.matrixWorld)
    expect(forward.z).toBeGreaterThan(0.9)
  })

  it('has several distinct building parts', () => {
    expect(buildings.children.length).toBeGreaterThanOrEqual(2)
  })
})

describe('street furniture', () => {
  it('has many items within the square', () => {
    const furniture = createStreetFurniture()
    let meshes = 0
    furniture.traverse((o) => {
      if ((o as { isMesh?: boolean }).isMesh) meshes++
    })
    expect(meshes).toBeGreaterThan(10)
    const box = worldBox(furniture)
    expect(box.max.x - box.min.x).toBeLessThan(400)
    expect(box.max.z - box.min.z).toBeLessThan(400)
  })
})
