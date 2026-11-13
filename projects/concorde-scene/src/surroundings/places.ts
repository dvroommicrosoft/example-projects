import * as THREE from 'three';
import { materials as m } from './materials';
import { box, columnRow, mesh } from './buildings';

export function createStatues(): THREE.Group {
  const g = new THREE.Group();
  g.name = 'statues';
  const pavilionGeo = new THREE.CylinderGeometry(7, 8, 5, 8);
  const topGeo = new THREE.CylinderGeometry(6, 6.5, 0.8, 8);
  const plinthGeo = new THREE.BoxGeometry(3, 3, 3);
  const bodyGeo = new THREE.CylinderGeometry(0.9, 1.2, 4, 8);
  const headGeo = new THREE.SphereGeometry(0.8, 10, 8);
  const crownGeo = new THREE.CylinderGeometry(1.8, 2.2, 1.2, 8);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const r = 95;
    const p = new THREE.Group();
    p.name = `statue-${i + 1}`;
    p.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
    p.add(mesh(pavilionGeo, m.stone, 0, 2.5, 0));
    p.add(mesh(topGeo, m.stoneDark, 0, 5.4, 0));
    p.add(mesh(plinthGeo, m.stone, 0, 6.8, 0));
    p.add(mesh(bodyGeo, m.stoneDark, 0, 10.3, 0)); // seated allegorical figure, stylized
    p.add(mesh(headGeo, m.stoneDark, 0, 12.8, 0));
    p.add(mesh(crownGeo, m.stone, 0, 8.7, 0));
    g.add(p);
  }
  return g;
}

export function createRiverside(): THREE.Group {
  const g = new THREE.Group();
  g.name = 'seine';
  const w = mesh(new THREE.BoxGeometry(900, 1, 44), m.water, 0, -1.5, 160, false);
  w.name = 'seine-water';
  g.add(w);
  for (const z of [134, 186]) {
    const q = box(900, 3, 6, m.stone, 0, -3, z);
    q.name = 'quay';
    g.add(q);
  }
  const bridge = new THREE.Group();
  bridge.name = 'pont-de-la-concorde';
  bridge.add(box(40, 1.5, 52, m.stone, 0, -1, 160));
  for (const sx of [-1, 1]) {
    bridge.add(box(1.2, 1.4, 52, m.stoneDark, sx * 19.4, 0.5, 160));
  }
  for (const z of [146, 160, 174]) {
    const pier = box(36, 6, 3, m.stoneDark, 0, -7, z);
    bridge.add(pier);
  }
  g.add(bridge);

  const ass = new THREE.Group();
  ass.name = 'assemblee-nationale';
  ass.add(box(100, 18, 40, m.stone, 0, 0, 230));
  ass.add(box(60, 3, 6, m.stoneDark, 0, 0, 213)); // steps
  const cols = columnRow(12, 52, 1, 15, 0, 3, 211);
  cols.name = 'assemblee-columns';
  ass.add(cols);
  ass.add(box(56, 2.5, 6, m.stone, 0, 18, 212)); // entablature
  const pediment = mesh(new THREE.CylinderGeometry(28, 28, 1, 3), m.stone);
  pediment.rotation.x = Math.PI / 2;
  pediment.scale.set(1, 1, 0.2);
  pediment.position.set(0, 22.6, 214);
  ass.add(pediment);
  ass.add(box(100, 2, 42, m.slate, 0, 18, 230));
  g.add(ass);
  return g;
}

function gate(x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  for (const s of [-1, 1]) g.add(box(1.6, 7, 1.6, m.stone, 0, 0, s * 3));
  g.add(box(1, 0.5, 7.4, m.gold, 0, 7, 0));
  const bars = new THREE.InstancedMesh(new THREE.BoxGeometry(0.15, 5, 0.15), m.iron, 12);
  const d = new THREE.Object3D();
  for (let i = 0; i < 12; i++) {
    d.position.set(0, 2.6, -2.2 + (i * 4.4) / 11);
    d.updateMatrix();
    bars.setMatrixAt(i, d.matrix);
  }
  bars.castShadow = true;
  g.add(bars);
  return g;
}

export function createTuileriesEdge(): THREE.Group {
  const g = new THREE.Group();
  g.name = 'tuileries-edge';
  const garden = mesh(new THREE.BoxGeometry(260, 0.1, 340), m.grass, 280, 0.03, 0, false);
  garden.castShadow = false;
  g.add(garden);
  // low wall with the garden gates
  for (const [z0, z1] of [[-170, -12], [12, 170]]) {
    g.add(box(1, 1.4, z1 - z0, m.stoneDark, 150, 0, (z0 + z1) / 2));
  }
  g.add(gate(150, -40));
  g.add(gate(150, 0));
  g.add(gate(150, 40));
  // Marly-horse pedestals flanking the main axis, each with a stylized rearing horse
  const horseGeo = new THREE.CylinderGeometry(0.8, 1.4, 5, 8);
  for (const sz of [-1, 1]) {
    const h = new THREE.Group();
    h.name = 'marly-horse';
    h.position.set(138, 0, sz * 16);
    h.add(box(5, 5, 5, m.stone, 0, 0, 0));
    const horse = mesh(horseGeo, m.bronze, 0, 7.5, 0);
    horse.rotation.z = -0.5;
    h.add(horse);
    h.add(mesh(new THREE.SphereGeometry(1, 8, 6), m.bronze, 1.6, 10, 0));
    g.add(h);
  }
  return g;
}

export function createArc(): THREE.Group {
  const g = new THREE.Group();
  g.name = 'arc-de-triomphe';
  const x = -520;
  // distant silhouette, scaled up so it reads from the plaza; axis along X
  for (const sz of [-1, 1]) g.add(box(30, 50, 14, m.silhouette, x, 0, sz * 21));
  g.add(box(30, 14, 56, m.silhouette, x, 50, 0));
  g.add(box(30, 4, 58, m.stoneDark, x, 64, 0));
  return g;
}
