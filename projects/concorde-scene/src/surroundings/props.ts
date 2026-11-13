import * as THREE from 'three';
import { materials as m } from './materials';
import { mesh } from './buildings';

const dummy = new THREE.Object3D();

function instance(
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  pts: { x: number; y: number; z: number; s?: number; ry?: number }[],
): THREE.InstancedMesh {
  const im = new THREE.InstancedMesh(geo, mat, pts.length);
  pts.forEach((p, i) => {
    dummy.position.set(p.x, p.y, p.z);
    dummy.rotation.set(0, p.ry ?? 0, 0);
    dummy.scale.setScalar(p.s ?? 1);
    dummy.updateMatrix();
    im.setMatrixAt(i, dummy.matrix);
  });
  im.instanceMatrix.needsUpdate = true;
  im.castShadow = true;
  im.receiveShadow = true;
  im.computeBoundingSphere();
  return im;
}

type P = { x: number; z: number };
const line = (x0: number, z0: number, x1: number, z1: number, n: number): P[] =>
  Array.from({ length: n }, (_, i) => ({
    x: x0 + ((x1 - x0) * i) / (n - 1),
    z: z0 + ((z1 - z0) * i) / (n - 1),
  }));

function treeSpots(): P[] {
  return [
    ...line(150, -150, 150, -50, 8).map((p) => ({ x: p.x + 6, z: p.z })),
    ...line(156, 50, 156, 150, 8),
    ...line(170, -150, 330, -150, 10),
    ...line(170, 150, 330, 150, 10),
    // Champs-Élysées double rows
    ...line(-130, -34, -480, -34, 16),
    ...line(-130, 34, -480, 34, 16),
    ...line(-130, -42, -480, -42, 16),
    ...line(-130, 42, -480, 42, 16),
  ];
}

export function createTrees(): THREE.Group {
  const g = new THREE.Group();
  g.name = 'trees';
  const spots = treeSpots();
  const trunks = instance(
    new THREE.CylinderGeometry(0.35, 0.5, 5, 6),
    m.trunk,
    spots.map((p) => ({ x: p.x, y: 2.5, z: p.z })),
  );
  trunks.name = 'tree-trunks';
  const crowns = instance(
    new THREE.IcosahedronGeometry(3.6, 1),
    m.foliage,
    spots.map((p, i) => ({ x: p.x, y: 8, z: p.z, s: 0.85 + ((i * 37) % 10) / 30 })),
  );
  crowns.name = 'tree-crowns';
  g.add(trunks, crowns);
  return g;
}

export function createLamps(): THREE.Group {
  const g = new THREE.Group();
  g.name = 'lamps';
  const spots: P[] = [];
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    spots.push({ x: Math.cos(a) * 80, z: Math.sin(a) * 80 });
  }
  spots.push(...line(-18, -150, -18, -380, 8), ...line(18, -150, 18, -380, 8));
  spots.push(...line(-130, -26, -480, -26, 8), ...line(-130, 26, -480, 26, 8));
  const poles = instance(
    new THREE.CylinderGeometry(0.12, 0.2, 8, 6),
    m.iron,
    spots.map((p) => ({ x: p.x, y: 4, z: p.z })),
  );
  poles.name = 'lamp-poles';
  const heads = instance(
    new THREE.SphereGeometry(0.55, 8, 6),
    m.lampGlow,
    spots.map((p) => ({ x: p.x, y: 8.3, z: p.z })),
  );
  heads.name = 'lamp-heads';
  heads.castShadow = false;
  g.add(poles, heads);
  return g;
}

export function createRoads(): THREE.Group {
  const g = new THREE.Group();
  g.name = 'roads';
  const flat = (w: number, d: number, mat: THREE.Material, x: number, y: number, z: number) => {
    const o = mesh(new THREE.BoxGeometry(w, 0.1, d), mat, x, y, z, false);
    o.castShadow = false;
    return o;
  };
  const plaza = mesh(new THREE.CylinderGeometry(112, 112, 0.1, 64), m.asphalt, 0, 0.02, 0, false);
  plaza.castShadow = false;
  plaza.name = 'plaza-surface';
  g.add(plaza);
  g.add(flat(26, 300, m.asphalt, 0, 0.03, -260)); // rue Royale
  g.add(flat(400, 60, m.asphalt, -300, 0.03, 0)); // Champs-Élysées
  g.add(flat(40, 50, m.asphalt, 0, 0.03, 160)); // approach to the bridge
  // sidewalks along the building fronts and the river
  for (const [w, d, x, z] of [
    [130, 8, 0, -108],
    [60, 6, 0, 120],
  ]) {
    const s = flat(w, d, m.sidewalk, x, 0.08, z);
    s.name = 'sidewalk';
    g.add(s);
  }
  // markings: zebra crossings (instanced) + dashed centre line up rue Royale
  const stripes: { x: number; y: number; z: number }[] = [];
  for (let i = 0; i < 10; i++) stripes.push({ x: -9 + i * 2, y: 0.09, z: -102 });
  for (let i = 0; i < 12; i++) stripes.push({ x: -118, y: 0.09, z: -24 + i * 4.4 });
  for (let i = 0; i < 20; i++) stripes.push({ x: 0, y: 0.09, z: -125 - i * 10 });
  for (let i = 0; i < 30; i++) stripes.push({ x: -130 - i * 10, y: 0.09, z: 0 });
  const marks = instance(new THREE.BoxGeometry(1, 0.05, 1.2), m.marking, stripes);
  marks.name = 'road-markings';
  marks.castShadow = false;
  g.add(marks);
  return g;
}
