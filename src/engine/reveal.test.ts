import { describe, expect, it } from 'vitest';
import { emptyGarden, holders, letGo, plant } from './index';

// "What holds you" (P9) ranks people and places by summed living vitality.

const REAL = 1_700_000_000_000;

const planted = () => {
  const g = emptyGarden(REAL);
  plant(g, { id: 'a', kind: 'sentence', text: 'x', people: [{ name: 'Leo' }] }, 0, REAL);
  plant(g, { id: 'b', kind: 'sentence', text: 'y', people: [{ name: 'Leo' }], places: [{ name: 'Hangzhou' }] }, 0, REAL);
  return g;
};

describe('holders', () => {
  it('sums vitality across memories, people and places, heaviest first', () => {
    const top = holders(planted(), 0);
    expect(top[0]).toMatchObject({ name: 'Leo', kind: 'person', weight: 2 });
    expect([...top[0].memories].sort()).toEqual(['a', 'b']);
    const place = top.find((h) => h.kind === 'place')!;
    expect(place).toMatchObject({ name: 'Hangzhou', weight: 1, memories: ['b'] });
  });

  it('lost memories stop voting', () => {
    const g = planted();
    letGo(g, 'b', 0);
    const top = holders(g, 0);
    expect(top).toHaveLength(1);
    expect(top[0]).toMatchObject({ name: 'Leo', weight: 1, memories: ['a'] });
  });

  it('an empty garden holds nothing', () => {
    expect(holders(emptyGarden(REAL), 0)).toEqual([]);
  });
});
