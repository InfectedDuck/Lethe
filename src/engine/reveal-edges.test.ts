import { describe, expect, it } from 'vitest';
import { sampleGarden } from '../data/sample';
import { emptyGarden, holders, letGo, numberWord, plant, retag, tend } from './index';

// P9 edge and regression tests (Spark). The primary ranking is in reveal.test.ts;
// here the vitality weighting, the vote rules and the words-not-digits contract are pinned,
// so a retune must update docs/scene-spec.md § The reveal alongside the code.

const REAL = 1_700_000_000_000;

const planted = () => {
  const g = emptyGarden(REAL);
  plant(g, { id: 'a', kind: 'sentence', text: 'x', people: [{ name: 'Leo' }] }, 0, REAL);
  plant(g, { id: 'b', kind: 'sentence', text: 'y', people: [{ name: 'Leo' }], places: [{ name: 'Hangzhou' }] }, 0, REAL);
  return g;
};

describe('holders weigh living vitality, not memory count', () => {
  it('one unfaded memory holds exactly 1; a week later it holds e^-1', () => {
    const g = emptyGarden(REAL);
    plant(g, { id: 'a', kind: 'sentence', text: 'x', people: [{ name: 'Leo' }] }, 0, REAL);
    expect(holders(g, 0)[0]).toMatchObject({ name: 'Leo', weight: 1 });
    // Alone there are no threads, so S stays S_INITIAL = 7: R(7) = e^-1.
    expect(holders(g, 7)[0].weight).toBeCloseTo(Math.exp(-1), 5);
  });

  it('tending moves the weight back to the tended holder', () => {
    const g = emptyGarden(REAL);
    plant(g, { id: 'a', kind: 'sentence', text: 'x', people: [{ name: 'Leo' }] }, 0, REAL);
    plant(g, { id: 'b', kind: 'sentence', text: 'y', people: [{ name: 'Mara' }] }, 6, REAL);
    expect(holders(g, 7)[0].name).toBe('Mara');
    tend(g, 'a', 7);
    expect(holders(g, 7)[0]).toMatchObject({ name: 'Leo', weight: 1 });
  });
});

describe('holders vote rules', () => {
  it('feelings never vote, not even on their own', () => {
    const g = emptyGarden(REAL);
    plant(g, { id: 'a', kind: 'song', text: 'x', feelings: [{ name: 'solitude' }] }, 0, REAL);
    expect(holders(g, 0)).toEqual([]);
    expect(Object.values(g.entities).map((e) => e.kind)).toContain('feeling');
  });

  it('the demo garden has no holder for a shared feeling', () => {
    // m9 and m10 share only the feeling solitude: no holder, no thread-made vote.
    const names = holders(sampleGarden(100, REAL), 100).map((h) => h.name);
    expect(names).not.toContain('solitude');
  });

  it('memories pointing at unknown entities are skipped', () => {
    const g = planted();
    const before = holders(g, 0);
    g.memories.a.people.push('person:no-one');
    expect(holders(g, 0)).toEqual(before);
  });

  it('retag moves the votes to the new names', () => {
    const g = planted();
    retag(g, 'a', { people: [{ name: 'Mara' }] });
    const byName = Object.fromEntries(holders(g, 0).map((h) => [h.name, h]));
    expect(byName['Mara']).toMatchObject({ memories: ['a'], weight: 1 });
    expect(byName['Leo']).toMatchObject({ memories: ['b'], weight: 1 });
  });

  it('a returned memory votes again', () => {
    const g = planted();
    letGo(g, 'b', 0);
    expect(holders(g, 0).map((h) => h.name)).toEqual(['Leo']);
    g.memories.b.lost = false;
    const byName = Object.fromEntries(holders(g, 0).map((h) => [h.name, h]));
    expect(byName['Leo'].memories.sort()).toEqual(['a', 'b']);
    expect(byName['Hangzhou']).toMatchObject({ memories: ['b'] });
  });
});

describe('the demo garden ranking', () => {
  it('Grandma Mei holds three vivid memories, then Leo, then Hangzhou', () => {
    const top = holders(sampleGarden(100, REAL), 100);
    expect(top.slice(0, 3).map((h) => h.name)).toEqual(['Grandma Mei', 'Leo', 'Hangzhou']);
    expect(top[0].weight).toBeCloseTo(2.7, 5);
    expect(top[0].memories).toEqual(['m1', 'm2', 'm3']);
    expect(top[1].weight).toBeCloseTo(2.25, 5);
    expect(top[1].memories).toEqual(['m4', 'm5', 'm6']);
    expect(top[2].weight).toBeCloseTo(1.8, 5);
    expect(top[2].memories).toEqual(['m1', 'm2']);
  });
});

describe('reveal counts are words, never digits', () => {
  it('one through twelve are words', () => {
    expect(['one', 'two', 'three', 'four', 'five', 'six', 'seven'].map((_, i) => numberWord(i + 1)))
      .toEqual(['one', 'two', 'three', 'four', 'five', 'six', 'seven']);
    expect(numberWord(12)).toBe('twelve');
  });

  it('small counts carry no digits, signs or percentages', () => {
    for (let n = 1; n <= 12; n++) expect(numberWord(n)).not.toMatch(/[\d%]/);
  });
});
