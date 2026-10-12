// The one store shared by the 3D scene and the DOM interface.
// It owns the Garden (persisted later via Dexie, see docs/build-plan.md P10) and the clock.
// Every action clones the garden, runs an engine function, and replaces it, so React and R3F see a new reference.

import { create } from 'zustand';
import {
  canPlant, gardenNow, letGo, plant, returnTo, tend, viewAll, visit,
  type Garden, type Kind, type MemoryView, type ReturnSummary,
} from '../engine';
import { sampleGarden } from '../data/sample';
import { tag } from '../tagging/tag';

type Clock = { debugOffset: number };

type GardenStore = {
  garden: Garden;
  clock: Clock;
  views: Record<string, MemoryView>;
  hoveredId: string | null;
  focusedId: string | null;
  returnSummary: ReturnSummary | null;
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
  const emit = (type: GardenStore['events'][number]['type'], ids: string[]) =>
    set((s) => ({ events: [...s.events.filter((e) => performance.now() - e.at < 8000), ...ids.map((id) => ({ type, id, at: performance.now() }))] }));

  return {
    garden: initial,
    clock: { debugOffset: urlDays },
    views: viewAll(initial, 100 + urlDays),
    hoveredId: null,
    focusedId: null,
    returnSummary: null,
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
      let rippled: string[] = [];
      mutate((g, now) => { rippled = tend(g, id, now); });
      emit('tend', [id]); emit('ripple', rippled);
    },
    letGoMemory: (id) => { mutate((g, now) => letGo(g, id, now)); emit('dissolve', [id]); },
    returnToMemory: (id) => { mutate((g, now) => returnTo(g, id, now)); emit('bloom', [id]); },

    plantMemory: async (kind, text, extra) => {
      const { garden } = get();
      if (!canPlant(garden, realNow())) return null;
      const tags = await tag(garden, kind, text);
      const id = newId();
      mutate((g, now) => {
        plant(g, { id, kind, text, ...extra, people: tags.people, places: tags.places, feelings: tags.feelings }, now, realNow());
      });
      emit('bloom', [id]);
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
