import * as THREE from 'three';
import { createObelisk } from './landmarks/obelisk';
import { createFountains } from './landmarks/fountains';
import { createGround } from './environment/ground';
import { createBuildings } from './environment/buildings';
import { createStreetFurniture } from './environment/streetFurniture';

export function createScene() {
  const scene = new THREE.Scene();
  scene.name = 'place-de-la-concorde';
  scene.background = new THREE.Color(0xd0dce1);
  scene.fog = new THREE.Fog(0xd0dce1, 270, 650);
  const camera = new THREE.PerspectiveCamera(45, 1, 0.5, 900);
  camera.position.set(132, 100, 154);
  camera.lookAt(0, 6, 0);

  const sky = new THREE.HemisphereLight(0xe4f0ff, 0x9b8968, 2.1);
  sky.name = 'sky-and-ground-light';
  const sun = new THREE.DirectionalLight(0xffe6bc, 3.1);
  sun.name = 'afternoon-sun';
  sun.position.set(-100, 140, 70);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -150, right: 150, top: 150, bottom: -150, near: 1, far: 450 });
  sun.shadow.normalBias = 0.08;
  sun.shadow.bias = -0.00015;
  scene.add(sky, sun);
  const fountains = createFountains();
  scene.add(createGround(), createBuildings(), createStreetFurniture(), createObelisk(), fountains.group);

  return {
    scene,
    camera,
    update: fountains.update,
    dispose() {
      const geometries = new Set<THREE.BufferGeometry>();
      const materials = new Set<THREE.Material>();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          geometries.add(object.geometry);
          const meshMaterials = Array.isArray(object.material) ? object.material : [object.material];
          meshMaterials.forEach((material) => materials.add(material));
          if (object instanceof THREE.InstancedMesh) object.dispose();
        }
      });
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      sun.shadow.dispose();
      scene.clear();
    },
  };
}
