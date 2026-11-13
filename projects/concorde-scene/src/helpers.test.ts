import { describe, expect, it } from 'vitest';
import { VIEWPOINTS, findViewpoint, viewpointForKey } from './viewpoints';
import { selectTheme } from './theme';

describe('viewpoints', () => {
  it('has unique ids and keys, including overview and street level', () => {
    expect(new Set(VIEWPOINTS.map((v) => v.id)).size).toBe(VIEWPOINTS.length);
    expect(new Set(VIEWPOINTS.map((v) => v.key)).size).toBe(VIEWPOINTS.length);
    expect(findViewpoint('street').position[1]).toBeLessThan(3);
  });
  it('falls back to overview for unknown ids', () => {
    expect(findViewpoint('nope').id).toBe('overview');
  });
  it('looks up by key', () => {
    expect(viewpointForKey('2')?.id).toBe('street');
    expect(viewpointForKey('x')).toBeUndefined();
  });
});

describe('theme', () => {
  it('follows the OS color scheme', () => {
    expect(selectTheme(true).name).toBe('dark');
    expect(selectTheme(false).name).toBe('light');
  });
});
