// Garden actions. Each one mutates the Garden it is given; the store passes a clone.
// No rendering, no clock, no storage here: `now` (garden day) and `realNow` (ms) are always parameters.

import {
  ABOUT_TO_BE_LOST_BELOW, FIRST_PLANTINGS, GHOST_AT, LIGHT_MAX, LIGHT_PER_REAL_DAY, MS_PER_REAL_DAY,
  PLANTS_PER_REAL_DAY, RETURN_COST, RETURN_VITALITY, S_INITIAL, TEND_COST, TEND_NEIGHBOUR_SHARE,
  TEND_STABILITY_MULT,
} from './constants';
import { setVitality, viewAll, vitalityOf } from './forgetting';
import { neighbours, rebuildThreads, resolveEntity, threadWeight } from './threads';
import { realDayIndex } from './time';
import type { EntityKind, Garden, GardenDay, Kind, Memory, MemoryState, ReturnSummary } from './types';

export function emptyGarden(realNow: number): Garden {
  return {
    memories: {}, entities: {}, threads: [], rejected: [],
    light: LIGHT_MAX, lightGrantedAt: realNow,
    lastSeenAt: 0, lastSeenReal: realNow,
    plantsToday: 0, plantsDay: realDayIndex(realNow), firstPlantingsDone: false,
  };
}

/* ---------- light ---------- */

/** Grant light for whole real days since the last grant. Unspent light carries over up to the cap. */
export function grantLight(g: Garden, realNow: number): void {
  const days = Math.floor((realNow - g.lightGrantedAt) / MS_PER_REAL_DAY);
  if (days <= 0) return;
  g.light = Math.min(LIGHT_MAX, g.light + days * LIGHT_PER_REAL_DAY);
  g.lightGrantedAt += days * MS_PER_REAL_DAY;
}

/* ---------- planting ---------- */

export type Tags = { name: string; id?: string }[];
export type PlantInput = {
  id: string;
  kind: Kind;
  text: string;
  hue?: string;
  photoId?: string;
  happenedAt?: string;
  people?: Tags;
  places?: Tags;
  feelings?: Tags;
};

export function canPlant(g: Garden, realNow: number): boolean {
  if (!g.firstPlantingsDone) return true;
  const today = realDayIndex(realNow);
  return g.plantsDay !== today || g.plantsToday < PLANTS_PER_REAL_DAY;
}

const resolveAll = (g: Garden, kind: EntityKind, tags: Tags = []) =>
  [...new Set(tags.map((t) => resolveEntity(g, kind, t.name, t.id)))];

export function plant(g: Garden, input: PlantInput, now: GardenDay, realNow: number): Memory {
  const resolve = (kind: EntityKind, tags?: Tags) => resolveAll(g, kind, tags);
  const m: Memory = {
    id: input.id, kind: input.kind, text: input.text.trim(), hue: input.hue, photoId: input.photoId,
    happenedAt: input.happenedAt, plantedAt: now, lastTendedAt: now, stability: S_INITIAL,
    people: resolve('person', input.people), places: resolve('place', input.places),
    feelings: resolve('feeling', input.feelings), lost: false,
  };
  g.memories[m.id] = m;
  rebuildThreads(g);

  if (g.firstPlantingsDone) {
    const today = realDayIndex(realNow);
    if (g.plantsDay !== today) { g.plantsDay = today; g.plantsToday = 0; }
    g.plantsToday++;
  } else if (Object.keys(g.memories).length >= FIRST_PLANTINGS) {
    g.firstPlantingsDone = true;
  }
  return m;
}

/**
 * Replace a memory's people, places and feelings, then redraw threads. Planting uses quick offline tags;
 * when a tagging provider answers later, its (better) tags replace them here. Vitality is untouched.
 */
export function retag(g: Garden, id: string, tags: { people?: Tags; places?: Tags; feelings?: Tags }): void {
  const m = g.memories[id];
  if (!m) return;
  m.people = resolveAll(g, 'person', tags.people);
  m.places = resolveAll(g, 'place', tags.places);
  m.feelings = resolveAll(g, 'feeling', tags.feelings);
  rebuildThreads(g);
}

/* ---------- tending ---------- */

export function canTend(g: Garden, id: string): boolean {
  return g.light >= TEND_COST && !!g.memories[id] && !g.memories[id].lost;
}

/**
 * Spend one light: reset t, multiply S, and give each threaded neighbour back
 * TEND_NEIGHBOUR_SHARE × weight of what it has lost. Returns the neighbours that brightened (for the ripple).
 */
export function tend(g: Garden, id: string, now: GardenDay): string[] {
  if (!canTend(g, id)) return [];
  const m = g.memories[id];
  g.light -= TEND_COST;

  // Read neighbour vitalities before the tended memory changes, so the order of updates doesn't matter.
  const before = neighbours(g, id)
    .filter(({ other }) => !g.memories[other]?.lost)
    .map(({ other, thread }) => ({ other, w: threadWeight(thread), v: vitalityOf(g, g.memories[other], now) }));

  m.lastTendedAt = now;
  m.stability *= TEND_STABILITY_MULT;

  for (const { other, w, v } of before) {
    const restored = v + TEND_NEIGHBOUR_SHARE * w * (1 - v);
    setVitality(g, other, restored, now);
  }
  return before.map((b) => b.other);
}

/* ---------- letting go and returning ---------- */

/** The person's choice. The memory drifts to lost but its words are kept, so it can be returned to. */
export function letGo(g: Garden, id: string, now: GardenDay): void {
  const m = g.memories[id];
  if (!m || m.lost) return;
  m.lost = true; m.lostAt = now; m.letGo = true;
  rebuildThreads(g);
}

export function canReturn(g: Garden, id: string): boolean {
  return g.light >= RETURN_COST && !!g.memories[id]?.lost;
}

/** Return to a lost memory: it comes back as a ghost with fresh stability, its threads re-form. */
export function returnTo(g: Garden, id: string, now: GardenDay): void {
  if (!canReturn(g, id)) return;
  const m = g.memories[id];
  g.light -= RETURN_COST;
  m.lost = false; m.lostAt = undefined; m.letGo = false;
  m.stability = S_INITIAL;
  rebuildThreads(g);
  setVitality(g, id, RETURN_VITALITY, now);
}

/* ---------- time passing ---------- */

/**
 * Move the garden from `from` to `to`, marking memories lost as they cross the threshold.
 * Steps in small increments because a loss weakens its neighbours' threads.
 */
export function advance(g: Garden, from: GardenDay, to: GardenDay, step = 0.25): ReturnSummary & { states: { before: Record<string, MemoryState>; after: Record<string, MemoryState> } } {
  const beforeViews = viewAll(g, from);
  const lostNow: string[] = [];
  for (let t = from; t < to; t = Math.min(to, t + step)) {
    const next = Math.min(to, t + step);
    let changed = false;
    for (const m of Object.values(g.memories)) {
      if (m.lost) continue;
      if (vitalityOf(g, m, next) < GHOST_AT) {
        m.lost = true; m.lostAt = next; lostNow.push(m.id); changed = true;
      }
    }
    if (changed) rebuildThreads(g);
    if (next >= to) break;
  }
  const afterViews = viewAll(g, to);
  const rank: Record<MemoryState, number> = { vivid: 0, fading: 1, ghost: 2, lost: 3 };
  const faded = Object.keys(afterViews)
    .filter((id) => !lostNow.includes(id) && rank[afterViews[id].state] > rank[beforeViews[id]?.state ?? 'vivid'])
    .sort((a, b) => (beforeViews[b].vitality - afterViews[b].vitality) - (beforeViews[a].vitality - afterViews[a].vitality));
  const aboutToBeLost = Object.values(afterViews)
    .filter((v) => v.state === 'ghost' && v.vitality < ABOUT_TO_BE_LOST_BELOW).map((v) => v.id);
  const states = {
    before: Object.fromEntries(Object.entries(beforeViews).map(([k, v]) => [k, v.state])),
    after: Object.fromEntries(Object.entries(afterViews).map(([k, v]) => [k, v.state])),
  };
  return { gardenDaysPassed: to - from, realDaysPassed: 0, faded, lost: lostNow, aboutToBeLost, states };
}

/** Called on every visit: grant light, apply elapsed time, remember this visit. */
export function visit(g: Garden, now: GardenDay, realNow: number): ReturnSummary {
  grantLight(g, realNow);
  const summary = advance(g, g.lastSeenAt, now);
  summary.realDaysPassed = (realNow - g.lastSeenReal) / MS_PER_REAL_DAY;
  g.lastSeenAt = now;
  g.lastSeenReal = realNow;
  return summary;
}

/* ---------- reveal: "what holds you" ---------- */

export type Holder = { entityId: string; name: string; kind: EntityKind; memories: string[]; weight: number };

/** Rank people and places by the total vitality of the living memories that mention them. */
export function holders(g: Garden, now: GardenDay): Holder[] {
  const map = new Map<string, Holder>();
  for (const m of Object.values(g.memories)) {
    if (m.lost) continue;
    const v = vitalityOf(g, m, now);
    for (const eid of [...m.people, ...m.places]) {
      const e = g.entities[eid];
      if (!e) continue;
      const h = map.get(eid) ?? { entityId: eid, name: e.name, kind: e.kind, memories: [], weight: 0 };
      h.memories.push(m.id); h.weight += v;
      map.set(eid, h);
    }
  }
  return [...map.values()].sort((a, b) => b.weight - a.weight);
}

/** For whispers: who still holds a fading memory ("Mira still holds it."). Strongest living neighbour's shared entity name. */
export function stillHeldBy(g: Garden, id: string, now: GardenDay): string | null {
  const m = g.memories[id];
  if (!m) return null;
  let best: { name: string; score: number } | null = null;
  for (const { other, thread } of neighbours(g, id)) {
    const o = g.memories[other];
    if (!o || o.lost) continue;
    const score = threadWeight(thread) * vitalityOf(g, o, now);
    const sharedIds = [...m.people.filter((p) => o.people.includes(p)), ...m.places.filter((p) => o.places.includes(p))];
    const name = sharedIds.length ? g.entities[sharedIds[0]]?.name : firstWords(o.text, 3);
    if (name && (!best || score > best.score)) best = { name, score };
  }
  return best?.name ?? null;
}

const DANGLING = /\s+(at|in|of|on|with|the|a|an|and|after|to|for|from|my|her|his)$/i;

/** A short name for a memory in a whisper: up to n words, cut at the first comma/period, never ending on "at"/"the"/... */
export function firstWords(text: string, n: number): string {
  let s = text.replace(/[“”"]/g, '').split(/[,;:]|\.(?=\s+[A-Z“"]|$)/)[0].split(/\s+/).slice(0, n).join(' ').trim();
  while (DANGLING.test(s)) s = s.replace(DANGLING, '');
  return s;
}
