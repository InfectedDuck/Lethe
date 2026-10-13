// The garden's sound (systems.md § Sound), driven by the store and nothing else.
// A low drone that darkens as fog gathers; each flower has its own pentatonic note, heard on hover; tending rings
// it and then its neighbours along their threads; a new thread resolves two notes into a chord; a lost memory's
// note bends down a minor third and fades. Everything is quiet and slow: no note starts faster than 8ms.
//
// Browsers only allow audio after a gesture, so the first click or key press anywhere starts it (the threshold's
// click, or any click on a ?demo link). Tone.js makes its audio context the moment it is imported, so it is only
// imported inside that gesture: imported earlier, the browser would refuse the context and say so in the console.

import { hashSeed, type Kind, type MemoryView } from '../engine';
import { useGarden } from '../store/garden';
import { BLOOM_MS } from '../scene/fx/bloomTimeline';
import { RIPPLE_TRAVEL_MS } from '../scene/thread/ThreadArc';

type Tone = typeof import('tone');

/** Pentatonic C D E G A; the octave says the kind (place low, sentence and photo mid, song high). */
const SCALE = ['C', 'D', 'E', 'G', 'A'];
const OCTAVE: Record<Kind, number> = { place: 3, sentence: 4, photo: 4, song: 5 };

/**
 * Levels in dB (P11.3 mix pass). Peaks measured at the output on ?demo: drone −28 (−30 in deep fog), hover −23 to −24,
 * tend chime with its ripple −12, planting with a four-note chord −17, and a 21-day return with its losses stacked −17.
 * Nothing goes above −12 except the chime. The bell's FM voice comes out ~9 dB under its velocity, hence BELL_GAIN.
 */
const LEVEL = { drone: -26, hover: -25, chime: -10, ripple: -22, chord: -20, lost: -24 };
const BELL_GAIN = 9;
/** A return can lose many memories at once; past this many bending at the same moment, the rest stay silent. */
const LOST_VOICES = 3;
/** A safety net only: nothing in the mix should reach it. */
const CEILING = -6;
const DRONE_FADE_IN_S = 4;
/** The drone follows the fog over this long, the same pace as a state change. */
const DRONE_FOLLOW_S = 3;
/** Clear garden → foggy garden: the drone's lowpass closes and its detuned second voice rises. */
const DRONE_CUTOFF = { clear: 900, fog: 220 };
const DRONE_SECOND = { clear: -40, fog: -8 };
const RIPPLE_GAP_S = 0.12;
const CHORD_RELEASE_S = 1.5;
const LOST_BEND_S = 2;
/** Hovering across many flowers quickly plays one note, not a run. */
const HOVER_GAP_MS = 140;

/** A memory's note, always the same for the same id. */
export function noteOf(id: string, kind: Kind): string {
  return `${SCALE[hashSeed(id) % SCALE.length]}${OCTAVE[kind]}`;
}

/** Turning sound off or on fades over this long, never a click. */
const MUTE_FADE_S = 0.6;
const MUTE_KEY = 'lethe.sound';

/* ---------- sound on/off (P11.2), remembered in this browser ---------- */

let muted = (() => { try { return localStorage.getItem(MUTE_KEY) === 'off'; } catch { return false; } })();
const listeners = new Set<() => void>();
let applyMute: ((m: boolean) => void) | null = null;

export const isMuted = () => muted;
export function onMuteChange(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }
export function setMuted(m: boolean) {
  if (m === muted) return;
  muted = m;
  try { localStorage.setItem(MUTE_KEY, m ? 'off' : 'on'); } catch { /* not remembered, still applied */ }
  applyMute?.(m);
  listeners.forEach((fn) => fn());
}

let started = false;

/** Start sound inside the first gesture (the browser lets a page start audio for a few seconds after one). */
export function startSound() {
  if (started || typeof AudioContext === 'undefined') return;
  started = true;
  void import('tone')
    .then(async (Tone) => { await Tone.start(); build(Tone); })
    .catch(() => { /* no sound: the garden is whole without it */ });
}

/** Start on the first click or key press anywhere. */
export function listenForFirstGesture() {
  const go = () => {
    removeEventListener('pointerdown', go, true);
    removeEventListener('keydown', go, true);
    startSound();
  };
  addEventListener('pointerdown', go, true);
  addEventListener('keydown', go, true);
}

function build(Tone: Tone) {
  // A linear gain, so turning sound off fades all the way to silence (a decibel ramp is exponential and never arrives).
  const ceiling = new Tone.Limiter(CEILING).toDestination();
  const out = new Tone.Gain(muted ? 0 : 1).connect(ceiling);
  applyMute = (m) => out.gain.rampTo(m ? 0 : 1, MUTE_FADE_S);
  const space = new Tone.Reverb({ decay: 7, preDelay: 0.04, wet: 0.38 }).connect(out);

  /* ---------- the drone ---------- */
  const filter = new Tone.Filter({ type: 'lowpass', frequency: DRONE_CUTOFF.clear, rolloff: -24, Q: 0.4 }).connect(space);
  const drone = new Tone.Gain(0).connect(filter);
  const first = new Tone.Oscillator({ frequency: 'C2', type: 'sine', volume: -6 }).connect(drone);
  const second = new Tone.Oscillator({ frequency: 'C2', type: 'sine', detune: 11, volume: DRONE_SECOND.clear }).connect(drone);
  const fifth = new Tone.Oscillator({ frequency: 'G2', type: 'sine', detune: -6, volume: -18 }).connect(drone);
  first.start(); second.start(); fifth.start();
  drone.gain.rampTo(Tone.dbToGain(LEVEL.drone), DRONE_FADE_IN_S);

  const follow = (shown: Record<string, MemoryView>) => {
    const views = Object.values(shown);
    const fog = views.length ? views.filter((v) => v.state === 'fading' || v.state === 'ghost').length / views.length : 0;
    filter.frequency.rampTo(DRONE_CUTOFF.clear + (DRONE_CUTOFF.fog - DRONE_CUTOFF.clear) * fog, DRONE_FOLLOW_S);
    second.volume.rampTo(DRONE_SECOND.clear + (DRONE_SECOND.fog - DRONE_SECOND.clear) * fog, DRONE_FOLLOW_S);
  };

  /* ---------- notes ---------- */
  const soft = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'triangle' }, envelope: { attack: 0.06, decay: 0.4, sustain: 0.25, release: 1.6 },
  }).connect(space);
  soft.maxPolyphony = 16;
  const bell = new Tone.PolySynth(Tone.FMSynth, {
    volume: BELL_GAIN, harmonicity: 3.01, modulationIndex: 2.2, oscillator: { type: 'sine' },
    envelope: { attack: 0.008, decay: 1.4, sustain: 0, release: 2.4 },
    modulation: { type: 'sine' }, modulationEnvelope: { attack: 0.008, decay: 0.6, sustain: 0, release: 1 },
  }).connect(space);
  bell.maxPolyphony = 12;

  const kindOf = (id: string) => useGarden.getState().garden.memories[id]?.kind;
  const at = (performanceMs: number) => Tone.now() + Math.max(0, (performanceMs - performance.now()) / 1000);
  const play = (synth: typeof soft | typeof bell, notes: string[], dur: number, db: number, when = Tone.now()) =>
    synth.triggerAttackRelease(notes, dur, when, Tone.dbToGain(db));

  let lastHover = 0;
  const hover = (id: string) => {
    const kind = kindOf(id);
    if (!kind || performance.now() - lastHover < HOVER_GAP_MS) return;
    lastHover = performance.now();
    play(soft, [noteOf(id, kind)], 0.5, LEVEL.hover);
  };

  // Tend: the flower's chime, then each neighbour's note 120ms apart, as the ripple runs along its threads.
  const chime = (id: string, whenMs: number) => {
    const kind = kindOf(id);
    if (kind) play(bell, [noteOf(id, kind)], 0.9, LEVEL.chime, at(whenMs));
  };
  const ripple = (ids: string[], tendMs: number) => ids.forEach((n, i) => {
    const k = kindOf(n);
    if (k) play(bell, [noteOf(n, k)], 0.6, LEVEL.ripple, at(tendMs) + (i + 1) * RIPPLE_GAP_S);
  });

  // A new memory's threads (or a returned one's, re-forming): when the first light reaches the neighbours (P6.4),
  // its note and theirs sound together.
  const chord = (id: string, whenMs: number) => {
    const g = useGarden.getState().garden;
    const kind = kindOf(id);
    const others = g.threads.flatMap((t) => (t.a === id ? [t.b] : t.b === id ? [t.a] : []));
    if (!kind || !others.length) return;
    const notes = [noteOf(id, kind), ...others.flatMap((o) => { const k = kindOf(o); return k ? [noteOf(o, k)] : []; })];
    const chordNotes = [...new Set(notes)].slice(0, 4);
    // Notes add up: each one is quieter as the chord grows, so a chord of four is no louder than a chord of two.
    play(soft, chordNotes, CHORD_RELEASE_S, LEVEL.chord - 20 * Math.log10(Math.max(2, chordNotes.length) / 2), at(whenMs));
  };

  // Lost: the note bends down a minor third over 2s while it fades. One short-lived voice per loss, at most
  // LOST_VOICES at once.
  let bending: number[] = [];
  const lost = (id: string, whenMs: number) => {
    const kind = kindOf(id);
    if (!kind) return;
    bending = bending.filter((end) => end > whenMs);
    if (bending.filter((end) => end - LOST_BEND_S * 1000 <= whenMs).length >= LOST_VOICES) return;
    bending.push(whenMs + LOST_BEND_S * 1000);
    const v = new Tone.Synth({ oscillator: { type: 'sine' }, envelope: { attack: 0.3, decay: 0, sustain: 1, release: 0.4 } }).connect(space);
    const t0 = at(whenMs);
    const f = Tone.Frequency(noteOf(id, kind)).toFrequency();
    v.volume.setValueAtTime(LEVEL.lost, t0);
    v.triggerAttack(f, t0);
    v.frequency.setValueAtTime(f, t0);
    v.frequency.exponentialRampToValueAtTime(f * 2 ** (-3 / 12), t0 + LOST_BEND_S);
    v.volume.linearRampToValueAtTime(-60, t0 + LOST_BEND_S);
    v.triggerRelease(t0 + LOST_BEND_S);
    setTimeout(() => v.dispose(), (t0 - Tone.now() + LOST_BEND_S + 1) * 1000);
  };

  /* ---------- follow the store ---------- */
  const heard = new WeakSet<object>();

  follow(useGarden.getState().shown);
  useGarden.subscribe((s, prev) => {
    if (s.shown !== prev.shown) follow(s.shown);
    if (s.hoveredId && s.hoveredId !== prev.hoveredId) hover(s.hoveredId);

    if (s.events !== prev.events) {
      const fresh = s.events.filter((e) => !heard.has(e));
      fresh.forEach((e) => heard.add(e));
      for (const e of fresh) {
        if (e.type === 'tend') chime(e.id, e.at);
        if (e.type === 'bloom') chord(e.id, e.at + BLOOM_MS.settle + RIPPLE_TRAVEL_MS);
        if (e.type === 'dissolve') lost(e.id, e.at);
      }
      // The store sends the ripple just after its tend: the neighbours follow the latest chime.
      const rippled = fresh.filter((e) => e.type === 'ripple').map((e) => e.id);
      const lastTend = s.events.filter((e) => e.type === 'tend').at(-1);
      if (rippled.length && lastTend) ripple(rippled, lastTend.at);
    }
  });
}
