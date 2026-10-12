import { describe, expect, it } from 'vitest';
import { emptyGarden, holders, letGo, plant } from '../engine';
import { REVEAL_DIM, REVEAL_LIT } from '../scene/thread/ThreadArc';
import { revealLabel } from '../ui/Reveal';
import { heldBy, useGarden } from './garden';

// P9 edge and regression tests (Spark). The engine ranking edges are in
// engine/reveal-edges.test.ts; here the store contract is pinned: what the reveal
// lights, what it opens on, and how a held memory is named beside its flower.

const REAL = 1_700_000_000_000;

const planted = () => {
  const g = emptyGarden(REAL);
  plant(g, { id: 'a', kind: 'sentence', text: 'x', people: [{ name: 'Leo' }] }, 0, REAL);
  plant(g, { id: 'b', kind: 'sentence', text: 'y', people: [{ name: 'Leo' }], places: [{ name: 'Hangzhou' }] }, 0, REAL);
  return g;
};

describe('scene-spec § The reveal, as built', () => {
  it('held threads brighten ×1.6 while every other thread drops to 5%', () => {
    expect(REVEAL_LIT).toBe(1.6);
    expect(REVEAL_DIM).toBe(0.05);
  });
});

describe('heldBy: what the reveal lights', () => {
  it('lights the living memories that mention the holder, people and places alike', () => {
    const g = planted();
    const leo = holders(g, 0)[0].entityId;
    const hangzhou = holders(g, 0).find((h) => h.name === 'Hangzhou')!.entityId;
    expect(heldBy(g, leo).sort()).toEqual(['a', 'b']);
    expect(heldBy(g, hangzhou)).toEqual(['b']);
  });

  it('a lost memory is no longer lit', () => {
    const g = planted();
    const leo = holders(g, 0)[0].entityId;
    letGo(g, 'b', 0);
    expect(heldBy(g, leo)).toEqual(['a']);
  });

  it('nothing is lit for no holder or an unknown one', () => {
    const g = planted();
    expect(heldBy(g, null)).toEqual([]);
    expect(heldBy(g, 'person:no-one')).toEqual([]);
  });

  it('a feeling holder lights nothing: feelings never hold', () => {
    const g = emptyGarden(REAL);
    plant(g, { id: 'a', kind: 'song', text: 'x', feelings: [{ name: 'solitude' }] }, 0, REAL);
    const feelingId = Object.values(g.entities).find((e) => e.kind === 'feeling')!.id;
    expect(heldBy(g, feelingId)).toEqual([]);
  });
});

describe('openReveal, selectHolder, closeReveal', () => {
  it('opens on what holds the most', () => {
    const { garden, now, openReveal, closeReveal } = useGarden.getState();
    const top = holders(garden, now())[0];
    expect(top.name).toBe('Grandma Mei');
    openReveal();
    expect(useGarden.getState().reveal).toEqual({ open: true, entityId: top.entityId });
    closeReveal();
  });

  it('opening clears focus and puts the planting field down', () => {
    const { focus, openPlanting, openReveal, closeReveal } = useGarden.getState();
    focus('m1');
    openPlanting('field');
    openReveal();
    const s = useGarden.getState();
    expect(s.reveal.open).toBe(true);
    expect(s.focusedId).toBe(null);
    expect(s.planting).toBe('closed');
    expect(s.draft).toBe(null);
    closeReveal();
  });

  it('choosing a holder lights only them; closing lights nothing', () => {
    const { selectHolder, closeReveal } = useGarden.getState();
    selectHolder('person:leo');
    expect(useGarden.getState().reveal).toEqual({ open: true, entityId: 'person:leo' });
    closeReveal();
    expect(useGarden.getState().reveal).toEqual({ open: false, entityId: null });
  });
});

describe('revealLabel: the words beside a held flower', () => {
  it('keeps a short memory whole, cutting only past 48 characters', () => {
    expect(revealLabel({ text: 'Leo and me on the night bus' } as never))
      .toBe('Leo and me on the night bus');
    // 50 characters: the comma past 48 still cuts, year and all.
    expect(revealLabel({ text: 'Leo and me on the night bus after graduation, 2022' } as never))
      .toBe('Leo and me on the night bus after graduation');
  });

  it('keeps the first sentence and drops its full stop', () => {
    expect(revealLabel({ text: 'Clair de Lune, Debussy. She played it on Sundays.' } as never))
      .toBe('Clair de Lune, Debussy');
    expect(revealLabel({ text: 'She waited.' } as never)).toBe('She waited');
  });

  it('cuts a long first sentence at its comma', () => {
    expect(revealLabel({ text: 'Grandma Mei’s kitchen in Hangzhou, smelling of osmanthus' } as never))
      .toBe('Grandma Mei’s kitchen in Hangzhou');
  });

  it('without a comma it cuts at a word and trails off', () => {
    expect(revealLabel({ text: 'x'.repeat(60) } as never)).toBe(`${'x'.repeat(46)}…`);
    expect(revealLabel({ text: 'word '.repeat(20) } as never))
      .toBe(`${'word '.repeat(9).trimEnd()}…`);
  });
});
