// The one store shared by the 3D scene and the DOM interface.
// It owns the Garden (your own one is kept in this browser, see persist.ts), where planted flowers stand, the
// clock, and the planting draft. Every action clones the garden, runs an engine function, and replaces it, so React
// and R3F see a new reference.

import { create } from 'zustand';
import {
  canPlant, emptyGarden, gardenNow, holders, letGo, plant, retag, returnTo, tend, viewAll, visit,
  type Garden, type Kind, type MemoryView, type ReturnSummary,
} from '../engine';
import type { Tags } from '../engine/garden';
import { FIRST_PLANTING_PLACES, layoutOf, placeNew, type Place } from '../data/placement';
import { FIRST_PROMPTS, sampleGarden } from '../data/sample';
import { stressGarden } from '../data/stress';
import { offlineTag } from '../tagging/offline';
import { apiTag, type TagSource } from '../tagging/tag';
import { dominantColor } from '../ui/photo';
import { ALONE_WHISPER, RULE_WHISPER } from '../ui/whispers';
import { forget, keep, load, markKept } from './persist';

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
  /** `quiet`: the garden growing in on entry (no new-thread chord; each flower sounds its note as it lands). */
  events: { type: 'bloom' | 'tend' | 'ripple' | 'dissolve' | 'beckon'; id: string; at: number; quiet?: boolean }[];
  planting: PlantingStep;
  phase: Phase;
  /** Whose garden is on screen: your own (kept in this browser) or the demo garden (never kept). */
  owner: 'own' | 'demo';
  /** Which first-planting prompt is showing (index into FIRST_PROMPTS). */
  promptIndex: number;
  /** A line the garden says over everything else for a moment ("A season passes."). */
  whisperOverride: string | null;
  /** "What holds your garden" (P9, screen p12): open, and which person or place is lit. */
  reveal: { open: boolean; entityId: string | null };
  /** The settings overlay (P10.2), opened from "lethe" top-left. */
  settings: boolean;
  /** "watch a season" (D20): the garden plays its own story, and says one line at a time beneath it. */
  story: { running: boolean; line: string | null };
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
  /**
   * Threshold, at the click: reset the demo garden while the threshold is still fading, its seeds waiting in the
   * dark until `afterMs` has passed. `openDemo` then opens it without resetting it again.
   */
  prepareDemo: (afterMs: number) => void;
  openDemo: () => void;
  /** First plantings: plant the current prompt's memory, or skip it. */
  plantPrompt: (text: string, photo?: File) => Promise<void>;
  skipPrompt: () => void;
  /** The reveal: open it (lighting what holds the most), choose a person or place, close it. */
  openReveal: () => void;
  selectHolder: (entityId: string) => void;
  closeReveal: () => void;
  /** Settings: open or close it; let the garden go empties this browser and returns to the threshold. */
  openSettings: () => void;
  closeSettings: () => void;
  letGardenGo: () => Promise<void>;
  /** The story's state; `src/ui/story.ts` runs it and calls the store's actions like a person would. */
  setStory: (patch: Partial<GardenStore['story']>) => void;

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
/** ?stress=N (P12.1): open a seeded garden of N memories instead of the demo, to check the frame rate. */
const urlStress = typeof location !== 'undefined' ? Math.min(400, Number(new URLSearchParams(location.search).get('stress')) || 0) : 0;
/** ?demo (or any preview/sandbox/stress link) opens straight into the garden; otherwise the threshold comes first. */
const startPhase: Phase = typeof location !== 'undefined' && /[?&](demo|days|sandbox|stress)\b/.test(location.search) ? 'garden' : 'threshold';
/** "A season passes" (P8.3): after the first plantings, this many garden days go by, shown with the return replay. */
const SEASON_DAYS = 10;
/** Let the last bloom finish and the line be read before the season passes. */
const SEASON_AFTER_MS = 2800;
const SEASON_LINE_MS = 3200;
let seasonTimer: ReturnType<typeof setTimeout> | null = null;
/** A line the garden says once (the rule), and its timer. Only this line is ever hushed early. */
let saying: string | null = null;
let sayTimer: ReturnType<typeof setTimeout> | null = null;
/** The rule is said when the demo garden opens; a memory planted alone hears it once its bloom has settled. */
const RULE_FOR_MS = 7000;
const ALONE_AFTER_MS = 2400;
/**
 * Entering the demo garden, it grows in: each seed falls and blooms, left to right, 160ms apart (the bloom's own
 * beats), and the threads light once both their flowers have grown. On a ?demo link the wait is longer, so the
 * first frame has been drawn before the first seed falls.
 */
const GROW_IN_AFTER_MS = 450;
const GROW_IN_ON_LOAD_MS = 1800;
const GROW_IN_STAGGER_MS = 160;
const isDemoLink = typeof location !== 'undefined' && /[?&]demo\b/.test(location.search);
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
let kept = startPhase === 'threshold' ? load() : Promise.resolve(null);

let replayTimer: ReturnType<typeof setInterval> | null = null;
const stopReplay = () => { if (replayTimer) clearInterval(replayTimer); replayTimer = null; };

export const useGarden = create<GardenStore>((set, get) => {
  const stress = urlStress ? stressGarden(urlStress, 100, realNow()) : null;
  const initial = stress?.garden ?? sampleGarden(100, realNow());
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
  /** Say a line over the usual whisper for a while (never over the season's line), then let the usual one return. */
  const say = (line: string, afterMs = 0, forMs = RULE_FOR_MS) => {
    if (sayTimer) clearTimeout(sayTimer);
    sayTimer = setTimeout(() => {
      if (get().whisperOverride && get().whisperOverride !== saying) return;
      saying = line;
      set({ whisperOverride: line });
      sayTimer = setTimeout(hush, forMs);
    }, afterMs);
  };
  /** Stop a said line (an arrive, a reset): the return whisper or the idle one takes over. */
  const hush = () => {
    if (sayTimer) clearTimeout(sayTimer);
    sayTimer = null;
    if (saying && get().whisperOverride === saying) set({ whisperOverride: null });
    saying = null;
  };
  // A judge's link (?demo) grows the garden in and opens on the rule, before anything else is said.
  if (isDemoLink) setTimeout(() => { growIn(GROW_IN_ON_LOAD_MS); say(RULE_WHISPER); }, 0);
  /** The garden grows in: one quiet bloom per memory, left to right across the canvas. */
  const growIn = (afterMs: number) => {
    const ids = Object.keys(get().garden.memories);
    const layout = layoutOf(ids, get().positions);
    const order = [...ids].sort((a, b) => layout[a].x - layout[b].x);
    const t0 = performance.now() + afterMs;
    set({ events: order.map((id, i) => ({ type: 'bloom' as const, id, at: t0 + i * GROW_IN_STAGGER_MS, quiet: true })) });
  };
  const setDraft = (patch: Partial<Draft>) => set((s) => (s.draft ? { draft: { ...s.draft, ...patch } } : {}));

  const initialViews = viewAll(initial, 100 + urlDays);
  return {
    garden: initial,
    clock: { debugOffset: urlDays },
    views: initialViews,
    shown: initialViews,
    replaying: false,
    positions: stress?.positions ?? {},
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
    reveal: { open: false, entityId: null },
    settings: false,
    story: { running: false, line: null },
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
      // Planted alone: once it has grown, the garden says how memories hold each other (not in the first plantings,
      // where the season and its return speak next).
      if (get().phase === 'garden' && !get().garden.threads.some((t) => t.a === id || t.b === id)) say(ALONE_WHISPER, ALONE_AFTER_MS);
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
      hush();
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
      hush();
      stopReplay();
      if (seasonTimer) clearTimeout(seasonTimer);
      draftRequest?.abort();
      const g = sampleGarden(100, realNow());
      const views = viewAll(g, 100);
      set({
        garden: g, views, shown: views, replaying: false, positions: {}, events: [], tagSources: {},
        clock: { debugOffset: 0 }, returnSummary: null, hoveredId: null, focusedId: null, planting: 'closed', draft: null,
        whisperOverride: null, reveal: { open: false, entityId: null }, owner: 'demo', settings: false,
      });
      growIn(GROW_IN_AFTER_MS);
    },

    /* ---------- the threshold and the first plantings (P8) ---------- */

    seeDemo: () => { get().resetDemo(); get().openDemo(); },
    prepareDemo: (afterMs) => { get().resetDemo(); growIn(afterMs + GROW_IN_AFTER_MS); },
    openDemo: () => { set({ phase: 'garden' }); say(RULE_WHISPER); },

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
        planting: 'closed', draft: null, whisperOverride: null, reveal: { open: false, entityId: null }, settings: false,
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
        phase: 'first', promptIndex: 0, whisperOverride: null, reveal: { open: false, entityId: null }, owner: 'own', settings: false,
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

    /* ---------- the reveal: what holds your garden (P9) ---------- */

    openReveal: () => {
      const top = holders(get().garden, get().now())[0];
      draftRequest?.abort();
      set({ reveal: { open: true, entityId: top?.entityId ?? null }, focusedId: null, hoveredId: null, planting: 'closed', draft: null, settings: false });
    },
    selectHolder: (entityId) => set({ reveal: { open: true, entityId } }),
    closeReveal: () => set({ reveal: { open: false, entityId: null } }),

    /* ---------- settings (P10.2, screen p13) ---------- */

    // One overlay at a time: settings closes whatever else is open.
    openSettings: () => {
      draftRequest?.abort();
      set({ settings: true, focusedId: null, hoveredId: null, planting: 'closed', draft: null, reveal: { open: false, entityId: null } });
    },
    closeSettings: () => set({ settings: false }),
    // When the story ends, its return line is old news: the garden's usual whisper takes over.
    setStory: (patch) => set((s) => ({
      story: { ...s.story, ...patch },
      ...(patch.running === false && s.story.running ? { returnSummary: null } : {}),
    })),
    letGardenGo: async () => {
      stopReplay();
      if (seasonTimer) clearTimeout(seasonTimer);
      if (keepTimer) clearTimeout(keepTimer);
      keepTimer = null;
      draftRequest?.abort();
      kept = Promise.resolve(null);
      await forget();
      for (const p of Object.values(get().photos)) URL.revokeObjectURL(p.url);
      const g = emptyGarden(realNow());
      const views = viewAll(g, 0);
      set({
        garden: g, views, shown: views, replaying: false, positions: {}, photos: {}, events: [], tagSources: {},
        clock: { debugOffset: 0 }, returnSummary: null, hoveredId: null, focusedId: null, planting: 'closed', draft: null,
        phase: 'threshold', owner: 'demo', promptIndex: 0, whisperOverride: null, reveal: { open: false, entityId: null },
        settings: false,
      });
    },

    /* ---------- planting (screens p4–p6) ---------- */

    canPlantNow: () => canPlant(get().garden, realNow()),

    openPlanting: (step = 'kind', kind = 'sentence') => {
      if (!get().canPlantNow()) return;
      const draft = get().draft;
      set({
        planting: step, focusedId: null, settings: false,
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

/** The living memories a person or place holds (the reveal lights these). */
export function heldBy(g: Garden, entityId: string | null): string[] {
  if (!entityId) return [];
  return Object.values(g.memories)
    .filter((m) => !m.lost && (m.people.includes(entityId) || m.places.includes(entityId)))
    .map((m) => m.id);
}

/** What the reveal lights right now: the chosen holder's memories, or null when the reveal is closed. */
export function useRevealHeld(): string[] | null {
  const reveal = useGarden((s) => s.reveal);
  const garden = useGarden((s) => s.garden);
  return reveal.open ? heldBy(garden, reveal.entityId) : null;
}
