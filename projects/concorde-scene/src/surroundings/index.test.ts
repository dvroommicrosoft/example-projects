import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createSurroundings } from './index';

const s = createSurroundings();
const find = (n: string) => s.getObjectByName(n)!;
const center = (o: THREE.Object3D) => new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3());

describe('createSurroundings', () => {
  it('exposes the named groups', () => {
    for (const n of [
      'hotel-de-crillon', 'hotel-de-la-marine', 'madeleine', 'statues', 'lamps',
      'trees', 'seine', 'pont-de-la-concorde', 'assemblee-nationale',
      'tuileries-edge', 'arc-de-triomphe', 'roads',
    ]) {
      expect(find(n), n).toBeDefined();
    }
  });

  it('has eight statues on a ring around the plaza', () => {
    const statues = find('statues');
    expect(statues.children).toHaveLength(8);
    for (const c of statues.children) {
      const r = Math.hypot(c.position.x, c.position.z);
      expect(r).toBeGreaterThanOrEqual(90);
      expect(r).toBeLessThanOrEqual(100);
    }
  });

  it('places buildings north and river/Assemblée south', () => {
    expect(center(find('hotel-de-crillon')).z).toBeLessThan(-100);
    expect(center(find('hotel-de-la-marine')).z).toBeLessThan(-100);
    expect(center(find('madeleine')).z).toBeLessThan(-300);
    expect(center(find('assemblee-nationale')).z).toBeGreaterThan(120);
    expect(center(find('tuileries-edge')).x).toBeGreaterThan(100);
    expect(center(find('arc-de-triomphe')).x).toBeLessThan(-100);
  });

  it('uses instancing for repeated props', () => {
    expect(find('lamps').children.every((c) => c instanceof THREE.InstancedMesh)).toBe(true);
    expect(find('trees').children.every((c) => c instanceof THREE.InstancedMesh)).toBe(true);
  });

  it('has finite bounds and a modest object count', () => {
    const b = new THREE.Box3().setFromObject(s);
    expect(b.isEmpty()).toBe(false);
    for (const v of [...b.min.toArray(), ...b.max.toArray()]) expect(Number.isFinite(v)).toBe(true);
    let meshes = 0;
    s.traverse((o) => { if ((o as THREE.Mesh).isMesh) meshes++; });
    expect(meshes).toBeLessThan(250);
  });
});
