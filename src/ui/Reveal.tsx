// "What holds your garden" (P9, screen p12): the people and places ranked by how much living memory they hold,
// each with a thin line of light as long as its share. Choosing one dims the garden to everything but what that
// person or place holds; their threads brighten and the held memories are named beside their flowers.
// Never numbers, percentages or a dashboard: words and light.

import { useMemo, useRef } from 'react';
import { holders, numberWord, type Memory } from '../engine';
import { useGarden, useRevealHeld } from '../store/garden';
import { Button } from './ds';
import { useFollow } from './useFollow';

/** The few that hold the most; a reveal, not a ledger. */
const MAX_HOLDERS = 7;

export function RevealEntry() {
  const open = useGarden((s) => s.reveal.open);
  const any = useGarden((s) => Object.keys(s.garden.memories).length > 0);
  if (open || !any) return null;
  return <Button className="reveal-entry" onClick={() => useGarden.getState().openReveal()}>what holds you</Button>;
}

export function Reveal() {
  const reveal = useGarden((s) => s.reveal);
  const garden = useGarden((s) => s.garden);
  const views = useGarden((s) => s.views);
  const now = useGarden((s) => s.now);
  const { selectHolder, closeReveal } = useGarden.getState();
  // Re-rank whenever vitality changes (views), not only when the garden does.
  const ranked = useMemo(() => holders(garden, now()).slice(0, MAX_HOLDERS), [garden, views, now]);

  if (!reveal.open) return null;
  const strongest = ranked[0]?.weight || 1;
  return (
    <>
      <nav className="reveal surface" aria-label="what holds your garden">
        <h2 className="title reveal-title">What holds your garden</h2>
        {ranked.length === 0 && <p className="interface reveal-empty">Nothing holds it yet. A memory with a person or a place in it would.</p>}
        <ul className="reveal-list">
          {ranked.map((h) => {
            const n = h.memories.length;
            return (
              <li key={h.entityId}>
                <button type="button" className={`reveal-holder${h.entityId === reveal.entityId ? ' is-on' : ''}`}
                  aria-pressed={h.entityId === reveal.entityId} onClick={() => selectHolder(h.entityId)}>
                  <span className="reveal-name">{h.name}</span>
                  <span className="interface-sm reveal-count">{numberWord(n)} {n === 1 ? 'memory' : 'memories'}</span>
                  {/* How much it holds, as a line of light: no number, no percentage. */}
                  <span className="reveal-line" aria-hidden style={{ width: `${Math.max(8, (h.weight / strongest) * 100)}%` }} />
                </button>
              </li>
            );
          })}
        </ul>
        <Button className="reveal-back" onClick={closeReveal}>back to the garden</Button>
      </nav>
      <RevealLabels />
    </>
  );
}

/** A memory's words beside its flower in the reveal (p12): the first sentence, kept short. */
export function revealLabel(m: Memory): string {
  const first = m.text.split(/\.\s+(?=\p{Lu})/u)[0];
  if (first.length <= 48) return first.replace(/\.$/, '');
  const clause = first.slice(0, 48).lastIndexOf(',');
  if (clause > 12) return first.slice(0, clause);
  return `${first.slice(0, 46).replace(/\s+\S*$/, '')}…`;
}

function RevealLabels() {
  const held = useRevealHeld() ?? [];
  const garden = useGarden((s) => s.garden);
  const labels = useRef(new Map<string, HTMLSpanElement>());
  useFollow(held, (id, p) => {
    const el = labels.current.get(id);
    if (!el) return;
    if (!p || !p.onScreen) { el.style.visibility = 'hidden'; return; }
    // Beside the flower on its right, or on its left when the right edge is too close; never off screen.
    const w = el.offsetWidth, gap = p.r * 0.7 + 12;
    const x = p.x + gap + w <= innerWidth - 24 ? p.x + gap : Math.max(24, p.x - gap - w);
    el.style.transform = `translate(${Math.round(x)}px, ${Math.round(p.y - 9)}px)`;
    el.style.visibility = 'visible';
  });
  return (
    <div className="reveal-labels" aria-hidden>
      {held.map((id) => (
        <span key={id} className="interface-sm reveal-label surface" style={{ visibility: 'hidden' }}
          ref={(el) => { if (el) labels.current.set(id, el); else labels.current.delete(id); }}>
          {revealLabel(garden.memories[id])}
        </span>
      ))}
    </div>
  );
}
