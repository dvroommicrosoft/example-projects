import * as THREE from 'three';

export interface FountainsResult {
  group: THREE.Group;
  update: (elapsed: number) => void;
}

const FOUNTAIN_Z = 55;
const BASIN_RADIUS = 11;
const RIM_HEIGHT = 1.1;
const WATER_LEVEL = 0.85;
const RADIAL_JETS = 16;
const DROPS_PER_JET = 14;
const CENTRAL_DROPS = 28;
const FIGURE_COUNT = 4;
const FIGURE_JET_DROPS = 10;
const TWO_PI = Math.PI * 2;

interface FountainJets {
  jets: THREE.InstancedMesh;
  phase: number;
}

function fract(x: number): number {
  return x - Math.floor(x);
}

export function createFountains(): FountainsResult {
  const root = new THREE.Group();
  root.name = 'Fountains';

  // Materials and geometry are shared by both fountains.
  const patina = new THREE.MeshStandardMaterial({
    color: 0x3f7a68,
    roughness: 0.55,
    metalness: 0.45,
    side: THREE.DoubleSide,
  });
  const darkBronze = new THREE.MeshStandardMaterial({
    color: 0x2c4a3f,
    roughness: 0.6,
    metalness: 0.5,
  });
  const gold = new THREE.MeshStandardMaterial({
    color: 0xd9a93a,
    roughness: 0.3,
    metalness: 0.9,
  });
  const stone = new THREE.MeshStandardMaterial({
    color: 0xd8cdb4,
    roughness: 0.85,
    metalness: 0,
  });
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x6fc3d6,
    roughness: 0.08,
    metalness: 0.1,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const dropMat = new THREE.MeshStandardMaterial({
    color: 0xcdf1fa,
    roughness: 0.1,
    metalness: 0,
    transparent: true,
    opacity: 0.8,
    emissive: 0x2a5560,
    emissiveIntensity: 0.35,
  });

  const seg = 48;
  const outerRingGeo = new THREE.TorusGeometry(BASIN_RADIUS, 0.55, 12, 72);
  const outerWallGeo = new THREE.CylinderGeometry(
    BASIN_RADIUS + 0.4,
    BASIN_RADIUS + 0.9,
    RIM_HEIGHT,
    seg,
    1,
    true,
  );
  const outerBaseGeo = new THREE.CylinderGeometry(BASIN_RADIUS + 1.6, BASIN_RADIUS + 1.8, 0.35, seg);
  const basinFloorGeo = new THREE.CylinderGeometry(BASIN_RADIUS, BASIN_RADIUS, 0.2, seg);
  const waterGeo = new THREE.CircleGeometry(BASIN_RADIUS - 0.2, seg);
  const bowlWaterGeo = new THREE.CircleGeometry(1, 32);
  const pedestalGeo = new THREE.CylinderGeometry(1.1, 1.8, 3.2, 24);
  const plinthGeo = new THREE.CylinderGeometry(3.4, 4.0, 0.9, 32);
  // Lower hemisphere (bowl opening upward).
  const bowlGeo = new THREE.SphereGeometry(1, 40, 16, 0, TWO_PI, Math.PI / 2, Math.PI / 2);
  const bowlRimGeo = new THREE.TorusGeometry(1, 0.07, 8, 48);
  const stemGeo = new THREE.CylinderGeometry(0.45, 0.8, 2.6, 16);
  const finialGeo = new THREE.SphereGeometry(0.55, 16, 12);
  const spireGeo = new THREE.ConeGeometry(0.28, 1.6, 12);
  const torsoGeo = new THREE.CapsuleGeometry(0.45, 1.0, 4, 10);
  const headGeo = new THREE.SphereGeometry(0.34, 14, 10);
  const tailGeo = new THREE.CapsuleGeometry(0.3, 1.5, 4, 10);
  const finGeo = new THREE.ConeGeometry(0.45, 0.9, 8);
  const dolphinBodyGeo = new THREE.CapsuleGeometry(0.28, 1.2, 4, 10);
  const dolphinSnoutGeo = new THREE.ConeGeometry(0.14, 0.5, 8);
  const shellGeo = new THREE.SphereGeometry(0.9, 16, 8, 0, TWO_PI, Math.PI / 2, Math.PI / 2);
  const dropGeo = new THREE.SphereGeometry(0.16, 8, 6);

  const mesh = (
    name: string,
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    cast = true,
    receive = true,
  ): THREE.Mesh => {
    const m = new THREE.Mesh(geo, mat);
    m.name = name;
    m.castShadow = cast;
    m.receiveShadow = receive;
    return m;
  };

  const buildBasin = (): THREE.Group => {
    const g = new THREE.Group();
    g.name = 'FountainBasin';

    const base = mesh('FountainBasinBase', outerBaseGeo, stone);
    base.position.y = 0.175;
    g.add(base);

    const floor = mesh('FountainBasinFloor', basinFloorGeo, darkBronze, false, true);
    floor.position.y = 0.3;
    g.add(floor);

    const wall = mesh('FountainBasinWall', outerWallGeo, patina);
    wall.position.y = RIM_HEIGHT / 2 + 0.2;
    g.add(wall);

    const rim = mesh('FountainBasinRim', outerRingGeo, gold);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = RIM_HEIGHT + 0.2;
    g.add(rim);

    const plinth = mesh('FountainPlinth', plinthGeo, stone);
    plinth.position.y = 0.75;
    g.add(plinth);

    const pedestal = mesh('FountainPedestal', pedestalGeo, patina);
    pedestal.position.y = 2.35;
    g.add(pedestal);

    const tiers = [
      { name: 'LowerBowl', y: 3.2, r: 3.3, depth: 0.9 },
      { name: 'UpperBowl', y: 6.5, r: 1.9, depth: 0.7 },
    ];
    for (const t of tiers) {
      const bowl = mesh(`Fountain${t.name}`, bowlGeo, patina);
      bowl.scale.set(t.r, t.depth, t.r);
      bowl.position.y = t.y;
      g.add(bowl);

      const bowlRim = mesh(`Fountain${t.name}Rim`, bowlRimGeo, gold);
      bowlRim.rotation.x = Math.PI / 2;
      bowlRim.scale.set(t.r, t.r, t.r * 1.8);
      bowlRim.position.y = t.y;
      g.add(bowlRim);

      const w = mesh(`Fountain${t.name}Water`, bowlWaterGeo, waterMat, false, false);
      w.rotation.x = -Math.PI / 2;
      w.scale.set(t.r * 0.94, t.r * 0.94, 1);
      w.position.y = t.y - 0.08;
      w.renderOrder = 2;
      g.add(w);
    }

    const stem = mesh('FountainStem', stemGeo, darkBronze);
    stem.position.y = 5.0;
    g.add(stem);

    const finial = mesh('FountainFinial', finialGeo, gold);
    finial.position.y = 7.0;
    g.add(finial);
    const spire = mesh('FountainSpire', spireGeo, gold);
    spire.position.y = 8.1;
    g.add(spire);

    return g;
  };

  const buildWater = (): THREE.Mesh => {
    const w = mesh('FountainWater', waterGeo, waterMat, false, true);
    w.rotation.x = -Math.PI / 2;
    w.position.y = WATER_LEVEL;
    w.renderOrder = 1;
    return w;
  };

  const buildFigures = (): THREE.Group => {
    const g = new THREE.Group();
    g.name = 'FountainFigures';
    for (let i = 0; i < FIGURE_COUNT; i++) {
      const a = (i / FIGURE_COUNT) * TWO_PI + Math.PI / 4;
      const fig = new THREE.Group();
      fig.name = i % 2 === 0 ? `FountainTriton${i}` : `FountainNereid${i}`;
      fig.position.set(Math.cos(a) * 7.4, 0.3, Math.sin(a) * 7.4);
      // Face outward from the pedestal.
      fig.rotation.y = Math.PI / 2 - a;

      const shell = mesh('FigureShell', shellGeo, darkBronze);
      shell.position.y = 1.0;
      shell.scale.set(1.2, 1, 1.2);
      fig.add(shell);
      const tail = mesh('FigureTail', tailGeo, patina);
      tail.rotation.x = Math.PI / 2.6;
      tail.position.set(0, 1.4, -0.6);
      fig.add(tail);
      const tailFin = mesh('FigureTailFin', finGeo, gold);
      tailFin.rotation.x = Math.PI / 2.4;
      tailFin.position.set(0, 1.9, -1.45);
      fig.add(tailFin);
      const torso = mesh('FigureTorso', torsoGeo, gold);
      torso.position.set(0, 2.5, 0);
      torso.rotation.x = 0.25;
      fig.add(torso);
      const head = mesh('FigureHead', headGeo, gold);
      head.position.set(0, 3.55, 0.15);
      fig.add(head);
      g.add(fig);
    }

    for (let i = 0; i < FIGURE_COUNT; i++) {
      const a = (i / FIGURE_COUNT) * TWO_PI;
      const d = new THREE.Group();
      d.name = `FountainDolphin${i}`;
      d.position.set(Math.cos(a) * 2.2, 3.4, Math.sin(a) * 2.2);
      d.rotation.y = Math.PI / 2 - a;
      const body = mesh('DolphinBody', dolphinBodyGeo, gold);
      body.rotation.z = Math.PI / 2.4;
      d.add(body);
      const snout = mesh('DolphinSnout', dolphinSnoutGeo, gold);
      snout.rotation.z = -Math.PI / 2 + 0.4;
      snout.position.set(0.75, 0.55, 0);
      d.add(snout);
      g.add(d);
    }
    return g;
  };

  const buildJets = (): THREE.InstancedMesh => {
    const total = RADIAL_JETS * DROPS_PER_JET + CENTRAL_DROPS + FIGURE_COUNT * FIGURE_JET_DROPS;
    const im = new THREE.InstancedMesh(dropGeo, dropMat, total);
    im.name = 'FountainJets';
    im.castShadow = false;
    im.receiveShadow = false;
    im.frustumCulled = false;
    im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    return im;
  };

  const animated: FountainJets[] = [];
  const placements: [string, number, number][] = [
    ['FountainNorth', -FOUNTAIN_Z, 0],
    ['FountainSouth', FOUNTAIN_Z, 1.7],
  ];
  for (const [name, z, phase] of placements) {
    const fg = new THREE.Group();
    fg.name = name;
    fg.position.set(0, 0, z);
    const jets = buildJets();
    fg.add(buildBasin(), buildWater(), buildFigures(), jets);
    root.add(fg);
    animated.push({ jets, phase });
  }

  // Scratch objects reused every frame.
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const p = new THREE.Vector3();
  const s = new THREE.Vector3();

  const writeDrop = (
    im: THREE.InstancedMesh,
    idx: number,
    x: number,
    y: number,
    z: number,
    k: number,
  ): void => {
    p.set(x, y, z);
    s.set(k, k * 1.3, k);
    m.compose(p, q, s);
    im.setMatrixAt(idx, m);
  };

  const update = (elapsed: number): void => {
    for (const f of animated) {
      const t0 = elapsed + f.phase;
      let idx = 0;

      // Arching streams from the upper bowl down into the basin, alternating long/short.
      for (let j = 0; j < RADIAL_JETS; j++) {
        const a = (j / RADIAL_JETS) * TWO_PI;
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        const short = j % 2 === 1;
        const r0 = 2.0;
        const r1 = short ? 5.6 : 8.6;
        const peak = short ? 1.8 : 3.0;
        for (let i = 0; i < DROPS_PER_JET; i++) {
          const t = fract(t0 * 0.55 + i / DROPS_PER_JET + j * 0.037);
          const y = 6.5 + (3.4 - 6.5) * t * t + peak * 4 * t * (1 - t);
          // Final stretch drops to the water surface.
          const fall = t > 0.85 ? (t - 0.85) / 0.15 : 0;
          const yy = y + (WATER_LEVEL - y) * fall * fall;
          const rr = r0 + (r1 - r0) * t + fall * 0.8;
          writeDrop(f.jets, idx++, ca * rr, yy, sa * rr, 0.75 + 0.25 * Math.sin(TWO_PI * t));
        }
      }

      // Central column with gently pulsing height.
      const pulse = 0.85 + 0.15 * Math.sin(t0 * 1.3);
      for (let i = 0; i < CENTRAL_DROPS; i++) {
        const t = fract(t0 * 0.7 + i / CENTRAL_DROPS);
        const h = 8.9 + 5.5 * pulse * 4 * t * (1 - t);
        const drift = 0.5 * (t - 0.5);
        writeDrop(f.jets, idx++, Math.cos(i * 2.399) * drift, h, Math.sin(i * 2.399) * drift, 0.8);
      }

      // Short sprays from the figures into the basin.
      for (let k = 0; k < FIGURE_COUNT; k++) {
        const a = (k / FIGURE_COUNT) * TWO_PI + Math.PI / 4;
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        for (let i = 0; i < FIGURE_JET_DROPS; i++) {
          const t = fract(t0 * 0.8 + i / FIGURE_JET_DROPS + k * 0.25);
          const r = 7.4 + t * 2.6;
          const y = 3.6 + 2.0 * 4 * t * (1 - t) - 2.75 * t * t;
          writeDrop(f.jets, idx++, ca * r, Math.max(y, WATER_LEVEL), sa * r, 0.7);
        }
      }
      f.jets.instanceMatrix.needsUpdate = true;
    }
  };

  update(0);
  return { group: root, update };
}
