import * as THREE from 'three';

// Two ornate tiered fountains flanking the obelisk (north -Z, south +Z).
// Units are meters, Y-up. Artistic reconstruction built from procedural geometry only.

const FOUNTAIN_Z = 42;
const STEP_TOP = 0.3;
const BASIN_WALL_TOP = STEP_TOP + 1.4;
const BASIN_WATER_Y = STEP_TOP + 1.1;
const BOWL2_Y = 3.6;
const BOWL2_WATER_Y = BOWL2_Y + 1.35;
const BOWL3_Y = 6.5;
const BOWL3_WATER_Y = BOWL3_Y + 0.85;
const CROWN_Y = 8.2;
const MAX_FRAME_DELTA = 0.25;

interface JetSpec {
  r0: number;
  y0: number;
  r1: number;
  y1: number;
  apex: number;
  angle: number;
  duration: number;
  drops: number;
  size: number;
}

function lathe(points: Array<[number, number]>, segments: number): THREE.LatheGeometry {
  return new THREE.LatheGeometry(
    points.map(([x, y]) => new THREE.Vector2(x, y)),
    segments,
  );
}

function buildJets(): JetSpec[] {
  const jets: JetSpec[] = [];
  // Triton conch jets arching over the lower basin.
  for (let i = 0; i < 8; i++) {
    jets.push({
      r0: 3.7, y0: 3.7, r1: 7.0, y1: BASIN_WATER_Y,
      apex: 1.6, angle: (i / 8) * Math.PI * 2 + Math.PI / 8,
      duration: 1.25, drops: 12, size: 0.11,
    });
  }
  // Middle bowl rim jets falling into the basin.
  for (let i = 0; i < 16; i++) {
    jets.push({
      r0: 4.6, y0: BOWL2_Y + 1.5, r1: 8.0, y1: BASIN_WATER_Y,
      apex: 1.1, angle: (i / 16) * Math.PI * 2,
      duration: 1.1, drops: 11, size: 0.09,
    });
  }
  // Upper bowl jets falling into the middle bowl.
  for (let i = 0; i < 12; i++) {
    jets.push({
      r0: 2.5, y0: BOWL3_Y + 1.05, r1: 4.1, y1: BOWL2_WATER_Y,
      apex: 0.7, angle: (i / 12) * Math.PI * 2 + Math.PI / 12,
      duration: 0.9, drops: 9, size: 0.08,
    });
  }
  // Central vertical plume (apex 0 marks a vertical jet).
  jets.push({
    r0: 0, y0: CROWN_Y + 0.9, r1: 0, y1: BOWL3_WATER_Y,
    apex: 0, angle: 0, duration: 1.6, drops: 18, size: 0.12,
  });
  return jets;
}

export function createFountains(): { group: THREE.Group; update(deltaSeconds: number, elapsedSeconds: number): void } {
  const group = new THREE.Group();
  group.name = 'fountains';

  const limestone = new THREE.MeshStandardMaterial({ color: 0xd9ccb2, roughness: 0.82, metalness: 0.02 });
  const granite = new THREE.MeshStandardMaterial({ color: 0x8b8680, roughness: 0.6, metalness: 0.05 });
  const bronze = new THREE.MeshStandardMaterial({ color: 0x6f5233, roughness: 0.42, metalness: 0.85, side: THREE.DoubleSide });
  const verdigris = new THREE.MeshStandardMaterial({ color: 0x5f7a62, roughness: 0.55, metalness: 0.6 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xe2b04a, roughness: 0.28, metalness: 1, emissive: 0x3a2706, emissiveIntensity: 0.35 });
  const basinStone = new THREE.MeshStandardMaterial({ color: 0xd9ccb2, roughness: 0.82, metalness: 0.02, side: THREE.DoubleSide });
  const waterSurface = new THREE.MeshPhysicalMaterial({
    color: 0x7fb7c9, roughness: 0.08, metalness: 0, transparent: true, opacity: 0.82,
    clearcoat: 1, clearcoatRoughness: 0.05,
  });
  const dropMaterial = new THREE.MeshStandardMaterial({
    color: 0xe8f6ff, roughness: 0.12, metalness: 0, transparent: true, opacity: 0.85,
    emissive: 0x4a6f80, emissiveIntensity: 0.35,
  });
  const rippleMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide,
  });

  // Geometries are shared by both fountains.
  const stepGeo = new THREE.CylinderGeometry(10.6, 11, STEP_TOP, 72);
  const stepUpperGeo = new THREE.CylinderGeometry(10.1, 10.3, 0.12, 72);
  const basinGeo = lathe([
    [8.55, 0], [9.5, 0], [9.75, 0.25], [9.75, 1.1], [10.0, 1.2], [10.0, 1.4],
    [9.2, 1.4], [8.9, 1.3], [8.7, 1.1], [8.55, 0.6], [8.55, 0],
  ], 96);
  const basinFloorGeo = new THREE.CylinderGeometry(8.6, 8.6, 0.06, 72);
  const basinWaterGeo = new THREE.CircleGeometry(8.75, 72);
  const basinTrimGeo = new THREE.TorusGeometry(9.45, 0.12, 8, 96);
  const columnGeo = new THREE.CylinderGeometry(1.5, 2.0, 2.9, 32);
  const columnBandGeo = new THREE.TorusGeometry(1.75, 0.14, 8, 40);
  const bowl2Geo = lathe([
    [0, 0], [1.0, 0.02], [2.4, 0.45], [4.0, 1.15], [4.55, 1.5], [4.7, 1.65],
    [4.45, 1.7], [4.3, 1.55], [3.8, 1.3], [2.3, 0.7], [1.0, 0.3], [0, 0.28],
  ], 64);
  const bowl2WaterGeo = new THREE.CircleGeometry(3.95, 56);
  const bowl2TrimGeo = new THREE.TorusGeometry(4.55, 0.1, 8, 72);
  const stem2Geo = new THREE.CylinderGeometry(0.55, 0.8, 1.6, 24);
  const knopGeo = new THREE.SphereGeometry(0.85, 24, 16);
  const bowl3Geo = lathe([
    [0, 0], [0.6, 0.02], [1.5, 0.3], [2.5, 0.75], [2.85, 1.0], [2.9, 1.1],
    [2.7, 1.12], [2.6, 1.0], [2.2, 0.85], [1.4, 0.5], [0.6, 0.3], [0, 0.28],
  ], 48);
  const bowl3WaterGeo = new THREE.CircleGeometry(2.45, 40);
  const bowl3TrimGeo = new THREE.TorusGeometry(2.85, 0.08, 8, 56);
  const stem3Geo = new THREE.CylinderGeometry(0.28, 0.45, 1.7, 16);
  const crownGeo = new THREE.ConeGeometry(0.55, 0.9, 16);
  const finialGeo = new THREE.SphereGeometry(0.26, 16, 12);
  const pedestalGeo = new THREE.BoxGeometry(1.3, 1.3, 1.3);
  const pedestalCapGeo = new THREE.BoxGeometry(1.55, 0.18, 1.55);
  const torsoGeo = new THREE.CapsuleGeometry(0.34, 0.8, 6, 12);
  const headGeo = new THREE.SphereGeometry(0.24, 14, 12);
  const tailGeo = new THREE.TorusGeometry(0.55, 0.15, 8, 20, Math.PI * 1.25);
  const armGeo = new THREE.CapsuleGeometry(0.1, 0.55, 4, 8);
  const conchGeo = new THREE.ConeGeometry(0.17, 0.5, 10);
  const dolphinBodyGeo = new THREE.TorusGeometry(0.7, 0.13, 8, 20, Math.PI * 1.1);
  const dolphinHeadGeo = new THREE.SphereGeometry(0.17, 10, 8);
  const rippleGeo = new THREE.RingGeometry(0.96, 1, 72);
  const dropGeo = new THREE.SphereGeometry(1, 8, 6);

  const add = (
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    parent: THREE.Object3D,
    x: number,
    y: number,
    z: number,
    flat = false,
  ) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    if (flat) m.rotation.x = Math.PI / 2;
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };

  const addWater = (geo: THREE.BufferGeometry, parent: THREE.Object3D, y: number) => {
    const m = add(geo, waterSurface, parent, 0, y, 0);
    m.rotation.x = -Math.PI / 2;
    m.castShadow = false;
    return m;
  };

  const jets = buildJets();
  const dropCount = jets.reduce((n, j) => n + j.drops, 0);

  const ripples: Array<{ mesh: THREE.Mesh; base: number; speed: number; offset: number }> = [];
  const dropMeshes: THREE.InstancedMesh[] = [];

  const buildFountain = (zSign: 1 | -1): THREE.Group => {
    const f = new THREE.Group();
    f.name = zSign < 0 ? 'fountain-north' : 'fountain-south';
    f.position.set(0, 0, zSign * FOUNTAIN_Z);

    // Stone steps and basin
    add(stepGeo, granite, f, 0, STEP_TOP / 2, 0);
    add(stepUpperGeo, limestone, f, 0, STEP_TOP + 0.01, 0);
    add(basinGeo, basinStone, f, 0, STEP_TOP, 0);
    add(basinFloorGeo, granite, f, 0, STEP_TOP + 0.3, 0);
    add(basinTrimGeo, gold, f, 0, BASIN_WALL_TOP + 0.04, 0, true);
    addWater(basinWaterGeo, f, BASIN_WATER_Y);

    // Central column with gold bands
    add(columnGeo, limestone, f, 0, STEP_TOP + 1.75, 0);
    add(columnBandGeo, gold, f, 0, STEP_TOP + 1.0, 0, true);
    add(columnBandGeo, gold, f, 0, STEP_TOP + 3.0, 0, true).scale.setScalar(0.85);

    // Eight tritons on stone pedestals around the column
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      const fig = new THREE.Group();
      fig.position.set(Math.sin(a) * 3.7, 0, Math.cos(a) * 3.7);
      fig.rotation.y = a;
      add(pedestalGeo, limestone, fig, 0, STEP_TOP + 0.85, 0);
      add(pedestalCapGeo, granite, fig, 0, STEP_TOP + 1.55, 0);
      const base = STEP_TOP + 1.65;
      add(tailGeo, verdigris, fig, 0, base + 0.5, 0.1).rotation.set(0, Math.PI / 2, Math.PI * 0.1);
      add(torsoGeo, bronze, fig, 0, base + 1.25, 0.15);
      add(headGeo, bronze, fig, 0, base + 2.05, 0.15);
      add(armGeo, bronze, fig, 0.45, base + 1.6, 0.35).rotation.set(Math.PI * 0.35, 0, -0.5);
      add(armGeo, bronze, fig, -0.45, base + 1.6, 0.35).rotation.set(Math.PI * 0.35, 0, 0.5);
      add(conchGeo, gold, fig, 0, base + 2.0, 0.65).rotation.x = Math.PI / 2 + 0.5;
      f.add(fig);
    }

    // Middle bronze bowl with stem, knop and gold dolphins
    add(stem2Geo, bronze, f, 0, STEP_TOP + 3.0, 0);
    add(knopGeo, gold, f, 0, BOWL2_Y + 0.55, 0);
    add(bowl2Geo, bronze, f, 0, BOWL2_Y, 0);
    addWater(bowl2WaterGeo, f, BOWL2_WATER_Y);
    add(bowl2TrimGeo, gold, f, 0, BOWL2_Y + 1.68, 0, true);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const d = new THREE.Group();
      d.position.set(Math.sin(a) * 0.85, BOWL2_Y + 1.7, Math.cos(a) * 0.85);
      d.rotation.y = a;
      add(dolphinBodyGeo, gold, d, 0, 0.45, 0).rotation.set(0, Math.PI / 2, Math.PI * 0.45);
      add(dolphinHeadGeo, gold, d, 0, 0.95, 0.5);
      f.add(d);
    }

    // Upper bowl, crown and finial
    add(stem3Geo, bronze, f, 0, BOWL3_Y - 0.55, 0);
    add(bowl3Geo, bronze, f, 0, BOWL3_Y, 0);
    addWater(bowl3WaterGeo, f, BOWL3_WATER_Y);
    add(bowl3TrimGeo, gold, f, 0, BOWL3_Y + 1.1, 0, true);
    add(crownGeo, gold, f, 0, CROWN_Y, 0);
    add(finialGeo, gold, f, 0, CROWN_Y + 0.55, 0);

    // Expanding ripple rings on the lower two water surfaces
    for (let i = 0; i < 3; i++) {
      for (const [radius, y, speed] of [[7.5, BASIN_WATER_Y, 0.12], [3.9, BOWL2_WATER_Y, 0.2]] as const) {
        const r = add(rippleGeo, rippleMaterial, f, 0, y + 0.02, 0);
        r.rotation.x = -Math.PI / 2;
        r.castShadow = false;
        r.receiveShadow = false;
        ripples.push({ mesh: r, base: radius, speed, offset: i / 3 });
      }
    }

    // Instanced droplets trace the visible water arcs
    const drops = new THREE.InstancedMesh(dropGeo, dropMaterial, dropCount);
    drops.name = 'water-drops';
    drops.frustumCulled = false;
    drops.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    f.add(drops);
    dropMeshes.push(drops);

    return f;
  };

  group.add(buildFountain(-1), buildFountain(1));

  const reducedMotion =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null;

  const dummy = new THREE.Object3D();
  let flowClock = 0;

  const writeDrops = (mesh: THREE.InstancedMesh, clock: number, phaseShift: number, flow: number) => {
    let index = 0;
    for (let j = 0; j < jets.length; j++) {
      const jet = jets[j];
      const sx = Math.sin(jet.angle);
      const sz = Math.cos(jet.angle);
      const vertical = jet.apex === 0;
      for (let d = 0; d < jet.drops; d++) {
        const s = (clock / jet.duration + d / jet.drops + phaseShift + (j % 3) * 0.07) % 1;
        let r: number;
        let y: number;
        if (vertical) {
          r = 0;
          y = Math.max(jet.y0 + 3.2 * 4 * s * (1 - s) * flow, jet.y1);
        } else {
          r = jet.r0 + (jet.r1 - jet.r0) * s;
          y = jet.y0 + (jet.y1 - jet.y0) * s + 4 * jet.apex * s * (1 - s) * flow;
        }
        const stretch = 1 + 0.6 * Math.abs(1 - 2 * s);
        dummy.position.set(sx * r, y, sz * r);
        dummy.scale.set(jet.size, jet.size * stretch, jet.size);
        dummy.updateMatrix();
        mesh.setMatrixAt(index++, dummy.matrix);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
  };

  const update = (deltaSeconds: number, elapsedSeconds: number) => {
    const reduced = reducedMotion?.matches === true;
    const speed = reduced ? 0.25 : 1;
    // Clamp spikes (e.g. background tabs) so arcs never jump.
    flowClock += Math.min(Math.max(deltaSeconds, 0), MAX_FRAME_DELTA) * speed;
    const flow = reduced ? 0.7 : 1;

    dropMeshes.forEach((m, i) => writeDrops(m, flowClock, i * 0.37, flow));

    for (const r of ripples) {
      const t = (elapsedSeconds * r.speed * speed + r.offset) % 1;
      const scale = r.base * (0.35 + 0.65 * t);
      r.mesh.scale.set(scale, scale, 1);
    }
    rippleMaterial.opacity = reduced ? 0.2 : 0.35;
  };

  update(0, 0);

  return { group, update };
}
