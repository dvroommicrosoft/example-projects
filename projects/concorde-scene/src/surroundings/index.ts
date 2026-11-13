import * as THREE from 'three';
import { createBuildings, createMadeleine } from './buildings';
import { createArc, createRiverside, createStatues, createTuileriesEdge } from './places';
import { createLamps, createRoads, createTrees } from './props';

/**
 * Procedural surroundings of Place de la Concorde. Units are meters, Y up,
 * origin at the Luxor Obelisk base; +X east (Tuileries), -Z north (rue Royale).
 */
export function createSurroundings(): THREE.Group {
  const g = new THREE.Group();
  g.name = 'surroundings';
  const buildings = createBuildings();
  g.add(
    createRoads(),
    buildings,
    createMadeleine(),
    createStatues(),
    createRiverside(),
    createTuileriesEdge(),
    createArc(),
    createTrees(),
    createLamps(),
  );
  return g;
}
