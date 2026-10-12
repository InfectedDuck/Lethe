import { afterEach, describe, expect, it } from 'vitest';
import type { Kind } from '../engine';
import { isMuted, noteOf, onMuteChange, setMuted, startSound } from './sound';

// P11 edge and regression tests (Spark). Claude owns the implementation and checked the mix
// in headless Edge with an output analyser (see the P11 notes in docs/build-plan.md); here the
// contracts a silent run can pin are pinned: every flower's own note, and sound on/off.
// The drone, the chimes and the mix (P11.3, still open) need ears and an AudioContext.

const KINDS: Kind[] = ['sentence', 'place', 'song', 'photo'];

describe('noteOf: every flower has its own note', () => {
  it('is a pentatonic note with the kind octave', () => {
    for (const kind of KINDS) for (const id of ['m1', 'm2', 'm10', 'abc']) {
      expect(noteOf(id, kind)).toMatch(/^[CDEGA][345]$/);
    }
  });

  it('the octave says the kind: place low, sentence and photo mid, song high', () => {
    expect(noteOf('m1', 'place')[1]).toBe('3');
    expect(noteOf('m1', 'sentence')[1]).toBe('4');
    expect(noteOf('m1', 'photo')[1]).toBe('4');
    expect(noteOf('m1', 'song')[1]).toBe('5');
  });

  it('the same id always grows the same note, and ids differ', () => {
    expect(noteOf('m1', 'sentence')).toBe(noteOf('m1', 'sentence'));
    const notes = new Set(Array.from({ length: 10 }, (_, i) => noteOf(`m${i + 1}`, 'sentence')));
    expect(notes.size).toBeGreaterThan(1);
  });
});

describe('sound on/off', () => {
  afterEach(() => setMuted(false));

  it('starts on, and tells its listeners when it changes', () => {
    expect(isMuted()).toBe(false);
    const heard: boolean[] = [];
    const stop = onMuteChange(() => heard.push(isMuted()));
    setMuted(true);
    expect(isMuted()).toBe(true);
    expect(heard).toEqual([true]);
    setMuted(true);
    expect(heard).toEqual([true]);
    setMuted(false);
    expect(heard).toEqual([true, false]);
    stop();
    setMuted(true);
    expect(heard).toEqual([true, false]);
  });

  it('without localStorage the choice still applies, it is just not remembered', () => {
    expect(typeof localStorage).toBe('undefined');
    expect(() => setMuted(true)).not.toThrow();
    expect(isMuted()).toBe(true);
  });
});

describe('startSound without audio', () => {
  it('is a silent no-op where the browser forbids audio', () => {
    expect(typeof AudioContext).toBe('undefined');
    expect(() => { startSound(); startSound(); }).not.toThrow();
  });
});
