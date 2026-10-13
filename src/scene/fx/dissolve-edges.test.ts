import { describe, expect, it } from 'vitest';
import { ALIVE, AT_REST, DISSOLVE_MS, dissolveBeats, LOST_MOTES, threadDeparture } from './dissolveTimeline';

// P7 edge and regression tests (Spark). The primary beats are in dissolve.test.ts;
// here the storyboard numbers, the exact boundaries and the reduced-motion path are pinned,
// so a retune must update docs/scene-spec.md § The dissolve alongside the code.

describe('dissolve storyboard numbers', () => {
  it('matches scene-spec § The dissolve: 0.8 detach, 1.6 particles, 2.6 flicker, 3.6 last thread, 4.5 seed', () => {
    expect(DISSOLVE_MS).toEqual({ detach: 800, particles: 1600, flicker: 2600, lastThread: 3600, seed: 4500 });
  });

  it('the settled look matches D18: dark seed, faint stems, particles at 0.55', () => {
    expect(LOST_MOTES).toBe(0.55);
    expect(AT_REST).toEqual({ ghostLook: false, detach: 1, scatter: -1, presence: 0.5, seed: 1, restMotes: 0.55 });
  });

  it('alive is neutral: no detach, no seed, full presence, no motes', () => {
    expect(ALIVE).toEqual({ ghostLook: false, detach: 0, scatter: -1, presence: 1, seed: 0, restMotes: 0 });
  });
});

describe('dissolve boundaries', () => {
  it('the ghost look ends exactly when particles take over at 1.6s', () => {
    expect(dissolveBeats(1599).ghostLook).toBe(true);
    expect(dissolveBeats(1600).ghostLook).toBe(false);
  });

  it('petals ease off the head between 0.8 and 1.6s (ease-in, so 1.2s is a quarter gone)', () => {
    expect(dissolveBeats(799).detach).toBe(0);
    expect(dissolveBeats(800).detach).toBe(0);
    expect(dissolveBeats(1200).detach).toBeCloseTo(0.25, 5);
    expect(dissolveBeats(1600).detach).toBe(1);
    expect(dissolveBeats(4500).detach).toBe(1);
  });

  it('scatter runs once from 1.6 to 4.5s, and is -1 outside', () => {
    expect(dissolveBeats(1599).scatter).toBe(-1);
    expect(dissolveBeats(1600).scatter).toBe(0);
    const mid = dissolveBeats(2600).scatter;
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
    expect(dissolveBeats(4499).scatter).toBeGreaterThan(0.9);
    expect(dissolveBeats(4500).scatter).toBe(-1);
    expect(dissolveBeats(6000).scatter).toBe(-1);
  });

  it('stems hold through the detach, then fade to half by 3.6s and stay there', () => {
    expect(dissolveBeats(1600).presence).toBe(1);
    expect(dissolveBeats(2600).presence).toBeCloseTo(0.75, 5);
    expect(dissolveBeats(3600).presence).toBe(0.5);
    expect(dissolveBeats(4500).presence).toBe(0.5);
    expect(dissolveBeats(9000).presence).toBe(0.5);
  });

  it('the dark seed appears over the last 0.7s and is whole at 4.5s', () => {
    expect(dissolveBeats(3799).seed).toBe(0);
    expect(dissolveBeats(3800).seed).toBe(0);
    const mid = dissolveBeats(4300).seed;
    expect(mid).toBeGreaterThan(0.5);
    expect(mid).toBeLessThan(1);
    expect(dissolveBeats(4500).seed).toBe(1);
  });

  it('rest motes rise at the very end, then drift at 0.55', () => {
    expect(dissolveBeats(4299).restMotes).toBe(0);
    const atSeed = dissolveBeats(4500).restMotes;
    expect(atSeed).toBeGreaterThan(0);
    expect(atSeed).toBeLessThan(LOST_MOTES);
    expect(dissolveBeats(6000).restMotes).toBe(LOST_MOTES);
    expect(dissolveBeats(20000).restMotes).toBe(LOST_MOTES);
  });
});

describe('dissolve reduced motion', () => {
  it('starts as a ghost and crosses halfway at 0.3s', () => {
    const start = dissolveBeats(0, true);
    expect(start.ghostLook).toBe(true);
    expect(start).toMatchObject({ detach: 0, seed: 0, restMotes: 0, presence: 1 });
    const mid = dissolveBeats(300, true);
    expect(mid.detach).toBeCloseTo(0.5, 5);
    expect(mid.seed).toBeCloseTo(0.5, 5);
    expect(mid.presence).toBeCloseTo(0.75, 5);
    expect(mid.restMotes).toBeCloseTo(LOST_MOTES / 2, 5);
  });

  it('settles by 0.6s and never scatters', () => {
    expect(dissolveBeats(600, true)).toEqual(AT_REST);
    expect(dissolveBeats(2000, true)).toEqual(AT_REST);
    for (const t of [0, 150, 300, 450, 599]) expect(dissolveBeats(t, true).scatter).toBe(-1);
  });

  it('a dissolve scheduled for later stays a ghost, even with reduced motion', () => {
    expect(dissolveBeats(-5, true)).toMatchObject({ ghostLook: true, detach: 0, seed: 0 });
    expect(dissolveBeats(-Infinity).ghostLook).toBe(true);
  });

  it('already lost is the settled seed with or without motion', () => {
    expect(dissolveBeats(Infinity, true)).toEqual(AT_REST);
    expect(dissolveBeats(NaN, true)).toEqual(AT_REST);
  });
});

describe('dissolve ranges', () => {
  it('every field stays in range on both paths, and scatter is -1 or 0–1', () => {
    for (const reduced of [false, true]) {
      for (let t = 0; t <= 7000; t += 100) {
        const b = dissolveBeats(t, reduced);
        expect(b.detach).toBeGreaterThanOrEqual(0);
        expect(b.detach).toBeLessThanOrEqual(1);
        expect(b.seed).toBeGreaterThanOrEqual(0);
        expect(b.seed).toBeLessThanOrEqual(1);
        expect(b.presence).toBeGreaterThanOrEqual(0.5);
        expect(b.presence).toBeLessThanOrEqual(1);
        expect(b.restMotes).toBeGreaterThanOrEqual(0);
        expect(b.restMotes).toBeLessThanOrEqual(LOST_MOTES);
        expect(b.scatter === -1 || (b.scatter >= 0 && b.scatter <= 1)).toBe(true);
      }
    }
  });

  it('reduced motion never moves backwards either', () => {
    let prev = dissolveBeats(0, true);
    for (let t = 25; t <= 600; t += 25) {
      const b = dissolveBeats(t, true);
      expect(b.detach).toBeGreaterThanOrEqual(prev.detach);
      expect(b.seed).toBeGreaterThanOrEqual(prev.seed);
      expect(b.restMotes).toBeGreaterThanOrEqual(prev.restMotes);
      expect(b.presence).toBeLessThanOrEqual(prev.presence);
      prev = b;
    }
  });
});

describe('thread departure edges', () => {
  it('flickers at +2.6s, releases at +3.6s, gone 0.8s later', () => {
    expect(threadDeparture(0)).toEqual({ flickerFrom: 2600, releaseAt: 3600, goneAt: 4400 });
    expect(threadDeparture(1000)).toEqual({ flickerFrom: 3600, releaseAt: 4600, goneAt: 5400 });
  });

  it('stays ordered for any start, and the fade-out is always 0.8s', () => {
    for (const at of [0, 500, 1500, 10000]) {
      const d = threadDeparture(at);
      expect(d.flickerFrom).toBe(at + DISSOLVE_MS.flicker);
      expect(d.releaseAt).toBe(at + DISSOLVE_MS.lastThread);
      expect(d.flickerFrom).toBeLessThan(d.releaseAt);
      expect(d.releaseAt).toBeLessThan(d.goneAt);
      expect(d.goneAt - d.releaseAt).toBe(800);
    }
  });
});
