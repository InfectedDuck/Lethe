// Vercel serverless function: POST /api/tag. The provider follows which key is set in the Vercel project
// (ANTHROPIC_API_KEY → Claude, else GROQ_API_KEY → Groq, else 503 and the browser tags offline). See server/tag.ts.
// Explicit .js: Vercel runs this file as a native Node ES module, which needs extensions.
import { handleTag, replyHeaders } from '../server/tag.js';

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try { body = await request.json(); } catch { body = null; }
  const reply = await handleTag(body);
  return new Response(JSON.stringify(reply.json), { status: reply.status, headers: replyHeaders(reply) });
}
