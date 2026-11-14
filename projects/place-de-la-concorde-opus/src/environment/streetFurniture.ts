import * as THREE from 'three';

const LAMP_COUNT = 44;
const LAMP_RADIUS_X = 100;
const LAMP_RADIUS_Z = 86;
const STATUE_RADIUS_X = 92;
const STATUE_RADIUS_Z = 78;
const STATUE_COUNT = 8;

const materials = {
  limestone: () => new THREE.MeshStandardMaterial({ color: 0xd8c8a6, roughness: 0.85, metalness: 0 }),
  granite: () => new THREE.MeshStandardMaterial({ color: 0x8c857b, roughness: 0.7, metalness: 0.05 }),
  stone: () => new THREE.MeshStandardMaterial({ color: 0xc4b392, roughness: 0.8, metalness: 0 }),
  bronze: () => new THREE.MeshStandardMaterial({ color: 0x3f4a3c, roughness: 0.45, metalness: 0.7 }),
  gold: () => new THREE.MeshStandardMaterial({ color: 0xd9a93a, roughness: 0.3, metalness: 0.9 }),
  glass: () =>
    new THREE.MeshStandardMaterial({
      color: 0xfff1c8,
      emissive: 0xffc766,
      emissiveIntensity: 0.55,
      roughness: 0.2,
      transparent: true,
      opacity: 0.9,
    }),
};

function lerpAngle(index: number, count: number, offset: number): number {
  return ((index + offset) / count) * Math.PI * 2;
}

function createLamps(mats: Record<keyof typeof materials, THREE.Material>, disposables: THREE.BufferGeometry[]): THREE.Group {
  const group = new THREE.Group();
  group.name = 'ornate-lamps';

  // Each part is one shared geometry rendered as a single InstancedMesh.
  const parts: { geo: THREE.BufferGeometry; mat: THREE.Material; y: number }[] = [
    { geo: new THREE.CylinderGeometry(0.55, 0.7, 0.9, 12), mat: mats.granite, y: 0.45 },
    { geo: new THREE.CylinderGeometry(0.3, 0.42, 1.2, 12), mat: mats.bronze, y: 1.5 },
    { geo: new THREE.CylinderGeometry(0.14, 0.2, 4.2, 10), mat: mats.bronze, y: 3.9 },
    { geo: new THREE.TorusGeometry(0.22, 0.06, 8, 16), mat: mats.gold, y: 2.2 },
    { geo: new THREE.TorusGeometry(0.2, 0.06, 8, 16), mat: mats.gold, y: 5.9 },
    { geo: new THREE.CylinderGeometry(0.5, 0.28, 1.1, 8), mat: mats.glass, y: 6.55 },
    { geo: new THREE.ConeGeometry(0.62, 0.55, 8), mat: mats.bronze, y: 7.35 },
    { geo: new THREE.SphereGeometry(0.16, 10, 8), mat: mats.gold, y: 7.78 },
  ];
  // Torus rings lie flat.
  parts[3].geo.rotateX(Math.PI / 2);
  parts[4].geo.rotateX(Math.PI / 2);

  const matrix = new THREE.Matrix4();
  const quat = new THREE.Quaternion();
  const scale = new THREE.Vector3(1, 1, 1);
  const pos = new THREE.Vector3();

  parts.forEach((part) => {
    disposables.push(part.geo);
    const mesh = new THREE.InstancedMesh(part.geo, part.mat, LAMP_COUNT);
    for (let i = 0; i < LAMP_COUNT; i++) {
      const a = lerpAngle(i, LAMP_COUNT, 0.5);
      pos.set(Math.cos(a) * LAMP_RADIUS_X, part.y, Math.sin(a) * LAMP_RADIUS_Z);
      matrix.compose(pos, quat, scale);
      mesh.setMatrixAt(i, matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.frustumCulled = false;
    group.add(mesh);
  });

  return group;
}

function createStatues(mats: Record<keyof typeof materials, THREE.Material>, disposables: THREE.BufferGeometry[]): THREE.Group {
  const group = new THREE.Group();
  group.name = 'allegorical-statues';

  const geo = {
    plinth: new THREE.BoxGeometry(5.6, 0.8, 5.6),
    pedestal: new THREE.BoxGeometry(4.2, 3.4, 4.2),
    cornice: new THREE.BoxGeometry(4.8, 0.45, 4.8),
    robe: new THREE.CylinderGeometry(0.6, 1.25, 3.2, 14),
    torso: new THREE.CylinderGeometry(0.62, 0.78, 1.3, 12),
    head: new THREE.SphereGeometry(0.42, 14, 12),
    crown: new THREE.CylinderGeometry(0.46, 0.5, 0.35, 8),
    arm: new THREE.CylinderGeometry(0.14, 0.18, 1.7, 8),
    staff: new THREE.CylinderGeometry(0.07, 0.07, 4.2, 6),
    emblem: new THREE.TorusGeometry(0.55, 0.09, 8, 20),
    shield: new THREE.CylinderGeometry(0.75, 0.75, 0.14, 20),
    flame: new THREE.ConeGeometry(0.28, 0.8, 8),
    wing: new THREE.BoxGeometry(0.12, 1.9, 1.1),
  };
  disposables.push(...Object.values(geo));

  const add = (parent: THREE.Object3D, g: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number) => {
    const mesh = new THREE.Mesh(g, m);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };

  // Eight allegorical attributes, one silhouette per statue.
  const attributes = ['torch', 'sword', 'wreath', 'shield', 'staff', 'wings', 'book', 'horn'] as const;

  for (let i = 0; i < STATUE_COUNT; i++) {
    const a = lerpAngle(i, STATUE_COUNT, 0.5);
    const statue = new THREE.Group();
    statue.name = `statue-${attributes[i]}`;
    statue.position.set(Math.cos(a) * STATUE_RADIUS_X, 0, Math.sin(a) * STATUE_RADIUS_Z);
    statue.rotation.y = Math.atan2(-statue.position.x, -statue.position.z);

    add(statue, geo.plinth, mats.granite, 0, 0.4, 0);
    add(statue, geo.pedestal, mats.limestone, 0, 2.5, 0);
    add(statue, geo.cornice, mats.stone, 0, 4.45, 0);

    const base = 4.68;
    add(statue, geo.robe, mats.stone, 0, base + 1.6, 0);
    add(statue, geo.torso, mats.stone, 0, base + 3.85, 0);
    add(statue, geo.head, mats.stone, 0, base + 4.85, 0);
    add(statue, geo.crown, mats.gold, 0, base + 5.25, 0); // mural crown of a city

    const rightArm = add(statue, geo.arm, mats.stone, 0.85, base + 4.1, 0);
    rightArm.rotation.z = -0.35;
    const leftArm = add(statue, geo.arm, mats.stone, -0.85, base + 3.9, 0.1);
    leftArm.rotation.z = 0.3;

    switch (attributes[i]) {
      case 'torch': {
        rightArm.rotation.z = -0.2;
        rightArm.position.y += 0.5;
        add(statue, geo.staff, mats.bronze, 1.2, base + 4.2, 0).scale.setScalar(0.4);
        add(statue, geo.flame, mats.gold, 1.2, base + 5.5, 0);
        break;
      }
      case 'sword': {
        const blade = add(statue, geo.staff, mats.bronze, -1.3, base + 3.2, 0.3);
        blade.scale.set(1.4, 0.7, 1.4);
        break;
      }
      case 'wreath': {
        const ring = add(statue, geo.emblem, mats.gold, 1.2, base + 5.0, 0);
        ring.rotation.x = Math.PI / 2;
        break;
      }
      case 'shield': {
        const sh = add(statue, geo.shield, mats.bronze, -1.2, base + 3.0, 0.4);
        sh.rotation.x = Math.PI / 2;
        break;
      }
      case 'staff': {
        add(statue, geo.staff, mats.bronze, 1.4, base + 2.8, 0);
        break;
      }
      case 'wings': {
        add(statue, geo.wing, mats.stone, 0.75, base + 3.9, -0.5).rotation.z = -0.3;
        add(statue, geo.wing, mats.stone, -0.75, base + 3.9, -0.5).rotation.z = 0.3;
        break;
      }
      case 'book': {
        add(statue, geo.shield, mats.bronze, 0, base + 3.0, 0.8).rotation.x = Math.PI / 2.4;
        break;
      }
      case 'horn': {
        const horn = add(statue, geo.flame, mats.gold, -1.2, base + 3.6, 0.3);
        horn.rotation.z = Math.PI / 2.6;
        break;
      }
    }

    group.add(statue);
  }

  return group;
}

export function createStreetFurniture(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'street-furniture';

  const mats = {
    limestone: materials.limestone(),
    granite: materials.granite(),
    stone: materials.stone(),
    bronze: materials.bronze(),
    gold: materials.gold(),
    glass: materials.glass(),
  };
  const geometries: THREE.BufferGeometry[] = [];

  group.add(createLamps(mats, geometries));
  group.add(createStatues(mats, geometries));

  group.userData.dispose = () => {
    geometries.forEach((g) => g.dispose());
    Object.values(mats).forEach((m) => m.dispose());
  };

  return group;
}
