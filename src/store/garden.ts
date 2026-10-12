// The one store shared by the 3D scene and the DOM interface.
// It owns the Garden (persisted later via Dexie, see docs/build-plan.md P10), where planted flowers stand, the
// clock, and the planting draft. Every action clones the garden, runs an engine function, and replaces it, so React
// and R3F see a new reference.

import { create } from 'zustand';
import {
  canPlant, gardenNow, letGo, plant, retag, returnTo, tend, viewAll, visit,
  type Garden, type Kind, type MemoryView, type ReturnSummary,
} from '../engine';
import type { Tags } from '../engine/garden';
import { layoutOf, placeNew, type Place } from '../data/placement';
import { sampleGarden } from '../data/sample';
import { offlineTag } from '../tagging/offline';
import { apiTag, type TagSource } from '../tagging/tag';
import { dominantColor } from '../ui/photo';

type Clock = { debugOffset: number };
type DraftTags = { people: Tags; places: Tags; feelings: Tags };

/** A memory being written in the plant overlay (screens p4–p6). */
export type Draft = {
  kind: Kind;
  text: string;
  /** Photo memories: the chosen image (kept in memory until P10 stores it) and its colour. */
  photoId?: string;
  hue?: string;
  tags: DraftTags | null;
  source: TagSource | null;
  /** Names the person removed from "threads it could join"; a later provider answer never brings them back. */
  dropped: string[];
  /** Where it will grow; the seed waits there while it is written. */
  place: Place;
};

export type PlantingStep = 'closed' | 'kind' | 'field';

type GardenStore = {
  garden: Garden;
  clock: Clock;
  views: Record<string, MemoryView>;
  /** Where each planted (non-sample) memory stands on the design canvas. */
  positions: Record<string, Place>;
  /** Photo blobs by photoId, with an object URL for showing them. */
  photos: Record<string, { blob: Blob; url: string }>;
  hoveredId: string | null;
  focusedId: string | null;
  returnSummary: ReturnSummary | null;
  /** Which tagger tagged each memory planted this session (for checking the providers on the live site). */
  tagSources: Record<string, TagSource>;
  /** Ids that just bloomed or were tended, for one-shot animations. */
  events: { type: 'bloom' | 'tend' | 'ripple' | 'dissolve'; id: string; at: number }[];
  planting: PlantingStep;
  draft: Draft | null;

  now: () => number;
  refresh: () => void;
  setDebugOffset: (gardenDays: number) => void;
  hover: (id: string | null) => void;
  focus: (id: string | null) => void;
  tendMemory: (id: string) => void;
  letGoMemory: (id: string) => void;
  returnToMemory: (id: string) => void;
  plantMemory: (kind: Kind, text: string, extra?: {
    hue?: string; photoId?: string; place?: Place; tags?: DraftTags; tagSource?: TagSource; dropped?: string[];
  }) => Promise<string | null>;
  arrive: () => void;

  openPlanting: (step?: Exclude<PlantingStep, 'closed'>, kind?: Kind) => void;
  closePlanting: () => void;
  setDraftKind: (kind: Kind) => void;
  setDraftText: (text: string) => void;
  setDraftPhoto: (file: File) => Promise<void>;
  dropDraftTag: (name: string) => void;
  /** Tag the draft: offline at once, then the provider in the background. Called by the overlay after a pause in typing. */
  tagDraft: () => Promise<void>;
  plantDraft: () => Promise<string | null>;
  canPlantNow: () => boolean;
};

const realNow = () => Date.now();
/** ?days=N previews the garden N garden days ahead (same as the hidden slider). For demos and screenshots. */
const urlDays = typeof location !== 'undefined' ? Number(new URLSearchParams(location.search).get('days')) || 0 : 0;
let nextId = 0;
const newId = (prefix = 'm') => `${prefix}${Date.now().toString(36)}${(nextId++).toString(36)}`;
const dropTags = (tags: DraftTags, dropped: string[]): DraftTags => {
  const keep = (t: Tags) => t.filter((x) => !dropped.includes(x.name.toLowerCase()));
  return { people: keep(tags.people), places: keep(tags.places), feelings: keep(tags.feelings) };
};
/** Only one draft tagging request at a time; a newer pause in typing aborts the older one. */
let draftRequest: AbortController | null = null;

export const useGarden = create<GardenStore>((set, get) => {
  const initial = sampleGarden(100, realNow());
  const withViews = (g: Garden, now: number) => ({ garden: g, views: viewAll(g, now) });
  const mutate = (fn: (g: Garden, now: number) => void) => {
    const g = structuredClone(get().garden);
    const now = get().now();
    fn(g, now);
    set(withViews(g, now));
  };
  /**
   * The hidden slider only previews. Acting while it is moved forward first commits the previewed time as a
   * proper return visit (light, losses, summary), so no action ever writes timestamps from a preview.
   */
  const commitPreview = () => { if (get().clock.debugOffset !== 0) get().arrive(); };
  const emit = (type: GardenStore['events'][number]['type'], ids: string[]) =>
    set((s) => ({ events: [...s.events.filter((e) => performance.now() - e.at < 8000), ...ids.map((id) => ({ type, id, at: performance.now() }))] }));
  /** The next free spot in the garden, for a memory about to be planted. */
  const nextPlace = () => {
    const { garden, positions } = get();
    const ids = Object.keys(garden.memories);
    return placeNew(Object.values(layoutOf(ids, positions)), ids.length * 7 + 3);
  };
  const setDraft = (patch: Partial<Draft>) => set((s) => (s.draft ? { draft: { ...s.draft, ...patch } } : {}));

  return {
    garden: initial,
    clock: { debugOffset: urlDays },
    views: viewAll(initial, 100 + urlDays),
    positions: {},
    photos: {},
    hoveredId: null,
    focusedId: null,
    returnSummary: null,
    tagSources: {},
    events: [],
    planting: 'closed',
    draft: null,

    now: () => {
      const { garden, clock } = get();
      return gardenNow(garden.lastSeenAt, garden.lastSeenReal, realNow(), clock.debugOffset);
    },
    refresh: () => set({ views: viewAll(get().garden, get().now()) }),

    // Hidden time slider: scrubbing only previews. `arrive()` commits the elapsed time like a real return visit.
    setDebugOffset: (d) => { set({ clock: { debugOffset: d } }); get().refresh(); },

    hover: (id) => set({ hoveredId: id }),
    focus: (id) => set({ focusedId: id }),

    tendMemory: (id) => {
      commitPreview();
      let rippled: string[] = [];
      mutate((g, now) => { rippled = tend(g, id, now); });
      emit('tend', [id]); emit('ripple', rippled);
    },
    letGoMemory: (id) => { commitPreview(); mutate((g, now) => letGo(g, id, now)); emit('dissolve', [id]); },
    returnToMemory: (id) => { commitPreview(); mutate((g, now) => returnTo(g, id, now)); emit('bloom', [id]); },

    plantMemory: async (kind, text, extra = {}) => {
      commitPreview();
      const { garden } = get();
      if (!canPlant(garden, realNow())) return null;
      // Plant at once: with the draft's tags if it has them, otherwise the offline tagger (in the browser, no network).
      const dropped = extra.dropped ?? [];
      const tags = extra.tags ?? dropTags(await offlineTag(garden, kind, text), dropped);
      const source = extra.tags ? extra.tagSource ?? 'offline' : 'offline';
      const id = newId();
      const place = extra.place ?? nextPlace();
      set((s) => ({ positions: { ...s.positions, [id]: place } }));
      mutate((g, now) => {
        plant(g, { id, kind, text, hue: extra.hue, photoId: extra.photoId, ...tags }, now, realNow());
      });
      set((s) => ({ tagSources: { ...s.tagSources, [id]: source } }));
      emit('bloom', [id]);
      // Offline tags only: ask the provider in the background; if it answers in time, its tags replace them.
      if (source === 'offline') {
        void apiTag(get().garden, kind, text).then((better) => {
          if (!better || !get().garden.memories[id]) return;
          mutate((g) => retag(g, id, dropTags(better, dropped)));
          set((s) => ({ tagSources: { ...s.tagSources, [id]: better.source } }));
        });
      }
      return id;
    },

    arrive: () => {
      const g = structuredClone(get().garden);
      const now = get().now();
      const summary = visit(g, now, realNow());
      set({ ...withViews(g, now), returnSummary: summary, clock: { debugOffset: 0 } });
      emit('dissolve', summary.lost);
    },

    /* ---------- planting (screens p4–p6) ---------- */

    canPlantNow: () => canPlant(get().garden, realNow()),

    openPlanting: (step = 'kind', kind = 'sentence') => {
      if (!get().canPlantNow()) return;
      const draft = get().draft;
      set({
        planting: step, focusedId: null,
        draft: draft ?? { kind, text: '', tags: null, source: null, dropped: [], place: nextPlace() },
      });
    },
    closePlanting: () => { draftRequest?.abort(); set({ planting: 'closed', draft: null }); },
    setDraftKind: (kind) => { set({ planting: 'field' }); setDraft({ kind, tags: null, source: null }); },
    setDraftText: (text) => setDraft({ text }),
    setDraftPhoto: async (file) => {
      const photoId = newId('p');
      const url = URL.createObjectURL(file);
      set((s) => ({ photos: { ...s.photos, [photoId]: { blob: file, url } } }));
      setDraft({ photoId, hue: undefined });
      const hue = await dominantColor(file);
      if (get().draft?.photoId === photoId) setDraft({ hue });
    },
    dropDraftTag: (name) => {
      const d = get().draft;
      if (!d?.tags) return;
      const dropped = [...d.dropped, name.toLowerCase()];
      setDraft({ dropped, tags: dropTags(d.tags, dropped) });
    },
    tagDraft: async () => {
      const d = get().draft;
      if (!d) return;
      const { kind, text } = d;
      draftRequest?.abort();
      if (!text.trim()) { setDraft({ tags: null, source: null }); return; }
      const still = () => get().draft?.text === text && get().draft?.kind === kind;
      const offline = await offlineTag(get().garden, kind, text);
      if (!still()) return;
      setDraft({ tags: dropTags(offline, get().draft!.dropped), source: 'offline' });
      const request = (draftRequest = new AbortController());
      const better = await apiTag(get().garden, kind, text, request.signal).catch(() => null);
      if (!better || request.signal.aborted || !still()) return;
      setDraft({ tags: dropTags(better, get().draft!.dropped), source: better.source });
    },
    plantDraft: async () => {
      const d = get().draft;
      if (!d || !d.text.trim()) return null;
      draftRequest?.abort();
      set({ planting: 'closed', draft: null });
      return get().plantMemory(d.kind, d.text.trim(), {
        hue: d.hue, photoId: d.photoId, place: d.place, dropped: d.dropped,
        ...(d.tags ? { tags: d.tags, tagSource: d.source ?? 'offline' } : {}),
      });
    },
  };
});
