import * as THREE from 'three';

export interface ConcordeScene {
  group: THREE.Group;
  update: (elapsedSeconds: number) => void;
  dispose: () => void;
}

const PLAZA_HALF_X = 90;
const PLAZA_HALF_Z = 110;
const FACADE_Z = -90;
const FOUNTAIN_Z = 30;

const PALETTE = {
  sandstone: 0xd8bf94,
  sandstoneDark: 0xb99a6b,
  paving: 0xc9b48c,
  pavingLine: 0x9c8760,
  road: 0x4a4641,
  verdigris: 0x5f9e8f,
  gold: 0xe0b23c,
  granite: 0xc0916c,
  water: 0x9fd6e6,
  roof: 0x5d6b6a,
  leaf: 0x4d7a45,
  leafLight: 0x6f9a4f,
  trunk: 0x5a4632,
  glass: 0x3d4f5c,
};

// Small deterministic PRNG so the artwork is identical on every load.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Procedural paving: large slabs with joints and mild tonal variation.
function createPavingTexture(): THREE.DataTexture {
  const size = 128;
  const slab = 32;
  const data = new Uint8Array(size * size * 4);
  const rand = mulberry32(7);
  const base = new THREE.Color(PALETTE.paving);
  const line = new THREE.Color(PALETTE.pavingLine);
  const tone = Array.from({ length: 16 }, () => 0.92 + rand() * 0.16);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const joint = x % slab === 0 || y % slab === 0;
      const c = joint ? line : base;
      const k = joint ? 1 : tone[Math.floor(y / slab) * 4 + Math.floor(x / slab)] * (0.97 + rand() * 0.06);
      const o = (y * size + x) * 4;
      data[o] = Math.min(255, Math.round(c.r * 255 * k));
      data[o + 1] = Math.min(255, Math.round(c.g * 255 * k));
      data[o + 2] = Math.min(255, Math.round(c.b * 255 * k));
      data[o + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}

export function createConcordeScene(): ConcordeScene {
  const group = new THREE.Group();
  group.name = 'place-de-la-concorde';

  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];
  let disposed = false;

  const geo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };
  const mat = (color: number, opts: THREE.MeshStandardMaterialParameters = {}) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...opts });
    materials.push(m);
    return m;
  };

  const mesh = (
    name: string,
    g: THREE.BufferGeometry,
    m: THREE.Material,
    x = 0,
    y = 0,
    z = 0,
    cast = true,
  ) => {
    const o = new THREE.Mesh(g, m);
    o.name = name;
    o.position.set(x, y, z);
    o.castShadow = cast;
    o.receiveShadow = true;
    return o;
  };

  const instanced = (
    name: string,
    g: THREE.BufferGeometry,
    m: THREE.Material,
    matrices: THREE.Matrix4[],
    cast = true,
  ) => {
    const o = new THREE.InstancedMesh(g, m, Math.max(1, matrices.length));
    o.name = name;
    matrices.forEach((mx, i) => o.setMatrixAt(i, mx));
    o.count = matrices.length;
    o.instanceMatrix.needsUpdate = true;
    o.castShadow = cast;
    o.receiveShadow = true;
    return o;
  };

  const tmp = new THREE.Object3D();
  const matrixAt = (x: number, y: number, z: number, sx = 1, sy = 1, sz = 1, ry = 0) => {
    tmp.position.set(x, y, z);
    tmp.rotation.set(0, ry, 0);
    tmp.scale.set(sx, sy, sz);
    tmp.updateMatrix();
    return tmp.matrix.clone();
  };

  // Shared materials
  const sandstone = mat(PALETTE.sandstone);
  const sandstoneDark = mat(PALETTE.sandstoneDark);
  const granite = mat(PALETTE.granite, { roughness: 0.6 });
  const gold = mat(PALETTE.gold, { metalness: 0.8, roughness: 0.3, emissive: 0x3a2a05 });
  const verdigris = mat(PALETTE.verdigris, { metalness: 0.3, roughness: 0.55 });
  const roofMat = mat(PALETTE.roof, { roughness: 0.7 });
  const glassMat = mat(PALETTE.glass, { roughness: 0.3, metalness: 0.2 });
  const roadMat = mat(PALETTE.road, { roughness: 0.95 });
  const waterMat = mat(PALETTE.water, {
    transparent: true,
    opacity: 0.75,
    roughness: 0.15,
    emissive: 0x16323c,
  });
  const hieroMat = mat(0x5b3a26);
  const leafMat = mat(PALETTE.leaf);
  const leafLightMat = mat(PALETTE.leafLight);
  const trunkMat = mat(PALETTE.trunk);

  const pavingTex = createPavingTexture();
  textures.push(pavingTex);
  pavingTex.repeat.set((PLAZA_HALF_X * 2) / 8, (PLAZA_HALF_Z * 2) / 8);
  const pavingMat = mat(0xffffff, { map: pavingTex, roughness: 0.9 });

  // ---------------------------------------------------------------- Plaza
  const plaza = new THREE.Group();
  plaza.name = 'plaza';
  group.add(plaza);

  const paving = mesh(
    'plaza-paving',
    geo(new THREE.PlaneGeometry(PLAZA_HALF_X * 2, PLAZA_HALF_Z * 2)),
    pavingMat,
    0,
    0,
    0,
    false,
  );
  paving.rotation.x = -Math.PI / 2;
  plaza.add(paving);

  // Inlaid ring and compass-star around the obelisk.
  const inlayMat = mat(0x8c7a55, { roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -1 });
  const ring = mesh('plaza-ring', geo(new THREE.RingGeometry(14, 15, 64)), inlayMat, 0, 0.02, 0, false);
  ring.rotation.x = -Math.PI / 2;
  plaza.add(ring);
  const starGeo = geo(new THREE.BoxGeometry(0.6, 0.02, 56));
  const starMatrices = [0, 1, 2, 3].map((i) => matrixAt(0, 0.03, 0, 1, 1, 1, (i * Math.PI) / 4));
  plaza.add(instanced('plaza-star', starGeo, inlayMat, starMatrices, false));

  // Streets radiating from the plaza (avenue along Z, cross street along X)
  const streets = new THREE.Group();
  streets.name = 'streets';
  group.add(streets);
  const streetDefs: Array<[string, number, number, number, number]> = [
    ['street-south-avenue', 0, PLAZA_HALF_Z + 60, 36, 120],
    ['street-north-rue-royale', 0, FACADE_Z - 65, 24, 110],
    ['street-east-riverside', PLAZA_HALF_X + 40, 0, 80, 34],
    ['street-west-rivoli', -PLAZA_HALF_X - 40, 0, 80, 34],
  ];
  const roadGeoms = new Map<string, THREE.PlaneGeometry>();
  for (const [name, x, z, w, d] of streetDefs) {
    const key = `${w}x${d}`;
    let g = roadGeoms.get(key);
    if (!g) {
      g = geo(new THREE.PlaneGeometry(w, d));
      roadGeoms.set(key, g);
    }
    const r = mesh(name, g, roadMat, x, 0.01, z, false);
    r.rotation.x = -Math.PI / 2;
    streets.add(r);
  }
  const dashGeo = geo(new THREE.BoxGeometry(0.4, 0.02, 4));
  const dashMatrices: THREE.Matrix4[] = [];
  for (let z = PLAZA_HALF_Z + 4; z < PLAZA_HALF_Z + 118; z += 9) dashMatrices.push(matrixAt(0, 0.03, z));
  streets.add(instanced('street-lane-marks', dashGeo, mat(0xe8e2d0), dashMatrices, false));

  // ------------------------------------------------------------- Obelisk
  const obelisk = new THREE.Group();
  obelisk.name = 'obelisk';
  group.add(obelisk);

  const plinthDefs: Array<[number, number]> = [
    [11, 0.8],
    [9, 0.8],
    [7.4, 2.6],
  ];
  let py = 0;
  plinthDefs.forEach(([w, h], i) => {
    obelisk.add(
      mesh(`obelisk-plinth-${i}`, geo(new THREE.BoxGeometry(w, h, w)), i === 2 ? granite : sandstone, 0, py + h / 2, 0),
    );
    py += h;
  });
  const plinthTop = py;
  // Shaft: 4-sided tapering prism rotated so faces align with the axes (apothem = radius / sqrt2).
  const shaftH = 20.2;
  const apothemBottom = 2.55;
  const apothemTop = 1.55;
  const shaft = mesh(
    'obelisk-shaft',
    geo(new THREE.CylinderGeometry(apothemTop * Math.SQRT2, apothemBottom * Math.SQRT2, shaftH, 4, 1)),
    granite,
    0,
    plinthTop + shaftH / 2,
    0,
  );
  shaft.rotation.y = Math.PI / 4;
  obelisk.add(shaft);
  const shaftTopY = plinthTop + shaftH;
  const tipH = 2.4;
  const tip = mesh(
    'obelisk-tip',
    geo(new THREE.ConeGeometry(apothemTop * Math.SQRT2, tipH, 4, 1)),
    gold,
    0,
    shaftTopY + tipH / 2,
    0,
  );
  tip.rotation.y = Math.PI / 4;
  obelisk.add(tip);

  // Original hieroglyph-like marks: abstract glyph blocks in columns on each face.
  const glyphGeos = [
    geo(new THREE.BoxGeometry(0.3, 0.45, 0.04)),
    geo(new THREE.CylinderGeometry(0.15, 0.15, 0.04, 10).rotateX(Math.PI / 2)),
    geo(new THREE.BoxGeometry(0.5, 0.14, 0.04)),
    geo(new THREE.ConeGeometry(0.2, 0.45, 3)),
  ];
  const glyphRand = mulberry32(2024);
  const glyphMatrices: THREE.Matrix4[][] = glyphGeos.map(() => []);
  const up = new THREE.Vector3(0, 1, 0);
  for (let face = 0; face < 4; face++) {
    const ang = (face * Math.PI) / 2;
    for (let col = -1; col <= 1; col++) {
      for (let y = plinthTop + 1.5; y < shaftTopY - 1; y += 0.85) {
        if (glyphRand() < 0.18) continue;
        const f = (y - plinthTop) / shaftH;
        const half = apothemBottom + (apothemTop - apothemBottom) * f;
        const p = new THREE.Vector3(col * half * 0.55, y, half + 0.02).applyAxisAngle(up, ang);
        const kind = Math.floor(glyphRand() * glyphGeos.length);
        const s = 0.7 + glyphRand() * 0.6;
        glyphMatrices[kind].push(matrixAt(p.x, p.y, p.z, s, s, s, ang));
      }
    }
  }
  glyphGeos.forEach((g, i) => obelisk.add(instanced(`obelisk-glyphs-${i}`, g, hieroMat, glyphMatrices[i], false)));

  // ------------------------------------------------------------ Fountains
  const jetGeo = geo(new THREE.ConeGeometry(0.16, 1, 8, 1, true));
  jetGeo.translate(0, 0.5, 0); // base at origin so scale.y grows upward
  const dropGeo = geo(new THREE.SphereGeometry(0.2, 8, 6));
  const poolGeo = geo(new THREE.CylinderGeometry(13, 13, 0.1, 48));
  const rimGeo = geo(new THREE.TorusGeometry(13.4, 0.7, 10, 56).rotateX(Math.PI / 2));
  const fountainBaseGeo = geo(new THREE.CylinderGeometry(5, 6, 1.2, 24));
  const bowlGeos = [
    { g: geo(new THREE.CylinderGeometry(6.5, 4.2, 1.6, 32)), h: 1.6, r: 6.5 },
    { g: geo(new THREE.CylinderGeometry(4.2, 2.6, 1.3, 28)), h: 1.3, r: 4.2 },
    { g: geo(new THREE.CylinderGeometry(2.4, 1.2, 1.1, 24)), h: 1.1, r: 2.4 },
  ];
  const bowlWaterGeo = geo(new THREE.CylinderGeometry(1, 1, 0.1, 32));
  const stemGeo = geo(new THREE.CylinderGeometry(0.7, 1.1, 1.2, 12));
  const finialGeo = geo(new THREE.SphereGeometry(0.5, 12, 8));
  const figureBody = geo(new THREE.CapsuleGeometry(0.55, 1.5, 4, 10));
  const figureHead = geo(new THREE.SphereGeometry(0.4, 12, 8));
  const figureTail = geo(new THREE.ConeGeometry(0.45, 2.2, 8));
  const figureArm = geo(new THREE.CylinderGeometry(0.1, 0.14, 1.4, 6));

  interface FountainRig {
    jets: THREE.InstancedMesh;
    drops: THREE.InstancedMesh;
    topY: number;
    phase: number;
  }
  const rigs: FountainRig[] = [];

  const buildFountain = (name: string, side: 1 | -1) => {
    const f = new THREE.Group();
    f.name = name;
    f.position.set(0, 0, side * FOUNTAIN_Z);

    f.add(mesh(`${name}-pool`, poolGeo, waterMat, 0, 0.55, 0, false));
    f.add(mesh(`${name}-rim`, rimGeo, sandstone, 0, 0.55, 0));
    f.add(mesh(`${name}-base`, fountainBaseGeo, sandstoneDark, 0, 0.9, 0));

    // Tiered verdigris-bronze bowls on short stems.
    let y = 1.5;
    bowlGeos.forEach(({ g, h, r }, i) => {
      f.add(mesh(`${name}-bowl-${i}`, g, verdigris, 0, y + h / 2, 0));
      const w = mesh(`${name}-bowl-water-${i}`, bowlWaterGeo, waterMat, 0, y + h + 0.01, 0, false);
      w.scale.set(r * 0.92, 1, r * 0.92);
      f.add(w);
      y += h;
      if (i < bowlGeos.length - 1) {
        f.add(mesh(`${name}-stem-${i}`, stemGeo, verdigris, 0, y + 0.6, 0));
        y += 1.2;
      }
    });
    f.add(mesh(`${name}-finial`, finialGeo, gold, 0, y + 0.3, 0));
    const topY = y + 0.6;

    // Sculpture-inspired silhouettes around the lowest bowl: abstract water-spirits
    // (torso, head, fish tail, raised arm).
    const figures = new THREE.Group();
    figures.name = `${name}-figures`;
    const nFig = 6;
    for (let i = 0; i < nFig; i++) {
      const a = (i / nFig) * Math.PI * 2;
      const fig = new THREE.Group();
      fig.position.set(Math.cos(a) * 7.4, 1.6, Math.sin(a) * 7.4);
      fig.rotation.y = -a + Math.PI / 2;
      const body = mesh('figure-body', figureBody, verdigris, 0, 1.4, 0);
      body.rotation.x = -0.15;
      const head = mesh('figure-head', figureHead, verdigris, 0, 2.7, 0.1);
      const tail = mesh('figure-tail', figureTail, verdigris, 0, 0.3, -0.2);
      tail.rotation.x = Math.PI;
      const arm = mesh('figure-arm', figureArm, verdigris, 0.55, 2.7, 0);
      arm.rotation.z = -0.6;
      fig.add(body, head, tail, arm);
      figures.add(fig);
    }
    f.add(figures);

    // Animated water: central plume, ring of arcs, low rim sprays, falling droplets.
    const jets = new THREE.InstancedMesh(jetGeo, waterMat, 25);
    jets.name = `${name}-jets`;
    jets.frustumCulled = false; // instance transforms change every frame
    const drops = new THREE.InstancedMesh(dropGeo, waterMat, 16);
    drops.name = `${name}-droplets`;
    drops.frustumCulled = false;
    f.add(jets, drops);

    rigs.push({ jets, drops, topY, phase: side === 1 ? 0 : 1.7 });
    return f;
  };
  group.add(buildFountain('fountain-south', 1), buildFountain('fountain-north', -1));

  const dummy = new THREE.Object3D();
  const animateFountains = (t: number) => {
    for (const { jets, drops, topY, phase } of rigs) {
      let n = 0;
      const put = (inst: THREE.InstancedMesh, i: number) => {
        dummy.updateMatrix();
        inst.setMatrixAt(i, dummy.matrix);
      };
      dummy.position.set(0, topY, 0);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1.2, 5 * (1 + 0.12 * Math.sin(t * 2.1 + phase)), 1.2);
      put(jets, n++);
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const lean = 0.55 + 0.05 * Math.sin(t * 1.7 + i + phase);
        dummy.position.set(Math.cos(a), topY - 3.4, Math.sin(a));
        dummy.rotation.set(Math.sin(a) * lean, 0, -Math.cos(a) * lean);
        dummy.scale.set(0.8, 2.2 + 0.4 * Math.sin(t * 2.4 + i * 1.3 + phase), 0.8);
        put(jets, n++);
      }
      for (let i = 0; i < 12; i++) {
        const a = ((i + 0.5) / 12) * Math.PI * 2;
        dummy.position.set(Math.cos(a) * 12.2, 0.6, Math.sin(a) * 12.2);
        dummy.rotation.set(-Math.sin(a) * 0.45, 0, Math.cos(a) * 0.45);
        dummy.scale.set(0.9, 1.4 + 0.5 * Math.sin(t * 3 + i * 0.9 + phase), 0.9);
        put(jets, n++);
      }
      jets.instanceMatrix.needsUpdate = true;

      for (let i = 0; i < 16; i++) {
        const life = (t * 0.8 + i / 16 + phase) % 1;
        const a = (i / 16) * Math.PI * 2 + i;
        const r = 0.4 + life * 2.4;
        dummy.position.set(Math.cos(a) * r, topY + 4.5 - life * life * 5.5, Math.sin(a) * r);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.setScalar(1 - life * 0.5);
        put(drops, i);
      }
      drops.instanceMatrix.needsUpdate = true;
    }
  };
  animateFountains(0);

  // -------------------------------------------------------- Palace facades
  const facades = new THREE.Group();
  facades.name = 'facades';
  group.add(facades);

  const wingW = 62;
  const wingH = 22;
  const wingD = 14;
  const wingGeo = geo(new THREE.BoxGeometry(wingW, wingH, wingD));
  const basementGeo = geo(new THREE.BoxGeometry(wingW + 2, 3.5, wingD + 2));
  const corniceGeo = geo(new THREE.BoxGeometry(wingW + 2, 1.2, wingD + 1.6));
  const roofGeo = geo(new THREE.BoxGeometry(wingW - 2, 6, wingD - 3));
  const colGeo = geo(new THREE.CylinderGeometry(0.55, 0.65, 11, 12));
  const capGeo = geo(new THREE.BoxGeometry(1.7, 0.6, 1.7));
  const windowGeo = geo(new THREE.BoxGeometry(1.5, 3.2, 0.3));
  const ridgeGeo = geo(new THREE.BoxGeometry(wingW - 6, 0.5, 1));
  // Triangular pediment prism: apex up, extruded along Z.
  const pedimentGeo = geo(new THREE.CylinderGeometry(5, 5, 1, 3).rotateX(-Math.PI / 2).scale(1.3, 0.5, 1));

  const wingCenters = [-(wingW / 2 + 12), wingW / 2 + 12];
  const wingNames = ['facade-north-west', 'facade-north-east'];
  const colMatrices: THREE.Matrix4[] = [];
  const capMatrices: THREE.Matrix4[] = [];
  const winMatrices: THREE.Matrix4[] = [];
  wingCenters.forEach((cx, wi) => {
    const name = wingNames[wi];
    const w = new THREE.Group();
    w.name = name;
    w.position.set(cx, 0, FACADE_Z);
    w.add(mesh(`${name}-basement`, basementGeo, sandstoneDark, 0, 1.75, 0));
    w.add(mesh(`${name}-body`, wingGeo, sandstone, 0, 3.5 + wingH / 2 - 1.5, 0));
    w.add(mesh(`${name}-cornice`, corniceGeo, sandstoneDark, 0, wingH + 2.2, 0));
    w.add(mesh(`${name}-roof`, roofGeo, roofMat, 0, wingH + 5.6, 0));
    w.add(mesh(`${name}-ridge`, ridgeGeo, verdigris, 0, wingH + 8.7, 0));
    w.add(mesh(`${name}-pediment`, pedimentGeo, sandstone, wi === 0 ? wingW / 2 - 8 : -wingW / 2 + 8, wingH - 3, wingD / 2 + 1.2));
    facades.add(w);

    const frontZ = FACADE_Z + wingD / 2;
    for (let i = -14; i <= 14; i++) {
      colMatrices.push(matrixAt(cx + i * 2, 9, frontZ + 1.2));
      capMatrices.push(matrixAt(cx + i * 2, 14.7, frontZ + 1.2));
    }
    for (let row = 0; row < 2; row++) {
      for (let i = -13; i <= 13; i++) winMatrices.push(matrixAt(cx + i * 2.2, 5.8 + row * 5.2, frontZ + 0.1));
    }
    for (let i = -13; i <= 13; i++) winMatrices.push(matrixAt(cx + i * 2.2, 2.4, frontZ + 1.2));
  });
  facades.add(
    instanced('facade-columns', colGeo, sandstone, colMatrices),
    instanced('facade-column-caps', capGeo, gold, capMatrices),
    instanced('facade-windows', windowGeo, glassMat, winMatrices, false),
  );

  // ------------------------------------------------------- Balustrades
  const balustrades = new THREE.Group();
  balustrades.name = 'balustrades';
  group.add(balustrades);
  const balGeo = geo(new THREE.CylinderGeometry(0.2, 0.28, 1.1, 8));
  const railGeo = geo(new THREE.BoxGeometry(1, 0.35, 0.55));
  const postGeo = geo(new THREE.BoxGeometry(0.7, 1.6, 0.7));
  const balMatrices: THREE.Matrix4[] = [];
  const railMatrices: THREE.Matrix4[] = [];
  const postMatrices: THREE.Matrix4[] = [];
  const addBalustrade = (x0: number, z0: number, x1: number, z1: number) => {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const ang = Math.atan2(-(z1 - z0), x1 - x0);
    const n = Math.max(1, Math.floor(len / 1.1));
    for (let i = 0; i <= n; i++) {
      const x = x0 + ((x1 - x0) * i) / n;
      const z = z0 + ((z1 - z0) * i) / n;
      if (i % 8 === 0) postMatrices.push(matrixAt(x, 0.8, z));
      else balMatrices.push(matrixAt(x, 0.55, z));
    }
    const mx = (x0 + x1) / 2;
    const mz = (z0 + z1) / 2;
    railMatrices.push(matrixAt(mx, 1.28, mz, len, 1, 1, ang), matrixAt(mx, 0.1, mz, len, 0.6, 1.2, ang));
  };
  const e = 2;
  const north = FACADE_Z + 12;
  // Perimeter runs with gaps where the streets meet the plaza.
  addBalustrade(-PLAZA_HALF_X + e, north, -14, north);
  addBalustrade(14, north, PLAZA_HALF_X - e, north);
  addBalustrade(-PLAZA_HALF_X + e, PLAZA_HALF_Z - e, -20, PLAZA_HALF_Z - e);
  addBalustrade(20, PLAZA_HALF_Z - e, PLAZA_HALF_X - e, PLAZA_HALF_Z - e);
  for (const sx of [-1, 1]) {
    addBalustrade(sx * (PLAZA_HALF_X - e), north, sx * (PLAZA_HALF_X - e), -20);
    addBalustrade(sx * (PLAZA_HALF_X - e), 20, sx * (PLAZA_HALF_X - e), PLAZA_HALF_Z - e);
  }
  balustrades.add(
    instanced('balustrade-balusters', balGeo, sandstone, balMatrices),
    instanced('balustrade-rails', railGeo, sandstone, railMatrices),
    instanced('balustrade-posts', postGeo, sandstoneDark, postMatrices),
  );

  // ------------------------------------------------------- Street lamps
  const lampPoleGeo = geo(new THREE.CylinderGeometry(0.12, 0.22, 6, 8));
  const lampBaseGeo = geo(new THREE.CylinderGeometry(0.4, 0.5, 0.8, 8));
  const lampHeadGeo = geo(new THREE.SphereGeometry(0.45, 12, 10));
  const lampCollarGeo = geo(new THREE.CylinderGeometry(0.3, 0.3, 0.2, 10));
  const lampGlow = mat(0xffe2a0, { emissive: 0xffc860, emissiveIntensity: 1.2, roughness: 0.4 });
  const lamps = new THREE.Group();
  lamps.name = 'street-lamps';
  group.add(lamps);
  const lampPositions: Array<[number, number]> = [];
  for (let z = -70; z <= 100; z += 20) {
    if (Math.abs(z) > 4) lampPositions.push([-24, z], [24, z]);
  }
  for (let x = -80; x <= 80; x += 20) {
    if (Math.abs(x) > 4) lampPositions.push([x, -62], [x, 62]);
  }
  lamps.add(
    instanced('lamp-poles', lampPoleGeo, verdigris, lampPositions.map(([x, z]) => matrixAt(x, 3.8, z))),
    instanced('lamp-bases', lampBaseGeo, sandstoneDark, lampPositions.map(([x, z]) => matrixAt(x, 0.4, z))),
    instanced('lamp-collars', lampCollarGeo, gold, lampPositions.map(([x, z]) => matrixAt(x, 6.6, z)), false),
    instanced('lamp-heads', lampHeadGeo, lampGlow, lampPositions.map(([x, z]) => matrixAt(x, 7.1, z)), false),
  );

  // -------------------------------------------------- Distant greenery
  const greenery = new THREE.Group();
  greenery.name = 'greenery';
  group.add(greenery);
  const trunkGeo = geo(new THREE.CylinderGeometry(0.35, 0.5, 4, 6));
  const crownGeo = geo(new THREE.IcosahedronGeometry(1, 1));
  const rand = mulberry32(99);
  const trunkM: THREE.Matrix4[] = [];
  const crownA: THREE.Matrix4[] = [];
  const crownB: THREE.Matrix4[] = [];
  const addTree = (x: number, z: number) => {
    const s = 0.8 + rand() * 0.8;
    const r = 3.2 * s;
    trunkM.push(matrixAt(x, 2 * s, z, s, s, s));
    (rand() < 0.5 ? crownA : crownB).push(matrixAt(x, 4 * s + r * 0.8, z, r, r * 1.15, r));
  };
  // Gardens beyond the east and west edges, a southern park band and avenue trees.
  for (let i = 0; i < 70; i++) {
    const side = i % 2 === 0 ? 1 : -1;
    addTree(side * (PLAZA_HALF_X + 12 + rand() * 38), FACADE_Z + rand() * (PLAZA_HALF_Z * 2 - 40));
  }
  for (let i = 0; i < 40; i++) {
    const x = -PLAZA_HALF_X + (i / 40) * PLAZA_HALF_X * 2;
    if (Math.abs(x) >= 22) addTree(x + (rand() - 0.5) * 3, PLAZA_HALF_Z + 6 + rand() * 18);
  }
  for (let z = PLAZA_HALF_Z + 8; z < PLAZA_HALF_Z + 110; z += 12) {
    addTree(-23, z);
    addTree(23, z);
  }
  greenery.add(
    instanced('greenery-trunks', trunkGeo, trunkMat, trunkM),
    instanced('greenery-crowns-a', crownGeo, leafMat, crownA),
    instanced('greenery-crowns-b', crownGeo, leafLightMat, crownB),
  );

  // --------------------------------------------------------------- API
  const update = (elapsedSeconds: number) => {
    if (disposed) return;
    animateFountains(Number.isFinite(elapsedSeconds) ? elapsedSeconds : 0);
  };

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    group.traverse((o) => {
      if (o instanceof THREE.InstancedMesh) o.dispose();
    });
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    textures.forEach((t) => t.dispose());
    group.clear();
  };

  return { group, update, dispose };
}
