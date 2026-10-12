// The dissolve (storyboard p18; scene-spec § The dissolve): a ghost becoming lost, about 4.5s, unhurried, never
// alarming. Petals detach, turn to particles, the threads flicker and go out, and a small dark seed remains where
// the flower stood, which can be returned to. Pure: milliseconds in, beats out.

export type DissolveBeats = {
  /** Draw with the ghost's look (outline at 0.4) rather than the lost look, while it is still letting go. */
  ghostLook: boolean;
  /** Petals and light parts drifting off the head, 0 attached → 1 gone. */
  detach: number;
  /** One-shot scatter of particles from the flower's shape, 0 → 1; −1 when not scattering. */
  scatter: number;
  /** Stems and leaves: 1 drawn → 0.5 faint. */
  presence: number;
  /** The dark seed at the base, 0 → 1. */
  seed: number;
  /** Faint particles still drifting where the flower stood, 0 → LOST_MOTES (the design system's lost look). */
  restMotes: number;
};

export const DISSOLVE_MS = { detach: 800, particles: 1600, flicker: 2600, lastThread: 3600, seed: 4500 } as const;
/** How strongly a lost memory's particles keep drifting once the dissolve is over (screen p16). */
export const LOST_MOTES = 0.55;
const THREAD_OUT_MS = 800;
const REDUCED_FADE_MS = 600;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const span = (ms: number, from: number, to: number) => clamp01((ms - from) / (to - from));
const easeIn = (t: number) => t * t;

/** Not lost: nothing dissolving. */
export const ALIVE: DissolveBeats = { ghostLook: false, detach: 0, scatter: -1, presence: 1, seed: 0, restMotes: 0 };
/** Lost and settled: a dark seed, faint stems, particles drifting. */
export const AT_REST: DissolveBeats = { ghostLook: false, detach: 1, scatter: -1, presence: 0.5, seed: 1, restMotes: LOST_MOTES };
/** Lost, but its dissolve is scheduled later (the return replay staggers them): still a ghost for now. */
const WAITING: DissolveBeats = { ghostLook: true, detach: 0, scatter: -1, presence: 1, seed: 0, restMotes: 0 };

/** `ms` since the dissolve began; Infinity for a memory that was already lost (no animation). */
export function dissolveBeats(ms: number, reducedMotion = false): DissolveBeats {
  if (ms === Infinity || Number.isNaN(ms)) return AT_REST;
  if (ms < 0) return WAITING;
  if (reducedMotion) {
    // Keep the look, drop the motion: a short crossfade from ghost to the settled seed.
    const k = span(ms, 0, REDUCED_FADE_MS);
    return k >= 1 ? AT_REST : { ...AT_REST, ghostLook: k < 0.5, detach: k, presence: 1 - 0.5 * k, seed: k, restMotes: LOST_MOTES * k };
  }
  if (ms >= DISSOLVE_MS.seed + 1500) return AT_REST;
  return {
    ghostLook: ms < DISSOLVE_MS.particles,
    detach: easeIn(span(ms, DISSOLVE_MS.detach, DISSOLVE_MS.particles)),
    scatter: ms >= DISSOLVE_MS.particles && ms < DISSOLVE_MS.seed ? span(ms, DISSOLVE_MS.particles, DISSOLVE_MS.seed) : -1,
    presence: 1 - 0.5 * span(ms, DISSOLVE_MS.particles, DISSOLVE_MS.lastThread),
    seed: span(ms, DISSOLVE_MS.seed - 700, DISSOLVE_MS.seed),
    restMotes: LOST_MOTES * span(ms, DISSOLVE_MS.seed - 200, DISSOLVE_MS.seed + 1500),
  };
}

/** For a thread to a dissolving memory: when it starts to flicker, and when it has gone out. */
export function threadDeparture(dissolveAt: number) {
  return { flickerFrom: dissolveAt + DISSOLVE_MS.flicker, releaseAt: dissolveAt + DISSOLVE_MS.lastThread, goneAt: dissolveAt + DISSOLVE_MS.lastThread + THREAD_OUT_MS };
}
