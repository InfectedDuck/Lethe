// The one store shared by the 3D scene and the DOM interface.
// It owns the Garden (your own one is kept in this browser, see persist.ts), where planted flowers stand, the
// clock, and the planting draft. Every action clones the garden, runs an engine function, and replaces it, so React
// and R3F see a new reference.

import { create } from 'zustand';
import {
  canPlant, emptyGarden, gardenNow, letGo, plant, retag, returnTo, tend, viewAll, visit,
  type Garden, type Kind, type MemoryView, type ReturnSummary,
} from '../engine';
import type { Tags } from '../engine/garden';
import { FIRST_PLANTING_PLACES, layoutOf, placeNew, type Place } from '../data/placement';
import { FIRST_PROMPTS, sampleGarden } from '../data/sample';
import { offlineTag } from '../tagging/offline';
import { apiTag, type TagSource } from '../tagging/tag';
import { dominantColor } from '../ui/photo';
import { keep, load, markKept } from './persist';

type Clock = { debugOffset: number };
type DraftTags = { people: Tags; places: Tags; feelings: Tags };

/** A memory being written in the plant overlay (screens p4–p6). */
export type Draft = {
  kind: Kind;
  text: string;
  /** Photo memories: the chosen image (written with the garden once planted) and its colour. */
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
/** Where the person is: the threshold (screen p7), the first plantings (p8–p10), or the garden itself. */
export type Phase = 'threshold' | 'first' | 'garden';

type GardenStore = {
  garden: Garden;
  clock: Clock;
  views: Record<string, MemoryView>;
  /**
   * What the 3D garden shows. Usually the same as `views`; during the return replay it starts as the garden was
   * before the time away and moves to `views` one memory at a time (P7.1).
   */
  shown: Record<string, MemoryView>;
  replaying: boolean;
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
  events: { type: 'bloom' | 'tend' | 'ripple' | 'dissolve' | 'beckon'; id: string; at: number }[];
  planting: PlantingStep;
  phase: Phase;
  /** Whose garden is on screen: your own (kept in this browser) or the demo garden (never kept). */
  owner: 'own' | 'demo';
  /** Which first-planting prompt is showing (index into FIRST_PROMPTS). */
  promptIndex: number;
  /** A line the garden says over everything else for a moment ("A season passes."). */
  whisperOverride: string | null;
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
  /** Hidden slider: put the ten sample memories back as they were. */
  resetDemo: () => void;
  /** Threshold: return to your kept garden if this browser has one, otherwise begin it with the first plantings. */
  enterOwn: () => Promise<void>;
  /** Threshold: begin your own garden, empty, with the first plantings. */
  beginOwn: () => void;
  /** Threshold: see the demo garden (the ten sample memories). */
  seeDemo: () => void;
  /** First plantings: plant the current prompt's memory, or skip it. */
  plantPrompt: (text: string, photo?: File) => Promise<void>;
  skipPrompt: () => void;

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
/** ?demo (or any preview/sandbox link) opens straight into the demo garden; otherwise the threshold comes first. */
const startPhase: Phase = typeof location !== 'undefined' && /[?&](demo|days|sandbox)\b/.test(location.search) ? 'garden' : 'threshold';
/** "A season passes" (P8.3): after the first plantings, this many garden days go by, shown with the return replay. */
const SEASON_DAYS = 10;
/** Let the last bloom finish and the line be read before the season passes. */
const SEASON_AFTER_MS = 2800;
const SEASON_LINE_MS = 3200;
let seasonTimer: ReturnType<typeof setTimeout> | null = null;
let nextId = 0;
const newId = (prefix = 'm') => `${prefix}${Date.now().toString(36)}${(nextId++).toString(36)}`;
const dropTags = (tags: DraftTags, dropped: string[]): DraftTags => {
  const keep = (t: Tags) => t.filter((x) => !dropped.includes(x.name.toLowerCase()));
  return { people: keep(tags.people), places: keep(tags.places), feelings: keep(tags.feelings) };
};
/** Only one draft tagging request at a time; a newer pause in typing aborts the older one. */
let draftRequest: AbortController | null = null;

/** The return replay (P7.1): how far apart memories change, and when a lost one starts to dissolve or a ghost beckons. */
const REPLAY_STAGGER_MS = 260;
const REPLAY_TICK_MS = 120;
const DISSOLVE_AFTER_MS = 1500;
const BECKON_AFTER_MS = 3000;
/** The kept garden, read once at start while the threshold shows (preview and demo links never read it). */
const kept = startPhase === 'threshold' ? load() : Promise.resolve(null);

let replayTimer: ReturnType<typeof setInterval> | null = null;
const stopReplay = () => { if (replayTimer) clearInterval(replayTimer); replayTimer = null; };

export const useGarden = create<GardenStore>((set, get) => {
  const initial = sampleGarden(100, realNow());
  // Any change to the garden ends a replay: the garden shows what is true now.
  const withViews = (g: Garden, now: number) => {
    stopReplay();
    const views = viewAll(g, now);
    return { garden: g, views, shown: views, replaying: false };
  };
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
  const emit = (type: GardenStore['events'][number]['type'], ids: string[], at: (id: string) => number = () => performance.now()) =>
    set((s) => ({ events: [...s.events.filter((e) => performance.now() - e.at < 8000), ...ids.map((id) => ({ type, id, at: at(id) }))] }));
  /** The next free spot in the garden, for a memory about to be planted. */
  const nextPlace = () => {
    const { garden, positions } = get();
    const ids = Object.keys(garden.memories);
    return placeNew(Object.values(layoutOf(ids, positions)), ids.length * 7 + 3);
  };
  /** Next first-planting prompt; after the last, the garden opens and a season passes (P8.3). */
  const advancePrompt = () => {
    const next = get().promptIndex + 1;
    if (next < FIRST_PROMPTS.length) { set({ promptIndex: next }); return; }
    set({ phase: 'garden', promptIndex: next });
    if (!Object.keys(get().garden.memories).length) return; // nothing planted: no season to show
    if (seasonTimer) clearTimeout(seasonTimer);
    set({ whisperOverride: 'A season passes.' });
    seasonTimer = setTimeout(() => {
      get().setDebugOffset(SEASON_DAYS);
      get().arrive();
      seasonTimer = setTimeout(() => set({ whisperOverride: null }), SEASON_LINE_MS);
    }, SEASON_AFTER_MS);
  };
  const setDraft = (patch: Partial<Draft>) => set((s) => (s.draft ? { draft: { ...s.draft, ...patch } } : {}));

  const initialViews = viewAll(initial, 100 + urlDays);
  return {
    garden: initial,
    clock: { debugOffset: urlDays },
    views: initialViews,
    shown: initialViews,
    replaying: false,
    positions: {},
    photos: {},
    hoveredId: null,
    focusedId: null,
    returnSummary: null,
    tagSources: {},
    events: [],
    planting: 'closed',
    phase: startPhase,
    owner: 'demo',
    promptIndex: 0,
    whisperOverride: null,
    draft: null,

    now: () => {
      const { garden, clock } = get();
      return gardenNow(garden.lastSeenAt, garden.lastSeenReal, realNow(), clock.debugOffset);
    },
    refresh: () => { stopReplay(); const views = viewAll(get().garden, get().now()); set({ views, shown: views, replaying: false }); },

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

    // Return visit: apply the time away, then replay it. The garden first shows how it was, and each memory eases
    // to how it is now, one after another (most changed first), while the fog rises. Lost ones dissolve once they have
    // become ghosts; ghosts about to be lost glow once, so they can still be saved.
    arrive: () => {
      const before = viewAll(get().garden, get().garden.lastSeenAt);
      const g = structuredClone(get().garden);
      const now = get().now();
      const summary = visit(g, now, realNow());
      const next = withViews(g, now);
      const changed = [...summary.lost, ...summary.faded, ...Object.keys(next.views)
        .filter((id) => !summary.lost.includes(id) && !summary.faded.includes(id) && before[id] && before[id].vitality - next.views[id].vitality > 0.02)];
      const start = performance.now() + 400;
      const delay = (id: string) => start + Math.max(0, changed.indexOf(id)) * REPLAY_STAGGER_MS;
      const shown: Record<string, MemoryView> = { ...next.views };
      for (const id of changed) if (before[id]) shown[id] = before[id];
      set({ ...next, shown, replaying: changed.length > 0, returnSummary: summary, clock: { debugOffset: 0 } });
      emit('dissolve', summary.lost, (id) => delay(id) + DISSOLVE_AFTER_MS);
      emit('beckon', summary.aboutToBeLost, (id) => delay(id) + BECKON_AFTER_MS);
      if (!changed.length) return;
      replayTimer = setInterval(() => {
        const t = performance.now();
        const { views, shown: cur } = get();
        const due = changed.filter((id) => cur[id] !== views[id] && t >= delay(id));
        if (due.length) set({ shown: { ...cur, ...Object.fromEntries(due.map((id) => [id, views[id]])) } });
        if (changed.every((id) => get().shown[id] === views[id])) { stopReplay(); set({ replaying: false }); }
      }, REPLAY_TICK_MS);
    },

    resetDemo: () => {
      stopReplay();
      if (seasonTimer) clearTimeout(seasonTimer);
      draftRequest?.abort();
      const g = sampleGarden(100, realNow());
      const views = viewAll(g, 100);
      set({
        garden: g, views, shown: views, replaying: false, positions: {}, events: [], tagSources: {},
        clock: { debugOffset: 0 }, returnSummary: null, hoveredId: null, focusedId: null, planting: 'closed', draft: null,
        whisperOverride: null, owner: 'demo',
      });
    },

    /* ---------- the threshold and the first plantings (P8) ---------- */

    seeDemo: () => { get().resetDemo(); set({ phase: 'garden' }); },

    // Coming back: the garden as it was left, then the time away, played as the return replay (P7.1).
    enterOwn: async () => {
      const found = await kept;
      if (!found) { get().beginOwn(); return; }
      const { stored, photos } = found;
      markKept(Object.keys(photos));
      const views = viewAll(stored.garden, stored.garden.lastSeenAt);
      set({
        garden: stored.garden, views, shown: views, replaying: false, positions: stored.layout,
        photos: Object.fromEntries(Object.entries(photos).map(([id, blob]) => [id, { blob, url: URL.createObjectURL(blob) }])),
        events: [], tagSources: {}, clock: { debugOffset: 0 }, returnSummary: null, hoveredId: null, focusedId: null,
        planting: 'closed', draft: null, whisperOverride: null,
        owner: 'own', promptIndex: stored.promptIndex,
        phase: stored.promptIndex < FIRST_PROMPTS.length ? 'first' : 'garden',
      });
      get().arrive();
    },

    beginOwn: () => {
      stopReplay();
      draftRequest?.abort();
      const g = emptyGarden(realNow());
      const views = viewAll(g, 0);
      set({
        garden: g, views, shown: views, replaying: false, positions: {}, photos: {}, events: [], tagSources: {},
        clock: { debugOffset: 0 }, returnSummary: null, hoveredId: null, focusedId: null, planting: 'closed', draft: null,
        phase: 'first', promptIndex: 0, whisperOverride: null, owner: 'own',
      });
    },

    plantPrompt: async (text, photo) => {
      const i = get().promptIndex;
      const prompt = FIRST_PROMPTS[i];
      if (!prompt || !text.trim()) return;
      let extra: { photoId?: string; hue?: string } = {};
      if (photo) {
        const photoId = newId('p');
        set((s) => ({ photos: { ...s.photos, [photoId]: { blob: photo, url: URL.createObjectURL(photo) } } }));
        extra = { photoId, hue: await dominantColor(photo) };
      }
      // Move on at once: the flower grows below while the next prompt appears.
      advancePrompt();
      await get().plantMemory(prompt.kind, text.trim(), { ...extra, place: FIRST_PLANTING_PLACES[i] });
    },
    skipPrompt: () => advancePrompt(),

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

/**
 * Keep your own garden: write it 500ms after the last change to it, where its flowers stand, or the first plantings,
 * and once more when the page is hidden or closed. The demo garden is never written.
 */
const KEEP_AFTER_MS = 500;
let keepTimer: ReturnType<typeof setTimeout> | null = null;
const keepNow = () => {
  if (keepTimer) clearTimeout(keepTimer);
  keepTimer = null;
  const { owner, garden, positions, promptIndex, photos } = useGarden.getState();
  if (owner === 'own') void keep({ garden, layout: positions, promptIndex }, photos, realNow());
};
useGarden.subscribe((s, prev) => {
  if (s.owner !== 'own') return;
  if (s.garden === prev.garden && s.positions === prev.positions && s.promptIndex === prev.promptIndex && s.owner === prev.owner) return;
  if (keepTimer) clearTimeout(keepTimer);
  keepTimer = setTimeout(keepNow, KEEP_AFTER_MS);
});
if (typeof addEventListener !== 'undefined') {
  addEventListener('pagehide', () => { if (keepTimer) keepNow(); });
  addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && keepTimer) keepNow(); });
}
