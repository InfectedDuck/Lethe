// Keyboard and screen-reader access to the flowers: one invisible button per memory, following its flower
// on screen. Tab moves through the garden left to right and shows the design system's focus ring around the
// flower; focusing one surfaces its words like a hover; Enter opens it. The buttons ignore the mouse, which
// talks to the 3D flowers directly.

import { useMemo, useRef } from 'react';
import { useGarden } from '../store/garden';
import { useLayout } from '../scene/useLayout';
import { useFollow } from './useFollow';
import { nameOf } from './whispers';

export function FlowerTargets() {
  const garden = useGarden((s) => s.garden);
  const views = useGarden((s) => s.views);
  const layout = useLayout();
  const { hover, focus } = useGarden.getState();
  const buttons = useRef(new Map<string, HTMLButtonElement>());

  // Reading order: left to right across the garden, as the eye sweeps it.
  const ids = useMemo(() => Object.keys(garden.memories).filter((id) => layout[id]).sort((a, b) => layout[a].x - layout[b].x), [garden, layout]);

  useFollow(ids, (id, p) => {
    const b = buttons.current.get(id);
    if (!b) return;
    if (!p || !p.onScreen) { b.style.visibility = 'hidden'; return; }
    const size = Math.max(40, p.r * 1.6);
    b.style.width = b.style.height = `${Math.round(size)}px`;
    b.style.transform = `translate(${Math.round(p.x - size / 2)}px, ${Math.round(p.y - size / 2)}px)`;
    b.style.visibility = 'visible';
  });

  return (
    <div className="flower-targets" role="group" aria-label="the garden">
      {ids.map((id) => (
        <button key={id} type="button" className="flower-target" data-id={id}
          ref={(el) => { if (el) buttons.current.set(id, el); else buttons.current.delete(id); }}
          aria-label={`${nameOf(garden.memories[id])} · ${views[id]?.state ?? ''}`}
          onFocus={() => hover(id)} onBlur={() => hover(null)} onClick={() => focus(id)} />
      ))}
    </div>
  );
}
