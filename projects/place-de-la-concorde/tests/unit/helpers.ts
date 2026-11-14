import { Box3, Object3D, Vector3 } from 'three'

export function namedObjects(root: Object3D, pattern: RegExp): Object3D[] {
  const found: Object3D[] = []
  root.traverse((o) => {
    if (pattern.test(o.name)) found.push(o)
  })
  return found
}

export function worldBox(object: Object3D): Box3 {
  object.updateWorldMatrix(true, true)
  return new Box3().setFromObject(object)
}

export function expectFiniteBox(box: Box3): void {
  if (box.isEmpty()) throw new Error('bounding box is empty')
  const values = [box.min, box.max].flatMap((v: Vector3) => [v.x, v.y, v.z])
  if (!values.every(Number.isFinite)) {
    throw new Error(`non-finite bounding box: ${values.join(', ')}`)
  }
}

// Every vertex position and every object transform must be a finite number.
export function allFinite(root: Object3D): boolean {
  let ok = true
  root.updateWorldMatrix(true, true)
  root.traverse((o) => {
    const values = [...o.position.toArray(), ...o.scale.toArray(), ...o.matrixWorld.elements]
    if (!values.every(Number.isFinite)) ok = false
    const geometry = (o as { geometry?: { attributes?: Record<string, { array: ArrayLike<number> }> } }).geometry
    const positions = geometry?.attributes?.position?.array
    if (positions) {
      for (let i = 0; i < positions.length; i++) {
        if (!Number.isFinite(positions[i])) {
          ok = false
          break
        }
      }
    }
  })
  return ok
}
