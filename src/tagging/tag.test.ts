import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { emptyGarden } from '../engine';
import { API_TIMEOUT_MS, apiTag, COOLDOWN_MS, resetTaggingPolicy, tag, taggingPolicy } from './tag';

const g = emptyGarden(0);
const TEXT = 'Kamakura beach at dawn, with Leo';
const OK_BODY = { people: [{ name: 'Leo', id: null }], places: [{ name: 'Kamakura', id: null }], feelings: ['calm'] };

const respond = (status: number, body: unknown = { error: 'x' }, headers: Record<string, string> = {}) =>
  vi.fn(async () => new Response(JSON.stringify(body), { status, headers }));

beforeEach(() => { resetTaggingPolicy(); vi.useFakeTimers(); vi.setSystemTime(0); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('tagging client: which tagger answers', () => {
  it('uses the provider’s tags and names it', async () => {
    vi.stubGlobal('fetch', respond(200, OK_BODY, { 'x-lethe-tagger': 'groq' }));
    const t = await tag(g, 'place', TEXT);
    expect(t.source).toBe('groq');
    expect(t.places).toEqual([{ name: 'Kamakura', id: undefined }]);
  });

  it('falls back to the offline tagger on a server error, and tries again next time', async () => {
    const f = respond(502);
    vi.stubGlobal('fetch', f);
    const t = await tag(g, 'place', TEXT);
    expect(t.source).toBe('offline');
    expect(t.people.map((p) => p.name)).toEqual(['Leo']);
    await tag(g, 'place', TEXT);
    expect(f).toHaveBeenCalledTimes(2);
  });

  it('rejects a reply in the wrong shape', async () => {
    vi.stubGlobal('fetch', respond(200, { people: 'Leo' }));
    expect(await apiTag(g, 'place', TEXT)).toBeNull();
  });
});

describe('tagging client: backing off', () => {
  it('503 (no key): stops calling the API for the rest of the session', async () => {
    const f = respond(503);
    vi.stubGlobal('fetch', f);
    expect((await tag(g, 'place', TEXT)).source).toBe('offline');
    for (let i = 0; i < 5; i++) await tag(g, 'place', TEXT);
    expect(f).toHaveBeenCalledTimes(1);
    expect(taggingPolicy().off).toBe(true);
  });

  it('429 (free-tier limit): offline for a few minutes, then tries the API again', async () => {
    const f = respond(429);
    vi.stubGlobal('fetch', f);
    await tag(g, 'place', TEXT);
    vi.setSystemTime(COOLDOWN_MS - 1000);
    await tag(g, 'place', TEXT);
    expect(f).toHaveBeenCalledTimes(1);
    vi.setSystemTime(COOLDOWN_MS + 1);
    await tag(g, 'place', TEXT);
    expect(f).toHaveBeenCalledTimes(2);
  });

  it('429 honours a longer retry-after from the server', async () => {
    vi.stubGlobal('fetch', respond(429, {}, { 'retry-after': '600' }));
    await tag(g, 'place', TEXT);
    expect(taggingPolicy().cooldownUntil).toBe(600_000);
  });

  it('a slow reply falls back to the offline tagger after the timeout', async () => {
    vi.stubGlobal('fetch', vi.fn((_url: string, init: RequestInit) => new Promise<Response>((_, reject) => {
      init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
    })));
    const pending = apiTag(g, 'place', TEXT);
    await vi.advanceTimersByTimeAsync(API_TIMEOUT_MS + 10);
    expect(await pending).toBeNull();
  });

  it('a network error falls back to the offline tagger', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    expect((await tag(g, 'place', TEXT)).source).toBe('offline');
  });
});
