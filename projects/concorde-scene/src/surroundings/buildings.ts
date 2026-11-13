import * as THREE from 'three';
import { materials as m } from './materials';

export function mesh(
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  x = 0,
  y = 0,
  z = 0,
  shadow = true,
): THREE.Mesh {
  const o = new THREE.Mesh(geo, mat);
  o.position.set(x, y, z);
  o.castShadow = shadow;
  o.receiveShadow = true;
  return o;
}

export const box = (w: number, h: number, d: number, mat: THREE.Material, x = 0, y = 0, z = 0) =>
  mesh(new THREE.BoxGeometry(w, h, d), mat, x, y + h / 2, z);

/** One instanced row of columns along X at the given z, standing on y=base. */
export function columnRow(
  count: number,
  span: number,
  radius: number,
  height: number,
  x: number,
  base: number,
  z: number,
): THREE.InstancedMesh {
  const geo = new THREE.CylinderGeometry(radius * 0.9, radius, height, 12);
  const row = new THREE.InstancedMesh(geo, m.stone, count);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    dummy.position.set(x - span / 2 + t * span, base + height / 2, z);
    dummy.updateMatrix();
    row.setMatrixAt(i, dummy.matrix);
  }
  row.instanceMatrix.needsUpdate = true;
  row.castShadow = true;
  row.receiveShadow = true;
  row.computeBoundingSphere();
  return row;
}

/** Hip-style mansard: steep lower slope plus a flatter slate cap. */
function mansard(w: number, d: number, y: number): THREE.Group {
  const g = new THREE.Group();
  const a = mesh(
    new THREE.CylinderGeometry(Math.SQRT1_2 * (w - 6), Math.SQRT1_2 * w, 7, 4, 1),
    m.slate,
  );
  a.rotation.y = Math.PI / 4;
  a.scale.set(1, 1, d / w);
  a.position.y = y + 3.5;
  g.add(a);
  const cap = mesh(
    new THREE.CylinderGeometry(Math.SQRT1_2 * (w - 14), Math.SQRT1_2 * (w - 6), 3, 4, 1),
    m.slate,
  );
  cap.rotation.y = Math.PI / 4;
  cap.scale.set(1, 1, d / w);
  cap.position.y = y + 8.5;
  g.add(cap);
  return g;
}

/**
 * Neoclassical colonnaded block facing south (+Z), centred at (cx, cz).
 * Front face lies at z = cz + depth / 2.
 */
export function colonnadedBuilding(
  name: string,
  cx: number,
  cz: number,
  width: number,
  depth: number,
): THREE.Group {
  const g = new THREE.Group();
  g.name = name;
  const frontZ = cz + depth / 2;
  const rusticH = 8;
  const colH = 14;
  const wallH = rusticH + colH + 3;

  g.add(box(width, wallH, depth, m.stone, cx, 0, cz));
  g.add(box(width + 2, 1.2, depth + 2, m.stoneDark, cx, 0, cz)); // plinth
  // loggia colonnade stands proud of the facade
  const loggiaD = 6;
  g.add(box(width * 0.8, rusticH + colH, 0.8, m.stoneDark, cx, 0, frontZ - loggiaD)); // recess wall
  const cols = columnRow(12, width * 0.8, 0.9, colH, cx, rusticH, frontZ + 0.5);
  cols.name = `${name}-columns`;
  g.add(cols);
  g.add(box(width * 0.86, 3, loggiaD + 2, m.stone, cx, rusticH + colH, frontZ - loggiaD / 2 + 0.5)); // entablature
  g.add(box(width * 0.9, 1, loggiaD + 3, m.stoneDark, cx, wallH, frontZ - loggiaD / 2 + 1)); // cornice
  g.add(box(width + 2, 1.2, depth + 2, m.stoneDark, cx, wallH, cz)); // main cornice
  const roof = mansard(width, depth, wallH + 1.2);
  roof.position.set(cx, 0, cz);
  roof.name = `${name}-roof`;
  g.add(roof);
  for (let i = 0; i < 4; i++) {
    g.add(box(2, 6, 2, m.stoneDark, cx - width / 3 + (i * 2 * width) / 9, wallH + 8, cz));
  }
  return g;
}

export function createBuildings(): THREE.Group {
  const g = new THREE.Group();
  g.name = 'buildings';
  // rue Royale runs north between the two blocks (gap ~25 m, centred on x=0)
  g.add(colonnadedBuilding('hotel-de-la-marine', 43, -130, 62, 40));
  g.add(colonnadedBuilding('hotel-de-crillon', -43, -130, 62, 40));
  // flanking street-wall blocks continuing up rue Royale
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const z = -190 - i * 45;
      const b = box(40, 24, 38, m.stone, sx * 32, 0, z);
      b.name = 'rue-royale-block';
      g.add(b);
      const r = box(42, 4, 40, m.slate, sx * 32, 24, z);
      g.add(r);
    }
  }
  return g;
}

/** Madeleine church: a distant stylized peristyle temple at the end of rue Royale. */
export function createMadeleine(): THREE.Group {
  const g = new THREE.Group();
  g.name = 'madeleine';
  const z = -400;
  g.add(box(44, 4, 70, m.silhouette, 0, 0, z)); // podium
  g.add(box(36, 22, 62, m.silhouette, 0, 4, z));
  const cols = columnRow(8, 36, 1.4, 22, 0, 4, z + 31);
  cols.material = m.silhouette;
  g.add(cols);
  const pediment = mesh(new THREE.CylinderGeometry(20, 20, 1, 3), m.silhouette);
  pediment.rotation.set(Math.PI / 2, 0, 0);
  pediment.scale.set(1, 1, 0.22);
  pediment.position.set(0, 4 + 22 + 3.5, z + 32);
  g.add(pediment);
  g.add(box(36, 4, 62, m.silhouette, 0, 26, z));
  const dome = mesh(
    new THREE.SphereGeometry(10, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    m.silhouette,
    0,
    30,
    z - 10,
  );
  g.add(dome);
  return g;
}
