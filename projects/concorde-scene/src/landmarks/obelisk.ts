import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { MATERIALS, mergeParts, seededRandom, type Part } from './util';

export const OBELISK_HEIGHT = 23;
const SHAFT_HEIGHT = 20;
const PYRAMIDION_HEIGHT = OBELISK_HEIGHT - SHAFT_HEIGHT;
const BASE_HALF_WIDTH = 1.2;
const TOP_HALF_WIDTH = 0.75;
const SQRT2 = Math.SQRT2;

/** Height of the top of the stepped pedestal; the obelisk group is lifted by this amount. */
export const PEDESTAL_HEIGHT = 3.15;

function halfWidthAt(y: number): number {
  return THREE.MathUtils.lerp(BASE_HALF_WIDTH, TOP_HALF_WIDTH, y / SHAFT_HEIGHT);
}

/** Rows of tiny carved bars hinting at hieroglyph columns on each of the four faces. */
function createCarvings(): THREE.Mesh {
  const rand = seededRandom(1836);
  const slope = Math.atan((BASE_HALF_WIDTH - TOP_HALF_WIDTH) / SHAFT_HEIGHT);
  const geos: THREE.BufferGeometry[] = [];
  const m = new THREE.Matrix4();
  const local = new THREE.Matrix4();
  const faceRot = new THREE.Matrix4();
  const tilt = new THREE.Matrix4().makeRotationX(-slope);
  const columns = [-0.4, 0, 0.4];

  for (let face = 0; face < 4; face++) {
    faceRot.makeRotationY((face * Math.PI) / 2);
    for (const col of columns) {
      const scaleW = halfWidthAt(SHAFT_HEIGHT * 0.5) / BASE_HALF_WIDTH;
      for (let y = 2.5; y < SHAFT_HEIGHT - 1.2; y += 0.42) {
        const w = 0.04 + rand() * 0.22;
        const h = 0.1 + rand() * 0.16;
        const g = new THREE.BoxGeometry(w, h, 0.03);
        local.makeTranslation(col * scaleW * halfWidthAt(y) * 1.1 + (rand() - 0.5) * 0.12, y, halfWidthAt(y) + 0.005);
        m.copy(faceRot).multiply(local);
        // Tilt each bar to follow the shaft taper (applied about its own centre first).
        g.applyMatrix4(tilt);
        g.applyMatrix4(m);
        geos.push(g);
      }
    }
  }
  const merged = mergeGeometries(geos, false);
  geos.forEach((g) => g.dispose());
  if (!merged) throw new Error('Failed to merge obelisk carvings');
  const mesh = new THREE.Mesh(merged, MATERIALS.carving());
  mesh.name = 'obelisk-carvings';
  mesh.receiveShadow = true;
  return mesh;
}

function createPedestal(): THREE.Group {
  const granite = MATERIALS.granite();
  const gold = MATERIALS.gold();
  const g = new THREE.Group();
  g.name = 'obelisk-pedestal';

  const steps: [number, number][] = [
    [9, 0.35],
    [7.5, 0.35],
    [6, 0.35],
  ];
  const parts: Part[] = [];
  let y = 0;
  for (const [w, h] of steps) {
    parts.push({ geometry: new THREE.BoxGeometry(w, h, w), position: [0, y + h / 2, 0] as [number, number, number] });
    y += h;
  }
  parts.push({ geometry: new THREE.BoxGeometry(4.2, 1.8, 4.2), position: [0, y + 0.9, 0] });
  y += 1.8;
  parts.push({ geometry: new THREE.BoxGeometry(4.8, 0.3, 4.8), position: [0, y + 0.15, 0] });
  y += 0.3;
  g.add(mergeParts(parts, granite, 'obelisk-pedestal-body'));

  // Gilded dedication bands on each plinth face.
  const bands: Part[] = [];
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2;
    bands.push({
      geometry: new THREE.BoxGeometry(2.6, 0.7, 0.06),
      position: [Math.sin(a) * 2.13, 1.05 + 1.05, Math.cos(a) * 2.13] as [number, number, number],
      rotation: [0, a, 0] as [number, number, number],
    });
  }
  g.add(mergeParts(bands, gold, 'obelisk-pedestal-gold'));
  return g;
}

export function createObelisk(): THREE.Group {
  const root = new THREE.Group();
  root.name = 'obelisk-monument';
  root.add(createPedestal());

  const obelisk = new THREE.Group();
  obelisk.name = 'obelisk';
  obelisk.position.y = PEDESTAL_HEIGHT;

  const granite = MATERIALS.granite();
  const gold = MATERIALS.gold();

  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(TOP_HALF_WIDTH * SQRT2, BASE_HALF_WIDTH * SQRT2, SHAFT_HEIGHT, 4, 1),
    granite,
  );
  shaft.geometry.rotateY(Math.PI / 4);
  shaft.position.y = SHAFT_HEIGHT / 2;
  shaft.name = 'obelisk-shaft';
  shaft.castShadow = shaft.receiveShadow = true;
  obelisk.add(shaft);

  // Pyramidion: the lower part is granite, the top metre is gilded.
  const goldHeight = 1;
  const pyrRadius = TOP_HALF_WIDTH * SQRT2;
  const pyr = new THREE.Mesh(new THREE.CylinderGeometry(pyrRadius * (goldHeight / PYRAMIDION_HEIGHT), pyrRadius, PYRAMIDION_HEIGHT - goldHeight, 4), granite);
  pyr.geometry.rotateY(Math.PI / 4);
  // Cone slope: radius shrinks linearly to 0 over PYRAMIDION_HEIGHT, so the cut radius is r*(gold/H).
  pyr.position.y = SHAFT_HEIGHT + (PYRAMIDION_HEIGHT - goldHeight) / 2;
  pyr.name = 'obelisk-pyramidion';
  pyr.castShadow = pyr.receiveShadow = true;
  obelisk.add(pyr);

  const tip = new THREE.Mesh(new THREE.ConeGeometry(pyrRadius * (goldHeight / PYRAMIDION_HEIGHT), goldHeight, 4), gold);
  tip.geometry.rotateY(Math.PI / 4);
  tip.position.y = OBELISK_HEIGHT - goldHeight / 2;
  tip.name = 'obelisk-tip';
  tip.castShadow = true;
  obelisk.add(tip);

  obelisk.add(createCarvings());
  root.add(obelisk);
  return root;
}
