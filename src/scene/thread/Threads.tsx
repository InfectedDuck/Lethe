// Every thread in the garden, between flower heads. Brightness comes from the engine (threadBrightness);
// hovering or focusing a flower lights its threads and dims the rest, "to show what holds the memory up".

import { useMemo } from 'react';
import { threadBrightness, threadKey } from '../../engine';
import { useGarden } from '../../store/garden';
import { flowerHead } from '../flower/Flower';
import { baseToWorld } from '../layout';
import { useLayout } from '../useLayout';
import { HOVER_DIM, HOVER_LIT, ThreadArc } from './ThreadArc';

export function Threads() {
  const garden = useGarden((s) => s.garden);
  const views = useGarden((s) => s.views);
  const hoveredId = useGarden((s) => s.hoveredId);
  const focusedId = useGarden((s) => s.focusedId);
  const layout = useLayout();
  const lit = hoveredId ?? focusedId;

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

  return (
    <>
      {threads.map((t) => (
        <ThreadArc key={t.key} seed={t.key} a={t.a} b={t.b} strength={t.strength} flicker={t.flicker}
          emphasis={!lit ? 1 : t.ids.includes(lit) ? HOVER_LIT : HOVER_DIM} />
      ))}
    </>
  );
}
