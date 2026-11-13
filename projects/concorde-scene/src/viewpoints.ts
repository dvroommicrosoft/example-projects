export interface Viewpoint {
  id: string;
  label: string;
  key: string;
  position: [number, number, number];
  target: [number, number, number];
}

// Meters; origin = Luxor Obelisk base, +X east, -Z north, Y up.
export const VIEWPOINTS: readonly Viewpoint[] = [
  { id: 'overview', label: 'Overview', key: '1', position: [-220, 170, 220], target: [0, 10, 0] },
  { id: 'street', label: 'Street level', key: '2', position: [-70, 1.7, 55], target: [0, 8, 0] },
  { id: 'tuileries', label: 'Toward Tuileries', key: '3', position: [-90, 25, 10], target: [60, 12, 0] },
  { id: 'madeleine', label: 'Toward La Madeleine', key: '4', position: [10, 20, 85], target: [0, 15, -80] },
];

export function findViewpoint(id: string): Viewpoint {
  return VIEWPOINTS.find((v) => v.id === id) ?? VIEWPOINTS[0];
}

export function viewpointForKey(key: string): Viewpoint | undefined {
  return VIEWPOINTS.find((v) => v.key === key);
}
