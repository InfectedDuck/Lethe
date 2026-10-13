// "Colour is life": a flower's colour blends toward fog in oklab as it fades.
// Mirrors the design system's color-mix() so 3D flowers match the 2D tokens.

import type { Kind, MemoryState } from './types';

/** Tokens from lethe-design-system/tokens.css. Keep in sync. */
export const TOKENS = {
  night: '#0b0e14',
  deepNight: '#121722',
  fog: '#8a93a6',
  textPrimary: '#e8e6e1',
  thread: '#fff4e0',
  light: '#ffd9a0',
  sentence: '#f2d58a',
  song: '#b9a3f0',
  place: '#7fd6c2',
} as const;

export const KIND_COLOR: Record<Kind, string> = {
  sentence: TOKENS.sentence, song: TOKENS.song, place: TOKENS.place, photo: TOKENS.light,
};

/** Share of the flower's own colour kept in each state (rest is fog). Same as bundle.js stateColor. */
export const STATE_COLOR_SHARE: Record<MemoryState, number> = { vivid: 1, fading: 0.5, ghost: 0.3, lost: 0 };

type Lab = [number, number, number];

const toLin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toSrgb = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function rgbToHex([r, g, b]: [number, number, number]): string {
  const c = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

function rgbToOklab([r, g, b]: [number, number, number]): Lab {
  const [lr, lg, lb] = [toLin(r), toLin(g), toLin(b)];
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function oklabToRgb([L, a, b]: Lab): [number, number, number] {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    toSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    toSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    toSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

/** color-mix(in oklab, a share, b). share = 1 gives a. */
export function mixOklab(a: string, b: string, share: number): string {
  const A = rgbToOklab(hexToRgb(a)), B = rgbToOklab(hexToRgb(b));
  const t = Math.min(1, Math.max(0, share));
  return rgbToHex(oklabToRgb([A[0] * t + B[0] * (1 - t), A[1] * t + B[1] * (1 - t), A[2] * t + B[2] * (1 - t)]));
}

/** A memory's flower colour for a state, or for a continuous vitality (smooth transitions while the fog moves). */
export function flowerColor(kind: Kind, state: MemoryState, hue?: string): string {
  return mixOklab(hue ?? KIND_COLOR[kind], TOKENS.fog, STATE_COLOR_SHARE[state]);
}
