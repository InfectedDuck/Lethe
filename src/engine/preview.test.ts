import { describe, expect, it } from 'vitest';
import { sampleGarden } from '../data/sample';
import { previewThreads } from './index';

const REAL = 1_700_000_000_000;

describe('planting preview', () => {
  it('previews the threads a draft would join without changing the garden', () => {
    const g = sampleGarden(100, REAL);
    const before = JSON.stringify(g);
    const t = previewThreads(g, { kind: 'sentence', text: 'Osmanthus tea with Grandma Mei on her balcony in Hangzhou.',
      people: [{ name: 'Grandma Mei', id: 'person:grandma-mei' }], places: [{ name: 'Hangzhou', id: 'place:hangzhou' }] }, 100);
    const others = t.map((x) => (x.a === '__draft__' ? x.b : x.a)).sort();
    expect(others).toEqual(['m1', 'm2', 'm3']);
    expect(t.find((x) => [x.a, x.b].includes('m1'))?.level).toBe(2);
    expect(JSON.stringify(g)).toBe(before);
  });

  it('a draft with no names joins nothing', () => {
    const g = sampleGarden(100, REAL);
    expect(previewThreads(g, { kind: 'sentence', text: 'Rain all night.' }, 100)).toEqual([]);
  });
});
