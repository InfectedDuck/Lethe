// Spending light, made visible (design system LightCounter): when a memory is tended, a mote of light
// leaves the light counter and travels to the flower over 0.6s while the counter's dot dims.
// The flower's swell and the ripple along its threads happen in the 3D scene on the same event.

import { useEffect, useRef } from 'react';
import { useGarden } from '../store/garden';
import { useReducedMotion } from '../scene/motion';
import { projectMemory } from '../scene/screen';

const TRAVEL_MS = 600;
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

export function TendMote() {
  const layer = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const seen = useRef(0);

  useEffect(() => useGarden.subscribe((s) => {
    const fresh = s.events.filter((e) => e.type === 'tend' && e.at > seen.current);
    if (!fresh.length) return;
    seen.current = Math.max(...fresh.map((e) => e.at));
    if (reduced || !layer.current) return;
    for (const e of fresh) fly(layer.current, e.id, s.garden.light);
  }), [reduced]);

  return <div ref={layer} className="mote-layer" aria-hidden />;
}

function fly(layer: HTMLElement, id: string, lightNow: number) {
  // The dot that just dimmed is the first unlit one.
  const dots = document.querySelectorAll<HTMLElement>('.light-counter .lt-light-dot');
  const from = (dots[lightNow] ?? dots[dots.length - 1])?.getBoundingClientRect();
  if (!from) return;
  const mote = document.createElement('span');
  mote.className = 'tend-mote';
  layer.appendChild(mote);
  const start = performance.now();
  const sx = from.left + from.width / 2, sy = from.top + from.height / 2;
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / TRAVEL_MS);
    // The flower may be gliding (focus camera), so aim at where it is now, every frame.
    const to = projectMemory(id);
    const tx = to?.x ?? sx, ty = to?.y ?? sy;
    const k = ease(t);
    // A gentle arc, never a straight dart.
    const x = sx + (tx - sx) * k, y = sy + (ty - sy) * k - Math.sin(Math.PI * k) * 60;
    mote.style.transform = `translate(${x - 3}px, ${y - 3}px)`;
    mote.style.opacity = String(t < 0.85 ? 1 : (1 - t) / 0.15);
    if (t < 1) requestAnimationFrame(step); else mote.remove();
  };
  requestAnimationFrame(step);
}
