import { describe, expect, it } from 'vitest';
import { buildFlower, generateFlower } from './generator';

describe('flower generator', () => {
  it('is deterministic: the same seed grows the same flower', () => {
    for (const kind of ['sentence', 'song', 'place', 'photo'] as const) {
      expect(buildFlower(kind, 'm1', 160)).toEqual(buildFlower(kind, 'm1', 160));
    }
  });

  it('different seeds grow different flowers of the same family', () => {
    const a = generateFlower('sentence', 'm1', 160), b = generateFlower('sentence', 'm5', 160);
    expect(a.head).not.toEqual(b.head);
  });

  it('a sentence flower has 4–6 long petals, two leaves and a light centre', () => {
    const d = generateFlower('sentence', 'first-dance', 140);
    const petals = d.shapes.filter((s) => s.part === 'petal').length;
    expect(petals).toBeGreaterThanOrEqual(4);
    expect(petals).toBeLessThanOrEqual(6);
    expect(d.shapes.filter((s) => s.part === 'stem')).toHaveLength(2);
    expect(d.shapes.some((s) => s.part === 'light')).toBe(true);
    expect(d.head.y).toBeCloseTo(-140 * 1.5 * 0.8);
  });

  it('a place flower is a low cluster of 22–33 five-petal florets', () => {
    const d = generateFlower('place', 'lake-house', 140);
    const florets = d.shapes.filter((s) => s.part === 'light').length;
    expect(florets).toBeGreaterThanOrEqual(22);
    expect(florets).toBeLessThan(34);
    expect(d.shapes.filter((s) => s.part === 'petal')).toHaveLength(florets * 5);
    expect(Math.min(...d.anchors.map((p) => p.y))).toBeGreaterThan(-140 * 1.5 * 0.4);
  });

  it('a song flower is one bell; a photo flower has 7 cup petals and 7 stamens', () => {
    expect(generateFlower('song', 'night-bus', 140).shapes.filter((s) => s.part === 'petal')).toHaveLength(1);
    const p = generateFlower('photo', 'grandmother', 140);
    expect(p.shapes.filter((s) => s.part === 'petal')).toHaveLength(7);
    expect(p.strokes.filter((s) => s.solidOnly)).toHaveLength(7);
  });

  it('gives the lost state up to 44 drifting motes', () => {
    const d = generateFlower('photo', 'm8', 120);
    expect(d.motes.length).toBe(Math.min(44, d.anchors.length));
    expect(d.motes.every((m) => m.dur >= 7 && m.dur <= 13)).toBe(true);
  });
});
