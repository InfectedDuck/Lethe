import { describe, expect, it } from 'vitest';
import { SAMPLE, sampleGarden } from '../data/sample';
import { emptyGarden, plant, setVitality, viewAll } from '../engine';
import { idleWhisper, nameOf } from './whispers';

// Whisper edge and regression tests (Spark). The primary voice is in whispers.test.ts;
// here the naming contract is pinned: a memory is named by a whole clause, never cut
// mid-verb ("You don't have is drifting into fog.", seen in the P10 browser check).

const REAL = 1_700_000_000_000;

describe('nameOf: whole clauses, never mid-verb', () => {
  it('keeps "You don\'t have to be brave"', () => {
    expect(nameOf({ text: '“You don’t have to be brave all the time.”' } as never))
      .toBe('You don’t have to be brave');
  });

  it('no sample memory ends on a dangling word', () => {
    for (const s of SAMPLE) {
      expect(nameOf({ text: s.text } as never)).not.toMatch(/\s(have|to|the|a|an|on|in|of|with|and)$/i);
    }
  });

  it('short and punctuated names keep their short cut', () => {
    expect(nameOf({ text: 'The library rooftop at university' } as never)).toBe('The library rooftop');
    expect(nameOf({ text: 'Clair de Lune, Debussy. She played it on Sundays.' } as never)).toBe('Clair de Lune');
    expect(nameOf({ text: '“Text me when you get home.”' } as never)).toBe('Text me when you');
  });
});

describe('idleWhisper names the fading memory whole', () => {
  it('a fading m1 drifts by its whole clause', () => {
    const g = emptyGarden(REAL);
    plant(g, { id: 'a', kind: 'sentence', text: '“You don’t have to be brave all the time.”' }, 0, REAL);
    setVitality(g, 'a', 0.5, 7);
    const line = idleWhisper(g, viewAll(g, 7))!;
    expect(line).toContain('“You don’t have to be brave” is drifting into fog.');
    expect(line).not.toContain('You don’t have is drifting');
  });

  it('the sample garden default whisper is untouched', () => {
    const g = sampleGarden(100, REAL);
    expect(idleWhisper(g, viewAll(g, 100)))
      .toBe('The library rooftop is drifting into fog. A faint thread to Satie still holds it.');
  });
});
