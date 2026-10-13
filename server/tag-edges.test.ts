import { afterEach, describe, expect, it, vi } from 'vitest';
import { GROQ_MODEL, groqRequestBody, handleTag, replyHeaders } from './tag';

// Edge contract for /api/tag (see server/tag.test.ts for the happy paths).
// What P12 checks in production: 503 with no key, 400 on bad input, 502/504 on provider failure.

const REQ = { kind: 'sentence', text: 'Osmanthus tea with Grandma Mei in Hangzhou', known: [] };
const G = { GROQ_API_KEY: 'g' };

const stubFetch = (impl: (...args: never[]) => Promise<Response>) => {
  const f = vi.fn(impl);
  vi.stubGlobal('fetch', f);
  return f;
};

describe('failure contract', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('503 with no key: null provider, no tagger header, nothing stored', async () => {
    const f = stubFetch(async () => new Response('{}', { status: 200 }));
    const r = await handleTag(REQ, {});
    expect(r).toMatchObject({ status: 503, provider: null, json: { error: 'tagging unavailable' } });
    expect(f).not.toHaveBeenCalled();
    const h = replyHeaders(r);
    expect(h['x-lethe-tagger']).toBeUndefined();
    expect(h['cache-control']).toBe('no-store');
    expect(h['content-type']).toBe('application/json');
  });

  it.each([
    ['empty body', {}],
    ['missing text', { kind: 'sentence', known: [] }],
    ['empty text', { kind: 'sentence', text: '', known: [] }],
    ['text over 400 chars', { kind: 'sentence', text: 'x'.repeat(401), known: [] }],
    ['bad kind', { kind: 'poem', text: 'x', known: [] }],
    ['too much known', { kind: 'sentence', text: 'x', known: Array.from({ length: 301 }, (_, i) => ({ id: `p${i}`, kind: 'person', name: `P${i}` })) }],
  ])('400 on %s, provider null, network untouched', async (_label, body) => {
    const f = stubFetch(async () => new Response('{}', { status: 200 }));
    const r = await handleTag(body, G);
    expect(r.status).toBe(400);
    expect(r.provider).toBeNull();
    expect(f).not.toHaveBeenCalled();
  });

  it('a blank groq key behaves like no key', async () => {
    const f = stubFetch(async () => new Response('{}', { status: 200 }));
    const r = await handleTag(REQ, { GROQ_API_KEY: '   ' });
    expect(r.status).toBe(503);
    expect(f).not.toHaveBeenCalled();
  });

  it('groq 500 → 502, still tagged as groq', async () => {
    stubFetch(async () => new Response('{}', { status: 500 }));
    const r = await handleTag(REQ, G);
    expect(r).toMatchObject({ status: 502, provider: 'groq' });
    expect(replyHeaders(r)['x-lethe-tagger']).toBe('groq');
  });

  it('groq empty reply → 502, the browser tags offline', async () => {
    stubFetch(async () => new Response(JSON.stringify({ choices: [] }), { status: 200 }));
    expect((await handleTag(REQ, G)).status).toBe(502);
  });

  it('429 without retry-after → 429 with no retry header', async () => {
    stubFetch(async () => new Response('{}', { status: 429 }));
    const r = await handleTag(REQ, G);
    expect(r.status).toBe(429);
    expect(replyHeaders(r)['retry-after']).toBeUndefined();
  });

  it('a timed-out provider → 504', async () => {
    stubFetch(async () => { throw Object.assign(new Error('slow'), { name: 'TimeoutError' }); });
    const r = await handleTag(REQ, G);
    expect(r).toMatchObject({ status: 504, provider: 'groq' });
  });
});

describe('request body', () => {
  it('carries the system prompt, the memory text, and low, cool settings', () => {
    const body = groqRequestBody(REQ as never);
    expect(body.model).toBe(GROQ_MODEL);
    expect(body.messages).toHaveLength(2);
    expect(body.messages[0].role).toBe('system');
    expect(body.messages[1].content).toContain(REQ.text);
    expect(body).toMatchObject({ temperature: 0, reasoning_effort: 'low', max_completion_tokens: 1024 });
  });
});
