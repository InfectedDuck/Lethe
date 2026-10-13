import { defineConfig } from 'vitest/config';

// The offline tagger's tests load the compromise NLP library cold (~3–4s on a busy laptop), which can push the first
// test in a file past vitest's 5s default. Give every test room for that one-time load; nothing else is slow.
export default defineConfig({
  test: { testTimeout: 15_000 },
});
