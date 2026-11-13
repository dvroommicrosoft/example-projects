import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const MATERIALS = {
  granite: () => new THREE.MeshStandardMaterial({ color: 0xb9a68a, roughness: 0.85, metalness: 0.02 }),
  stone: () => new THREE.MeshStandardMaterial({ color: 0xcfc6b4, roughness: 0.9, metalness: 0 }),
  gold: () => new THREE.MeshStandardMaterial({ color: 0xd4a72c, roughness: 0.3, metalness: 0.9 }),
  bronze: () => new THREE.MeshStandardMaterial({ color: 0x5f6b3e, roughness: 0.5, metalness: 0.6 }),
  carving: () => new THREE.MeshStandardMaterial({ color: 0x6b5a45, roughness: 1, metalness: 0 }),
  water: () =>
    new THREE.MeshStandardMaterial({
      color: 0x4f8fb0,
      roughness: 0.08,
      metalness: 0.1,
      transparent: true,
      opacity: 0.85,
      emissive: 0x0b2a3a,
      emissiveIntensity: 0.3,
    }),
};

export interface Part {
  geometry: THREE.BufferGeometry;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
}

/** Bakes transforms into each part and merges them into one mesh (one draw call). */
export function mergeParts(parts: Part[], material: THREE.Material, name: string): THREE.Mesh {
  const dummy = new THREE.Object3D();
  const geos = parts.map((p) => {
    dummy.position.set(...(p.position ?? [0, 0, 0]));
    dummy.rotation.set(...(p.rotation ?? [0, 0, 0]));
    dummy.scale.set(...(p.scale ?? [1, 1, 1]));
    dummy.updateMatrix();
    const out = p.geometry.clone().applyMatrix4(dummy.matrix);
    p.geometry.dispose();
    return out;
  });
  const merged = mergeGeometries(geos, false);
  geos.forEach((g) => g.dispose());
  if (!merged) throw new Error(`Failed to merge geometry for ${name}`);
  const mesh = new THREE.Mesh(merged, material);
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** Small deterministic PRNG so the scene is identical on every load. */
export function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
