// The bloom (storyboard p17; scene-spec § The bloom): a seed falls, lands with a ripple, roots spread as light,
// the stem rises, petals unfold, the glow settles. 1.6s, then breathing. Pure: milliseconds in, beats out.

export type BloomBeats = {
  /** Height of the falling seed above the ground (world units). */
  seedY: number;
  seedAlpha: number;
  /** The landing ripple on the ground: radius (world units) and opacity. */
  ringR: number;
  ringAlpha: number;
  /** Roots spreading as light, 0–1 drawn, and their opacity. */
  roots: number;
  rootsAlpha: number;
  /** Stem reveal from the ground up, 0–1 of the flower's height. */
  grow: number;
  /** Petals opening from the head, 0–1. */
  unfold: number;
  /** Halo and glow settling in, 0–1. */
  glow: number;
  /** Whole-flower opacity (only below 1 for the reduced-motion crossfade). */
  opacity: number;
  /** True once nothing is moving any more. */
  done: boolean;
};

export const BLOOM_MS = { land: 250, roots: 500, stem: 800, petals: 1200, settle: 1600, end: 2200 } as const;
const SEED_FROM = 2.5;
const RING_MAX = 0.6;
const REDUCED_FADE_MS = 600;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const easeIn = (t: number) => t * t;
const easeOut = (t: number) => 1 - (1 - t) ** 2;
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const span = (ms: number, from: number, to: number) => clamp01((ms - from) / (to - from));

export const FULL_BLOOM: BloomBeats = {
  seedY: 0, seedAlpha: 0, ringR: 0, ringAlpha: 0, roots: 1, rootsAlpha: 0, grow: 1, unfold: 1, glow: 1, opacity: 1, done: true,
};

export function bloomBeats(ms: number, reducedMotion = false): BloomBeats {
  if (!Number.isFinite(ms) || ms >= BLOOM_MS.end) return FULL_BLOOM;
  if (reducedMotion) {
    // Keep the look, drop the motion: a short crossfade instead of the growth.
    return { ...FULL_BLOOM, opacity: clamp01(ms / REDUCED_FADE_MS), done: ms >= REDUCED_FADE_MS };
  }
  const t = Math.max(0, ms);
  const fall = span(t, 0, BLOOM_MS.land);
  const ring = span(t, BLOOM_MS.land, BLOOM_MS.stem + 100);
  return {
    seedY: SEED_FROM * (1 - easeIn(fall)),
    // The seed glows as it falls and rests, then gives itself to the stem.
    seedAlpha: 1 - span(t, BLOOM_MS.stem, BLOOM_MS.petals - 100),
    ringR: RING_MAX * easeOut(span(t, BLOOM_MS.land, BLOOM_MS.roots + 150)),
    ringAlpha: t < BLOOM_MS.land ? 0 : 0.8 * (1 - ring),
    roots: easeOut(span(t, BLOOM_MS.roots, BLOOM_MS.stem)),
    rootsAlpha: t < BLOOM_MS.roots ? 0 : 0.9 * (1 - span(t, BLOOM_MS.petals, BLOOM_MS.end)),
    grow: easeOut(span(t, BLOOM_MS.stem, BLOOM_MS.petals)),
    unfold: easeInOut(span(t, BLOOM_MS.petals, BLOOM_MS.settle)),
    glow: easeInOut(span(t, BLOOM_MS.settle - 200, BLOOM_MS.end)),
    opacity: 1,
    done: false,
  };
}
