// A 90-second film of real episode actions. No forced loss, network dependency, or automatic resurrection.
import { CLOSING_LINES, EPISODE_INTRO } from '../data/episode';
import { holders } from '../engine';
import { useGarden } from '../store/garden';
import { presentationClock } from '../store/presentationClock';
import { sceneReady } from '../store/sceneReady';

export const STORY_LINES = {
  flowers: 'every flower is a fragment of a life: words, songs, places, photographs.',
  rule: 'memories that share someone or somewhere hold each other up.',
  rooftop: 'the library rooftop. a place remembered on its own.',
  plant: 'a new memory finds what it shares.',
  joins: 'it grows into what holds it.',
  tend: 'one light remains. to tend one memory is to choose it.',
  away: 'three weeks pass in this garden.',
  shape: CLOSING_LINES[0],
  holds: CLOSING_LINES[1],
} as const;

let run: AbortController | null = null;
export const storyRunning = () => run !== null;

export function waitForPresentation(ms: number, signal: AbortSignal): Promise<void> {
  const until = presentationClock.now() + ms;
  return new Promise((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout>;
    const clean = () => { clearTimeout(timer); signal.removeEventListener('abort', abort); };
    const abort = () => { clean(); reject(signal.reason); };
    const poll = () => {
      if (signal.aborted) { abort(); return; }
      if (presentationClock.now() >= until) { clean(); resolve(); return; }
      timer = setTimeout(poll, 50);
    };
    signal.addEventListener('abort', abort, { once: true });
    poll();
  });
}

/**
 * Entry is always a user gesture. From the threshold the episode is already prepared (it grows in as the threshold
 * fades), so it is only opened; anywhere else the film begins a fresh episode.
 */
export function startStory({ prepared = false }: { prepared?: boolean } = {}) {
  stopStory();
  const ctrl = (run = new AbortController());
  const s = useGarden.getState;
  if (prepared && s().episode?.mode === 'film') s().openEpisode(); else s().beginEpisode('film');
  const generation = s().generation;
  s().setStory({ running: true, line: EPISODE_INTRO });
  const signal = ctrl.signal;
  const line = (text: string | null) => s().setStory({ line: text });
  const interrupt = (event: Event) => {
    if (event.type === 'pointerdown' && event.target instanceof Element && event.target.closest('.story-entry')) return;
    stopStory();
  };
  addEventListener('pointerdown', interrupt, true);
  addEventListener('keydown', interrupt, true);
  addEventListener('wheel', interrupt, { capture: true, passive: true });
  const unsubscribe = useGarden.subscribe((state) => {
    if (state.generation !== generation || !state.story.running) ctrl.abort();
  });
  signal.addEventListener('abort', () => {
    removeEventListener('pointerdown', interrupt, true);
    removeEventListener('keydown', interrupt, true);
    removeEventListener('wheel', interrupt, true);
    unsubscribe();
    if (run === ctrl) run = null;
  }, { once: true });

  const play = async () => {
    await Promise.race([sceneReady, waitForPresentation(4000, signal)]);
    if (signal.aborted) return;
    const started = presentationClock.now();
    const at = (seconds: number) => waitForPresentation(Math.max(0, started + seconds * 1000 - presentationClock.now()), signal);
    line(STORY_LINES.flowers);
    await at(8); s().focus('m1'); line(STORY_LINES.rule);
    await at(17); s().focus('m10'); line(STORY_LINES.rooftop);
    await at(23); s().focus(null); s().selectEpisodeChoice('tea'); line(STORY_LINES.plant);
    await at(32); await s().plantDraft(); line(STORY_LINES.joins);
    await at(39); s().focus('m1'); line(STORY_LINES.tend);
    await at(42); s().tendMemory('m1');
    await at(49); s().focus(null); line(STORY_LINES.away);
    await at(53); s().focus('m10'); s().advanceEpisode(); line(null);
    await at(61); s().setPresentation({ headId: null, quiet: true });
    await at(66); s().focus(null); s().finishEpisode(); s().setPresentation({ quiet: false });
    await at(70); s().setPresentation({ holderId: strongestHolder() });
    await at(80); line(STORY_LINES.shape);
    await at(85); line(STORY_LINES.holds);
    await at(90);
    if (s().generation !== generation || signal.aborted) return;
    s().setStory({ running: false, line: null });
    s().setPresentation({ line: CLOSING_LINES[1], quiet: false });
    s().finishEpisode();
    ctrl.abort();
  };
  void play().catch(() => { /* cancellation hands back the live episode */ });
}

/** The person or place that holds the most of what remains: the group the closing composition lights. */
function strongestHolder(): string | null {
  const s = useGarden.getState();
  return holders(s.garden, s.now())[0]?.entityId ?? null;
}

export function stopStory() {
  const ctrl = run;
  if (!ctrl) return;
  run = null;
  ctrl.abort();
  const s = useGarden.getState();
  s.stopPresentation();
  s.closePlanting();
  s.hover(null);
  s.focus(null);
}
