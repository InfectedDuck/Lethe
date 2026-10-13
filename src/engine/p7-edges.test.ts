import { describe, expect, it } from 'vitest';
import { sampleGarden } from '../data/sample';
import { returnWhisper, idleWhisper } from '../ui/whispers';
import { advance, letGo, returnTo, viewAll } from './index';

const REAL = 1_700_000_000_000;
// The interface Never list (CLAUDE.md): no counts, warnings, streaks, scores,
// no delete/save/submit/sync/streak/score, no exclamation marks, no percentages.
const NEVER = /warning|error|you haven|!|\d+ memories|%|delete|save|submit|sync|streak|score/i;

describe('P7 return story: three weeks away', () => {
  it('loses the rooftop, its pair and the Dad pair while the Mei cluster fades to ghost', () => {
    const g = sampleGarden(100, REAL);
    const s = advance(g, 100, 121);
    expect([...s.lost].sort()).toEqual(['m10', 'm7', 'm8', 'm9']);
    expect(s.aboutToBeLost).toContain('m6');
    for (const id of ['m1', 'm2', 'm3', 'm4', 'm5', 'm6']) expect(s.faded).toContain(id);
    expect(s.states.after).toMatchObject({
      m1: 'ghost', m2: 'ghost', m3: 'ghost', m4: 'ghost', m5: 'ghost', m6: 'ghost',
      m7: 'lost', m8: 'lost', m9: 'lost', m10: 'lost',
    });
  });

  it('threads among the living survive the dissolve; threads to the lost go out', () => {
    const g = sampleGarden(100, REAL);
    advance(g, 100, 121);
    const has = (a: string, b: string) => g.threads.some((t) => (t.a === a && t.b === b) || (t.a === b && t.b === a));
    expect(has('m1', 'm2')).toBe(true);
    expect(has('m4', 'm5')).toBe(true);
    for (const id of ['m7', 'm8', 'm9', 'm10']) {
      expect(g.threads.some((t) => t.a === id || t.b === id)).toBe(false);
    }
  });

  it('the return whisper names the days in words and what is about to be lost, never counting', () => {
    const g = sampleGarden(100, REAL);
    const s = advance(g, 100, 121);
    const line = returnWhisper(g, viewAll(g, 121), { ...s, realDaysPassed: 3 })!;
    expect(line.startsWith('Three days passed.')).toBe(true);
    expect(line).toMatch(/is about to be lost\./);
    expect(line).toMatch(/still holds it\./);
    expect(line).not.toMatch(NEVER);
  });
});

describe('P7 neglected garden: four weeks, like screen p16', () => {
  it('is mostly outlines and fog, and the connected Mei trio are the last to go', () => {
    const g = sampleGarden(100, REAL);
    const s = advance(g, 100, 128);
    const views = viewAll(g, 128);
    const states = Object.values(views).map((v) => v.state);
    expect(s.lost.length).toBeGreaterThanOrEqual(5);
    expect(states.filter((x) => x === 'vivid')).toHaveLength(0);
    for (const id of ['m1', 'm2', 'm3']) expect(s.lost).not.toContain(id);
    expect(s.lost).toContain('m10');
  });
});

describe('P7 letting go and returning: the dark-seed contract (D4, D18)', () => {
  it('letting go is free, keeps the words, and drops only its own threads', () => {
    const g = sampleGarden(100, REAL);
    const light = g.light;
    const words = g.memories.m8.text;
    letGo(g, 'm8', 100);
    expect(g.light).toBe(light);
    expect(g.memories.m8.text).toBe(words);
    expect(g.memories.m8.lost).toBe(true);
    expect(g.threads.some((t) => t.a === 'm8' || t.b === 'm8')).toBe(false);
    expect(g.threads.some((t) => t.a === 'm1' || t.b === 'm1')).toBe(true);
  });

  it('returning re-forms its threads and comes back as a ghost at 0.2', () => {
    const g = sampleGarden(100, REAL);
    letGo(g, 'm8', 100);
    returnTo(g, 'm8', 100);
    expect(g.threads.some((t) => (t.a === 'm7' && t.b === 'm8') || (t.a === 'm8' && t.b === 'm7'))).toBe(true);
    const v = viewAll(g, 100).m8;
    expect(v.state).toBe('ghost');
    expect(v.vitality).toBeCloseTo(0.2, 5);
  });

  it('the return whisper prefers about-to-be-lost over lost, and a loss drifts without a holder line', () => {
    const g = sampleGarden(100, REAL);
    const views = viewAll(g, 100);
    const both = returnWhisper(g, views, { gardenDaysPassed: 7, realDaysPassed: 1, faded: [], lost: ['m10'], aboutToBeLost: ['m6'] })!;
    expect(both).toMatch(/is about to be lost\./);
    const lostOnly = returnWhisper(g, views, { gardenDaysPassed: 7, realDaysPassed: 1, faded: [], lost: ['m10'], aboutToBeLost: [] })!;
    expect(lostOnly).toBe('One day passed. The library rooftop drifted into the fog.');
    expect(lostOnly).not.toContain('still holds');
  });
});

describe('P7 whisper voice', () => {
  it('idle never names a lost memory', () => {
    const g = sampleGarden(100, REAL);
    letGo(g, 'm10', 100);
    const line = idleWhisper(g, viewAll(g, 100))!;
    expect(line.toLowerCase()).not.toContain('rooftop');
    expect(line).toMatch(/is drifting into fog\./);
  });

  it('never counts, warns or exclaims across the whole P7 range', () => {
    for (const days of [3, 7, 14, 21, 28]) {
      const g = sampleGarden(100, REAL);
      const s = advance(g, 100, 100 + days);
      const views = viewAll(g, 100 + days);
      for (const line of [idleWhisper(g, views), returnWhisper(g, views, { ...s, realDaysPassed: days / 7 })]) {
        if (line) expect(line).not.toMatch(NEVER);
      }
    }
  });
});
