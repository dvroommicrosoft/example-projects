import * as THREE from 'three';

// Stylized Luxor Obelisk on its pedestal. Artistic approximation: the carved
// marks are abstract glyph-like shapes, not authentic hieroglyphic text.

const SHAFT_HEIGHT = 23.0;
const PYRAMIDION_HEIGHT = 1.0;
const SHAFT_BASE_HALF = 1.1;
const SHAFT_TOP_HALF = 0.72;
const PEDESTAL_TOP_Y = 9.0;

function markShadows(mesh: THREE.Object3D): void {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
}

function box(
  w: number,
  h: number,
  d: number,
  y0: number,
  material: THREE.Material,
  name: string,
  geometries: THREE.BufferGeometry[],
): THREE.Mesh {
  const geometry = new THREE.BoxGeometry(w, h, d);
  geometries.push(geometry);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.position.y = y0 + h / 2;
  markShadows(mesh);
  return mesh;
}

function createPedestal(
  stone: THREE.Material,
  darkStone: THREE.Material,
  goldTrim: THREE.Material,
  geometries: THREE.BufferGeometry[],
): THREE.Group {
  const pedestal = new THREE.Group();
  pedestal.name = 'ObeliskPedestal';

  // Stepped base
  const steps: Array<[number, number]> = [
    [9.6, 0.45],
    [8.7, 0.45],
    [7.8, 0.45],
    [6.9, 0.45],
  ];
  let y = 0;
  steps.forEach(([size, h], i) => {
    pedestal.add(box(size, h, size, y, stone, `ObeliskPedestalStep${i + 1}`, geometries));
    y += h;
  });

  // Plinth + die
  pedestal.add(box(5.9, 0.7, 5.9, y, darkStone, 'ObeliskPedestalPlinth', geometries));
  y += 0.7;
  const dieHeight = 5.4;
  const dieSize = 5.0;
  pedestal.add(box(dieSize, dieHeight, dieSize, y, stone, 'ObeliskPedestalDie', geometries));

  // Inset panels and gilded edge frames on each face of the die
  const panels = new THREE.Group();
  panels.name = 'ObeliskPedestalPanels';
  const panelGeo = new THREE.BoxGeometry(3.6, 3.8, 0.12);
  const frameGeoH = new THREE.BoxGeometry(3.9, 0.1, 0.14);
  const frameGeoV = new THREE.BoxGeometry(0.1, 4.1, 0.14);
  geometries.push(panelGeo, frameGeoH, frameGeoV);
  const panelY = y + dieHeight / 2;
  for (let face = 0; face < 4; face++) {
    const holder = new THREE.Group();
    holder.name = `ObeliskPedestalPanelFace${face + 1}`;
    holder.rotation.y = (face * Math.PI) / 2;
    const inset = new THREE.Mesh(panelGeo, darkStone);
    inset.name = 'ObeliskInsetPanel';
    inset.position.set(0, panelY, dieSize / 2 + 0.02);
    markShadows(inset);
    holder.add(inset);
    const frameParts: Array<[THREE.BufferGeometry, number, number]> = [
      [frameGeoH, 0, 2.0],
      [frameGeoH, 0, -2.0],
      [frameGeoV, 1.9, 0],
      [frameGeoV, -1.9, 0],
    ];
    frameParts.forEach(([g, dx, dy], i) => {
      const f = new THREE.Mesh(g, goldTrim);
      f.name = `ObeliskPanelFrame${i + 1}`;
      f.position.set(dx, panelY + dy, dieSize / 2 + 0.1);
      markShadows(f);
      holder.add(f);
    });
    panels.add(holder);
  }
  pedestal.add(panels);

  y += dieHeight;
  pedestal.add(box(5.5, 0.35, 5.5, y, darkStone, 'ObeliskPedestalCorniceLower', geometries));
  y += 0.35;
  pedestal.add(box(5.9, 0.3, 5.9, y, stone, 'ObeliskPedestalCornice', geometries));
  y += 0.3;
  pedestal.add(box(5.2, 0.25, 5.2, y, darkStone, 'ObeliskPedestalCap', geometries));
  y += 0.25;

  // Slim gilded socle the shaft rests on
  pedestal.add(box(2.9, PEDESTAL_TOP_Y - y, 2.9, y, goldTrim, 'ObeliskShaftSocle', geometries));
  return pedestal;
}

function shaftHalfWidth(y: number, baseY: number): number {
  const t = THREE.MathUtils.clamp((y - baseY) / SHAFT_HEIGHT, 0, 1);
  return THREE.MathUtils.lerp(SHAFT_BASE_HALF, SHAFT_TOP_HALF, t);
}

function createHieroglyphs(
  baseY: number,
  material: THREE.Material,
  geometries: THREE.BufferGeometry[],
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'ObeliskHieroglyphs';

  // Three abstract glyph shapes, each instanced across all faces and columns.
  const barGeo = new THREE.BoxGeometry(0.1, 0.34, 0.03);
  const discGeo = new THREE.CylinderGeometry(0.075, 0.075, 0.03, 10);
  discGeo.rotateX(Math.PI / 2);
  const wedgeGeo = new THREE.ConeGeometry(0.1, 0.26, 3);
  wedgeGeo.scale(1, 1, 0.2);
  geometries.push(barGeo, discGeo, wedgeGeo);
  const shapes = [barGeo, discGeo, wedgeGeo];
  const names = ['ObeliskGlyphBars', 'ObeliskGlyphDiscs', 'ObeliskGlyphWedges'];

  const columnOffsets = [-0.42, 0, 0.42];
  const rowSpacing = 0.62;
  const startY = baseY + 1.6;
  const endY = baseY + SHAFT_HEIGHT - 2.4;
  const rows = Math.floor((endY - startY) / rowSpacing);
  const tilt = Math.atan((SHAFT_BASE_HALF - SHAFT_TOP_HALF) / SHAFT_HEIGHT);

  const counts = [0, 0, 0];
  const entries: Array<{ kind: number; matrix: THREE.Matrix4 }> = [];
  const dummy = new THREE.Object3D();
  for (let face = 0; face < 4; face++) {
    for (let c = 0; c < columnOffsets.length; c++) {
      for (let r = 0; r < rows; r++) {
        // Deterministic variety with occasional gaps.
        const seed = (face * 31 + c * 17 + r * 7) % 11;
        if (seed === 0) continue;
        const kind = (r + c + face) % 3;
        const y = startY + r * rowSpacing;
        const half = shaftHalfWidth(y, baseY);
        dummy.position.set(columnOffsets[c] * (half / SHAFT_BASE_HALF), y, half + 0.005);
        dummy.rotation.set(-tilt, 0, 0);
        dummy.scale.setScalar(0.85 + (seed % 3) * 0.12);
        dummy.updateMatrix();
        const m = new THREE.Matrix4()
          .makeRotationY((face * Math.PI) / 2)
          .multiply(dummy.matrix);
        entries.push({ kind, matrix: m });
        counts[kind]++;
      }
    }
  }

  shapes.forEach((geo, kind) => {
    const mesh = new THREE.InstancedMesh(geo, material, Math.max(counts[kind], 1));
    mesh.name = names[kind];
    mesh.count = counts[kind];
    let i = 0;
    for (const e of entries) {
      if (e.kind === kind) mesh.setMatrixAt(i++, e.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    markShadows(mesh);
    group.add(mesh);
  });
  return group;
}

export function createObelisk(): THREE.Group {
  const root = new THREE.Group();
  root.name = 'LuxorObelisk';

  const geometries: THREE.BufferGeometry[] = [];
  const stone = new THREE.MeshStandardMaterial({ color: 0xcfc4ae, roughness: 0.88, metalness: 0.02 });
  const darkStone = new THREE.MeshStandardMaterial({ color: 0xb3a68d, roughness: 0.9, metalness: 0.02 });
  const granite = new THREE.MeshStandardMaterial({ color: 0xc58f7a, roughness: 0.62, metalness: 0.05 });
  const carving = new THREE.MeshStandardMaterial({ color: 0x8a5a48, roughness: 0.95, metalness: 0 });
  const gold = new THREE.MeshStandardMaterial({
    color: 0xf2c14e,
    roughness: 0.28,
    metalness: 0.9,
    emissive: 0x3a2705,
    emissiveIntensity: 0.35,
  });

  root.add(createPedestal(stone, darkStone, gold, geometries));

  const baseY = PEDESTAL_TOP_Y;

  // Tapered square shaft: 4-sided cylinder rotated so faces are axis-aligned.
  const shaftGeo = new THREE.CylinderGeometry(
    SHAFT_TOP_HALF * Math.SQRT2,
    SHAFT_BASE_HALF * Math.SQRT2,
    SHAFT_HEIGHT,
    4,
    1,
  );
  shaftGeo.rotateY(Math.PI / 4);
  const shaft = new THREE.Mesh(shaftGeo, granite);
  shaft.name = 'ObeliskShaft';
  shaft.position.y = baseY + SHAFT_HEIGHT / 2;
  markShadows(shaft);
  root.add(shaft);

  const tipGeo = new THREE.ConeGeometry(SHAFT_TOP_HALF * Math.SQRT2, PYRAMIDION_HEIGHT, 4, 1);
  tipGeo.rotateY(Math.PI / 4);
  const tip = new THREE.Mesh(tipGeo, gold);
  tip.name = 'ObeliskPyramidion';
  tip.position.y = baseY + SHAFT_HEIGHT + PYRAMIDION_HEIGHT / 2;
  markShadows(tip);
  root.add(tip);

  root.add(createHieroglyphs(baseY, carving, geometries));

  root.userData = {
    totalHeight: baseY + SHAFT_HEIGHT + PYRAMIDION_HEIGHT,
    shaftHeight: SHAFT_HEIGHT + PYRAMIDION_HEIGHT,
    pedestalHeight: baseY,
    note: 'Stylized approximation; carvings are abstract, not authentic hieroglyphs.',
  };
  return root;
}
