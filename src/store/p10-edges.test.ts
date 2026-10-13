import { describe, expect, it } from 'vitest';
import { emptyGarden, plant } from '../engine';
import { useGarden } from './garden';
import { exportFile, forget, keep, load, markKept } from './persist';

// P10 edge and regression tests (Spark). Claude owns the implementation and checked it in
// headless Edge over CDP (see the P10 notes in docs/build-plan.md); here the contracts a
// browser-less run can pin are pinned: the no-IndexedDB fallback, the export file, the
// one-overlay rule, and letting the garden go. The Dexie round trip itself needs a browser.

// No IndexedDB here (and none in some private windows): the garden lives for the visit only.

describe('without IndexedDB the garden is visit-only', () => {
  it('load finds no kept garden', async () => {
    expect(typeof indexedDB).toBe('undefined');
    await expect(load()).resolves.toBe(null);
  });

  it('keep and forget resolve without storing anything', async () => {
    const g = emptyGarden(1_700_000_000_000);
    await expect(keep({ garden: g, layout: {}, promptIndex: 0 }, {}, 1_700_000_000_000)).resolves.toBe(undefined);
    await expect(forget()).resolves.toBe(undefined);
    expect(() => markKept([])).not.toThrow();
  });
});

describe('exportFile: the garden as one JSON file', () => {
  const realFileReader = (globalThis as { FileReader?: unknown }).FileReader;
  const constructions: string[] = [];
  const stubFileReader = (payload = 'data:image/jpeg;base64,AAA') => {
    constructions.length = 0;
    (globalThis as Record<string, unknown>).FileReader = class {
      result: string | null = null;
      error: unknown = null;
      onload: (() => void) | null = null;
      onerror: ((e: unknown) => void) | null = null;
      readAsDataURL(blob: Blob) {
        constructions.push(String((blob as Blob).size));
        this.result = payload;
        this.onload?.();
      }
    };
  };
  const restoreFileReader = () => {
    if (realFileReader === undefined) delete (globalThis as Record<string, unknown>).FileReader;
    else (globalThis as Record<string, unknown>).FileReader = realFileReader;
  };

  const REAL = 1_700_000_000_000;

  it('names the file for the local date and carries the whole garden', async () => {
    stubFileReader();
    try {
      const g = emptyGarden(REAL);
      plant(g, { id: 'a', kind: 'sentence', text: 'x', photoId: 'p1' }, 0, REAL);
      const layout = { a: { x: 1, y: 2, size: 3 } };
      const photos = { p1: { blob: new Blob(['bytes']) } };
      // 5 march 2026, midday local time: single-digit month and day exercise the padding.
      const at = new Date(2026, 2, 5, 12, 0, 0).getTime();
      const { name, blob } = await exportFile(g, layout, photos, at);
      expect(name).toBe('lethe-garden-2026-03-05.json');
      expect(blob.type).toBe('application/json');
      const body = JSON.parse(await blob.text());
      expect(body).toMatchObject({ lethe: 1, exportedAt: new Date(at).toISOString(), layout });
      expect(body.garden.memories.a).toMatchObject({ id: 'a', photoId: 'p1' });
      expect(body.photos).toEqual({ p1: 'data:image/jpeg;base64,AAA' });
      expect(constructions).toHaveLength(1);
    } finally {
      restoreFileReader();
    }
  });

  it('a photo id with no blob is left out, never read', async () => {
    stubFileReader();
    try {
      const g = emptyGarden(REAL);
      plant(g, { id: 'a', kind: 'sentence', text: 'x', photoId: 'p1' }, 0, REAL);
      const { blob } = await exportFile(g, {}, {}, REAL);
      expect(JSON.parse(await blob.text()).photos).toEqual({});
      expect(constructions).toHaveLength(0);
    } finally {
      restoreFileReader();
    }
  });
});

describe('settings: one overlay at a time', () => {
  it('opening settings closes focus, planting and the reveal', () => {
    const s = useGarden.getState();
    s.focus('m1');
    s.selectHolder('person:leo');
    s.openPlanting('field');
    expect(useGarden.getState().planting).toBe('field');
    s.openSettings();
    const after = useGarden.getState();
    expect(after.settings).toBe(true);
    expect(after.focusedId).toBe(null);
    expect(after.reveal).toEqual({ open: false, entityId: null });
    expect(after.planting).toBe('closed');
    expect(after.draft).toBe(null);
    s.closeSettings();
  });

  it('opening planting, or the reveal, closes settings', () => {
    const s = useGarden.getState();
    s.openSettings();
    expect(useGarden.getState().settings).toBe(true);
    s.openPlanting('field');
    expect(useGarden.getState().settings).toBe(false);
    s.openSettings();
    s.openReveal();
    expect(useGarden.getState().settings).toBe(false);
    s.closeReveal();
    expect(useGarden.getState().settings).toBe(false);
  });

  it('closing settings restores nothing and keeps what it never closed', () => {
    const s = useGarden.getState();
    s.focus('m1');
    useGarden.setState({ whisperOverride: 'A season passes.' });
    s.openSettings();
    expect(useGarden.getState().focusedId).toBe(null);
    s.closeSettings();
    const after = useGarden.getState();
    expect(after.settings).toBe(false);
    expect(after.focusedId).toBe(null);
    expect(after.whisperOverride).toBe('A season passes.');
    expect(Object.keys(after.garden.memories)).toHaveLength(10);
    s.focus(null);
    useGarden.setState({ whisperOverride: null });
  });
});

describe('letGardenGo and enterOwn', () => {
  it('letting go empties the browser garden and returns to the threshold', async () => {
    const s = useGarden.getState();
    const id = await s.plantMemory('sentence', 'a sentence to let go of');
    expect(id).not.toBe(null);
    useGarden.setState({
      owner: 'own', settings: true, promptIndex: 2,
      photos: { p1: { blob: new Blob(['x']), url: 'blob:nodedata:fake' } },
    });
    await s.letGardenGo();
    const after = useGarden.getState();
    expect(after.phase).toBe('threshold');
    expect(after.owner).toBe('demo');
    expect(after.promptIndex).toBe(0);
    expect(Object.keys(after.garden.memories)).toEqual([]);
    expect(after.positions).toEqual({});
    expect(after.photos).toEqual({});
    expect(after.settings).toBe(false);
    expect(after.reveal).toEqual({ open: false, entityId: null });
    expect(after.planting).toBe('closed');
    expect(after.whisperOverride).toBe(null);
    expect(after.garden.light).toBe(5);
  });

  it('entering with no kept garden begins the first plantings', async () => {
    await useGarden.getState().letGardenGo();
    await useGarden.getState().enterOwn();
    const s = useGarden.getState();
    expect(s.phase).toBe('first');
    expect(s.promptIndex).toBe(0);
    expect(s.owner).toBe('own');
    expect(Object.keys(s.garden.memories)).toEqual([]);
  });
});
