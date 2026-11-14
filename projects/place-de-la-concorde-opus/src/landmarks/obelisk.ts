import * as THREE from 'three';

// Dimensions in meters. Total height (pedestal + shaft + pyramidion) is ~23 m.
const PEDESTAL_HEIGHT = 3.2;
const SHAFT_HEIGHT = 17.9;
const SHAFT_BASE_WIDTH = 2.6;
const SHAFT_TOP_WIDTH = 1.6;
const PYRAMIDION_HEIGHT = 1.9;

const SHAFT_TAPER_ANGLE = Math.atan((SHAFT_BASE_WIDTH - SHAFT_TOP_WIDTH) / 2 / SHAFT_HEIGHT);

/** Half width of the shaft at a height measured from the world ground plane. */
function shaftHalfWidthAt(y: number): number {
  const t = THREE.MathUtils.clamp((y - PEDESTAL_HEIGHT) / SHAFT_HEIGHT, 0, 1);
  return THREE.MathUtils.lerp(SHAFT_BASE_WIDTH, SHAFT_TOP_WIDTH, t) / 2;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Square-section frustum with flat faces aligned to the X and Z axes. */
function createSquareFrustum(topWidth: number, bottomWidth: number, height: number): THREE.CylinderGeometry {
  const geometry = new THREE.CylinderGeometry(topWidth / Math.SQRT2, bottomWidth / Math.SQRT2, height, 4, 1);
  geometry.rotateY(Math.PI / 4);
  return geometry;
}

function extrudeShape(shape: THREE.Shape, depth: number): THREE.ExtrudeGeometry {
  return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 10 });
}

type GlyphKind = 'disc' | 'ring' | 'bar' | 'zigzag' | 'triangle' | 'cartouche' | 'eye';

function createGlyphGeometries(depth: number): Record<GlyphKind, THREE.ExtrudeGeometry> {
  const disc = new THREE.Shape().absarc(0, 0, 0.5, 0, Math.PI * 2, false);

  const ring = new THREE.Shape();
  ring.absarc(0, 0, 0.5, 0, Math.PI * 2, false);
  const ringHole = new THREE.Path();
  ringHole.absarc(0, 0, 0.3, 0, Math.PI * 2, true);
  ring.holes.push(ringHole);

  const bar = new THREE.Shape();
  bar.moveTo(-0.5, -0.12);
  bar.lineTo(0.5, -0.12);
  bar.lineTo(0.5, 0.12);
  bar.lineTo(-0.5, 0.12);
  bar.closePath();

  const zigzag = new THREE.Shape();
  const zigPoints: Array<[number, number]> = [
    [-0.5, -0.1], [-0.3, 0.2], [-0.1, -0.1], [0.1, 0.2], [0.3, -0.1], [0.5, 0.2],
  ];
  zigPoints.forEach(([x, y], i) => (i === 0 ? zigzag.moveTo(x, y) : zigzag.lineTo(x, y)));
  for (let i = zigPoints.length - 1; i >= 0; i--) {
    zigzag.lineTo(zigPoints[i][0], zigPoints[i][1] - 0.14);
  }
  zigzag.closePath();

  const triangle = new THREE.Shape();
  triangle.moveTo(-0.5, -0.4);
  triangle.lineTo(0.5, -0.4);
  triangle.lineTo(0, 0.5);
  triangle.closePath();

  // Rounded cartouche outline: a stadium shape with a smaller stadium cut out.
  const stadium = (hw: number, hh: number, r: number, target: THREE.Path) => {
    target.moveTo(-hw + r, -hh);
    target.lineTo(hw - r, -hh);
    target.absarc(hw - r, -hh + r, r, -Math.PI / 2, 0, false);
    target.lineTo(hw, hh - r);
    target.absarc(hw - r, hh - r, r, 0, Math.PI / 2, false);
    target.lineTo(-hw + r, hh);
    target.absarc(-hw + r, hh - r, r, Math.PI / 2, Math.PI, false);
    target.lineTo(-hw, -hh + r);
    target.absarc(-hw + r, -hh + r, r, Math.PI, Math.PI * 1.5, false);
  };
  const cartouche = new THREE.Shape();
  stadium(0.5, 0.5, 0.25, cartouche);
  const cartoucheHole = new THREE.Path();
  stadium(0.34, 0.34, 0.17, cartoucheHole);
  cartouche.holes.push(cartoucheHole);

  // Stylised eye: almond outline with a pupil-less lens shape.
  const eye = new THREE.Shape();
  eye.moveTo(-0.5, 0);
  eye.quadraticCurveTo(0, 0.5, 0.5, 0);
  eye.quadraticCurveTo(0, -0.5, -0.5, 0);
  const eyeHole = new THREE.Path();
  eyeHole.moveTo(-0.3, 0);
  eyeHole.quadraticCurveTo(0, -0.24, 0.3, 0);
  eyeHole.quadraticCurveTo(0, 0.24, -0.3, 0);
  eye.holes.push(eyeHole);

  return {
    disc: extrudeShape(disc, depth),
    ring: extrudeShape(ring, depth),
    bar: extrudeShape(bar, depth),
    zigzag: extrudeShape(zigzag, depth),
    triangle: extrudeShape(triangle, depth),
    cartouche: extrudeShape(cartouche, depth),
    eye: extrudeShape(eye, depth),
  };
}

interface GlyphPlacement {
  kind: GlyphKind;
  matrix: THREE.Matrix4;
}

/** Builds engraved-style glyph columns on all four tapered faces of the shaft. */
function createGlyphs(material: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  group.name = 'obelisk-engravings';

  const depth = 0.035;
  const geometries = createGlyphGeometries(depth);
  const kinds = Object.keys(geometries) as GlyphKind[];
  const placements: Record<GlyphKind, THREE.Matrix4[]> = {
    disc: [], ring: [], bar: [], zigzag: [], triangle: [], cartouche: [], eye: [],
  };

  const pickable = kinds.filter((k) => k !== 'cartouche');
  const random = mulberry32(1836);
  const faceMatrix = new THREE.Matrix4();
  const local = new THREE.Matrix4();
  const tilt = new THREE.Matrix4().makeRotationX(-SHAFT_TAPER_ANGLE);
  const scale = new THREE.Matrix4();
  const columnOffsets = [-0.56, 0, 0.56];
  const startY = PEDESTAL_HEIGHT + 1.3;
  const endY = PEDESTAL_HEIGHT + SHAFT_HEIGHT - 1.0;
  const rowSpacing = 0.62;

  const push = (placement: GlyphPlacement) => placements[placement.kind].push(placement.matrix);

  for (let face = 0; face < 4; face++) {
    faceMatrix.makeRotationY((face * Math.PI) / 2);

    // Two shallow vertical divider rules between the three columns.
    for (const x of [-0.28, 0.28]) {
      const yMid = (startY + endY) / 2;
      const hw = shaftHalfWidthAt(yMid);
      const length = endY - startY;
      local.makeTranslation(x * hw * 2, yMid, hw + 0.004).multiply(tilt);
      scale.makeScale(0.1, length, 1);
      push({ kind: 'bar', matrix: faceMatrix.clone().multiply(local).multiply(scale).multiply(new THREE.Matrix4().makeRotationZ(Math.PI / 2)) });
    }

    let row = 0;
    for (let y = startY; y <= endY; y += rowSpacing, row++) {
      const hw = shaftHalfWidthAt(y);
      const size = hw * 0.34;
      for (let c = 0; c < columnOffsets.length; c++) {
        const centerColumn = c === 1;
        // Cartouches appear sparsely in the central column; other cells are picked at random.
        let kind: GlyphKind;
        if (centerColumn && row % 9 === 4) {
          kind = 'cartouche';
        } else {
          kind = pickable[Math.floor(random() * pickable.length)];
        }
        if (random() < 0.08) continue;

        const sx = kind === 'cartouche' ? size * 0.8 : size * (0.8 + random() * 0.3);
        const sy = kind === 'cartouche' ? size * 1.5 : size * (0.8 + random() * 0.3);
        // Deterministic jitter keeps columns from looking mechanically stamped.
        const jitter = (random() - 0.5) * 0.02;
        local.makeTranslation(columnOffsets[c] * hw + jitter, y, hw + 0.002).multiply(tilt);
        scale.makeScale(sx, sy, 1);
        push({ kind, matrix: faceMatrix.clone().multiply(local).multiply(scale) });
      }
    }
  }

  for (const kind of kinds) {
    const matrices = placements[kind];
    if (matrices.length === 0) continue;
    const mesh = new THREE.InstancedMesh(geometries[kind], material, matrices.length);
    mesh.name = `obelisk-glyph-${kind}`;
    matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  return group;
}

function createPedestal(
  limestone: THREE.Material,
  limestoneTrim: THREE.Material,
  bronze: THREE.Material,
  gold: THREE.Material,
): THREE.Group {
  const pedestal = new THREE.Group();
  pedestal.name = 'obelisk-pedestal';

  const box = new THREE.BoxGeometry(1, 1, 1);
  const tiers: Array<{ name: string; width: number; height: number; material: THREE.Material }> = [
    { name: 'plinth-lower-step', width: 6.4, height: 0.4, material: limestoneTrim },
    { name: 'plinth-upper-step', width: 5.6, height: 0.4, material: limestone },
    { name: 'base-moulding', width: 4.8, height: 0.3, material: limestoneTrim },
    { name: 'die', width: 4.0, height: 1.5, material: limestone },
    { name: 'cornice', width: 4.5, height: 0.25, material: limestoneTrim },
    { name: 'cap-slab', width: 3.6, height: 0.35, material: limestone },
  ];

  let y = 0;
  let dieBottom = 0;
  let dieHeight = 0;
  for (const tier of tiers) {
    const mesh = new THREE.Mesh(box, tier.material);
    mesh.name = `obelisk-pedestal-${tier.name}`;
    mesh.scale.set(tier.width, tier.height, tier.width);
    mesh.position.y = y + tier.height / 2;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    pedestal.add(mesh);
    if (tier.name === 'die') {
      dieBottom = y;
      dieHeight = tier.height;
    }
    y += tier.height;
  }

  // Bronze inscription plates and gilded rules on the four faces of the die.
  const plate = new THREE.BoxGeometry(2.6, 0.9, 0.06);
  const rule = new THREE.BoxGeometry(2.9, 0.04, 0.05);
  const dieHalf = 2.0;
  for (let face = 0; face < 4; face++) {
    const holder = new THREE.Group();
    holder.name = `obelisk-pedestal-face-${face}`;
    holder.rotation.y = (face * Math.PI) / 2;

    const plateMesh = new THREE.Mesh(plate, bronze);
    plateMesh.name = 'obelisk-bronze-plate';
    plateMesh.position.set(0, dieBottom + dieHeight / 2, dieHalf + 0.03);
    plateMesh.castShadow = true;
    plateMesh.receiveShadow = true;
    holder.add(plateMesh);

    for (const dy of [-0.55, 0.55]) {
      const ruleMesh = new THREE.Mesh(rule, gold);
      ruleMesh.name = 'obelisk-gilded-rule';
      ruleMesh.position.set(0, dieBottom + dieHeight / 2 + dy, dieHalf + 0.026);
      ruleMesh.receiveShadow = true;
      holder.add(ruleMesh);
    }
    pedestal.add(holder);
  }

  // Bronze corner feet beneath the shaft, set on the cap slab.
  const foot = new THREE.BoxGeometry(0.34, 0.26, 0.34);
  const capTop = PEDESTAL_HEIGHT;
  const footOffset = SHAFT_BASE_WIDTH / 2 + 0.02;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const mesh = new THREE.Mesh(foot, bronze);
      mesh.name = 'obelisk-bronze-corner-foot';
      mesh.position.set(sx * footOffset, capTop + 0.13, sz * footOffset);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      pedestal.add(mesh);
    }
  }

  return pedestal;
}

export function createObelisk(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'luxor-obelisk';

  const granite = new THREE.MeshStandardMaterial({ name: 'obelisk-rose-granite', color: 0xb78672, roughness: 0.55, metalness: 0.05 });
  const engraving = new THREE.MeshStandardMaterial({ name: 'obelisk-engraving', color: 0x6d4a3d, roughness: 0.8, metalness: 0.0 });
  const limestone = new THREE.MeshStandardMaterial({ name: 'obelisk-limestone', color: 0xd9ccb0, roughness: 0.85, metalness: 0.0 });
  const limestoneTrim = new THREE.MeshStandardMaterial({ name: 'obelisk-limestone-trim', color: 0xc8b997, roughness: 0.8, metalness: 0.0 });
  const bronze = new THREE.MeshStandardMaterial({ name: 'obelisk-bronze', color: 0x7a5a32, roughness: 0.4, metalness: 0.75 });
  const gold = new THREE.MeshStandardMaterial({
    name: 'obelisk-gold',
    color: 0xe0b44a,
    roughness: 0.28,
    metalness: 0.9,
    emissive: 0x3a2808,
    emissiveIntensity: 0.35,
  });

  group.add(createPedestal(limestone, limestoneTrim, bronze, gold));

  const shaft = new THREE.Mesh(createSquareFrustum(SHAFT_TOP_WIDTH, SHAFT_BASE_WIDTH, SHAFT_HEIGHT), granite);
  shaft.name = 'obelisk-shaft';
  shaft.position.y = PEDESTAL_HEIGHT + SHAFT_HEIGHT / 2;
  shaft.castShadow = true;
  shaft.receiveShadow = true;
  group.add(shaft);

  group.add(createGlyphs(engraving));

  // Slender gilded collar where the shaft meets the pyramidion.
  const shaftTop = PEDESTAL_HEIGHT + SHAFT_HEIGHT;
  const collar = new THREE.Mesh(createSquareFrustum(SHAFT_TOP_WIDTH + 0.06, SHAFT_TOP_WIDTH + 0.1, 0.12), gold);
  collar.name = 'obelisk-gilded-collar';
  collar.position.y = shaftTop - 0.06;
  collar.castShadow = true;
  collar.receiveShadow = true;
  group.add(collar);

  const pyramidion = new THREE.Mesh(createSquareFrustum(0.02, SHAFT_TOP_WIDTH, PYRAMIDION_HEIGHT), gold);
  pyramidion.name = 'obelisk-golden-pyramidion';
  pyramidion.position.y = shaftTop + PYRAMIDION_HEIGHT / 2;
  pyramidion.castShadow = true;
  pyramidion.receiveShadow = false;
  group.add(pyramidion);

  return group;
}
