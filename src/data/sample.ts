// The ten sample memories from lethe-design-system/sample-content.md, exact words.
// Built through the engine (plant → threads derive from shared people/places) so the demo exercises real rules.

import { emptyGarden, plant, setVitality, type Garden, type Kind, type PlantInput } from '../engine';

type Sample = PlantInput & { vitality: number; layout: { x: number; y: number; size: number } };

const t = (...names: string[]) => names.map((name) => ({ name }));

export const SAMPLE: Sample[] = [
  { id: 'm1', kind: 'sentence', text: '“You don’t have to be brave all the time.”', happenedAt: '2014',
    people: t('Grandma Mei'), places: t('Hangzhou'), feelings: t('comfort'), vitality: 0.9, layout: { x: 430, y: 520, size: 160 } },
  { id: 'm2', kind: 'place', text: 'Grandma Mei’s kitchen in Hangzhou, smelling of osmanthus',
    people: t('Grandma Mei'), places: t('Hangzhou'), feelings: t('warmth'), vitality: 0.9, layout: { x: 280, y: 610, size: 170 } },
  { id: 'm3', kind: 'song', text: 'Clair de Lune, Debussy. She played it on Sundays.',
    people: t('Grandma Mei'), feelings: t('tenderness'), vitality: 0.9, layout: { x: 560, y: 720, size: 140 } },
  { id: 'm4', kind: 'photo', text: 'Leo and me on the night bus after graduation, 2022', hue: '#e8a87c', happenedAt: '2022',
    people: t('Leo'), feelings: t('joy'), vitality: 0.9, layout: { x: 1000, y: 600, size: 150 } },
  { id: 'm5', kind: 'sentence', text: '“Text me when you get home.”',
    people: t('Leo'), feelings: t('care'), vitality: 0.9, layout: { x: 1180, y: 500, size: 150 } },
  { id: 'm6', kind: 'place', text: 'Kamakura beach at dawn, with Leo',
    people: t('Leo'), places: t('Kamakura'), feelings: t('calm'), vitality: 0.45, layout: { x: 1060, y: 780, size: 160 } },
  { id: 'm7', kind: 'sentence', text: '“We’ll figure it out.” The day I failed the exam.',
    people: t('Dad'), feelings: t('reassurance'), vitality: 0.45, layout: { x: 150, y: 380, size: 130 } },
  { id: 'm8', kind: 'photo', text: 'Dad’s handwriting on a birthday card', hue: '#d9c7a8',
    people: t('Dad'), feelings: t('love'), vitality: 0.45, layout: { x: 320, y: 330, size: 120 } },
  // 9 and 10 share only a feeling, which gives the faint thread the design calls for.
  { id: 'm9', kind: 'song', text: 'Gymnopédie No. 1, Satie. My first winter in Tokyo.',
    places: t('Tokyo'), feelings: t('solitude'), vitality: 0.45, layout: { x: 1320, y: 300, size: 130 } },
  { id: 'm10', kind: 'place', text: 'The library rooftop at university',
    places: t('university'), feelings: t('solitude'), vitality: 0.1, layout: { x: 1330, y: 690, size: 140 } },
];

/** Design-canvas layout (1440 × 900, base of each flower). The scene maps this to world space. */
export const SAMPLE_LAYOUT: Record<string, { x: number; y: number; size: number }> =
  Object.fromEntries(SAMPLE.map((s) => [s.id, s.layout]));

export const DEFAULT_WHISPER = 'The library rooftop is drifting into fog. A faint thread to Satie still holds it.';

/** The ready-made demo garden: the ten memories at their designed vitality, as of garden day `now`. */
export function sampleGarden(now: number, realNow: number): Garden {
  const g = emptyGarden(realNow);
  for (const s of SAMPLE) plant(g, s, now, realNow);
  g.firstPlantingsDone = true;
  // The sample memories are the garden's past, not today's plantings: today's budget starts untouched.
  g.plantsToday = 0;
  // Set vitality only after every memory exists, so effective stability includes all threads.
  for (const s of SAMPLE) setVitality(g, s.id, s.vitality, now);
  g.light = 3;
  g.lastSeenAt = now;
  return g;
}

/** Prompts for the first plantings (screen 2). */
export const FIRST_PROMPTS: { kind: Kind; prompt: string; placeholder: string }[] = [
  { kind: 'sentence', prompt: 'A sentence someone said that you still hear.', placeholder: 'Their words, as you remember them' },
  { kind: 'place', prompt: 'A place you can still smell.', placeholder: 'Where it was, and what the air held' },
  { kind: 'song', prompt: 'A song from one particular summer.', placeholder: 'The song, and the summer' },
  { kind: 'photo', prompt: 'A photograph you would carry out of a fire.', placeholder: 'What is in the photograph' },
  { kind: 'sentence', prompt: 'Something you told yourself on a hard day.', placeholder: 'The words, as you said them' },
  { kind: 'place', prompt: 'A room you could walk through with your eyes closed.', placeholder: 'The room, and who was there' },
  { kind: 'song', prompt: 'A song that belongs to one person.', placeholder: 'The song, and who it belongs to' },
];
