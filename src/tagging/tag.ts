// Client side of tagging. Calls /api/tag; if that is unavailable (offline, no key, demo), falls back to
// matching names the garden already knows, so planting never blocks on the network.

import type { Garden, Kind } from '../engine';
import type { Tags } from '../engine/garden';

export type TagResult = { people: Tags; places: Tags; feelings: Tags; source: 'claude' | 'local' };

export async function tag(g: Garden, kind: Kind, text: string, signal?: AbortSignal): Promise<TagResult> {
  try {
    const known = Object.values(g.entities).map(({ id, kind, name }) => ({ id, kind, name }));
    const res = await fetch('/api/tag', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ kind, text, known }), signal,
    });
    if (!res.ok) throw new Error(String(res.status));
    const j = await res.json() as { people: { name: string; id: string | null }[]; places: { name: string; id: string | null }[]; feelings: string[] };
    const named = (xs: { name: string; id: string | null }[]) => xs.map((x) => ({ name: x.name, id: x.id ?? undefined }));
    return { people: named(j.people), places: named(j.places), feelings: j.feelings.map((name) => ({ name })), source: 'claude' };
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
    return { ...localTag(g, text), source: 'local' };
  }
}

/** Offline fallback: find known entity names (and aliases) in the text. */
export function localTag(g: Garden, text: string): Omit<TagResult, 'source'> {
  const lower = text.toLowerCase();
  const hit = (kind: 'person' | 'place' | 'feeling') => Object.values(g.entities)
    .filter((e) => e.kind === kind && [e.name.toLowerCase(), ...e.aliases].some((n) => n && lower.includes(n)))
    .map((e) => ({ name: e.name, id: e.id }));
  return { people: hit('person'), places: hit('place'), feelings: hit('feeling') };
}
