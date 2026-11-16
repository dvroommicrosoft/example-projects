import * as THREE from 'three';

// Layout (meters, Y up, north = -Z, origin = obelisk).
const SQ_HX = 90; // paved square half-width (X)
const SQ_HZ = 110; // paved square half-depth (Z)
const CURB_W = 0.4;
const CURB_H = 0.18;
const ROAD_W = 17.6;
const NORTH_Z = -115; // building line (facades face +Z)
const SIDEWALK_W = 8;
const OUTER_X = SQ_HX + CURB_W + ROAD_W + CURB_W + SIDEWALK_W; // ~116.4
const OUTER_Z = SQ_HZ + CURB_W + ROAD_W + CURB_W + SIDEWALK_W;

const Y_LAWN = -0.05;
const Y_PAVED = 0;
const Y_INLAY = 0.012;
const Y_PAINT = 0.025;

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function dataTexture(
  size: number,
  seed: number,
  pixel: (x: number, y: number, r: () => number) => [number, number, number],
): THREE.DataTexture {
  const r = rng(seed);
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const [R, G, B] = pixel(x, y, r);
      const i = (y * size + x) * 4;
      data[i] = Math.max(0, Math.min(255, R));
      data[i + 1] = Math.max(0, Math.min(255, G));
      data[i + 2] = Math.max(0, Math.min(255, B));
      data[i + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

// Running-bond stone pavers; one tile covers 4 m x 4 m.
function pavingTexture(): THREE.DataTexture {
  const size = 128;
  const cell = 32;
  const cellTone: number[] = [];
  const r0 = rng(11);
  for (let i = 0; i < 64; i++) cellTone.push((r0() - 0.5) * 22);
  return dataTexture(size, 7, (x, y, r) => {
    const row = Math.floor(y / cell);
    const xs = (x + (row % 2) * (cell / 2)) % size;
    const col = Math.floor(xs / cell);
    const lx = xs % cell;
    const ly = y % cell;
    const joint = lx < 1.5 || ly < 1.5;
    const tone = cellTone[(row * 4 + col) % 64] + (r() - 0.5) * 9;
    if (joint) return [150 + tone * 0.3, 140 + tone * 0.3, 122 + tone * 0.3];
    return [214 + tone, 198 + tone, 164 + tone];
  });
}

function asphaltTexture(): THREE.DataTexture {
  return dataTexture(128, 21, (_x, _y, r) => {
    const n = (r() - 0.5) * 26;
    const fleck = r() > 0.97 ? 30 : 0;
    return [88 + n + fleck, 88 + n + fleck, 94 + n + fleck];
  });
}

function gravelTexture(): THREE.DataTexture {
  return dataTexture(128, 33, (_x, _y, r) => {
    const n = (r() - 0.5) * 50;
    return [200 + n, 184 + n, 150 + n];
  });
}

function grassTexture(): THREE.DataTexture {
  return dataTexture(128, 45, (x, y, r) => {
    const patch = Math.sin(x * 0.11) * Math.cos(y * 0.09) * 9;
    const n = (r() - 0.5) * 22;
    return [96 + n + patch, 148 + n * 1.2 + patch, 70 + n * 0.6];
  });
}

interface Mats {
  paved: THREE.MeshStandardMaterial;
  inlay: THREE.MeshStandardMaterial;
  sidewalk: THREE.MeshStandardMaterial;
  asphalt: THREE.MeshStandardMaterial;
  gravel: THREE.MeshStandardMaterial;
  grass: THREE.MeshStandardMaterial;
  curb: THREE.MeshStandardMaterial;
  paint: THREE.MeshStandardMaterial;
  hedge: THREE.MeshStandardMaterial;
}

function offsetMat(m: THREE.MeshStandardMaterial, f: number): THREE.MeshStandardMaterial {
  m.polygonOffset = true;
  m.polygonOffsetFactor = f;
  m.polygonOffsetUnits = f;
  return m;
}

function makeMaterials(): Mats {
  const paveTex = pavingTexture();
  const asphaltTex = asphaltTexture();
  const gravelTex = gravelTexture();
  const grassTex = grassTexture();
  return {
    paved: new THREE.MeshStandardMaterial({ map: paveTex, roughness: 0.9, metalness: 0 }),
    inlay: offsetMat(
      new THREE.MeshStandardMaterial({ map: paveTex, color: 0xb9a98a, roughness: 0.85 }),
      -1,
    ),
    sidewalk: new THREE.MeshStandardMaterial({ map: paveTex, color: 0xe8dcc4, roughness: 0.9 }),
    asphalt: new THREE.MeshStandardMaterial({ map: asphaltTex, roughness: 0.95 }),
    gravel: offsetMat(new THREE.MeshStandardMaterial({ map: gravelTex, roughness: 1 }), -1),
    grass: new THREE.MeshStandardMaterial({ map: grassTex, roughness: 1 }),
    curb: new THREE.MeshStandardMaterial({ color: 0xcfc6b2, roughness: 0.8 }),
    paint: offsetMat(new THREE.MeshStandardMaterial({ color: 0xf6f1e4, roughness: 0.7 }), -2),
    hedge: new THREE.MeshStandardMaterial({ color: 0x3f7a3a, roughness: 1 }),
  };
}

// Horizontal plane spanning [x0,x1] x [z0,z1]; UVs scaled so one texture tile = `tile` m.
function plane(
  name: string,
  x0: number,
  x1: number,
  z0: number,
  z1: number,
  y: number,
  mat: THREE.Material,
  tile: number,
): THREE.Mesh {
  const w = x1 - x0;
  const d = z1 - z0;
  const g = new THREE.PlaneGeometry(w, d);
  g.rotateX(-Math.PI / 2);
  const uv = g.getAttribute('uv') as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * w) / tile, (uv.getY(i) * d) / tile);
  const m = new THREE.Mesh(g, mat);
  m.name = name;
  m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2);
  m.receiveShadow = true;
  return m;
}

function box(
  name: string,
  x0: number,
  x1: number,
  z0: number,
  z1: number,
  h: number,
  mat: THREE.Material,
): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, h, z1 - z0), mat);
  m.name = name;
  m.position.set((x0 + x1) / 2, h / 2 - 0.02, (z0 + z1) / 2);
  m.receiveShadow = true;
  m.castShadow = true;
  return m;
}

interface Stripe {
  x: number;
  z: number;
  sx: number;
  sz: number;
}

function stripes(name: string, items: Stripe[], mat: THREE.Material): THREE.InstancedMesh {
  const g = new THREE.PlaneGeometry(1, 1);
  g.rotateX(-Math.PI / 2);
  const mesh = new THREE.InstancedMesh(g, mat, Math.max(1, items.length));
  mesh.count = items.length;
  const m = new THREE.Matrix4();
  items.forEach((s, i) => {
    m.compose(
      new THREE.Vector3(s.x, Y_PAINT, s.z),
      new THREE.Quaternion(),
      new THREE.Vector3(s.sx, 1, s.sz),
    );
    mesh.setMatrixAt(i, m);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.name = name;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  return mesh;
}

export function createGround(): THREE.Group {
  const mats = makeMaterials();
  const ground = new THREE.Group();
  ground.name = 'Ground';

  // Road geometry (centerlines)
  const eastCx = SQ_HX + CURB_W + ROAD_W / 2;
  const southCz = SQ_HZ + CURB_W + ROAD_W / 2;
  const roadIn = SQ_HX + CURB_W;
  const roadOut = roadIn + ROAD_W;
  const roadInZ = SQ_HZ + CURB_W;
  const roadOutZ = roadInZ + ROAD_W;
  const sideZ0 = NORTH_Z;
  const sideZ1 = roadOutZ;

  // Surrounding lawn
  const lawn = new THREE.Group();
  lawn.name = 'SurroundingLawn';
  lawn.add(plane('LawnBase', -320, 320, -320, 320, Y_LAWN, mats.grass, 8));
  ground.add(lawn);

  // Paved square
  const paved = new THREE.Group();
  paved.name = 'PavedSquare';
  paved.add(plane('SquarePavement', -SQ_HX, SQ_HX, -SQ_HZ, SQ_HZ, Y_PAVED, mats.paved, 4));
  const bw = 2.4;
  const inlays = new THREE.Group();
  inlays.name = 'PavementInlays';
  inlays.add(
    plane('InlayNorth', -SQ_HX + bw, SQ_HX - bw, -SQ_HZ + bw, -SQ_HZ + 2 * bw, Y_INLAY, mats.inlay, 4),
    plane('InlaySouth', -SQ_HX + bw, SQ_HX - bw, SQ_HZ - 2 * bw, SQ_HZ - bw, Y_INLAY, mats.inlay, 4),
    plane('InlayWest', -SQ_HX + bw, -SQ_HX + 2 * bw, -SQ_HZ + 2 * bw, SQ_HZ - 2 * bw, Y_INLAY, mats.inlay, 4),
    plane('InlayEast', SQ_HX - 2 * bw, SQ_HX - bw, -SQ_HZ + 2 * bw, SQ_HZ - 2 * bw, Y_INLAY, mats.inlay, 4),
    plane('InlayAxisZ', -0.6, 0.6, -SQ_HZ + 2 * bw, SQ_HZ - 2 * bw, Y_INLAY, mats.inlay, 4),
    plane('InlayAxisX', -SQ_HX + 2 * bw, SQ_HX - 2 * bw, -0.6, 0.6, Y_INLAY, mats.inlay, 4),
  );
  paved.add(inlays);
  ground.add(paved);

  // North forecourt / building apron (buildings stand at Z = -115, facing +Z)
  const forecourt = new THREE.Group();
  forecourt.name = 'NorthForecourt';
  forecourt.add(
    plane('ForecourtSidewalk', -SQ_HX - CURB_W, SQ_HX + CURB_W, NORTH_Z, -SQ_HZ - CURB_W, Y_PAVED, mats.sidewalk, 4),
    plane('BuildingApron', -OUTER_X, OUTER_X, NORTH_Z - 40, NORTH_Z, Y_PAVED, mats.sidewalk, 4),
  );
  ground.add(forecourt);

  // Perimeter roads (east, west, south); north edge is the forecourt
  const roads = new THREE.Group();
  roads.name = 'PerimeterRoads';
  roads.add(
    plane('RoadEast', roadIn, roadOut, sideZ0, sideZ1, Y_PAVED, mats.asphalt, 6),
    plane('RoadWest', -roadOut, -roadIn, sideZ0, sideZ1, Y_PAVED, mats.asphalt, 6),
    plane('RoadSouth', -roadIn, roadIn, roadInZ, roadOutZ, Y_PAVED, mats.asphalt, 6),
  );
  ground.add(roads);

  // Sidewalks outside the roads
  const sw = new THREE.Group();
  sw.name = 'Sidewalks';
  const swIn = roadOut + CURB_W;
  const swInZ = roadOutZ + CURB_W;
  sw.add(
    plane('SidewalkEast', swIn, OUTER_X, sideZ0, OUTER_Z, Y_PAVED, mats.sidewalk, 4),
    plane('SidewalkWest', -OUTER_X, -swIn, sideZ0, OUTER_Z, Y_PAVED, mats.sidewalk, 4),
    plane('SidewalkSouth', -swIn, swIn, swInZ, OUTER_Z, Y_PAVED, mats.sidewalk, 4),
  );
  ground.add(sw);

  // Curbs
  const curbs = new THREE.Group();
  curbs.name = 'Curbs';
  curbs.add(
    box('CurbSquareNorth', -SQ_HX - CURB_W, SQ_HX + CURB_W, -SQ_HZ - CURB_W, -SQ_HZ, CURB_H, mats.curb),
    box('CurbSquareSouth', -SQ_HX - CURB_W, SQ_HX + CURB_W, SQ_HZ, SQ_HZ + CURB_W, CURB_H, mats.curb),
    box('CurbSquareWest', -SQ_HX - CURB_W, -SQ_HX, -SQ_HZ, SQ_HZ, CURB_H, mats.curb),
    box('CurbSquareEast', SQ_HX, SQ_HX + CURB_W, -SQ_HZ, SQ_HZ, CURB_H, mats.curb),
    box('CurbOuterEast', roadOut, roadOut + CURB_W, sideZ0, sideZ1 + CURB_W, CURB_H, mats.curb),
    box('CurbOuterWest', -roadOut - CURB_W, -roadOut, sideZ0, sideZ1 + CURB_W, CURB_H, mats.curb),
    box('CurbOuterSouth', -roadOut - CURB_W, roadOut + CURB_W, roadOutZ, roadOutZ + CURB_W, CURB_H, mats.curb),
  );
  ground.add(curbs);

  // Road markings: dashed center lines + solid edge lines, skipping crosswalk zones
  const cwAlong = [-60, 0, 60]; // crosswalk centers along the roads
  const cwDepth = 4;
  const clear = (v: number) => cwAlong.every((c) => Math.abs(v - c) > cwDepth / 2 + 2);
  const paint: Stripe[] = [];
  const edge = 1.2;
  const dashLen = 3;
  const dashPitch = 7;
  for (const side of [1, -1]) {
    const cx = side * eastCx;
    for (let z = sideZ0 + 6; z < sideZ1 - 3; z += dashPitch) {
      if (clear(z) && clear(z + dashLen)) paint.push({ x: cx, z: z + dashLen / 2, sx: 0.25, sz: dashLen });
    }
    for (const off of [-1, 1]) {
      const ex = cx + off * (ROAD_W / 2 - edge);
      paint.push({ x: ex, z: (sideZ0 + sideZ1) / 2, sx: 0.2, sz: sideZ1 - sideZ0 - 2 });
    }
  }
  for (let x = -roadIn + 4; x < roadIn - 4; x += dashPitch) {
    if (clear(x) && clear(x + dashLen)) paint.push({ x: x + dashLen / 2, z: southCz, sx: dashLen, sz: 0.25 });
  }
  for (const off of [-1, 1]) {
    paint.push({ x: 0, z: southCz + off * (ROAD_W / 2 - edge), sx: 2 * roadIn - 4, sz: 0.2 });
  }
  const markings = stripes('RoadMarkings', paint, mats.paint);

  // Crosswalks (zebra stripes) across each road
  const zebra: Stripe[] = [];
  const pitch = 1.2;
  const zebraLen = ROAD_W - 2 * (edge + 0.8);
  for (const c of cwAlong) {
    const n = Math.floor(cwDepth / pitch);
    for (let i = 0; i < n; i++) {
      const o = (i - (n - 1) / 2) * pitch;
      zebra.push({ x: eastCx, z: c + o, sx: zebraLen, sz: 0.6 });
      zebra.push({ x: -eastCx, z: c + o, sx: zebraLen, sz: 0.6 });
      zebra.push({ x: c + o, z: southCz, sx: 0.6, sz: zebraLen });
    }
  }
  const crosswalks = stripes('Crosswalks', zebra, mats.paint);

  ground.add(markings, crosswalks);

  // Edge landscaping: gravel paths, hedge rows on the lawn ring
  const land = new THREE.Group();
  land.name = 'EdgeLandscaping';
  const pathW = 3;
  const pathE = OUTER_X + 14;
  const pathS = OUTER_Z + 14;
  const paths = new THREE.Group();
  paths.name = 'GravelPaths';
  paths.add(
    plane('GravelPathEast', pathE - pathW / 2, pathE + pathW / 2, NORTH_Z, pathS + pathW / 2, 0.01, mats.gravel, 3),
    plane('GravelPathWest', -pathE - pathW / 2, -pathE + pathW / 2, NORTH_Z, pathS + pathW / 2, 0.01, mats.gravel, 3),
    plane('GravelPathSouth', -pathE + pathW / 2, pathE - pathW / 2, pathS - pathW / 2, pathS + pathW / 2, 0.01, mats.gravel, 3),
  );
  land.add(paths);

  const hedgeItems: Stripe[] = [];
  const hedgeLen = 6;
  const addRow = (fixed: number, from: number, to: number, alongZ: boolean) => {
    for (let t = from + hedgeLen / 2; t < to; t += hedgeLen + 0.6) {
      hedgeItems.push(alongZ ? { x: fixed, z: t, sx: 1.4, sz: hedgeLen } : { x: t, z: fixed, sx: hedgeLen, sz: 1.4 });
    }
  };
  for (const s of [1, -1]) {
    addRow(s * (OUTER_X + 2), NORTH_Z + 4, OUTER_Z, true);
    addRow(s * (pathE + pathW / 2 + 2.5), NORTH_Z + 4, pathS + 4, true);
  }
  addRow(OUTER_Z + 2, -OUTER_X, OUTER_X, false);
  addRow(pathS + pathW / 2 + 2.5, -pathE - 4, pathE + 4, false);

  const hg = new THREE.BoxGeometry(1, 1.2, 1);
  const hedges = new THREE.InstancedMesh(hg, mats.hedge, hedgeItems.length);
  const hm = new THREE.Matrix4();
  hedgeItems.forEach((h, i) => {
    hm.compose(
      new THREE.Vector3(h.x, 0.6 + Y_LAWN, h.z),
      new THREE.Quaternion(),
      new THREE.Vector3(h.sx, 1, h.sz),
    );
    hedges.setMatrixAt(i, hm);
  });
  hedges.instanceMatrix.needsUpdate = true;
  hedges.name = 'HedgeRows';
  hedges.castShadow = true;
  hedges.receiveShadow = true;
  hedges.frustumCulled = false;
  land.add(hedges);
  ground.add(land);

  return ground;
}
