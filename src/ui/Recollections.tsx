// A memory's words surfacing in the garden (design system Recollection).
// Hover: beside its flower, space-3 from it, on the side with more open ground (screen p1).
// Focus: large, on the right half, while the camera brings the flower close on the left (screen p2).

import { useEffect, useRef } from 'react';
import { C, type Memory } from '../engine';
import { useGarden } from '../store/garden';
import { Button, Recollection } from './ds';
import { useFollow } from './useFollow';

const SPACE_3 = 16;
const SPACE_4 = 24;

export function heldByNames(m: Memory): string[] {
  const { garden } = useGarden.getState();
  return [...m.people, ...m.places].map((e) => garden.entities[e]?.name).filter((n): n is string => !!n)
    .concat(m.happenedAt ? [m.happenedAt] : []);
}

export function HoverRecollection() {
  const hoveredId = useGarden((s) => s.hoveredId);
  const focusedId = useGarden((s) => s.focusedId);
  const view = useGarden((s) => (hoveredId ? s.views[hoveredId] : null));
  const m = useGarden((s) => (hoveredId ? s.garden.memories[hoveredId] : null));
  const el = useRef<HTMLDivElement>(null);

  useFollow(m && !focusedId ? m.id : null, (_, p) => {
    const box = el.current;
    if (!box) return;
    if (!p || !p.onScreen) { box.style.visibility = 'hidden'; return; }
    const w = box.offsetWidth, h = box.offsetHeight, W = innerWidth, H = innerHeight;
    // The side with more open ground: right of the flower unless it stands in the right part of the garden.
    const right = p.x + p.r + SPACE_3 + w < W - SPACE_4 && (p.x < W * 0.62 || p.x - p.r - SPACE_3 - w < SPACE_4);
    const left = right ? p.x + p.r + SPACE_3 : p.x - p.r - SPACE_3 - w;
    const top = Math.min(H - SPACE_4 - h, Math.max(SPACE_4, p.y - h / 2));
    box.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
    box.style.visibility = 'visible';
  });

  if (!m || !view || focusedId) return null;
  return (
    <div ref={el} className="hover-recollection surface" style={{ visibility: 'hidden' }}>
      <Recollection text={m.text} seed={m.id} kind={m.kind} vitality={view.vitality} state={view.state} heldBy={heldByNames(m)} />
    </div>
  );
}

export function FocusRecollection() {
  const focusedId = useGarden((s) => s.focusedId);
  const view = useGarden((s) => (focusedId ? s.views[focusedId] : null));
  const light = useGarden((s) => s.garden.light);
  const m = useGarden((s) => (focusedId ? s.garden.memories[focusedId] : null));
  const { tendMemory, letGoMemory, returnToMemory, focus } = useGarden.getState();
  const box = useRef<HTMLDivElement>(null);

  // Opened from the keyboard (a flower target had focus): move focus to the main action, so Enter tends.
  useEffect(() => {
    if (!focusedId) return;
    if (document.activeElement?.classList.contains('flower-target')) {
      requestAnimationFrame(() => box.current?.querySelector<HTMLButtonElement>('.lt-btn.is-pill:not(:disabled), .lt-btn:not(:disabled)')?.focus());
    }
  }, [focusedId]);

  if (!m || !view) return null;
  const back = <Button onClick={() => focus(null)}>back to the garden</Button>;
  return (
    <div ref={box} key={m.id} className="focus-recollection surface" role="dialog" aria-label={`memory · ${view.state}`}>
      <Recollection size="lg" text={m.text} seed={m.id} kind={m.kind} vitality={view.vitality} state={view.state} heldBy={heldByNames(m)}
        actions={view.state === 'lost'
          ? <><Button variant="pill" disabled={light < C.RETURN_COST} onClick={() => returnToMemory(m.id)}>return</Button>{back}</>
          : <><Button variant="pill" disabled={light < C.TEND_COST} onClick={() => tendMemory(m.id)}>tend</Button>
              <Button onClick={() => letGoMemory(m.id)}>let go</Button>{back}</>} />
    </div>
  );
}
