import { describe, expect, it } from 'vitest';
import { BLOOM_MS, bloomBeats, FULL_BLOOM } from './bloomTimeline';

describe('the bloom timeline (storyboard p17)', () => {
  it('0 ms: a seed high above the ground, nothing grown', () => {
    const b = bloomBeats(0);
    expect(b.seedY).toBeCloseTo(2.5);
    expect(b.grow).toBe(0);
    expect(b.unfold).toBe(0);
  });

  it('250 ms: it lands, and a ripple starts on the ground', () => {
    const b = bloomBeats(BLOOM_MS.land + 1);
    expect(b.seedY).toBeCloseTo(0, 2);
    expect(b.ringAlpha).toBeGreaterThan(0);
  });

  it('500–800 ms: roots spread, the stem has not started', () => {
    const b = bloomBeats(700);
    expect(b.roots).toBeGreaterThan(0.5);
    expect(b.grow).toBe(0);
  });

  it('800–1200 ms: the stem rises; 1200–1600 ms: petals unfold', () => {
    expect(bloomBeats(1000).grow).toBeGreaterThan(0.4);
    expect(bloomBeats(1000).unfold).toBe(0);
    expect(bloomBeats(BLOOM_MS.petals).grow).toBe(1);
    expect(bloomBeats(1400).unfold).toBeCloseTo(0.5, 1);
    expect(bloomBeats(BLOOM_MS.settle).unfold).toBe(1);
  });

  it('after 2.2 s the flower simply stands; reduced motion is a 0.6 s crossfade', () => {
    expect(bloomBeats(BLOOM_MS.end)).toEqual(FULL_BLOOM);
    expect(bloomBeats(Infinity)).toEqual(FULL_BLOOM);
    const r = bloomBeats(300, true);
    expect(r.grow).toBe(1);
    expect(r.opacity).toBeCloseTo(0.5);
  });

  it('nothing ever moves backwards', () => {
    let prev = bloomBeats(0);
    for (let t = 10; t <= BLOOM_MS.end; t += 10) {
      const b = bloomBeats(t);
      expect(b.grow).toBeGreaterThanOrEqual(prev.grow);
      expect(b.unfold).toBeGreaterThanOrEqual(prev.unfold);
      expect(b.glow).toBeGreaterThanOrEqual(prev.glow);
      expect(b.seedY).toBeLessThanOrEqual(prev.seedY);
      prev = b;
    }
  });
});
