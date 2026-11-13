import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { createObeliskAndFountains } from './obelisk';

describe('createObeliskAndFountains', () => {
  const root = createObeliskAndFountains();

  it('builds an obelisk about 23m tall at the origin', () => {
    const obelisk = root.getObjectByName('obelisk')!;
    const box = new THREE.Box3().setFromObject(obelisk);
    expect(box.max.y).toBeCloseTo(23, 1);
    expect(box.min.y).toBeCloseTo(0, 5);
    expect((box.min.x + box.max.x) / 2).toBeCloseTo(0, 5);
    expect(obelisk.getObjectByName('pyramidion')).toBeDefined();
  });

  it('places both fountains 45m from center along Z, each with a water group', () => {
    const mers = root.getObjectByName('fontaine-des-mers')!;
    const fleuves = root.getObjectByName('fontaine-des-fleuves')!;
    expect(mers.position.z).toBeCloseTo(-45, 5);
    expect(fleuves.position.z).toBeCloseTo(45, 5);
    expect(mers.getObjectByName('water')).toBeDefined();
    expect(fleuves.getObjectByName('water')).toBeDefined();
  });
});
