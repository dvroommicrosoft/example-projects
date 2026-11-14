import * as THREE from 'three';

const OUTLINE: [number, number][] = [
  [-76, -89], [76, -89], [108, -59], [108, 59],
  [76, 89], [-76, 89], [-108, 59], [-108, -59],
];

export function createGround(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'ground-and-streets';
  const stone = new THREE.MeshStandardMaterial({ color: 0xc3bca9, roughness: 0.96 });
  const curb = new THREE.MeshStandardMaterial({ color: 0xe7ddc6, roughness: 0.9 });
  const asphalt = new THREE.MeshStandardMaterial({ color: 0x686b69, roughness: 1 });
  const grass = new THREE.MeshStandardMaterial({ color: 0x78896a, roughness: 1 });
  const marking = new THREE.MeshStandardMaterial({ color: 0xd7d3bd, roughness: 1 });
  const box = new THREE.BoxGeometry(1, 1, 1);
  const addBox = (name: string, mat: THREE.Material, x: number, y: number, z: number,
    width: number, height: number, depth: number) => {
    const mesh = new THREE.Mesh(box, mat);
    mesh.name = name;
    mesh.position.set(x, y, z);
    mesh.scale.set(width, height, depth);
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };
  addBox('surrounding-streets', asphalt, 0, -0.5, 0, 480, 0.6, 380);
  addBox('tuileries-garden', grass, 178, -0.13, 0, 85, 0.2, 285);
  addBox('western-promenade', grass, -178, -0.13, -35, 85, 0.2, 215);
  addBox('north-pavement', curb, 0, -0.12, -112, 235, 0.3, 20);
  addBox('seine-quay', curb, 0, -0.12, 118, 250, 0.3, 15);

  const outline = new THREE.Shape(OUTLINE.map(([x, z]) => new THREE.Vector2(x, -z)));
  const paving = new THREE.Mesh(new THREE.ShapeGeometry(outline), stone);
  paving.name = 'octagonal-plaza';
  paving.rotation.x = -Math.PI / 2;
  paving.receiveShadow = true;
  group.add(paving);

  const matrix = new THREE.Matrix4();
  const dummy = new THREE.Object3D();
  const tilePositions: [number, number][] = [];
  for (let x = -104; x <= 104; x += 4) {
    for (let z = -85; z <= 85; z += 4) {
      if (Math.abs(x) > 74 && Math.abs(z) > 57
        && (Math.abs(x) - 74) / 32 + (Math.abs(z) - 57) / 30 > 1) continue;
      tilePositions.push([x, z]);
    }
  }
  const tiles = new THREE.InstancedMesh(box, stone, tilePositions.length);
  tiles.name = 'individual-paving-stones';
  tilePositions.forEach(([x, z], i) => {
    dummy.position.set(x, -0.009, z);
    dummy.scale.set(3.94, 0.025, 3.94);
    dummy.updateMatrix();
    tiles.setMatrixAt(i, dummy.matrix);
    const variation = 0.91 + ((i * 13) % 17) / 140;
    tiles.setColorAt(i, new THREE.Color(variation, variation, variation));
  });
  tiles.receiveShadow = true;
  group.add(tiles);

  const edges = new THREE.InstancedMesh(box, curb, OUTLINE.length);
  edges.name = 'perimeter-kerbs';
  OUTLINE.forEach(([x, z], i) => {
    const [nx, nz] = OUTLINE[(i + 1) % OUTLINE.length];
    dummy.position.set((x + nx) / 2, 0.06, (z + nz) / 2);
    dummy.rotation.y = -Math.atan2(nz - z, nx - x);
    dummy.scale.set(Math.hypot(nx - x, nz - z), 0.18, 0.65);
    dummy.updateMatrix();
    edges.setMatrixAt(i, dummy.matrix);
  });
  edges.receiveShadow = true;
  group.add(edges);

  const dashes: THREE.Matrix4[] = [];
  for (let x = -120; x <= 120; x += 12) {
    for (const z of [-97, 102]) {
      matrix.makeScale(5, 0.02, 0.22).setPosition(x, -0.18, z);
      dashes.push(matrix.clone());
    }
  }
  for (let z = -80; z <= 80; z += 12) {
    for (const x of [-120, 120]) {
      matrix.makeScale(0.22, 0.02, 5).setPosition(x, -0.18, z);
      dashes.push(matrix.clone());
    }
  }
  const lanes = new THREE.InstancedMesh(box, marking, dashes.length);
  lanes.name = 'road-lane-markings';
  dashes.forEach((m, i) => lanes.setMatrixAt(i, m));
  group.add(lanes);

  for (const z of [-69, 69]) {
    addBox('central-promenade-inlay', curb, 0, 0.015, z, 5, 0.018, 20);
  }
  return group;
}
