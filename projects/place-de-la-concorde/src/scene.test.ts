import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { createConcordeScene } from './scene.ts';

const worldBox = (o: THREE.Object3D) => {
  o.updateMatrixWorld(true);
  return new THREE.Box3().setFromObject(o);
};

test('obelisk stands at the origin and reaches about 27m', () => {
  const { group, dispose } = createConcordeScene();
  const obelisk = group.getObjectByName('obelisk');
  assert.ok(obelisk);
  const box = worldBox(obelisk);
  assert.ok(Math.abs((box.min.x + box.max.x) / 2) < 0.5);
  assert.ok(Math.abs((box.min.z + box.max.z) / 2) < 0.5);
  assert.ok(box.max.y > 26 && box.max.y < 28, `height ${box.max.y}`);
  assert.ok(group.getObjectByName('obelisk-shaft'));
  assert.ok(group.getObjectByName('obelisk-tip'));
  dispose();
});

test('twin fountains sit on the Z axis at z=+/-30', () => {
  const { group, dispose } = createConcordeScene();
  for (const [name, z] of [
    ['fountain-south', 30],
    ['fountain-north', -30],
  ] as const) {
    const f = group.getObjectByName(name);
    assert.ok(f, name);
    const p = f.getWorldPosition(new THREE.Vector3());
    assert.equal(p.x, 0);
    assert.equal(p.z, z);
  }
  dispose();
});

test('palace facades are placed at z=-90 within the plaza span', () => {
  const { group, dispose } = createConcordeScene();
  for (const name of ['facade-north-west', 'facade-north-east']) {
    const w = group.getObjectByName(name);
    assert.ok(w, name);
    assert.equal(w.getWorldPosition(new THREE.Vector3()).z, -90);
    const box = worldBox(w);
    assert.ok(box.min.x >= -110 && box.max.x <= 110);
  }
  for (const name of ['plaza-paving', 'street-lamps', 'balustrades', 'greenery', 'streets']) {
    assert.ok(group.getObjectByName(name), name);
  }
  dispose();
});

test('main meshes cast and receive shadows', () => {
  const { group, dispose } = createConcordeScene();
  for (const name of ['obelisk-shaft', 'fountain-south-bowl-0', 'facade-north-west-body']) {
    const m = group.getObjectByName(name) as THREE.Mesh;
    assert.ok(m.castShadow && m.receiveShadow, name);
  }
  dispose();
});

test('update animates fountain jets and is deterministic per time', () => {
  const { group, update, dispose } = createConcordeScene();
  const jets = group.getObjectByName('fountain-south-jets') as THREE.InstancedMesh;
  const read = () => Array.from(jets.instanceMatrix.array);
  update(1);
  const a = read();
  update(1);
  assert.deepEqual(read(), a);
  update(2.5);
  assert.notDeepEqual(read(), a);
  assert.doesNotThrow(() => update(Number.NaN));
  dispose();
});

test('dispose frees geometries, materials and textures and is idempotent', () => {
  const { group, update, dispose } = createConcordeScene();
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  group.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    geometries.add(m.geometry);
    for (const mt of Array.isArray(m.material) ? m.material : [m.material]) {
      materials.add(mt);
      const map = (mt as THREE.MeshStandardMaterial).map;
      if (map) textures.add(map);
    }
  });
  assert.ok(geometries.size > 20 && materials.size > 10 && textures.size === 1);

  let disposedCount = 0;
  const count = () => disposedCount++;
  for (const r of [...geometries, ...materials, ...textures]) r.addEventListener('dispose', count);
  dispose();
  assert.equal(disposedCount, geometries.size + materials.size + textures.size);
  assert.equal(group.children.length, 0);

  assert.doesNotThrow(() => {
    dispose();
    update(3);
  });
  assert.equal(disposedCount, geometries.size + materials.size + textures.size);
});
