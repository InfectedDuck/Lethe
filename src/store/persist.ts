// Your own garden, kept in this browser (IndexedDB via Dexie). Nothing here leaves the device.
// One row holds the Garden, where each flower stands and how far the first plantings got; photos are blobs by id.
// The demo garden is never kept: it is the same ten memories for everyone, every time.

import Dexie, { type Table } from 'dexie';
import type { Garden } from '../engine';
import type { Place } from '../data/placement';

/** Bump when the stored shape changes, and teach `load` to read the older one. */
const VERSION = 1;
const ROW = 'garden';

export type StoredGarden = {
  id: typeof ROW;
  version: number;
  garden: Garden;
  /** Where every planted memory stands, so a flower never moves between visits. */
  layout: Record<string, Place>;
  /** Which first-planting prompt was showing (FIRST_PROMPTS.length or more once they are done). */
  promptIndex: number;
  /** Real-time ms of this write. */
  keptAt: number;
};
type StoredPhoto = { id: string; blob: Blob };

class LetheDB extends Dexie {
  garden!: Table<StoredGarden, string>;
  photos!: Table<StoredPhoto, string>;
  constructor() {
    super('lethe');
    this.version(1).stores({ garden: 'id', photos: 'id' });
  }
}

/** No IndexedDB (tests, some private windows): the garden simply lives for this visit only. */
const db = typeof indexedDB !== 'undefined' ? new LetheDB() : null;

/** The kept garden, if there is one this code can read. Photos come back as blobs by id. */
export async function load(): Promise<{ stored: StoredGarden; photos: Record<string, Blob> } | null> {
  if (!db) return null;
  try {
    const stored = await db.garden.get(ROW);
    if (!stored || stored.version !== VERSION) return null;
    const ids = Object.values(stored.garden.memories).flatMap((m) => (m.photoId ? [m.photoId] : []));
    const rows = await db.photos.bulkGet(ids);
    const photos: Record<string, Blob> = {};
    for (const r of rows) if (r) photos[r.id] = r.blob;
    return { stored, photos };
  } catch {
    return null;
  }
}

/** Photo ids already written, so each blob is written once. */
const kept = new Set<string>();

/** Write the garden, and any photo its memories hold that is not written yet. */
export async function keep(
  state: Omit<StoredGarden, 'id' | 'version' | 'keptAt'>, photos: Record<string, { blob: Blob }>, realNow: number,
): Promise<void> {
  if (!db) return;
  const fresh = Object.values(state.garden.memories)
    .flatMap((m) => (m.photoId && !kept.has(m.photoId) && photos[m.photoId] ? [{ id: m.photoId, blob: photos[m.photoId].blob }] : []));
  try {
    await db.transaction('rw', db.garden, db.photos, async () => {
      if (fresh.length) await db.photos.bulkPut(fresh);
      await db.garden.put({ id: ROW, version: VERSION, keptAt: realNow, ...state });
    });
    for (const p of fresh) kept.add(p.id);
  } catch {
    // A full or blocked disk: the garden stays as it is on screen and the next change tries again.
  }
}

/** Mark photos that came back from the store as already written. */
export const markKept = (ids: string[]) => ids.forEach((id) => kept.add(id));
