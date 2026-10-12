// Every thread in the garden, between flower heads. Brightness comes from the engine (threadBrightness).
// Hovering a flower lights its threads and dims the rest, "to show what holds the memory up". While a memory
// is open, every thread recedes with the garden, so no light crosses its words (screen p2).

import { useMemo } from 'react';
import { threadBrightness, threadKey } from '../../engine';
import { useGarden } from '../../store/garden';
import { flowerHead } from '../flower/Flower';
import { baseToWorld } from '../layout';
import { useLayout } from '../useLayout';
import { BLOOM_MS } from '../fx/bloomTimeline';
import { HOVER_DIM, HOVER_LIT, RIPPLE_TRAVEL_MS, ThreadArc } from './ThreadArc';

export function Threads() {
  const garden = useGarden((s) => s.garden);
  const views = useGarden((s) => s.views);
  const hoveredId = useGarden((s) => s.hoveredId);
  const focusedId = useGarden((s) => s.focusedId);
  const events = useGarden((s) => s.events);
  const layout = useLayout();
  const emphasisFor = (ids: string[]) =>
    focusedId ? HOVER_DIM : !hoveredId ? 1 : ids.includes(hoveredId) ? HOVER_LIT : HOVER_DIM;

  const threads = useMemo(() => garden.threads.flatMap((t) => {
    const A = garden.memories[t.a], B = garden.memories[t.b];
    const LA = layout[t.a], LB = layout[t.b];
    if (!A || !B || !LA || !LB || !views[t.a] || !views[t.b]) return [];
    return [{
      key: threadKey(t.a, t.b),
      ids: [t.a, t.b],
      a: flowerHead(A.kind, A.id, LA.size, baseToWorld(LA.x, LA.y)),
      b: flowerHead(B.kind, B.id, LB.size, baseToWorld(LB.x, LB.y)),
      strength: threadBrightness(t, views[t.a].vitality, views[t.b].vitality),
      flicker: views[t.a].state === 'ghost' || views[t.b].state === 'ghost',
    }];
  }), [garden, views, layout]);

  // The latest tend at either end of a thread sends a ripple along it, away from the tended flower.
  // A memory that just bloomed sends one too, once it has finished growing: its first threads are lit by a pulse
  // of light from it to each neighbour, and only then fade in (the first-thread moment).
  const rippleFor = (ids: string[]) => {
    const e = events.filter((x) => (x.type === 'tend' || x.type === 'bloom') && ids.includes(x.id)).at(-1);
    if (!e) return undefined;
    return { at: e.type === 'bloom' ? e.at + BLOOM_MS.settle : e.at, fromB: e.id === ids[1] };
  };
  const holdFor = (ids: string[]) => {
    const e = events.filter((x) => x.type === 'bloom' && ids.includes(x.id)).at(-1);
    return e ? e.at + BLOOM_MS.settle + RIPPLE_TRAVEL_MS : undefined;
  };

  return (
    <>
      {threads.map((t) => (
        <ThreadArc key={t.key} seed={t.key} a={t.a} b={t.b} strength={t.strength} flicker={t.flicker}
          emphasis={emphasisFor(t.ids)} ripple={rippleFor(t.ids)} holdUntil={holdFor(t.ids)} />
      ))}
    </>
  );
}
