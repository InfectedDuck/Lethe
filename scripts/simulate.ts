// Tuning sandbox: 30 memories over 60 garden days with a simple player.
// Run: npm run sim            (attentive player, visits daily)
//      npm run sim -- lazy    (visits every 3rd real day)
//      npm run sim -- none    (never tends)
// Edit src/engine/constants.ts and re-run until the table "feels" right (see docs/systems.md § Tuning targets).

import {
  C, emptyGarden, plant, tend, viewAll, visit, type Garden, type MemoryState,
} from '../src/engine';

const mode = process.argv[2] ?? 'daily';
const REAL0 = 0;
const DAY = C.MS_PER_REAL_DAY;
const PEOPLE = ['Mei', 'Leo', 'Dad', 'Ana', 'Sam', 'Mira'];
const PLACES = ['Hangzhou', 'Tokyo', 'Kamakura', 'home', 'school'];
const FEELINGS = ['joy', 'calm', 'solitude', 'love'];

// Deterministic pseudo-random so runs are comparable.
let seed = 42;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const pick = <T,>(xs: T[], p: number) => xs.filter(() => rnd() < p).map((name) => ({ name: String(name) }));

const g: Garden = emptyGarden(REAL0);
// 7 first plantings on day 0, then ~1 per real day until 30.
let planted = 0;
const plantOne = (now: number, real: number) => {
  plant(g, {
    id: `m${++planted}`, kind: (['sentence', 'photo', 'song', 'place'] as const)[planted % 4], text: `memory ${planted}`,
    people: pick(PEOPLE, 0.22), places: pick(PLACES, 0.18), feelings: pick(FEELINGS, 0.25),
  }, now, real);
};
for (let i = 0; i < 7; i++) plantOne(0, REAL0);

const visitEvery = mode === 'lazy' ? 3 : 1;
const rows: string[] = [];
const realDays = Math.ceil(60 / C.GARDEN_DAYS_PER_REAL_DAY);

for (let d = 1; d <= realDays; d++) {
  const real = REAL0 + d * DAY;
  const now = d * C.GARDEN_DAYS_PER_REAL_DAY;
  if (d % visitEvery !== 0 && mode !== 'none') continue;
  const s = visit(g, now, real);
  if (planted < 30) for (let k = 0; k < (mode === 'lazy' ? 3 : 2) && planted < 30; k++) plantOne(now, real);

  if (mode !== 'none') {
    // Player heuristic: tend the faintest non-lost memory with the most threads, while light lasts.
    while (g.light >= C.TEND_COST) {
      const v = viewAll(g, now);
      const deg = (id: string) => g.threads.filter((t) => t.a === id || t.b === id).length;
      const target = Object.values(v).filter((x) => x.state !== 'lost')
        .sort((a, b) => (a.vitality - deg(a.id) * 0.05) - (b.vitality - deg(b.id) * 0.05))[0];
      if (!target) break;
      tend(g, target.id, now);
    }
  }

  const v = viewAll(g, now);
  const count = (st: MemoryState) => Object.values(v).filter((x) => x.state === st).length;
  rows.push([
    `day ${String(d).padStart(2)}`, `g${String(now).padStart(3)}`,
    `vivid ${count('vivid')}`.padEnd(9), `fading ${count('fading')}`.padEnd(10),
    `ghost ${count('ghost')}`.padEnd(9), `lost ${count('lost')}`.padEnd(8),
    `threads ${g.threads.length}`.padEnd(11), `light ${g.light}`,
    s.lost.length ? `  lost this visit: ${s.lost.join(', ')}` : '',
  ].join('  '));
}

console.log(`\nLethe simulation · mode=${mode} · S0=${C.S_INITIAL} · tend×${C.TEND_STABILITY_MULT} · thread+${C.THREAD_STABILITY_BONUS}\n`);
console.log(rows.join('\n'));
const finalV = viewAll(g, realDays * C.GARDEN_DAYS_PER_REAL_DAY);
const alive = Object.values(finalV).filter((x) => x.state !== 'lost');
const avgDeg = (ids: string[]) => ids.reduce((s, id) => s + g.threads.filter((t) => t.a === id || t.b === id).length, 0) / Math.max(1, ids.length);
console.log(`\nsurvivors: ${alive.length}/${planted}, avg threads per survivor ${avgDeg(alive.map((x) => x.id)).toFixed(1)}`);
