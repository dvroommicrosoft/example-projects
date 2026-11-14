import * as THREE from 'three';

/**
 * Stylized northern frontage of the square (Hotel de Crillon, its companion
 * facade flanking rue Royale) plus low context blocks set well back.
 * Units: meters, Y up, north = -Z. Facades face +Z into the square; the
 * rusticated base front sits at Z = NORTH_FRONT_Z.
 */
export const NORTH_FRONT_Z = -115;

interface Palette {
  stone: THREE.MeshStandardMaterial;
  rustic: THREE.MeshStandardMaterial;
  trim: THREE.MeshStandardMaterial;
  groove: THREE.MeshStandardMaterial;
  glass: THREE.MeshStandardMaterial;
  slate: THREE.MeshStandardMaterial;
  slateDark: THREE.MeshStandardMaterial;
  brick: THREE.MeshStandardMaterial;
}

interface WindowRow {
  y: number;
  w: number;
  h: number;
}

interface FacadeSpec {
  name: string;
  label: string;
  bays: number;
  bayW: number;
  depth: number;
  baseH: number;
  wallTop: number;
  roofH: number;
  rows: WindowRow[];
  /** Inclusive bay range fronted by a Corinthian-style colonnade. */
  colonnade?: { first: number; last: number };
  flags?: boolean;
  urns?: boolean;
  stone: THREE.MeshStandardMaterial;
  rustic: THREE.MeshStandardMaterial;
}

interface Kit {
  box: THREE.BoxGeometry;
  shaft: THREE.CylinderGeometry;
  capital: THREE.CylinderGeometry;
  baluster: THREE.LatheGeometry;
  urn: THREE.LatheGeometry;
  gable: THREE.ExtrudeGeometry;
  pole: THREE.CylinderGeometry;
  flag: THREE.PlaneGeometry;
  flagMats: THREE.MeshStandardMaterial[];
  poleMat: THREE.MeshStandardMaterial;
}

const _o = new THREE.Object3D();

function mtx(
  x: number,
  y: number,
  z: number,
  sx = 1,
  sy = 1,
  sz = 1,
): THREE.Matrix4 {
  _o.position.set(x, y, z);
  _o.scale.set(sx, sy, sz);
  _o.updateMatrix();
  return _o.matrix.clone();
}

function instanced(
  parent: THREE.Object3D,
  name: string,
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  mats: THREE.Matrix4[],
  shadows = true,
): void {
  if (mats.length === 0) return;
  const mesh = new THREE.InstancedMesh(geo, mat, mats.length);
  mats.forEach((m, i) => mesh.setMatrixAt(i, m));
  mesh.instanceMatrix.needsUpdate = true;
  mesh.name = name;
  mesh.castShadow = shadows;
  mesh.receiveShadow = shadows;
  parent.add(mesh);
}

function slab(
  parent: THREE.Object3D,
  kit: Kit,
  mat: THREE.Material,
  name: string,
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
): THREE.Mesh {
  const mesh = new THREE.Mesh(kit.box, mat);
  mesh.name = name;
  mesh.scale.set(w, h, d);
  mesh.position.set(x, y + h / 2, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function makeKit(): Kit {
  const balProfile = [
    [0.0, 0.0],
    [0.16, 0.0],
    [0.16, 0.08],
    [0.09, 0.14],
    [0.09, 0.3],
    [0.15, 0.5],
    [0.09, 0.72],
    [0.09, 0.9],
    [0.15, 0.95],
    [0.15, 1.0],
    [0.0, 1.0],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const urnProfile = [
    [0.0, 0.0],
    [0.3, 0.0],
    [0.3, 0.12],
    [0.14, 0.2],
    [0.14, 0.3],
    [0.38, 0.55],
    [0.4, 0.75],
    [0.28, 0.92],
    [0.34, 1.0],
    [0.0, 1.0],
  ].map(([x, y]) => new THREE.Vector2(x, y));

  const tri = new THREE.Shape();
  tri.moveTo(-0.5, 0);
  tri.lineTo(0.5, 0);
  tri.lineTo(0, 1);
  tri.closePath();
  const gable = new THREE.ExtrudeGeometry(tri, {
    depth: 1,
    bevelEnabled: false,
  });
  gable.translate(0, 0, -0.5);

  const flagMat = (c: number) =>
    new THREE.MeshStandardMaterial({
      color: c,
      roughness: 0.85,
      side: THREE.DoubleSide,
    });

  return {
    box: new THREE.BoxGeometry(1, 1, 1),
    shaft: new THREE.CylinderGeometry(0.43, 0.5, 1, 20),
    capital: new THREE.CylinderGeometry(0.62, 0.42, 1, 16),
    baluster: new THREE.LatheGeometry(balProfile, 10),
    urn: new THREE.LatheGeometry(urnProfile, 14),
    gable,
    pole: new THREE.CylinderGeometry(0.07, 0.09, 1, 8),
    flag: new THREE.PlaneGeometry(1, 1),
    flagMats: [flagMat(0x2f4f9c), flagMat(0xf6f1e6), flagMat(0xc23b3b)],
    poleMat: new THREE.MeshStandardMaterial({
      color: 0xc9b47a,
      roughness: 0.4,
      metalness: 0.5,
    }),
  };
}

function buildFacade(spec: FacadeSpec, kit: Kit, p: Palette): THREE.Group {
  const g = new THREE.Group();
  g.name = spec.name;
  g.userData.label = spec.label;

  const W = spec.bays * spec.bayW;
  const D = spec.depth;
  const wallZ = -0.5; // upper wall front, set back from the rusticated base
  const slabTop = spec.baseH + 0.5;
  const cornTop = spec.wallTop + 0.9;
  const bayX = (i: number) => -W / 2 + (i + 0.5) * spec.bayW;
  const stone = spec.stone;

  // Walls
  const walls = new THREE.Group();
  walls.name = 'Walls';
  const base = slab(walls, kit, spec.rustic, 'RusticatedBase', W, spec.baseH, D, 0, 0, -D / 2);
  base.userData.rusticated = true;
  slab(walls, kit, stone, 'UpperWall', W, spec.wallTop - spec.baseH, D - 0.5, 0, spec.baseH, wallZ - (D - 0.5) / 2);
  slab(walls, kit, p.trim, 'StringCourse', W + 0.5, 0.5, 0.5, 0, spec.baseH - 0.25, 0.1);
  g.add(walls);

  // Rustication joints (horizontal grooves) and corner quoins
  const grooves: THREE.Matrix4[] = [];
  for (let y = 1; y < spec.baseH - 0.4; y += 1) {
    grooves.push(mtx(0, y, 0.01, W, 0.07, 0.04));
  }
  const rust = new THREE.Group();
  rust.name = 'Rustication';
  instanced(rust, 'RusticationGrooves', kit.box, p.groove, grooves, false);
  const quoins: THREE.Matrix4[] = [];
  for (const sx of [-1, 1]) {
    quoins.push(mtx(sx * (W / 2 - 0.6), (spec.baseH + spec.wallTop) / 2, wallZ + 0.1, 1.2, spec.wallTop - spec.baseH, 0.3));
  }
  instanced(rust, 'Quoins', kit.box, p.trim, quoins);
  g.add(rust);

  // Window rows with frames, mullions, sills and lintel cornices
  const windows = new THREE.Group();
  windows.name = 'WindowRows';
  const frames: THREE.Matrix4[] = [];
  const panes: THREE.Matrix4[] = [];
  const mullions: THREE.Matrix4[] = [];
  const sills: THREE.Matrix4[] = [];
  const lintels: THREE.Matrix4[] = [];
  for (const row of spec.rows) {
    const fz = row.y < spec.baseH ? 0 : wallZ;
    for (let i = 0; i < spec.bays; i++) {
      const x = bayX(i);
      frames.push(mtx(x, row.y, fz + 0.08, row.w + 0.5, row.h + 0.5, 0.2));
      panes.push(mtx(x, row.y, fz + 0.2, row.w, row.h, 0.1));
      mullions.push(mtx(x, row.y, fz + 0.28, 0.08, row.h, 0.06));
      mullions.push(mtx(x, row.y + row.h * 0.15, fz + 0.28, row.w, 0.08, 0.06));
      sills.push(mtx(x, row.y - row.h / 2 - 0.35, fz + 0.2, row.w + 0.9, 0.2, 0.5));
      lintels.push(mtx(x, row.y + row.h / 2 + 0.4, fz + 0.2, row.w + 0.9, 0.22, 0.45));
    }
  }
  instanced(windows, 'WindowFrames', kit.box, p.trim, frames);
  instanced(windows, 'WindowPanes', kit.box, p.glass, panes, false);
  instanced(windows, 'WindowMullions', kit.box, p.trim, mullions, false);
  instanced(windows, 'WindowSills', kit.box, p.trim, sills);
  instanced(windows, 'WindowLintels', kit.box, p.trim, lintels);
  g.add(windows);

  // Colonnade: platform, Corinthian-style columns, entablature
  if (spec.colonnade) {
    const { first, last } = spec.colonnade;
    const colonnade = new THREE.Group();
    colonnade.name = 'Colonnade';
    const x0 = -W / 2 + first * spec.bayW;
    const x1 = -W / 2 + (last + 1) * spec.bayW;
    const span = x1 - x0;
    const cx = (x0 + x1) / 2;
    const colZ = 2.6;
    const colTop = spec.wallTop - 3.2;
    const shaftH = colTop - slabTop - 1.3;
    slab(colonnade, kit, p.trim, 'Platform', span + 1.2, 0.5, 4.6, cx, spec.baseH, 1.8);
    const bases: THREE.Matrix4[] = [];
    const shafts: THREE.Matrix4[] = [];
    const caps: THREE.Matrix4[] = [];
    const abaci: THREE.Matrix4[] = [];
    for (let k = first; k <= last + 1; k++) {
      const x = -W / 2 + k * spec.bayW;
      bases.push(mtx(x, slabTop + 0.25, colZ, 1.5, 0.5, 1.5));
      shafts.push(mtx(x, slabTop + 0.5 + shaftH / 2, colZ, 1.7, shaftH, 1.7));
      caps.push(mtx(x, colTop - 0.8, colZ, 1.5, 1.0, 1.5));
      abaci.push(mtx(x, colTop - 0.15, colZ, 1.5, 0.3, 1.5));
    }
    instanced(colonnade, 'ColumnBases', kit.box, p.trim, bases);
    instanced(colonnade, 'ColumnShafts', kit.shaft, stone, shafts);
    instanced(colonnade, 'ColumnCapitals', kit.capital, p.trim, caps);
    instanced(colonnade, 'ColumnAbaci', kit.box, p.trim, abaci);
    slab(colonnade, kit, stone, 'Entablature', span + 1.0, 2.0, 4.4, cx, colTop, 1.7);
    slab(colonnade, kit, p.trim, 'EntablatureCornice', span + 1.8, 0.45, 5.0, cx, colTop + 2.0, 1.9);
    // Front balustrade closing the loggia platform
    const bal: THREE.Matrix4[] = [];
    for (let x = x0 - 0.2; x <= x1 + 0.2; x += 0.55) {
      bal.push(mtx(x, spec.baseH + 0.5, 4.0, 1, 0.9, 1));
    }
    instanced(colonnade, 'LoggiaBalusters', kit.baluster, p.trim, bal);
    slab(colonnade, kit, p.trim, 'LoggiaRail', span + 1.2, 0.18, 0.5, cx, spec.baseH + 1.4, 4.0);
    g.add(colonnade);
  }

  // Main cornice and roof balustrade
  const cornices = new THREE.Group();
  cornices.name = 'Cornices';
  slab(cornices, kit, p.trim, 'MainCornice', W + 1.2, 0.9, 2.4, 0, spec.wallTop, 0.2);
  slab(cornices, kit, p.trim, 'CorniceBed', W, 0.4, 1.8, 0, spec.wallTop - 0.4, 0.0);
  g.add(cornices);

  const balustrade = new THREE.Group();
  balustrade.name = 'Balustrade';
  const bal: THREE.Matrix4[] = [];
  for (let x = -W / 2 + 0.6; x <= W / 2 - 0.5; x += 0.55) {
    bal.push(mtx(x, cornTop, 0.9, 1, 1.0, 1));
  }
  instanced(balustrade, 'Balusters', kit.baluster, p.trim, bal);
  slab(balustrade, kit, p.trim, 'BalustradeRail', W, 0.16, 0.5, 0, cornTop + 1.0, 0.9);
  const piers: THREE.Matrix4[] = [];
  const urns: THREE.Matrix4[] = [];
  const pierCount = 9;
  for (let i = 0; i < pierCount; i++) {
    const x = -W / 2 + 0.4 + (i * (W - 0.8)) / (pierCount - 1);
    piers.push(mtx(x, cornTop + 0.8, 0.9, 0.8, 1.6, 0.8));
    if (spec.urns) urns.push(mtx(x, cornTop + 1.6, 0.9, 1.1, 1.3, 1.1));
  }
  instanced(balustrade, 'BalustradePiers', kit.box, p.trim, piers);
  instanced(balustrade, 'RoofUrns', kit.urn, p.trim, urns);
  g.add(balustrade);

  // Mansard slate roofline
  const roofline = new THREE.Group();
  roofline.name = 'Roofline';
  const rh = spec.roofH;
  const lo = 0.3 * rh;
  const prof = new THREE.Shape();
  prof.moveTo(-1.6, cornTop);
  prof.lineTo(-1.6 - lo, cornTop + rh);
  prof.lineTo(-(D - 1.6 - lo), cornTop + rh);
  prof.lineTo(-(D - 1.6), cornTop);
  prof.closePath();
  const roofGeo = new THREE.ExtrudeGeometry(prof, { depth: W, bevelEnabled: false });
  roofGeo.translate(0, 0, -W / 2);
  roofGeo.rotateY(-Math.PI / 2);
  const roof = new THREE.Mesh(roofGeo, p.slate);
  roof.name = 'MansardSlate';
  roof.castShadow = true;
  roof.receiveShadow = true;
  roofline.add(roof);
  slab(roofline, kit, p.slateDark, 'RoofRidgeCap', W - 2.4, 0.3, D - 2 * (1.6 + lo) - 1, 0, cornTop + rh, -D / 2);

  // Dormers
  const dBody: THREE.Matrix4[] = [];
  const dPane: THREE.Matrix4[] = [];
  const dRoof: THREE.Matrix4[] = [];
  const dh = 0.45 * rh;
  const dy = cornTop + 0.27 * rh;
  const slopeZ = (y: number) => -1.6 - ((y - cornTop) / rh) * lo;
  const dFront = slopeZ(dy) + 0.75;
  for (let i = 0; i < spec.bays; i++) {
    const x = bayX(i);
    dBody.push(mtx(x, dy + dh / 2, dFront - 1.2, 1.7, dh, 2.4));
    dPane.push(mtx(x, dy + dh / 2, dFront + 0.03, 1.0, dh * 0.65, 0.1));
    dRoof.push(mtx(x, dy + dh, dFront - 1.2, 2.1, 0.9, 2.9));
  }
  const dormers = new THREE.Group();
  dormers.name = 'Dormers';
  instanced(dormers, 'DormerBodies', kit.box, stone, dBody);
  instanced(dormers, 'DormerWindows', kit.box, p.glass, dPane, false);
  instanced(dormers, 'DormerGables', kit.gable, p.slate, dRoof);
  roofline.add(dormers);

  // Chimneys
  const chimneys = new THREE.Group();
  chimneys.name = 'Chimneys';
  const chBody: THREE.Matrix4[] = [];
  const chCap: THREE.Matrix4[] = [];
  const chCount = Math.max(3, Math.round(W / 7));
  const top = cornTop + rh;
  for (let j = 0; j < chCount; j++) {
    const x = -W / 2 + (W * (j + 0.5)) / chCount;
    for (const z of [-D * 0.3, -D * 0.7]) {
      chBody.push(mtx(x, top + 1.6, z, 1.5, 3.2, 1.2));
      chCap.push(mtx(x, top + 3.3, z, 1.9, 0.25, 1.6));
    }
  }
  instanced(chimneys, 'ChimneyStacks', kit.box, p.brick, chBody);
  instanced(chimneys, 'ChimneyCaps', kit.box, p.trim, chCap);
  roofline.add(chimneys);
  g.add(roofline);

  if (spec.flags) {
    const flags = new THREE.Group();
    flags.name = 'Flagpoles';
    const poleH = 7;
    for (const x of [-W / 2 + 3, 0, W / 2 - 3]) {
      const pole = new THREE.Mesh(kit.pole, kit.poleMat);
      pole.scale.set(1, poleH, 1);
      pole.position.set(x, cornTop + 1.6 + poleH / 2, 0.9);
      pole.castShadow = true;
      flags.add(pole);
      kit.flagMats.forEach((fm, s) => {
        const f = new THREE.Mesh(kit.flag, fm);
        f.scale.set(0.8, 1.6, 1);
        f.position.set(x + 0.5 + s * 0.8, cornTop + 1.6 + poleH - 1.0, 0.9);
        f.castShadow = true;
        flags.add(f);
      });
    }
    g.add(flags);
  }

  return g;
}

export function createBuildings(): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Buildings';
  root.userData.description =
    'Stylized northern frontage and context blocks around Place de la Concorde';
  root.userData.northFrontZ = NORTH_FRONT_Z;

  const kit = makeKit();
  const std = (color: number, roughness = 0.9, metalness = 0) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const palette: Palette = {
    stone: std(0xebdcb8),
    rustic: std(0xdcc89c),
    trim: std(0xf6eddb, 0.8),
    groove: std(0xa99468),
    glass: std(0x6f8fa8, 0.15, 0.3),
    slate: std(0x4f6d90, 0.65),
    slateDark: std(0x3d5575, 0.7),
    brick: std(0xb8795a),
  };
  const crillonStone = palette.stone;
  const companionStone = std(0xe4d2a8);
  const companionRustic = std(0xd4bf93);
  const contextStone = std(0xe0d0ae);
  const contextRustic = std(0xcdb98e);

  const grandRows: WindowRow[] = [
    { y: 3.4, w: 1.5, h: 3.0 },
    { y: 11.6, w: 1.5, h: 4.6 },
    { y: 17.8, w: 1.4, h: 2.8 },
  ];
  const grand = {
    bays: 16,
    bayW: 3.5,
    depth: 32,
    baseH: 7,
    wallTop: 22.5,
    roofH: 6,
    rows: grandRows,
    colonnade: { first: 3, last: 12 },
  };

  // Hotel de Crillon: east of rue Royale
  const crillon = buildFacade(
    {
      ...grand,
      name: 'HotelDeCrillon',
      label: 'Hôtel de Crillon (stylized)',
      flags: true,
      stone: crillonStone,
      rustic: palette.rustic,
    },
    kit,
    palette,
  );
  crillon.position.set(40, 0, NORTH_FRONT_Z);
  root.add(crillon);

  // Companion facade (Hôtel de la Marine style): west of rue Royale
  const companion = buildFacade(
    {
      ...grand,
      name: 'CompanionFacade',
      label: 'Hôtel de la Marine (stylized companion facade)',
      urns: true,
      stone: companionStone,
      rustic: companionRustic,
    },
    kit,
    { ...palette, stone: companionStone, rustic: companionRustic },
  );
  companion.position.set(-40, 0, NORTH_FRONT_Z);
  root.add(companion);

  // Low context blocks set well back from the plaza
  const context = new THREE.Group();
  context.name = 'ContextBuildings';
  const block = (name: string, x: number, z: number, ry: number) => {
    const b = buildFacade(
      {
        name,
        label: 'Context block',
        bays: 10,
        bayW: 3.5,
        depth: 22,
        baseH: 4.5,
        wallTop: 15,
        roofH: 4,
        rows: [
          { y: 2.4, w: 1.4, h: 2.2 },
          { y: 8.4, w: 1.4, h: 3.2 },
          { y: 12.4, w: 1.3, h: 2.2 },
        ],
        stone: contextStone,
        rustic: contextRustic,
      },
      kit,
      { ...palette, stone: contextStone, rustic: contextRustic },
    );
    b.position.set(x, 0, z);
    b.rotation.y = ry;
    context.add(b);
  };
  // Continuation of the northern frontage beyond the two grand facades
  block('ContextNorthEast', 88, NORTH_FRONT_Z, 0);
  block('ContextNorthWest', -88, NORTH_FRONT_Z, 0);
  // East and west sides (fronts at |x| = 118, facing the square)
  [-90, -45, 0, 45, 90].forEach((z, i) => {
    block(`ContextEast${i + 1}`, 118, z, -Math.PI / 2);
    block(`ContextWest${i + 1}`, -118, z, Math.PI / 2);
  });
  // South side with an open central gap (fronts at z = 128, facing north)
  [-95, -60, 60, 95].forEach((x, i) => {
    block(`ContextSouth${i + 1}`, x, 128, Math.PI);
  });
  root.add(context);

  return root;
}
