// Where flowers stand on the 1440 × 900 design canvas (x, y = where a flower meets the ground).
// Pure: no Three, no React, so the store can choose a spot before the flower exists (the planting seed shows there).

import { SAMPLE_LAYOUT } from './sample';

export type Place = { x: number; y: number; size: number };

const CENTER = { x: 720, y: 560 };
/** space-6: the minimum distance between two flower bases. */
const MIN_GAP = 96;

/** A new memory's spot: a golden-angle spiral out from the garden's centre, at least MIN_GAP from every base. */
export function placeNew(existing: { x: number; y: number }[], seed: number): Place {
  for (let i = 0; i < 400; i++) {
    const a = (seed + i) * 2.39996;
    const r = 60 + i * 9;
    const x = CENTER.x + Math.cos(a) * r * 1.3;
    const y = CENTER.y + Math.sin(a) * r * 0.55;
    if (x < 80 || x > 1360 || y < 260 || y > 840) continue;
    if (existing.every((p) => Math.hypot(p.x - x, p.y - y) >= MIN_GAP)) return { x, y, size: 140 + ((seed * 37) % 30) };
  }
  return { x: CENTER.x, y: CENTER.y, size: 140 };
}

/** Every memory's spot: the designed layout for the ten sample memories, stored spots for the rest. */
export function layoutOf(ids: string[], positions: Record<string, Place>): Record<string, Place> {
  const out: Record<string, Place> = {};
  const taken: Place[] = [];
  for (const id of ids) {
    const p = SAMPLE_LAYOUT[id] ?? positions[id];
    if (p) { out[id] = p; taken.push(p); }
  }
  // A memory with no stored spot (shouldn't happen once planted through the store) still gets a stable one.
  let n = 0;
  for (const id of ids) {
    if (out[id]) continue;
    out[id] = placeNew(taken, ++n * 7 + id.length);
    taken.push(out[id]);
  }
  return out;
}
