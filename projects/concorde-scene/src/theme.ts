export type ThemeName = 'light' | 'dark';

export interface ThemeSettings {
  name: ThemeName;
  skyTop: number;
  skyHorizon: number;
  fog: number;
  hemiSky: number;
  hemiGround: number;
  hemiIntensity: number;
  sunColor: number;
  sunIntensity: number;
  sunPosition: [number, number, number];
  ground: number;
}

export const THEMES: Record<ThemeName, ThemeSettings> = {
  light: {
    name: 'light', skyTop: 0x5d9be0, skyHorizon: 0xdfe9f2, fog: 0xdfe9f2,
    hemiSky: 0xcfe3ff, hemiGround: 0x8c8470, hemiIntensity: 1.0,
    sunColor: 0xfff1d6, sunIntensity: 2.6, sunPosition: [-180, 220, 120], ground: 0xcdc3ad,
  },
  dark: {
    name: 'dark', skyTop: 0x0a1030, skyHorizon: 0x7a4a5e, fog: 0x241d36,
    hemiSky: 0x39466e, hemiGround: 0x1c1a24, hemiIntensity: 0.9,
    sunColor: 0xff9a66, sunIntensity: 0.8, sunPosition: [-260, 40, 40], ground: 0x6f6a60,
  },
};

export function selectTheme(prefersDark: boolean): ThemeSettings {
  return prefersDark ? THEMES.dark : THEMES.light;
}
