import * as THREE from 'three';

const std = (color: number, roughness = 0.9, metalness = 0) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness });

/** Shared stylized materials for the surroundings. */
export const materials = {
  stone: std(0xd9c7a3),
  stoneDark: std(0xb9a67f),
  slate: std(0x4a5260, 0.7),
  asphalt: new THREE.MeshStandardMaterial({
    color: 0x3b3d42,
    roughness: 0.95,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  }),
  sidewalk: std(0xa8a39a),
  marking: new THREE.MeshStandardMaterial({
    color: 0xf2f2ee,
    roughness: 0.8,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  }),
  grass: std(0x4f7a3c),
  gravel: std(0xc9b78f),
  water: std(0x3f6f8f, 0.25, 0.1),
  bronze: std(0x6b5a3a, 0.5, 0.6),
  iron: std(0x1f2226, 0.6, 0.5),
  gold: std(0xc8a24a, 0.4, 0.7),
  lampGlow: new THREE.MeshStandardMaterial({
    color: 0xfff1c4,
    emissive: 0xffd98a,
    emissiveIntensity: 0.6,
  }),
  trunk: std(0x5a4631),
  foliage: std(0x3f6b34),
  silhouette: std(0x8d93a0, 1),
};
