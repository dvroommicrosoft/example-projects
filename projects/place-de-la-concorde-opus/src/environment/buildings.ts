import * as THREE from 'three';

interface Batch {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  matrices: THREE.Matrix4[];
}

export function createBuildings(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'surrounding-paris';
  const stone = new THREE.MeshStandardMaterial({ color: 0xd7cbb0, roughness: 0.88 });
  const trim = new THREE.MeshStandardMaterial({ color: 0xf0e3c9, roughness: 0.83 });
  const recess = new THREE.MeshStandardMaterial({ color: 0x5a5c58, roughness: 0.6 });
  const roof = new THREE.MeshStandardMaterial({ color: 0x6e7c84, roughness: 0.75, metalness: 0.15 });
  const foliage = new THREE.MeshStandardMaterial({ color: 0x637b50, roughness: 1 });
  const trunk = new THREE.MeshStandardMaterial({ color: 0x746552, roughness: 1 });
  const box = new THREE.BoxGeometry(1, 1, 1);
  const cylinder = new THREE.CylinderGeometry(0.5, 0.57, 1, 12);
  const sphere = new THREE.IcosahedronGeometry(1, 1);
  const triangle = new THREE.Shape();
  triangle.moveTo(-7.5, 0);
  triangle.lineTo(7.5, 0);
  triangle.lineTo(0, 3.2);
  triangle.closePath();
  const pedimentGeometry = new THREE.ExtrudeGeometry(triangle, { depth: 0.8, bevelEnabled: false });
  const batches = new Map<string, Batch>();
  const dummy = new THREE.Object3D();
  const place = (name: string, geometry: THREE.BufferGeometry, material: THREE.Material,
    x: number, y: number, z: number, w: number, h: number, d: number) => {
    let batch = batches.get(name);
    if (!batch) {
      batch = { geometry, material, matrices: [] };
      batches.set(name, batch);
    }
    dummy.position.set(x, y, z);
    dummy.scale.set(w, h, d);
    dummy.updateMatrix();
    batch.matrices.push(dummy.matrix.clone());
  };

  for (const [centerX, name] of [[-54, 'hotel-de-crillon'], [54, 'hotel-de-la-marine']] as const) {
    const building = new THREE.Group();
    building.name = name;
    const body = new THREE.Mesh(new THREE.BoxGeometry(82, 20, 18), stone);
    body.position.set(centerX, 10, -108);
    body.castShadow = true;
    body.receiveShadow = true;
    building.add(body);
    group.add(building);

    for (const [y, height, depth] of [[0.4, 0.8, 21], [5, 0.5, 19.5], [17.6, 0.6, 21], [20.4, 1, 21]] as const) {
      place('facade-cornices', box, trim, centerX, y, -108, 84, height, depth);
    }
    place('slate-mansard', box, roof, centerX, 22.2, -108, 80, 3, 17);
    place('roof-ridge', box, trim, centerX, 23.8, -108, 81, 0.35, 1);

    for (let column = 0; column < 17; column++) {
      const x = centerX - 37.5 + column * 4.7;
      place('arcade-recesses', box, recess, x, 2.7, -98.93, 2.5, 3.6, 0.22);
      place('arcade-piers', box, trim, x - 1.8, 2.5, -98.5, 0.7, 4.7, 1.2);
      for (const y of [8.6, 14]) {
        place('window-surrounds', box, trim, x, y, -98.82, 2.4, 3.8, 0.3);
        place('window-glazing', box, recess, x, y, -98.6, 1.8, 3.2, 0.12);
        place('window-mullions', box, stone, x, y, -98.48, 0.12, 3.25, 0.14);
        place('window-transoms', box, stone, x, y + 0.3, -98.46, 1.8, 0.12, 0.16);
      }
      place('colonnade-shafts', cylinder, trim, x - 2, 11.6, -97.8, 0.8, 11.6, 0.8);
      for (const y of [5.8, 17.4]) {
        place('column-capitals', box, trim, x - 2, y, -97.8, 1.35, 0.45, 1.35);
      }
      place('balustrade-uprights', box, trim, x, 21.3, -97.9, 0.32, 1.3, 0.32);
      place('roof-dormers', box, trim, x, 22.3, -99.2, 1.6, 1.8, 1);
      place('dormer-windows', box, recess, x, 22.3, -98.65, 1, 1.2, 0.12);
    }
    place('balustrade-rails', box, trim, centerX, 22, -97.9, 84, 0.3, 0.6);
    for (const offset of [-32, 0, 32]) {
      const pediment = new THREE.Mesh(pedimentGeometry, trim);
      pediment.name = 'classical-pediment';
      pediment.position.set(centerX + offset, 20.8, -98);
      pediment.castShadow = true;
      group.add(pediment);
    }
    for (const x of [-28, -10, 10, 28]) {
      place('chimneys', box, stone, centerX + x, 25.3, -110, 1.5, 3.2, 2);
    }
  }

  for (let i = 0; i < 13; i++) {
    const x = -132 + i * 22;
    const height = 17 + (i % 4) * 2;
    place('distant-city-blocks', box, stone, x, height / 2, -157, 21, height, 23);
    place('distant-roofs', box, roof, x, height + 1.1, -157, 22, 2.2, 24);
  }
  for (let i = 0; i < 12; i++) {
    for (const side of [-1, 1]) {
      const x = side * (145 + (i % 2) * 16);
      const z = -112 + i * 19;
      place('promenade-tree-trunks', cylinder, trunk, x, 2.8, z, 0.8, 5.6, 0.8);
      place('promenade-tree-canopies', sphere, foliage, x, 7.5, z, 4.6, 5.5, 4.6);
    }
  }
  for (const [name, batch] of batches) {
    const mesh = new THREE.InstancedMesh(batch.geometry, batch.material, batch.matrices.length);
    mesh.name = name;
    batch.matrices.forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
    mesh.castShadow = !name.startsWith('distant');
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  return group;
}
