import { afterEach, describe, expect, it, vi } from 'vitest';
import { GROQ_MODEL, groqRequestBody, handleTag, pickProvider, replyHeaders } from './tag';

const REQ = { kind: 'sentence', text: 'Osmanthus tea with Grandma Mei in Hangzhou', known: [{ id: 'person:grandma-mei', kind: 'person', name: 'Grandma Mei' }] };

describe('provider choice', () => {
  it.each([
    [{}, null],
    [{ GROQ_API_KEY: 'g' }, 'groq'],
    [{ ANTHROPIC_API_KEY: 'a' }, 'claude'],
    [{ ANTHROPIC_API_KEY: 'a', GROQ_API_KEY: 'g' }, 'claude'],
    [{ ANTHROPIC_API_KEY: '  ', GROQ_API_KEY: 'g' }, 'groq'],
    [{ ANTHROPIC_API_KEY: '', GROQ_API_KEY: '' }, null],
  ] as const)('%j → %s', (env, provider) => {
    expect(pickProvider(env)).toBe(provider);
  });

  it('answers 503 with no key, without touching the network', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const r = await handleTag(REQ, {});
    expect(r.status).toBe(503);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('answers 400 to a malformed request', async () => {
    expect((await handleTag({ kind: 'poem', text: '' }, { GROQ_API_KEY: 'g' })).status).toBe(400);
  });
});

describe('Groq provider', () => {
  afterEach(() => vi.unstubAllGlobals());

  const reply = (status: number, content?: unknown, headers: Record<string, string> = {}) =>
    vi.fn(async () => new Response(
      JSON.stringify(content === undefined ? { error: 'x' } : { choices: [{ message: { content: typeof content === 'string' ? content : JSON.stringify(content) } }] }),
      { status, headers }));

  it('asks for strict JSON in the shared shape and returns validated tags', async () => {
    const tags = { people: [{ name: 'Grandma Mei', id: 'person:grandma-mei' }], places: [{ name: 'Hangzhou', id: null }], feelings: ['comfort'] };
    const f = reply(200, tags);
    vi.stubGlobal('fetch', f);
    const r = await handleTag(REQ, { GROQ_API_KEY: 'g' });
    expect(r).toMatchObject({ status: 200, provider: 'groq', json: tags });
    expect(replyHeaders(r)['x-lethe-tagger']).toBe('groq');
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.groq.com/openai/v1/chat/completions');
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer g');
    const body = JSON.parse(String(init.body));
    expect(body.model).toBe(GROQ_MODEL);
    expect(body.response_format.json_schema.strict).toBe(true);
  });

  it('passes a rate limit on as 429 with retry-after', async () => {
    vi.stubGlobal('fetch', reply(429, undefined, { 'retry-after': '42' }));
    const r = await handleTag(REQ, { GROQ_API_KEY: 'g' });
    expect(r.status).toBe(429);
    expect(replyHeaders(r)['retry-after']).toBe('42');
  });

  it('rejects a reply that does not match the shape (502, the browser tags offline)', async () => {
    vi.stubGlobal('fetch', reply(200, { people: 'Grandma Mei' }));
    expect((await handleTag(REQ, { GROQ_API_KEY: 'g' })).status).toBe(502);
    vi.stubGlobal('fetch', reply(200, 'not json'));
    expect((await handleTag(REQ, { GROQ_API_KEY: 'g' })).status).toBe(502);
  });

  it('keeps the strict schema Groq requires: every field required, objects closed', () => {
    const schema = groqRequestBody(REQ as never).response_format.json_schema.schema;
    expect(schema.required).toEqual(['people', 'places', 'feelings']);
    expect(schema.additionalProperties).toBe(false);
    expect(schema.properties.people.items.required).toEqual(['name', 'id']);
    expect(schema.properties.people.items.properties.id.type).toEqual(['string', 'null']);
  });
});
