// Tagging: reads one memory and returns its people, places and feelings, reusing known entities.
// Runs server-side only (Vercel function in /api/tag.ts, Vite dev middleware in vite.config.ts) so the key never reaches the browser.
// Privacy: the text is sent for tagging and not stored anywhere by us.

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
export const Tags = z.object({
  people: z.array(Named),
  places: z.array(Named),
  feelings: z.array(z.string()).describe('One or two single lowercase words, e.g. "comfort", "solitude".'),
});
export type Tags = z.infer<typeof Tags>;

const SYSTEM = `You tag personal memories for a quiet garden app. Extract only what the memory states or clearly implies.
- people: specific people (named, or by relation like "Dad", "my sister"). Not "me"/"I". Not generic groups.
- places: specific places (cities, buildings, rooms that belong to someone like "her kitchen" -> name it with its owner if known).
- feelings: at most two single lowercase words for the memory's emotional tone.
If a person or place matches a known entity (same person under another name: "Mom" = "my mother"; "her kitchen" when Grandma Mei is the subject is still a place, not Grandma Mei), return that entity's id. Otherwise id is null.
For songs, the artist is not a person in the person's life; do not tag the artist.`;

const client = new Anthropic(); // reads ANTHROPIC_API_KEY

export async function tagMemory(req: TagRequest): Promise<Tags> {
  const known = req.known.map((e) => `${e.id}\t${e.kind}\t${e.name}`).join('\n') || '(none yet)';
  const response = await client.messages.parse({
    model: 'claude-opus-5-5',
    max_tokens: 1024,
    output_config: { effort: 'low', format: zodOutputFormat(Tags) },
    system: SYSTEM,
    messages: [{
      role: 'user',
      content: `Known entities (id, kind, name):\n${known}\n\nMemory (${req.kind}):\n${req.text}`,
    }],
  });
  // A refusal or unparsable answer just means "no tags": the person can still draw threads by hand.
  if (response.stop_reason === 'refusal' || !response.parsed_output) return { people: [], places: [], feelings: [] };
  return response.parsed_output;
}

/** Shared HTTP handling for both the dev middleware and the deployed function. */
export async function handleTag(body: unknown): Promise<{ status: number; json: unknown }> {
  const parsed = TagRequest.safeParse(body);
  if (!parsed.success) return { status: 400, json: { error: 'bad request' } };
  if (!process.env.ANTHROPIC_API_KEY) return { status: 503, json: { error: 'tagging unavailable' } };
  try {
    return { status: 200, json: await tagMemory(parsed.data) };
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return { status: 429, json: { error: 'busy' } };
    if (err instanceof Anthropic.APIError) return { status: 502, json: { error: 'tagging failed' } };
    throw err;
  }
}
