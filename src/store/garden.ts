// The one store shared by the 3D scene and the DOM interface.
// It owns the Garden (persisted later via Dexie, see docs/build-plan.md P10) and the clock.
// Every action clones the garden, runs an engine function, and replaces it, so React and R3F see a new reference.

import { create } from 'zustand';
import {
  canPlant, gardenNow, letGo, plant, retag, returnTo, tend, viewAll, visit,
  type Garden, type Kind, type MemoryView, type ReturnSummary,
} from '../engine';
import { sampleGarden } from '../data/sample';
import { offlineTag } from '../tagging/offline';
import { apiTag, type TagSource } from '../tagging/tag';

type Clock = { debugOffset: number };

type GardenStore = {
  garden: Garden;
  clock: Clock;
  views: Record<string, MemoryView>;
  hoveredId: string | null;
  focusedId: string | null;
  returnSummary: ReturnSummary | null;
  /** Which tagger tagged each memory planted this session (for checking the providers on the live site). */
  tagSources: Record<string, TagSource>;
  /** Ids that just bloomed or were tended, for one-shot animations. */
  events: { type: 'bloom' | 'tend' | 'ripple' | 'dissolve'; id: string; at: number }[];

  now: () => number;
  refresh: () => void;
  setDebugOffset: (gardenDays: number) => void;
  hover: (id: string | null) => void;
  focus: (id: string | null) => void;
  tendMemory: (id: string) => void;
  letGoMemory: (id: string) => void;
  returnToMemory: (id: string) => void;
  plantMemory: (kind: Kind, text: string, extra?: { hue?: string; photoId?: string }) => Promise<string | null>;
  arrive: () => void;
};

const realNow = () => Date.now();
/** ?days=N previews the garden N garden days ahead (same as the hidden slider). For demos and screenshots. */
const urlDays = typeof location !== 'undefined' ? Number(new URLSearchParams(location.search).get('days')) || 0 : 0;
let nextId = 0;
const newId = () => `m${Date.now().toString(36)}${(nextId++).toString(36)}`;

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

  return {
    garden: initial,
    clock: { debugOffset: urlDays },
    views: viewAll(initial, 100 + urlDays),
    hoveredId: null,
    focusedId: null,
    returnSummary: null,
    tagSources: {},
    events: [],

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

    plantMemory: async (kind, text, extra) => {
      commitPreview();
      const { garden } = get();
      if (!canPlant(garden, realNow())) return null;
      // Plant at once with the offline tagger (in the browser, no network), so the flower never waits.
      const tags = await offlineTag(garden, kind, text);
      const id = newId();
      mutate((g, now) => {
        plant(g, { id, kind, text, ...extra, ...tags }, now, realNow());
      });
      set((s) => ({ tagSources: { ...s.tagSources, [id]: 'offline' } }));
      emit('bloom', [id]);
      // Then ask the tagging provider in the background; if it answers in time, its tags replace the offline ones.
      void apiTag(get().garden, kind, text).then((better) => {
        if (!better || !get().garden.memories[id]) return;
        mutate((g) => retag(g, id, better));
        set((s) => ({ tagSources: { ...s.tagSources, [id]: better.source } }));
      });
      return id;
    },

    arrive: () => {
      const g = structuredClone(get().garden);
      const now = get().now();
      const summary = visit(g, now, realNow());
      set({ ...withViews(g, now), returnSummary: summary, clock: { debugOffset: 0 } });
      emit('dissolve', summary.lost);
    },
  };
});
