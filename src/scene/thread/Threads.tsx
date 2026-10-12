// Every thread in the garden, between flower heads. Brightness comes from the engine (threadBrightness).
// Hovering a flower lights its threads and dims the rest, "to show what holds the memory up". While a memory
// is open, every thread recedes with the garden, so no light crosses its words (screen p2).
// When a memory is lost the engine drops its threads at once; here they stay a little longer, flicker and go
// out with the dissolve (storyboard p18).

import { useMemo, useRef } from 'react';
import { threadBrightness, threadKey, type MemoryView } from '../../engine';
import { useGarden, useRevealHeld } from '../../store/garden';
import { flowerHead } from '../flower/Flower';
import { baseToWorld } from '../layout';
import { useLayout } from '../useLayout';
import { BLOOM_MS } from '../fx/bloomTimeline';
import { threadDeparture } from '../fx/dissolveTimeline';
import { HOVER_DIM, HOVER_LIT, REVEAL_DIM, REVEAL_LIT, RIPPLE_TRAVEL_MS, ThreadArc } from './ThreadArc';
import type * as THREE from 'three';

type Drawn = {
  key: string; ids: [string, string]; a: THREE.Vector3; b: THREE.Vector3; strength: number; flicker: boolean;
  departing?: { flickerFrom: number; releaseAt: number; goneAt: number };
};

export function Threads() {
  const garden = useGarden((s) => s.garden);
  const shown = useGarden((s) => s.shown);
  const hoveredId = useGarden((s) => s.hoveredId);
  const focusedId = useGarden((s) => s.focusedId);
  const events = useGarden((s) => s.events);
  const layout = useLayout();
  const held = useRevealHeld();
  const emphasisFor = (ids: string[]) =>
    held ? (ids.every((id) => held.includes(id)) ? REVEAL_LIT : REVEAL_DIM)
    : focusedId ? HOVER_DIM : !hoveredId ? 1 : ids.includes(hoveredId) ? HOVER_LIT : HOVER_DIM;

  const live = useMemo(() => garden.threads.flatMap((t): Drawn[] => {
    const A = garden.memories[t.a], B = garden.memories[t.b];
    const LA = layout[t.a], LB = layout[t.b];
    if (!A || !B || !LA || !LB || !shown[t.a] || !shown[t.b]) return [];
    // While the slider previews the future, a memory can look lost before the engine has let it go: no thread to it.
    if (shown[t.a].state === 'lost' || shown[t.b].state === 'lost') return [];
    return [{
      key: threadKey(t.a, t.b),
      ids: [t.a, t.b],
      a: flowerHead(A.kind, A.id, LA.size, baseToWorld(LA.x, LA.y)),
      b: flowerHead(B.kind, B.id, LB.size, baseToWorld(LB.x, LB.y)),
      strength: threadBrightness(t, shown[t.a].vitality, shown[t.b].vitality),
      flicker: isGhost(shown[t.a]) || isGhost(shown[t.b]),
    }];
  }), [garden, shown, layout]);

  // Threads that just disappeared because one end is dissolving: keep drawing them until they have gone out.
  const previous = useRef(new Map<string, Drawn>());
  const departing = useRef(new Map<string, Drawn>());
  const now = performance.now();
  const liveKeys = new Set(live.map((t) => t.key));
  for (const [key, t] of previous.current) {
    if (liveKeys.has(key) || departing.current.has(key)) continue;
    const died = events.filter((e) => e.type === 'dissolve' && t.ids.includes(e.id)).at(-1);
    if (died && now - died.at < 6000) departing.current.set(key, { ...t, departing: threadDeparture(died.at) });
  }
  for (const [key, t] of departing.current) {
    if (liveKeys.has(key) || (t.departing && now > t.departing.goneAt + 1000)) departing.current.delete(key);
  }
  previous.current = new Map(live.map((t) => [t.key, t]));

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
      {live.map((t) => (
        <ThreadArc key={t.key} seed={t.key} a={t.a} b={t.b} strength={t.strength} flicker={t.flicker}
          emphasis={emphasisFor(t.ids)} ripple={rippleFor(t.ids)} holdUntil={holdFor(t.ids)} />
      ))}
      {[...departing.current.values()].map((t) => (
        <ThreadArc key={`${t.key}:departing`} seed={t.key} a={t.a} b={t.b} strength={t.strength} flicker={t.flicker}
          emphasis={emphasisFor(t.ids)} departing={t.departing} />
      ))}
    </>
  );
}

const isGhost = (v: MemoryView) => v.state === 'ghost';
