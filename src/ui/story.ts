// "watch a season" (D20): the demo garden plays its own story in about 85 seconds, so a stranger sees the idea
// rather than hears it. Nothing here is new machinery: each beat calls the store's actions as a person would
// (hover, tend, plant, two days away, return, the reveal), and the garden says one line beneath it. The lines
// carry the first pillar: forgetting is dusk, and it is how a garden keeps what matters.
// Any click or key stops it and leaves a live garden behind.

import { useGarden } from '../store/garden';

/** The story's lines, in the garden's voice: sentence case, no exclamations, nothing counted. */
export const STORY_LINES = {
  flowers: 'Every flower is a memory: something said, a song, a place, a photograph.',
  rule: 'Memories that share someone or somewhere hold each other up.',
  tend: 'Light is scarce. To tend one memory is to choose it.',
  plant: 'A new memory finds what it shares.',
  joins: 'It grows into what holds it.',
  away: 'Now the garden is left alone for two days.',
  shape: 'A garden that kept everything would have no shape. Forgetting is how it keeps what matters.',
  returned: 'Nothing is gone for good. What is let go can be returned to.',
  holds: 'What remains shows what holds a life together.',
} as const;

/** The memory the story writes: it names Grandma Mei and Hangzhou, so it joins her memories. */
const PLANTED = 'Tea with Grandma Mei in Hangzhou.';
const TYPE_MS = 55;
/** How long the last line stays before the garden speaks for itself again. */
const LAST_LINE_MS = 9000;

let run: AbortController | null = null;

const wait = (ms: number, signal: AbortSignal) => new Promise<void>((resolve, reject) => {
  if (signal.aborted) { reject(signal.reason); return; }
  const t = setTimeout(resolve, ms);
  signal.addEventListener('abort', () => { clearTimeout(t); reject(signal.reason); }, { once: true });
});

export const storyRunning = () => run !== null;

/** Begin the story on the demo garden, from its first day. */
export function startStory() {
  stopStory();
  const ctrl = (run = new AbortController());
  const s = useGarden.getState;
  const line = (l: string | null) => s().setStory({ line: l });
  s().seeDemo();
  s().setStory({ running: true, line: null });
  // A click anywhere (except the story's own word, which stops it itself) or any key hands the garden back.
  const interrupt = (e: Event) => { if (!(e.target instanceof Element && e.target.closest('.story-entry'))) stopStory(); };
  addEventListener('pointerdown', interrupt, true);
  addEventListener('keydown', interrupt, true);
  ctrl.signal.addEventListener('abort', () => {
    removeEventListener('pointerdown', interrupt, true);
    removeEventListener('keydown', interrupt, true);
  }, { once: true });

  const play = async (signal: AbortSignal) => {
    const w = (ms: number) => wait(ms, signal);
    // The first line at once, so the garden opens on the story rather than on its usual whisper.
    line(STORY_LINES.flowers); await w(6500);

    // Connection: a memory and what holds it.
    s().hover('m1'); line(STORY_LINES.rule); await w(6500);
    s().hover(null);

    // Choice: tending spends scarce light, and the light runs to its neighbours.
    s().focus('m1'); await w(1800);
    s().tendMemory('m1'); line(STORY_LINES.tend); await w(5500);
    s().focus(null); await w(1200);

    // A new memory finds its threads while it is written, then grows into them.
    s().openPlanting('field', 'sentence'); line(STORY_LINES.plant); await w(900);
    for (let i = 1; i <= PLANTED.length; i++) { s().setDraftText(PLANTED.slice(0, i)); await w(TYPE_MS); }
    await w(2600);
    await s().plantDraft(); line(STORY_LINES.joins); await w(5000);

    // Forgetting: two days away, played back as dusk; the garden says for itself what happened. The camera goes
    // straight to the library rooftop, which nothing holds, so its dissolve is seen up close.
    line(STORY_LINES.away); await w(3800);
    line(null); s().setDebugOffset(14); s().arrive(); await w(300);
    s().focus('m10'); await w(7200);

    // Then the whole garden at dusk: what was held still glows. That is the point of forgetting.
    s().focus(null); line(STORY_LINES.shape); await w(8500);

    // And the seed: nothing is gone for good.
    s().focus('m10'); await w(1800);
    s().returnToMemory('m10'); line(STORY_LINES.returned); await w(5500);
    s().focus(null); await w(900);

    // What holds you.
    s().openReveal(); line(STORY_LINES.holds); await w(LAST_LINE_MS);
  };

  void play(ctrl.signal)
    .then(() => finish(ctrl))
    .catch(() => { /* stopped */ });
}

/** The story has played to its end: hand the garden back quietly, leaving the reveal open. */
function finish(ctrl: AbortController) {
  if (run !== ctrl) return;
  run = null;
  ctrl.abort();
  useGarden.getState().setStory({ running: false, line: null });
}

/** Stop wherever it is: whatever the story left open (the planting field, a hover) is put down. */
export function stopStory() {
  if (!run) return;
  const ctrl = run;
  run = null;
  ctrl.abort();
  const s = useGarden.getState();
  if (s.planting !== 'closed') s.closePlanting();
  s.hover(null);
  s.setStory({ running: false, line: null });
}
