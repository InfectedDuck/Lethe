import {
  GARDEN_DAYS_PER_REAL_DAY, MS_PER_REAL_DAY, SLOW_FOG_AFTER_REAL_DAYS, SLOW_FOG_FACTOR,
} from './constants';
import type { GardenDay } from './types';

/** Garden days that pass while the person is away. Fog slows after a long absence but never stops. */
export function gardenDaysForRealDays(realDays: number): number {
  if (realDays <= 0) return 0;
  const full = Math.min(realDays, SLOW_FOG_AFTER_REAL_DAYS);
  const slow = Math.max(0, realDays - SLOW_FOG_AFTER_REAL_DAYS);
  return (full + slow * SLOW_FOG_FACTOR) * GARDEN_DAYS_PER_REAL_DAY;
}

/**
 * The garden's "now". `debugOffset` is the hidden time slider: extra garden days added on top.
 * The engine never reads the clock itself, so tests and the slider pass `now` in.
 */
export function gardenNow(lastSeenAt: GardenDay, lastSeenReal: number, realNow: number, debugOffset = 0): GardenDay {
  return lastSeenAt + gardenDaysForRealDays((realNow - lastSeenReal) / MS_PER_REAL_DAY) + debugOffset;
}

export const realDayIndex = (ms: number) => Math.floor(ms / MS_PER_REAL_DAY);

/** "Four days passed." Words, not digits, for small numbers; lowercase-friendly. */
const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
export const numberWord = (n: number) => WORDS[n] ?? String(n);
