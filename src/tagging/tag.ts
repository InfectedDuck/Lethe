// Client side of tagging. Asks /api/tag first; if no provider is configured, the network fails or the reply
// can't be read, the offline tagger (./offline.ts) runs in the browser instead, so planting always gets tags.

import type { Garden, Kind } from '../engine';
import type { Tags } from '../engine/garden';
import { offlineTag } from './offline';

export type TagResult = { people: Tags; places: Tags; feelings: Tags; source: 'api' | 'offline' };

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
    return { people: named(j.people), places: named(j.places), feelings: j.feelings.map((name) => ({ name })), source: 'api' };
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
    return { ...(await offlineTag(g, kind, text)), source: 'offline' };
  }
}
