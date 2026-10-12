// Tagging: reads one memory and returns its people, places and feelings, reusing known entities.
// Runs server-side only (Vercel function in /api/tag.ts, Vite dev middleware in vite.config.ts), so keys never
// reach the browser. The provider follows which key is set:
//   ANTHROPIC_API_KEY → Claude (claude-haiku-5-5)   ·   else GROQ_API_KEY → Groq (openai/gpt-oss-20b)
//   neither → 503, and the browser's offline tagger does the work.
// Privacy: only the memory text and the names of known entities are sent, and nothing is stored.

import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';

export const TagRequest = z.object({
  kind: z.enum(['sentence', 'photo', 'song', 'place']),
  text: z.string().min(1).max(400),
  known: z.array(z.object({ id: z.string(), kind: z.enum(['person', 'place', 'feeling']), name: z.string() })).max(300),
});
export type TagRequest = z.infer<typeof TagRequest>;

const Named = z.object({
  name: z.string().describe('As written in the memory, e.g. "Grandma Mei", "Hangzhou".'),
  id: z.string().nullable().describe('Id of the matching known entity, or null if new.'),
});
/** The one response shape, whichever provider answers. Both providers' output is validated against it. */
export const Tags = z.object({
  people: z.array(Named),
  places: z.array(Named),
  feelings: z.array(z.string()).describe('One or two single lowercase words, e.g. "comfort", "solitude".'),
});
export type Tags = z.infer<typeof Tags>;

export type Provider = 'claude' | 'groq';
export type Env = Partial<Record<'ANTHROPIC_API_KEY' | 'GROQ_API_KEY', string>>;

/** Claude if its key is set, otherwise Groq if its key is set, otherwise none. */
export function pickProvider(env: Env): Provider | null {
  if (env.ANTHROPIC_API_KEY?.trim()) return 'claude';
  if (env.GROQ_API_KEY?.trim()) return 'groq';
  return null;
}

export const CLAUDE_MODEL = 'claude-haiku-5-5';
export const GROQ_MODEL = 'openai/gpt-oss-20b';
/** Server-side ceiling; the browser gives up sooner and uses the offline tagger anyway. */
const TIMEOUT_MS = 8000;

const SYSTEM = `You tag personal memories for a quiet garden app. Extract only what the memory states or clearly implies.
- people: specific people (named, or by relation like "Dad", "my sister"). Not "me"/"I". Not generic groups.
- places: specific places (cities, buildings, rooms that belong to someone like "her kitchen" -> name it with its owner if known).
- feelings: at most two single lowercase words for the memory's emotional tone.
If a person or place matches a known entity (same person under another name: "Mom" = "my mother"; "her kitchen" when Grandma Mei is the subject is still a place, not Grandma Mei), return that entity's id. Otherwise id is null.
For songs, the artist is not a person in the person's life; do not tag the artist.`;

function userMessage(req: TagRequest): string {
  const known = req.known.map((e) => `${e.id}\t${e.kind}\t${e.name}`).join('\n') || '(none yet)';
  return `Known entities (id, kind, name):\n${known}\n\nMemory (${req.kind}):\n${req.text}`;
}

/** Thrown for a provider's rate limit, so the browser can back off. */
export class RateLimited extends Error {
  constructor(readonly retryAfterSeconds?: number) { super('rate limited'); }
}

const NO_TAGS: Tags = { people: [], places: [], feelings: [] };

/* ---------- Claude ---------- */

async function tagWithClaude(req: TagRequest, apiKey: string): Promise<Tags> {
  const client = new Anthropic({ apiKey, timeout: TIMEOUT_MS, maxRetries: 0 });
  try {
    const response = await client.messages.parse({
      model: CLAUDE_MODEL,
      max_tokens: 2048,
      output_config: { effort: 'low', format: zodOutputFormat(Tags) },
      system: SYSTEM,
      messages: [{ role: 'user', content: userMessage(req) }],
    });
    // A refusal or unparsable answer just means "no tags": the person can still draw threads by hand.
    if (response.stop_reason === 'refusal' || !response.parsed_output) return NO_TAGS;
    return Tags.parse(response.parsed_output);
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      throw new RateLimited(Number(err.headers?.get?.('retry-after')) || undefined);
    }
    throw err;
  }
}

/* ---------- Groq (OpenAI-compatible chat completions) ---------- */

/** Strict JSON schema for Groq: every property required, objects closed, nullable via a type union. */
const GROQ_SCHEMA = (() => {
  const named = {
    type: 'object', additionalProperties: false, required: ['name', 'id'],
    properties: { name: { type: 'string' }, id: { type: ['string', 'null'] } },
  };
  return {
    type: 'object', additionalProperties: false, required: ['people', 'places', 'feelings'],
    properties: {
      people: { type: 'array', items: named },
      places: { type: 'array', items: named },
      feelings: { type: 'array', items: { type: 'string' } },
    },
  };
})();

export function groqRequestBody(req: TagRequest) {
  return {
    model: GROQ_MODEL,
    messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: userMessage(req) }],
    response_format: { type: 'json_schema', json_schema: { name: 'memory_tags', strict: true, schema: GROQ_SCHEMA } },
    reasoning_effort: 'low',
    temperature: 0,
    max_completion_tokens: 1024,
  };
}

async function tagWithGroq(req: TagRequest, apiKey: string): Promise<Tags> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify(groqRequestBody(req)),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (res.status === 429) throw new RateLimited(Number(res.headers.get('retry-after')) || undefined);
  if (!res.ok) throw new Error(`groq ${res.status}`);
  const body = await res.json() as { choices?: { message?: { content?: string } }[] };
  const content = body.choices?.[0]?.message?.content;
  if (!content) throw new Error('groq: empty reply');
  return Tags.parse(JSON.parse(content));
}

/* ---------- HTTP ---------- */

export type TagReply = { status: number; json: unknown; provider: Provider | null; retryAfter?: number };

/** Shared by the dev middleware and the deployed function. `env` is injectable for tests. */
export async function handleTag(body: unknown, env: Env = process.env): Promise<TagReply> {
  const parsed = TagRequest.safeParse(body);
  if (!parsed.success) return { status: 400, json: { error: 'bad request' }, provider: null };
  const provider = pickProvider(env);
  if (!provider) return { status: 503, json: { error: 'tagging unavailable' }, provider: null };
  try {
    const tags = provider === 'claude'
      ? await tagWithClaude(parsed.data, env.ANTHROPIC_API_KEY!.trim())
      : await tagWithGroq(parsed.data, env.GROQ_API_KEY!.trim());
    return { status: 200, json: tags, provider };
  } catch (err) {
    if (err instanceof RateLimited) return { status: 429, json: { error: 'busy' }, provider, retryAfter: err.retryAfterSeconds };
    const timedOut = (err as Error).name === 'TimeoutError' || err instanceof Anthropic.APIConnectionTimeoutError;
    if (timedOut) return { status: 504, json: { error: 'slow' }, provider };
    // Invalid JSON, schema mismatch or any other provider error: the browser falls back to offline tags.
    return { status: 502, json: { error: 'tagging failed' }, provider };
  }
}

/** Headers for a reply: which provider answered (for checking the live site), and when to retry after a 429. */
export function replyHeaders(r: TagReply): Record<string, string> {
  const h: Record<string, string> = { 'content-type': 'application/json', 'cache-control': 'no-store' };
  if (r.provider) h['x-lethe-tagger'] = r.provider;
  if (r.retryAfter) h['retry-after'] = String(r.retryAfter);
  return h;
}
