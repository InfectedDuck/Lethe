import { describe, expect, it } from 'vitest';
import { AT_REST, DISSOLVE_MS, dissolveBeats, LOST_MOTES, threadDeparture } from './dissolveTimeline';

// The dissolve (storyboard p18; scene-spec § The dissolve, as built): 4.5s, then a dark seed.

describe('dissolve beats', () => {
  it('already lost or waiting: settled seed, or still a ghost', () => {
    expect(dissolveBeats(Infinity)).toEqual(AT_REST);
    expect(dissolveBeats(NaN)).toEqual(AT_REST);
    const w = dissolveBeats(-100);
    expect(w.ghostLook).toBe(true);
    expect(w).toMatchObject({ detach: 0, seed: 0, restMotes: 0 });
  });

  it('0–1.6s: the ghost look, petals still attached, no seed', () => {
    const b = dissolveBeats(0);
    expect(b.ghostLook).toBe(true);
    expect(b.detach).toBe(0);
    expect(b.scatter).toBe(-1);
    expect(b).toMatchObject({ presence: 1, seed: 0, restMotes: 0 });
  });

  it('0.8–1.6s: petals drift off; 1.6s: detached, scattering starts, ghost look ends', () => {
    expect(dissolveBeats(800).detach).toBe(0);
    expect(dissolveBeats(1200).detach).toBeGreaterThan(0.2);
    const b = dissolveBeats(DISSOLVE_MS.particles);
    expect(b.detach).toBe(1);
    expect(b.scatter).toBe(0);
    expect(b.ghostLook).toBe(false);
    expect(b.presence).toBe(1);
  });

  it('4.5s: the seed is here, the scatter is spent, stems at half', () => {
    const b = dissolveBeats(DISSOLVE_MS.seed);
    expect(b.seed).toBe(1);
    expect(b.scatter).toBe(-1);
    expect(b.detach).toBe(1);
    expect(b.presence).toBe(0.5);
    expect(b.restMotes).toBeGreaterThan(0);
    expect(b.restMotes).toBeLessThan(LOST_MOTES);
  });

  it('settles: seed, faint stems, particles drifting at 0.55', () => {
    expect(dissolveBeats(DISSOLVE_MS.seed + 1500)).toEqual(AT_REST);
    expect(AT_REST).toMatchObject({ detach: 1, presence: 0.5, seed: 1, restMotes: LOST_MOTES });
  });

  it('reduced motion: a 0.6s crossfade from ghost to seed', () => {
    const mid = dissolveBeats(300, true);
    expect(mid.ghostLook).toBe(false);
    expect(mid.detach).toBeCloseTo(0.5);
    expect(mid.seed).toBeCloseTo(0.5);
    expect(dissolveBeats(600, true)).toEqual(AT_REST);
  });

  it('nothing ever moves backwards', () => {
    let prev = dissolveBeats(0);
    for (let t = 50; t <= DISSOLVE_MS.seed + 1500; t += 50) {
      const b = dissolveBeats(t);
      expect(b.detach).toBeGreaterThanOrEqual(prev.detach);
      expect(b.seed).toBeGreaterThanOrEqual(prev.seed);
      expect(b.restMotes).toBeGreaterThanOrEqual(prev.restMotes);
      expect(b.presence).toBeLessThanOrEqual(prev.presence);
      expect(b.scatter === -1 || (b.scatter >= 0 && b.scatter <= 1)).toBe(true);
      prev = b;
    }
  });
});

describe('thread departure', () => {
  it('flickers, releases, then goes out over 0.8s', () => {
    const d = threadDeparture(1000);
    expect(d).toEqual({ flickerFrom: 3600, releaseAt: 4600, goneAt: 5400 });
    expect(d.flickerFrom).toBeLessThan(d.releaseAt);
    expect(d.releaseAt).toBeLessThan(d.goneAt);
  });
});
