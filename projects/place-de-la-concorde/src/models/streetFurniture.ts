import * as THREE from 'three';

/** Small deterministic PRNG (mulberry32) so placement is reproducible. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Part {
  name: string;
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  /** Local offset (y) and scale within a prop. */
  y: number;
  castShadow?: boolean;
}

/** Builds one InstancedMesh per part, sharing the same set of world placements. */
function instanceParts(
  group: THREE.Group,
  parts: Part[],
  placements: { x: number; z: number; rot?: number; scale?: number }[],
): void {
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  for (const part of parts) {
    const mesh = new THREE.InstancedMesh(part.geometry, part.material, placements.length);
    mesh.name = part.name;
    placements.forEach((pl, i) => {
      const sc = pl.scale ?? 1;
      q.setFromAxisAngle(up, pl.rot ?? 0);
      s.set(sc, sc, sc);
      p.set(pl.x, part.y * sc, pl.z);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = part.castShadow ?? true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }
}

function createLampPosts(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'LampPosts';

  const bronze = new THREE.MeshStandardMaterial({ color: 0x24382d, roughness: 0.5, metalness: 0.6 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xd6a93c, roughness: 0.35, metalness: 0.85 });
  const glass = new THREE.MeshStandardMaterial({
    color: 0xffe2a0,
    emissive: 0xffb84d,
    emissiveIntensity: 1.4,
    roughness: 0.3,
  });

  const placements: { x: number; z: number; rot: number }[] = [];
  // Long edges (east/west) and short edges (north/south) of the paved square.
  for (let z = -90; z <= 90; z += 20) {
    if (Math.abs(z) < 20) continue; // leave the obelisk axis open
    placements.push({ x: -76, z, rot: 0 }, { x: 76, z, rot: 0 });
  }
  for (let x = -60; x <= 60; x += 20) {
    if (Math.abs(x) < 20) continue; // keep fountain axes open
    placements.push({ x, z: -102, rot: 0 }, { x, z: 102, rot: 0 });
  }

  const parts: Part[] = [
    { name: 'LampBases', geometry: new THREE.CylinderGeometry(0.5, 0.65, 1.2, 12), material: bronze, y: 0.6 },
    { name: 'LampPosts', geometry: new THREE.CylinderGeometry(0.16, 0.24, 4.2, 12), material: bronze, y: 3.0 },
    { name: 'LampCollars', geometry: new THREE.TorusGeometry(0.24, 0.07, 8, 16).rotateX(Math.PI / 2), material: gold, y: 4.9 },
    { name: 'LampLanternGlass', geometry: new THREE.CylinderGeometry(0.42, 0.3, 1.1, 8), material: glass, y: 5.55, castShadow: false },
    { name: 'LampCaps', geometry: new THREE.ConeGeometry(0.6, 0.5, 8), material: bronze, y: 6.35 },
    { name: 'LampFinials', geometry: new THREE.SphereGeometry(0.16, 10, 8), material: gold, y: 6.72 },
  ];
  instanceParts(group, parts, placements);
  return group;
}

function createStatue(name: string, pose: 'seated' | 'standing', stone: THREE.Material, mat: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  g.name = name;

  const plinthBase = new THREE.Mesh(new THREE.BoxGeometry(5, 0.8, 5), stone);
  plinthBase.name = 'PlinthBase';
  plinthBase.position.y = 0.4;
  const plinthShaft = new THREE.Mesh(new THREE.BoxGeometry(3.6, 2.4, 3.6), stone);
  plinthShaft.name = 'PlinthShaft';
  plinthShaft.position.y = 2.0;
  const plinthCap = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.4, 4.2), stone);
  plinthCap.name = 'PlinthCap';
  plinthCap.position.y = 3.4;
  g.add(plinthBase, plinthShaft, plinthCap);

  const figure = new THREE.Group();
  figure.name = 'Figure';
  figure.position.y = 3.6;
  const add = (n: string, geo: THREE.BufferGeometry, x: number, y: number, z: number, rx = 0, rz = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.name = n;
    m.position.set(x, y, z);
    m.rotation.set(rx, 0, rz);
    m.castShadow = true;
    figure.add(m);
  };

  if (pose === 'standing') {
    add('Legs', new THREE.CylinderGeometry(0.45, 0.6, 2.2, 10), 0, 1.1, 0);
    add('Torso', new THREE.CylinderGeometry(0.6, 0.5, 1.8, 10), 0, 3.1, 0);
    add('Head', new THREE.SphereGeometry(0.38, 12, 10), 0, 4.3, 0);
    add('RaisedArm', new THREE.CylinderGeometry(0.14, 0.14, 1.6, 8), 0.85, 3.8, 0, 0, -0.5);
    add('Torch', new THREE.ConeGeometry(0.22, 0.6, 8), 1.4, 4.7, 0);
  } else {
    add('Seat', new THREE.BoxGeometry(1.8, 0.5, 1.6), 0, 0.25, 0);
    add('Thighs', new THREE.BoxGeometry(1.1, 0.5, 1.5), 0, 0.85, 0.3);
    add('Shins', new THREE.CylinderGeometry(0.3, 0.25, 1.2, 8), 0, 0.5, 1.1);
    add('Torso', new THREE.CylinderGeometry(0.6, 0.5, 1.7, 10), 0, 1.75, -0.2);
    add('Head', new THREE.SphereGeometry(0.36, 12, 10), 0, 2.95, -0.1);
    add('Book', new THREE.BoxGeometry(0.7, 0.12, 0.5), 0, 1.35, 0.55);
  }
  g.add(figure);
  g.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return g;
}

function createStatues(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Statues';
  const stone = new THREE.MeshStandardMaterial({ color: 0xd9d0bd, roughness: 0.85 });
  const figureMat = new THREE.MeshStandardMaterial({ color: 0xb9ae96, roughness: 0.7 });

  // Eight city statues: four corners and four mid-edge stations, facing the centre.
  const spots: [number, number][] = [
    [-84, -102], [84, -102], [-84, 102], [84, 102],
    [-84, -50], [84, -50], [-84, 50], [84, 50],
  ];
  spots.forEach(([x, z], i) => {
    const s = createStatue(`Statue${i + 1}`, i % 2 === 0 ? 'standing' : 'seated', stone, figureMat);
    s.position.set(x, 0, z);
    s.rotation.y = Math.atan2(-x, -z);
    group.add(s);
  });
  return group;
}

function createGreenery(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Greenery';
  const rand = seeded(1789);

  const stone = new THREE.MeshStandardMaterial({ color: 0xc9bfa8, roughness: 0.9 });
  const bark = new THREE.MeshStandardMaterial({ color: 0x5b4330, roughness: 0.9 });
  const leaf = new THREE.MeshStandardMaterial({ color: 0x5f8f3e, roughness: 0.85, flatShading: true });
  const shrubMat = new THREE.MeshStandardMaterial({ color: 0x3f7a3a, roughness: 0.9, flatShading: true });

  const trees: { x: number; z: number; rot: number; scale: number }[] = [];
  for (let z = -92; z <= 92; z += 14) {
    if (Math.abs(Math.abs(z) - 50) < 7) continue; // statue stations
    trees.push({ x: -88, z, rot: rand() * 6.28, scale: 0.9 + rand() * 0.25 });
    trees.push({ x: 88, z, rot: rand() * 6.28, scale: 0.9 + rand() * 0.25 });
  }
  for (let x = -66; x <= 66; x += 14) {
    if (Math.abs(x) < 24) continue;
    trees.push({ x, z: -106, rot: rand() * 6.28, scale: 0.9 + rand() * 0.25 });
    trees.push({ x, z: 106, rot: rand() * 6.28, scale: 0.9 + rand() * 0.25 });
  }

  const treeGroup = new THREE.Group();
  treeGroup.name = 'PlanterTrees';
  instanceParts(treeGroup, [
    { name: 'TreePlanters', geometry: new THREE.CylinderGeometry(1.0, 0.85, 0.8, 12), material: stone, y: 0.4 },
    { name: 'TreeTrunks', geometry: new THREE.CylinderGeometry(0.15, 0.22, 2.6, 8), material: bark, y: 2.0 },
    { name: 'TreeCrowns', geometry: new THREE.IcosahedronGeometry(1.7, 1).scale(1, 1.15, 1), material: leaf, y: 4.3 },
  ], trees);

  const shrubs: { x: number; z: number; rot: number; scale: number }[] = [];
  for (let i = 0; i < 12; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    shrubs.push({ x: side * 80, z: -75 + (i >> 1) * 28 + rand() * 4, rot: rand() * 6.28, scale: 0.8 + rand() * 0.4 });
  }
  const shrubGroup = new THREE.Group();
  shrubGroup.name = 'LowShrubs';
  instanceParts(shrubGroup, [
    { name: 'ShrubMounds', geometry: new THREE.IcosahedronGeometry(0.9, 1).scale(1.4, 0.7, 1), material: shrubMat, y: 0.5 },
  ], shrubs);

  group.add(treeGroup, shrubGroup);
  return group;
}

export function createStreetFurniture(): THREE.Group {
  const root = new THREE.Group();
  root.name = 'StreetFurniture';
  root.add(createLampPosts(), createStatues(), createGreenery());
  return root;
}
