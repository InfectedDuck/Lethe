import { describe, expect, it } from 'vitest';
import { C, canPlant, plant } from '../engine';
import { sampleGarden } from './sample';

const REAL = 1_700_000_000_000;

describe('the demo garden', () => {
  it('leaves today’s planting budget untouched, so a visitor can plant at once', () => {
    const g = sampleGarden(100, REAL);
    expect(canPlant(g, REAL)).toBe(true);
    for (let i = 0; i < C.PLANTS_PER_REAL_DAY; i++) {
      expect(canPlant(g, REAL)).toBe(true);
      plant(g, { id: `new${i}`, kind: 'sentence', text: 'x' }, 100, REAL);
    }
    expect(canPlant(g, REAL)).toBe(false);
  });
});
