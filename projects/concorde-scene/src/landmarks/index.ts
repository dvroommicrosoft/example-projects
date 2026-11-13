/**
 * Landmarks of Place de la Concorde: Luxor Obelisk, the two fountains and plaza details.
 *
 * World: metres, Y up, origin = obelisk base. +X east (Tuileries), -X west (Champs-Élysées),
 * -Z north (rue Royale), +Z south (Seine). Everything is procedural; no assets are loaded.
 *
 * Named objects: 'landmarks', 'obelisk' (23 m, excludes the pedestal), 'obelisk-pedestal',
 * 'fountain-mers' (0,0,-45), 'fountain-fleuves' (0,0,+45), 'plaza-details'.
 *
 * Optional animation: call `updateLandmarks(group, timeSeconds)` each frame to shimmer the
 * water surfaces (small height bob and emissive pulse). It allocates nothing.
 */
import * as THREE from 'three';
import { createFountain } from './fountains';
import { createObelisk } from './obelisk';
import { createPlazaDetails } from './plaza';

export const FOUNTAIN_OFFSET_Z = 45;

export function createLandmarks(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'landmarks';

  group.add(createObelisk());

  const mers = createFountain({ name: 'fountain-mers', figures: 8, upperFigures: 4, phase: 0 });
  mers.position.set(0, 0, -FOUNTAIN_OFFSET_Z);
  const fleuves = createFountain({ name: 'fountain-fleuves', figures: 6, upperFigures: 3, phase: 1.7 });
  fleuves.position.set(0, 0, FOUNTAIN_OFFSET_Z);
  group.add(mers, fleuves, createPlazaDetails());

  return group;
}

export function updateLandmarks(group: THREE.Group, timeSeconds: number): void {
  for (const name of ['fountain-mers', 'fountain-fleuves']) {
    const fountain = group.getObjectByName(name);
    const water = fountain?.getObjectByName(`${name}-water`);
    if (!fountain || !water) continue;
    const phase = fountain.userData.phase as number;
    for (const child of water.children) {
      const baseY = child.userData.baseY as number | undefined;
      if (baseY !== undefined) child.position.y = baseY + Math.sin(timeSeconds * 1.6 + phase + baseY) * 0.015;
      const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.3 + 0.12 * Math.sin(timeSeconds * 2.3 + phase);
    }
  }
}
