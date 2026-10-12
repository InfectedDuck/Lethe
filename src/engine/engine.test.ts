import { describe, expect, it } from 'vitest';
import { sampleGarden } from '../data/sample';
import {
  C, advance, emptyGarden, flowerColor, gardenDaysForRealDays, grantLight, holders, letGo, plant,
  retention, returnTo, stateOf, tend, threadKey, viewAll, viewOf, vitalityOf,
} from './index';

const REAL = 1_700_000_000_000;
const DAY = C.MS_PER_REAL_DAY;

describe('forgetting curve', () => {
  it('follows e^(-t/S)', () => {
    expect(retention(0, 7)).toBe(1);
    expect(retention(7, 7)).toBeCloseTo(Math.exp(-1));
  });
  it('maps vitality to the four states at the design-system thresholds', () => {
    expect(stateOf(0.6)).toBe('vivid');
    expect(stateOf(0.59)).toBe('fading');
    expect(stateOf(0.3)).toBe('fading');
    expect(stateOf(0.29)).toBe('ghost');
    expect(stateOf(0.08)).toBe('ghost');
    expect(stateOf(0.079)).toBe('lost');
  });
  it('loses an untended, unconnected memory in about 2.5 real days', () => {
    const g = emptyGarden(REAL);
    plant(g, { id: 'a', kind: 'sentence', text: 'alone' }, 0, REAL);
    const daysToLost = -C.S_INITIAL * Math.log(C.GHOST_AT);
    expect(daysToLost / C.GARDEN_DAYS_PER_REAL_DAY).toBeGreaterThan(2);
    expect(daysToLost / C.GARDEN_DAYS_PER_REAL_DAY).toBeLessThan(3);
  });
});

describe('threads', () => {
  it('derives the sample threads from shared people and places', () => {
    const g = sampleGarden(100, REAL);
    const keys = g.threads.map((t) => `${threadKey(t.a, t.b)}:${t.level}`).sort();
    expect(keys).toEqual([
      'm1|m2:2', 'm1|m3:1', 'm10|m9:0', 'm2|m3:1', 'm4|m5:1', 'm4|m6:1', 'm5|m6:1', 'm7|m8:1',
    ].sort());
  });
  it('matches "my mother" to an existing "Mother"', () => {
    const g = emptyGarden(REAL);
    plant(g, { id: 'a', kind: 'sentence', text: 'x', people: [{ name: 'Mother' }] }, 0, REAL);
    plant(g, { id: 'b', kind: 'sentence', text: 'y', people: [{ name: 'my mother' }] }, 0, REAL);
    expect(g.threads).toHaveLength(1);
  });
  it('treats relation words as one person: Mom, mum, my mother', () => {
    const g = emptyGarden(REAL);
    plant(g, { id: 'a', kind: 'sentence', text: 'x', people: [{ name: 'Mom' }] }, 0, REAL);
    plant(g, { id: 'b', kind: 'sentence', text: 'y', people: [{ name: 'my mother' }] }, 0, REAL);
    plant(g, { id: 'c', kind: 'sentence', text: 'z', people: [{ name: 'mum' }] }, 0, REAL);
    const people = Object.values(g.entities).filter((e) => e.kind === 'person');
    expect(people).toHaveLength(1);
    expect(people[0].name).toBe('Mom');
    expect(g.threads).toHaveLength(3);
  });
  it('keeps a named grandmother apart from an unnamed one', () => {
    const g = emptyGarden(REAL);
    plant(g, { id: 'a', kind: 'sentence', text: 'x', people: [{ name: 'Grandma Mei' }] }, 0, REAL);
    plant(g, { id: 'b', kind: 'sentence', text: 'y', people: [{ name: 'my grandmother' }] }, 0, REAL);
    expect(g.threads).toHaveLength(0);
  });
  it('connected memories fade more slowly', () => {
    const g = emptyGarden(REAL);
    plant(g, { id: 'lonely', kind: 'sentence', text: 'x' }, 0, REAL);
    plant(g, { id: 'a', kind: 'sentence', text: 'y', people: [{ name: 'Leo' }] }, 0, REAL);
    plant(g, { id: 'b', kind: 'sentence', text: 'z', people: [{ name: 'Leo' }] }, 0, REAL);
    expect(vitalityOf(g, g.memories.a, 10)).toBeGreaterThan(vitalityOf(g, g.memories.lonely, 10));
  });
});

describe('sample garden', () => {
  it('starts at the designed states', () => {
    const v = viewAll(sampleGarden(100, REAL), 100);
    expect(['m1', 'm2', 'm3', 'm4', 'm5'].map((id) => v[id].state)).toEqual(Array(5).fill('vivid'));
    expect(['m6', 'm7', 'm8', 'm9'].map((id) => v[id].state)).toEqual(Array(4).fill('fading'));
    expect(v.m10.state).toBe('ghost');
    expect(v.m10.vitality).toBeCloseTo(0.1);
  });
  it('one real day later the rooftop is lost and the Mei cluster still glows', () => {
    const g = sampleGarden(100, REAL);
    const s = advance(g, 100, 107);
    expect(s.lost).toContain('m10');
    expect(viewOf(g, 'm1', 107).state).not.toBe('lost');
  });
});

describe('tending', () => {
  it('spends light, resets the memory, strengthens S and spills onto neighbours', () => {
    const g = sampleGarden(100, REAL);
    const before = vitalityOf(g, g.memories.m6, 110);
    const S = g.memories.m4.stability;
    const rippled = tend(g, 'm4', 110);
    expect(g.light).toBe(2);
    expect(vitalityOf(g, g.memories.m4, 110)).toBe(1);
    expect(g.memories.m4.stability).toBeCloseTo(S * C.TEND_STABILITY_MULT);
    expect(rippled).toEqual(expect.arrayContaining(['m5', 'm6']));
    expect(vitalityOf(g, g.memories.m6, 110)).toBeGreaterThan(before);
  });
  it('cannot tend without light', () => {
    const g = sampleGarden(100, REAL);
    g.light = 0;
    expect(tend(g, 'm1', 100)).toEqual([]);
  });
});

describe('light', () => {
  it('grants 3 per real day and carries over up to 5', () => {
    const g = emptyGarden(REAL);
    g.light = 1;
    grantLight(g, REAL + DAY * 0.9);
    expect(g.light).toBe(1);
    grantLight(g, REAL + DAY);
    expect(g.light).toBe(4);
    grantLight(g, REAL + DAY * 5);
    expect(g.light).toBe(5);
  });
});

describe('loss and return', () => {
  it('lost memories keep their words and can be returned to as a ghost', () => {
    const g = sampleGarden(100, REAL);
    advance(g, 100, 107);
    expect(g.memories.m10.lost).toBe(true);
    expect(g.memories.m10.text).toBe('The library rooftop at university');
    returnTo(g, 'm10', 107);
    expect(viewOf(g, 'm10', 107).state).toBe('ghost');
  });
  it('letting go is a choice and threads to it fade out', () => {
    const g = sampleGarden(100, REAL);
    letGo(g, 'm8', 100);
    expect(g.threads.some((t) => t.a === 'm8' || t.b === 'm8')).toBe(false);
  });
});

describe('time and reveal', () => {
  it('one real day is one garden week; fog slows after two weeks away', () => {
    expect(gardenDaysForRealDays(1)).toBe(7);
    expect(gardenDaysForRealDays(15)).toBeCloseTo(14 * 7 + 7 * C.SLOW_FOG_FACTOR);
  });
  it('Grandma Mei holds the most', () => {
    expect(holders(sampleGarden(100, REAL), 100)[0].name).toBe('Grandma Mei');
  });
  it('fading colours match the design-system tokens', () => {
    expect(flowerColor('sentence', 'fading')).toBe('#bdb49c');
    expect(flowerColor('song', 'fading')).toBe('#a19bcb');
    expect(flowerColor('place', 'fading')).toBe('#87b4b4');
  });
});
