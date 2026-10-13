// ?stress=N (P12.1): a big garden for checking the frame rate, never shown to anyone else.
// It repeats the ten sample memories' words (no filler text) under new ids, and spreads people, places and
// feelings the way a long-kept garden would: a few people in many memories, most in a handful, a feeling on most.
// Seeded, so every run is the same garden.

import { emptyGarden, plant, rng, setVitality, type Garden } from '../engine';
import type { Place } from './placement';
import { SAMPLE } from './sample';

const PEOPLE = ['Grandma Mei', 'Leo', 'Dad', ...Array.from({ length: 37 }, (_, i) => `friend ${i + 1}`)];
const PLACES = ['Hangzhou', 'Kamakura', 'Tokyo', 'university', ...Array.from({ length: 21 }, (_, i) => `place ${i + 1}`)];
const FEELINGS = ['comfort', 'warmth', 'tenderness', 'joy', 'care', 'calm', 'love', 'solitude'];

/** A skewed pick: low indexes (the people who matter most) come up far more often. */
const skewed = <T,>(r: () => number, xs: T[]) => xs[Math.floor(xs.length * r() ** 2.2)];

export function stressGarden(n: number, now: number, realNow: number): { garden: Garden; positions: Record<string, Place> } {
  const r = rng(`stress:${n}`);
  const g = emptyGarden(realNow);
  g.firstPlantingsDone = true;
  const positions: Record<string, Place> = {};
  const vitality: Record<string, number> = {};
  const cols = Math.ceil(Math.sqrt(n * 2.1));
  const rows = Math.ceil(n / cols);
  for (let i = 0; i < n; i++) {
    const s = SAMPLE[i % SAMPLE.length];
    const id = `s${i}`;
    const people = r() < 0.75 ? [skewed(r, PEOPLE), ...(r() < 0.2 ? [skewed(r, PEOPLE)] : [])] : [];
    const places = r() < 0.5 ? [skewed(r, PLACES)] : [];
    const feelings = r() < 0.7 ? [FEELINGS[Math.floor(r() * FEELINGS.length)]] : [];
    const t = (xs: string[]) => [...new Set(xs)].map((name) => ({ name }));
    plant(g, { id, kind: s.kind, text: s.text, hue: s.hue, people: t(people), places: t(places), feelings: t(feelings) }, now, realNow);
    const c = i % cols, row = Math.floor(i / cols);
    positions[id] = {
      x: 80 + (c + 0.5 + (r() - 0.5) * 0.6) * (1280 / cols),
      y: 250 + (row + 0.5 + (r() - 0.5) * 0.5) * (640 / rows),
      size: 80 + r() * 40,
    };
    vitality[id] = [0.95, 0.9, 0.6, 0.45, 0.2, 0.1][Math.floor(r() * 6)];
  }
  for (const id of Object.keys(vitality)) setVitality(g, id, vitality[id], now);
  g.plantsToday = 0;
  g.light = 3;
  g.lastSeenAt = now;
  return { garden: g, positions };
}
