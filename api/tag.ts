// Vercel serverless function: POST /api/tag. Set ANTHROPIC_API_KEY in the Vercel project settings.
// Explicit .js: Vercel runs this file as a native Node ES module, which needs extensions.
import { handleTag } from '../server/tag.js';

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: 'bad request' }, { status: 400 }); }
  const { status, json } = await handleTag(body);
  return Response.json(json, { status });
}
