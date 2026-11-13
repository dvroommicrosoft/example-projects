// @vitest-environment node
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CAMERA_POSITION,
  getTimeOfDay,
  setTimeOfDay,
  setupEnvironment,
  toggleTimeOfDay,
} from './environment';

function fakeRenderer() {
  return {
    shadowMap: { enabled: false, type: 0 },
    toneMapping: 0,
    outputColorSpace: '',
    toneMappingExposure: 1,
  } as unknown as THREE.WebGLRenderer;
}

describe('setupEnvironment', () => {
  it('configures renderer, fog and shadow-casting sun', () => {
    const scene = new THREE.Scene();
    const renderer = fakeRenderer();
    setupEnvironment(scene, renderer);
    expect(renderer.outputColorSpace).toBe(THREE.SRGBColorSpace);
    expect(renderer.toneMapping).toBe(THREE.ACESFilmicToneMapping);
    expect(renderer.shadowMap.enabled).toBe(true);
    expect(scene.fog).toBeInstanceOf(THREE.FogExp2);
    const sun = scene.getObjectByName('sun') as THREE.DirectionalLight;
    expect(sun.castShadow).toBe(true);
  });

  it('defaults to day without matchMedia and toggles to dusk', () => {
    const scene = new THREE.Scene();
    setupEnvironment(scene, fakeRenderer());
    expect(getTimeOfDay(scene)).toBe('day');
    expect(toggleTimeOfDay(scene)).toBe('dusk');
    const sun = scene.getObjectByName('sun') as THREE.DirectionalLight;
    expect(sun.position.x).toBeLessThan(0);
    setTimeOfDay(scene, 'day');
    expect(sun.position.x).toBeGreaterThan(0);
  });

  it('is idempotent', () => {
    const scene = new THREE.Scene();
    setupEnvironment(scene, fakeRenderer());
    setupEnvironment(scene, fakeRenderer());
    expect(scene.children.filter((c) => c.name === 'sun')).toHaveLength(1);
  });

  it('frames the obelisk from the west', () => {
    expect(DEFAULT_CAMERA_POSITION.x).toBeLessThan(0);
  });
});
