import * as THREE from 'three';
import { MATERIALS } from './util';

export const BOLLARD_RING_RADIUS = 13;
const BOLLARD_COUNT = 40;

/** Flat paving markings (rings and a compass star) plus a ring of low bollards around the obelisk. */
export function createPlazaDetails(): THREE.Group {
  const g = new THREE.Group();
  g.name = 'plaza-details';

  const stone = MATERIALS.stone();
  const gold = MATERIALS.gold();
  const carving = MATERIALS.carving();
  const lift = new THREE.MeshStandardMaterial({ color: 0x9a8d78, roughness: 0.95 });

  // Paving rosette: pale disc, darker rings, polygonal border. Slightly above y=0 and polygon-offset to avoid z-fighting.
  for (const m of [stone, lift, carving]) {
    m.polygonOffset = true;
    m.polygonOffsetFactor = -2;
    m.polygonOffsetUnits = -2;
  }
  const disc = new THREE.Mesh(new THREE.CircleGeometry(11, 64), stone);
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 0.03;
  disc.name = 'plaza-paving-disc';
  disc.receiveShadow = true;

  const ringGeo = (inner: number, outer: number, seg = 64) => new THREE.RingGeometry(inner, outer, seg);
  const rings = new THREE.Group();
  rings.name = 'plaza-paving-rings';
  for (const [inner, outer, mat] of [
    [4.8, 5.1, carving],
    [10.4, 10.9, lift],
    [15.2, 15.5, carving],
  ] as const) {
    const r = new THREE.Mesh(ringGeo(inner, outer, 96), mat);
    r.rotation.x = -Math.PI / 2;
    r.position.y = 0.045;
    r.receiveShadow = true;
    rings.add(r);
  }

  // Eight-point compass star: thin strips along the cardinal and diagonal axes.
  const star = new THREE.Group();
  star.name = 'plaza-compass-star';
  for (let i = 0; i < 4; i++) {
    const long = i % 2 === 0;
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(long ? 30 : 21, 0.25), long ? gold : lift);
    strip.rotation.x = -Math.PI / 2;
    strip.rotation.z = (i * Math.PI) / 4;
    strip.position.y = 0.05;
    strip.receiveShadow = true;
    star.add(strip);
  }
  g.add(disc, rings, star);

  // Bollards: two instanced meshes (stone shafts, gilded caps).
  const shaftGeo = new THREE.CylinderGeometry(0.22, 0.28, 0.9, 12);
  const capGeo = new THREE.SphereGeometry(0.24, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  const bollards = new THREE.InstancedMesh(shaftGeo, MATERIALS.granite(), BOLLARD_COUNT);
  const caps = new THREE.InstancedMesh(capGeo, gold, BOLLARD_COUNT);
  bollards.name = 'plaza-bollards';
  caps.name = 'plaza-bollard-caps';
  const m = new THREE.Matrix4();
  for (let i = 0; i < BOLLARD_COUNT; i++) {
    const a = (i / BOLLARD_COUNT) * Math.PI * 2;
    const x = Math.sin(a) * BOLLARD_RING_RADIUS;
    const z = Math.cos(a) * BOLLARD_RING_RADIUS;
    bollards.setMatrixAt(i, m.makeTranslation(x, 0.45, z));
    caps.setMatrixAt(i, m.makeTranslation(x, 0.9, z));
  }
  for (const im of [bollards, caps]) {
    im.castShadow = true;
    im.receiveShadow = true;
    im.instanceMatrix.needsUpdate = true;
    g.add(im);
  }
  return g;
}
