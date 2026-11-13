import * as THREE from 'three';

// Units are meters, origin at plaza center, +Y up, fountains along the Z axis.
export const OBELISK_HEIGHT = 23;
export const FOUNTAIN_Z = 45;

const stone = new THREE.MeshStandardMaterial({ color: 0xc9a98a, roughness: 0.85 });
const granite = new THREE.MeshStandardMaterial({ color: 0xb59a82, roughness: 0.8 });
const gold = new THREE.MeshStandardMaterial({ color: 0xe6b422, metalness: 0.9, roughness: 0.3 });
const bronze = new THREE.MeshStandardMaterial({ color: 0x4f6b4a, metalness: 0.6, roughness: 0.5 });
const waterMaterial = new THREE.MeshStandardMaterial({
  color: 0x6fb7d8,
  transparent: true,
  opacity: 0.75,
  roughness: 0.15,
});

function mesh(geometry: THREE.BufferGeometry, material: THREE.Material, y = 0): THREE.Mesh {
  const m = new THREE.Mesh(geometry, material);
  m.position.y = y;
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function createObelisk(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'obelisk';

  // Steps, pedestal, shaft and pyramidion stack so the total is OBELISK_HEIGHT.
  const stepSizes = [9, 8, 7];
  const stepH = 0.3;
  let y = 0;
  for (const size of stepSizes) {
    group.add(mesh(new THREE.BoxGeometry(size, stepH, size), granite, y + stepH / 2));
    y += stepH;
  }

  const pedestal = new THREE.Group();
  pedestal.name = 'pedestal';
  const pedestalH = 4.1;
  pedestal.add(mesh(new THREE.BoxGeometry(5.6, pedestalH, 5.6), stone, y + pedestalH / 2));
  pedestal.add(mesh(new THREE.BoxGeometry(6.2, 0.35, 6.2), granite, y + pedestalH + 0.175));
  group.add(pedestal);
  y += pedestalH + 0.35;

  const pyramidH = 1.5;
  const shaftH = OBELISK_HEIGHT - y - pyramidH;
  const bottom = 2.4;
  const top = 1.5;
  // 4 radial segments rotated 45deg gives a square section; radius = half-width * sqrt2
  const shaftGeo = new THREE.CylinderGeometry((top / 2) * Math.SQRT2, (bottom / 2) * Math.SQRT2, shaftH, 4, 1);
  shaftGeo.rotateY(Math.PI / 4);
  const shaft = mesh(shaftGeo, stone, y + shaftH / 2);
  shaft.name = 'shaft';
  group.add(shaft);
  y += shaftH;

  const pyramidGeo = new THREE.ConeGeometry((top / 2) * Math.SQRT2, pyramidH, 4);
  pyramidGeo.rotateY(Math.PI / 4);
  const pyramidion = mesh(pyramidGeo, gold, y + pyramidH / 2);
  pyramidion.name = 'pyramidion';
  group.add(pyramidion);

  return group;
}

function addFigure(parent: THREE.Group, x: number, z: number, scale: number): void {
  const fig = new THREE.Group();
  fig.name = 'figure';
  fig.position.set(x, 1, z);
  fig.add(mesh(new THREE.CylinderGeometry(0.35 * scale, 0.4 * scale, 1.2 * scale, 8), bronze, 0.6 * scale));
  fig.add(mesh(new THREE.SphereGeometry(0.28 * scale, 10, 8), bronze, 1.45 * scale));
  const arm = mesh(new THREE.CylinderGeometry(0.08 * scale, 0.08 * scale, scale, 6), bronze, 1.1 * scale);
  arm.rotation.z = Math.PI / 4;
  fig.add(arm);
  parent.add(fig);
}

function createFountain(name: string, figureCount: number, tierCount: number): THREE.Group {
  const group = new THREE.Group();
  group.name = name;

  const basins = new THREE.Group();
  basins.name = 'basins';
  const figures = new THREE.Group();
  figures.name = 'figures';
  const water = new THREE.Group();
  water.name = 'water';

  basins.add(mesh(new THREE.CylinderGeometry(8, 8.4, 1, 48), stone, 0.5));
  const lowerWater = mesh(new THREE.CylinderGeometry(7.6, 7.6, 0.05, 48), waterMaterial, 0.9);
  lowerWater.castShadow = false;
  water.add(lowerWater);

  let y = 1;
  const stemH = 3;
  basins.add(mesh(new THREE.CylinderGeometry(0.9, 1.3, stemH, 16), bronze, y + stemH / 2));
  y += stemH;
  for (let t = 0; t < tierCount; t++) {
    const r = 3.4 - t * 1.1;
    basins.add(mesh(new THREE.CylinderGeometry(r, r * 0.7, 0.5, 32), stone, y + 0.25));
    const tierWater = mesh(new THREE.CylinderGeometry(r * 0.9, r * 0.9, 0.05, 32), waterMaterial, y + 0.5);
    tierWater.castShadow = false;
    water.add(tierWater);
    y += 1.2;
    basins.add(mesh(new THREE.CylinderGeometry(0.4, 0.5, 0.7, 12), bronze, y - 0.35));
  }

  for (let i = 0; i < figureCount; i++) {
    const a = (i / figureCount) * Math.PI * 2;
    addFigure(figures, Math.cos(a) * 6.2, Math.sin(a) * 6.2, 1.6);
  }

  const jets = new THREE.Group();
  jets.name = 'jets';
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const jet = mesh(new THREE.CylinderGeometry(0.04, 0.12, 2, 6), waterMaterial, 2);
    jet.position.x = Math.cos(a) * 4.5;
    jet.position.z = Math.sin(a) * 4.5;
    jet.castShadow = false;
    jets.add(jet);
  }
  water.add(jets);

  group.add(basins, figures, water);
  return group;
}

export function createObeliskAndFountains(): THREE.Group {
  const root = new THREE.Group();
  root.name = 'landmarks';
  root.add(createObelisk());

  const mers = createFountain('fontaine-des-mers', 6, 2);
  mers.position.z = -FOUNTAIN_Z;
  const fleuves = createFountain('fontaine-des-fleuves', 6, 2);
  fleuves.position.z = FOUNTAIN_Z;
  root.add(mers, fleuves);

  return root;
}
