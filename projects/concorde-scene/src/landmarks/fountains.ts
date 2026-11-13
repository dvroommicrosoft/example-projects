import * as THREE from 'three';
import { MATERIALS, mergeParts, type Part } from './util';

export interface FountainOptions {
  name: string;
  /** Number of seated figures around the lower basin. */
  figures: number;
  /** Number of leaping tritons/dolphins on the upper tier. */
  upperFigures: number;
  /** Phase offset (radians) so the two fountains don't shimmer in lockstep. */
  phase: number;
}

/** Lathe profile (radius, height) of a shallow basin wall with a thick rim. */
function basinProfile(radius: number, height: number, wall: number): THREE.Vector2[] {
  return [
    new THREE.Vector2(0.01, 0),
    new THREE.Vector2(radius + wall, 0),
    new THREE.Vector2(radius + wall, height),
    new THREE.Vector2(radius + wall * 0.2, height + wall * 0.3),
    new THREE.Vector2(radius, height),
    new THREE.Vector2(radius, height * 0.35),
    new THREE.Vector2(0.01, height * 0.35),
  ];
}

function figure(angle: number, radius: number, y: number, size: number): Part[] {
  const x = Math.sin(angle) * radius;
  const z = Math.cos(angle) * radius;
  const out: Part[] = [];
  // Torso, head, raised arm and a curled tail pointing at the water.
  out.push({ geometry: new THREE.CylinderGeometry(0.28 * size, 0.36 * size, 1.1 * size, 8), position: [x, y + 0.55 * size, z] });
  out.push({ geometry: new THREE.SphereGeometry(0.24 * size, 10, 8), position: [x, y + 1.3 * size, z] });
  out.push({
    geometry: new THREE.CylinderGeometry(0.07 * size, 0.09 * size, 0.9 * size, 6),
    position: [x + Math.cos(angle) * 0.35 * size, y + 1.35 * size, z - Math.sin(angle) * 0.35 * size],
    rotation: [0, 0, 0.5],
  });
  out.push({
    geometry: new THREE.ConeGeometry(0.34 * size, 1.4 * size, 8),
    position: [x + Math.sin(angle) * 0.5 * size, y + 0.1 * size, z + Math.cos(angle) * 0.5 * size],
    rotation: [Math.cos(angle) * 1.9, 0, -Math.sin(angle) * 1.9],
  });
  return out;
}

/** Builds a monumental two-tier fountain centred on its local origin (y = 0 is ground). */
export function createFountain(opts: FountainOptions): THREE.Group {
  const root = new THREE.Group();
  root.name = opts.name;
  root.userData.phase = opts.phase;

  const stone = MATERIALS.stone();
  const bronze = MATERIALS.bronze();
  const gold = MATERIALS.gold();

  const lowerR = 8;
  const lowerH = 0.9;
  const upperR = 3.4;
  const upperY = 3.4;
  const stemH = upperY;

  // Stone: lower basin, stem, upper basin and their plinths, merged to a single mesh.
  const stoneParts: Part[] = [
    { geometry: new THREE.CylinderGeometry(lowerR + 1.6, lowerR + 1.8, 0.25, 48), position: [0, 0.125, 0] },
    { geometry: new THREE.LatheGeometry(basinProfile(lowerR, lowerH, 0.45), 48), position: [0, 0.25, 0] },
    { geometry: new THREE.CylinderGeometry(1.1, 1.8, stemH, 16), position: [0, 0.25 + stemH / 2, 0] },
    { geometry: new THREE.LatheGeometry(basinProfile(upperR, 0.7, 0.35), 40), position: [0, 0.25 + upperY, 0] },
    { geometry: new THREE.CylinderGeometry(0.4, 0.7, 2.4, 12), position: [0, 0.25 + upperY + 1.5, 0] },
    { geometry: new THREE.CylinderGeometry(1.4, 1.4, 0.35, 20), position: [0, 0.25 + upperY + 2.9, 0] },
  ];
  root.add(mergeParts(stoneParts, stone, `${opts.name}-stone`));

  // Bronze figures around both tiers.
  const figureParts: Part[] = [];
  for (let i = 0; i < opts.figures; i++) {
    figureParts.push(...figure((i / opts.figures) * Math.PI * 2, lowerR - 1.2, 0.25 + lowerH * 0.35, 1.5));
  }
  for (let i = 0; i < opts.upperFigures; i++) {
    figureParts.push(...figure(((i + 0.5) / opts.upperFigures) * Math.PI * 2, 1.8, 0.25 + upperY + 0.3, 1.1));
  }
  root.add(mergeParts(figureParts, bronze, `${opts.name}-figures`));

  // Gilded accents: rim studs on the lower basin and a finial on top.
  const goldParts: Part[] = [
    { geometry: new THREE.SphereGeometry(0.4, 12, 10), position: [0, 0.25 + upperY + 3.4, 0] },
    { geometry: new THREE.ConeGeometry(0.12, 0.7, 8), position: [0, 0.25 + upperY + 4.0, 0] },
  ];
  const studs = 24;
  for (let i = 0; i < studs; i++) {
    const a = (i / studs) * Math.PI * 2;
    goldParts.push({
      geometry: new THREE.SphereGeometry(0.16, 8, 6),
      position: [Math.sin(a) * (lowerR + 0.45), 0.25 + lowerH + 0.2, Math.cos(a) * (lowerR + 0.45)],
    });
  }
  root.add(mergeParts(goldParts, gold, `${opts.name}-gold`));

  // Water: one translucent disc per basin plus a faint central jet. Shared material so shimmer is cheap.
  const waterMat = MATERIALS.water();
  const lowerWater = new THREE.Mesh(new THREE.CircleGeometry(lowerR - 0.05, 48), waterMat);
  lowerWater.rotation.x = -Math.PI / 2;
  lowerWater.position.y = 0.25 + lowerH * 0.8;
  lowerWater.name = `${opts.name}-water-lower`;
  lowerWater.userData.baseY = lowerWater.position.y;
  lowerWater.receiveShadow = true;

  const upperWater = new THREE.Mesh(new THREE.CircleGeometry(upperR - 0.05, 40), waterMat);
  upperWater.rotation.x = -Math.PI / 2;
  upperWater.position.y = 0.25 + upperY + 0.55;
  upperWater.name = `${opts.name}-water-upper`;
  upperWater.userData.baseY = upperWater.position.y;
  upperWater.receiveShadow = true;

  const jet = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.14, 2.2, 8, 1, true), waterMat);
  jet.position.y = 0.25 + upperY + 4.2;
  jet.name = `${opts.name}-jet`;

  const water = new THREE.Group();
  water.name = `${opts.name}-water`;
  water.add(lowerWater, upperWater, jet);
  root.add(water);

  return root;
}
