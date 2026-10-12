import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin } from 'vite';

/** Serves POST /api/tag in dev with the same handler the deployed Vercel function uses. */
function tagApi(): Plugin {
  return {
    name: 'lethe-tag-api',
    configureServer(server) {
      server.middlewares.use('/api/tag', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return; }
        let raw = '';
        for await (const chunk of req) raw += chunk;
        let body: unknown = null;
        try { body = JSON.parse(raw); } catch { /* handled as bad request */ }
        const { handleTag } = await server.ssrLoadModule('/server/tag.ts') as typeof import('./server/tag');
        const { status, json } = await handleTag(body);
        res.statusCode = status;
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify(json));
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Load ANTHROPIC_API_KEY from .env for the dev server only. Never exposed to the client (no VITE_ prefix).
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''));
  return { plugins: [react(), tagApi()] };
});
