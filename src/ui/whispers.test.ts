import { describe, expect, it } from 'vitest';
import { sampleGarden, DEFAULT_WHISPER } from '../data/sample';
import { advance, tend, viewAll, type ReturnSummary } from '../engine';
import { idleWhisper, returnWhisper } from './whispers';

const REAL = 1_700_000_000_000;
const NEVER = /warning|error|you haven|!|\d+ memories|%/i;

describe('whispers', () => {
  it('the sample garden says the design system’s default whisper, from the rules', () => {
    const g = sampleGarden(100, REAL);
    expect(idleWhisper(g, viewAll(g, 100))).toBe(DEFAULT_WHISPER);
  });

  it('names a person who still holds a fading memory', () => {
    const g = sampleGarden(100, REAL);
    tend(g, 'm10', 100); // the rooftop is no longer the faintest; the Dad pair and Kamakura are
    const line = idleWhisper(g, viewAll(g, 100))!;
    expect(line).toMatch(/is drifting into fog\. (Dad|Leo) still holds it\.$/);
  });

  it('on return: days in words, then what is about to be lost', () => {
    const g = sampleGarden(100, REAL);
    const summary: ReturnSummary = { gardenDaysPassed: 28, realDaysPassed: 4, faded: ['m6'], lost: [], aboutToBeLost: ['m10'] };
    expect(returnWhisper(g, viewAll(g, 100), summary)).toBe(
      'Four days passed. The library rooftop is about to be lost. A faint thread to Satie still holds it.');
  });

  it('on return after a loss, the lost memory drifts into the fog', () => {
    const g = sampleGarden(100, REAL);
    const s = advance(g, 100, 107);
    const line = returnWhisper(g, viewAll(g, 107), { ...s, realDaysPassed: 1 })!;
    expect(line.startsWith('One day passed.')).toBe(true);
  });

  it('never counts, warns or exclaims', () => {
    const g = sampleGarden(100, REAL);
    for (const days of [3, 7, 14, 28]) {
      const s = advance(g, 100, 100 + days);
      const views = viewAll(g, 100 + days);
      for (const line of [idleWhisper(g, views), returnWhisper(g, views, s)]) {
        if (line) expect(line).not.toMatch(NEVER);
      }
    }
  });
});
