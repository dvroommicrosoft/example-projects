import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createLandmarks, updateLandmarks } from './index';

describe('landmarks', () => {
  const group = createLandmarks();
  group.updateMatrixWorld(true);

  it('contains the named major objects', () => {
    for (const n of ['obelisk', 'obelisk-pedestal', 'fountain-mers', 'fountain-fleuves', 'plaza-details']) {
      expect(group.getObjectByName(n), n).toBeDefined();
    }
  });

  it('obelisk is about 23 m tall and sits on the pedestal at the origin', () => {
    const box = new THREE.Box3().setFromObject(group.getObjectByName('obelisk')!);
    expect(box.max.y - box.min.y).toBeCloseTo(23, 0);
    expect((box.min.x + box.max.x) / 2).toBeCloseTo(0, 1);
    expect((box.min.z + box.max.z) / 2).toBeCloseTo(0, 1);
    const ped = new THREE.Box3().setFromObject(group.getObjectByName('obelisk-pedestal')!);
    expect(box.min.y).toBeCloseTo(ped.max.y, 2);
  });

  it('places fountains north (-Z) and south (+Z) of the obelisk', () => {
    const p = new THREE.Vector3();
    group.getObjectByName('fountain-mers')!.getWorldPosition(p);
    expect(p.toArray()).toEqual([0, 0, -45]);
    group.getObjectByName('fountain-fleuves')!.getWorldPosition(p);
    expect(p.toArray()).toEqual([0, 0, 45]);
  });

  it('has finite bounds and shadow flags on meshes', () => {
    const box = new THREE.Box3().setFromObject(group);
    for (const v of [...box.min.toArray(), ...box.max.toArray()]) expect(Number.isFinite(v)).toBe(true);
    group.traverse((o) => {
      if ((o as THREE.Mesh).isMesh && !o.name.includes('water') && !o.name.includes('jet')) {
        expect((o as THREE.Mesh).castShadow || (o as THREE.Mesh).receiveShadow, o.name).toBe(true);
      }
    });
  });

  it('updateLandmarks animates water without producing NaN', () => {
    const w = group.getObjectByName('fountain-mers-water-lower')!;
    const before = w.position.y;
    updateLandmarks(group, 1.234);
    expect(Number.isFinite(w.position.y)).toBe(true);
    expect(w.position.y).not.toBe(before);
  });
});
