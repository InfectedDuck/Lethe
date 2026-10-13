import {
  FADING_AT, GHOST_AT, S_INITIAL, THREAD_BONUS_CAP, THREAD_STABILITY_BONUS, VIVID_AT,
} from './constants';
import { neighbours, threadWeight } from './threads';
import type { Garden, GardenDay, Memory, MemoryState, MemoryView } from './types';

/** R(t) = e^(−t/S). */
export function retention(t: number, S: number): number {
  if (t <= 0) return 1;
  return Math.exp(-t / Math.max(S, 0.0001));
}

/** Inverse: how many days since tending give retention r at stability S. */
export function daysForRetention(r: number, S: number): number {
  const clamped = Math.min(1, Math.max(1e-6, r));
  return -S * Math.log(clamped);
}

export function stateOf(v: number, lost = false): MemoryState {
  if (lost) return 'lost';
  if (v >= VIVID_AT) return 'vivid';
  if (v >= FADING_AT) return 'fading';
  if (v >= GHOST_AT) return 'ghost';
  return 'lost';
}

/** S plus the thread bonus, which saturates at THREAD_BONUS_CAP. Threads to lost memories no longer hold anything. */
export function effectiveStability(g: Garden, m: Memory): number {
  let bonus = 0;
  for (const { other, thread } of neighbours(g, m.id)) {
    if (!g.memories[other] || g.memories[other].lost) continue;
    bonus += THREAD_STABILITY_BONUS * threadWeight(thread);
  }
  return m.stability + THREAD_BONUS_CAP * (1 - Math.exp(-bonus / THREAD_BONUS_CAP));
}

export function vitalityOf(g: Garden, m: Memory, now: GardenDay): number {
  if (m.lost) return 0;
  return retention(now - m.lastTendedAt, effectiveStability(g, m));
}

export function viewOf(g: Garden, id: string, now: GardenDay): MemoryView {
  const m = g.memories[id];
  const S = effectiveStability(g, m);
  const v = m.lost ? 0 : retention(now - m.lastTendedAt, S);
  return { id, vitality: v, state: stateOf(v, m.lost), effectiveStability: S };
}

export function viewAll(g: Garden, now: GardenDay): Record<string, MemoryView> {
  const out: Record<string, MemoryView> = {};
  for (const id of Object.keys(g.memories)) out[id] = viewOf(g, id, now);
  return out;
}

/** Set lastTendedAt so the memory currently shows vitality v. Used for demo gardens and tend spill-over. */
export function setVitality(g: Garden, id: string, v: number, now: GardenDay): void {
  const m = g.memories[id];
  m.lastTendedAt = now - daysForRetention(v, effectiveStability(g, m));
}

export function newMemoryStability(): number {
  return S_INITIAL;
}
