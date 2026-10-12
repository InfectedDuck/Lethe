// How the garden speaks (design system Whisper; docs/systems.md § Return summary → words).
// Pure functions: garden in, one line out. About memories, never about the app or the person's performance.
// No counts, no "you haven't…", no warnings, no exclamation marks. When something still holds a fading
// memory, name it, so fading reads as an invitation.

import {
  C, firstWords, neighbours, numberWord, threadBrightness,
  type Garden, type Memory, type MemoryView, type ReturnSummary,
} from '../engine';

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** A memory's short name in a whisper: "The library rooftop", "Gymnopédie No. 1". */
export function nameOf(m: Memory): string {
  return firstWords(m.text, 4);
}

/** How a memory is named when it is the one holding another: a song by its artist ("Satie"), others by name. */
function holderNameOf(m: Memory): string {
  if (m.kind === 'song') {
    // "Title, Artist. Note": the title part ends at the first full stop before a capital ("No. 1" doesn't count).
    const titlePart = m.text.split(/\.\s+(?=\p{Lu})/u)[0];
    const artist = titlePart.split(',').slice(1).join(',').trim().replace(/\.$/, '');
    if (artist) return artist;
  }
  return nameOf(m);
}

/** What still holds a memory: its strongest living thread, named by what the two share. */
export function holderOf(g: Garden, views: Record<string, MemoryView>, id: string): { line: string } | null {
  const m = g.memories[id];
  if (!m) return null;
  let best: { other: Memory; brightness: number; shared?: string } | null = null;
  for (const { other, thread } of neighbours(g, id)) {
    const o = g.memories[other];
    if (!o || o.lost || !views[other] || !views[id]) continue;
    const brightness = threadBrightness(thread, views[id].vitality, views[other].vitality);
    if (best && brightness <= best.brightness) continue;
    const sharedId = [...m.people.filter((p) => o.people.includes(p)), ...m.places.filter((p) => o.places.includes(p))][0];
    best = { other: o, brightness, shared: sharedId ? g.entities[sharedId]?.name : undefined };
  }
  if (!best) return null;
  if (best.brightness < 0.3) return { line: `A faint thread to ${holderNameOf(best.other)} still holds it.` };
  return { line: `${best.shared ?? holderNameOf(best.other)} still holds it.` };
}

/** The whisper for an ordinary moment: the faintest memory still in the garden, and what holds it. */
export function idleWhisper(g: Garden, views: Record<string, MemoryView>): string | null {
  const faintest = Object.values(views)
    .filter((v) => v.state === 'fading' || v.state === 'ghost')
    .sort((a, b) => a.vitality - b.vitality)[0];
  if (!faintest) return null;
  const holder = holderOf(g, views, faintest.id);
  return `${nameOf(g.memories[faintest.id])} is drifting into fog.${holder ? ` ${holder.line}` : ''}`;
}

/** The whisper on return, after time has passed: "Four days passed. The library rooftop is about to be lost." */
export function returnWhisper(g: Garden, views: Record<string, MemoryView>, s: ReturnSummary): string | null {
  const days = Math.round(Math.max(s.realDaysPassed, s.gardenDaysPassed / C.GARDEN_DAYS_PER_REAL_DAY));
  const parts: string[] = [];
  if (days >= 1) parts.push(`${capitalise(numberWord(days))} ${days === 1 ? 'day' : 'days'} passed.`);

  const about = s.aboutToBeLost.find((id) => g.memories[id]);
  const lost = s.lost.find((id) => g.memories[id]);
  const faded = s.faded.find((id) => g.memories[id]);
  if (about) {
    parts.push(`${nameOf(g.memories[about])} is about to be lost.`);
    const h = holderOf(g, views, about);
    if (h) parts.push(h.line);
  } else if (lost) {
    parts.push(`${nameOf(g.memories[lost])} drifted into the fog.`);
  } else if (faded) {
    parts.push(`${nameOf(g.memories[faded])} is drifting into fog.`);
    const h = holderOf(g, views, faded);
    if (h) parts.push(h.line);
  }
  return parts.length ? parts.join(' ') : null;
}
