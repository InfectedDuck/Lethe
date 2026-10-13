// Groups of memories joined by threads, in world space. Used for the soft light on the ground under each
// cluster (screens p1/p3) and to place fog. Pure: no React, no Three objects kept.

import type { Garden, MemoryView } from '../engine';
import { baseToWorld } from './layout';

export type Cluster = { ids: string[]; x: number; z: number; radius: number; vitality: number };

export function clustersOf(
  g: Garden, views: Record<string, MemoryView>, layout: Record<string, { x: number; y: number; size: number }>,
): Cluster[] {
  const ids = Object.keys(g.memories).filter((id) => layout[id]);
  const parent = new Map(ids.map((id) => [id, id]));
  const find = (a: string): string => { let r = a; while (parent.get(r) !== r) r = parent.get(r)!; parent.set(a, r); return r; };
  for (const t of g.threads) if (parent.has(t.a) && parent.has(t.b)) parent.set(find(t.a), find(t.b));

  const groups = new Map<string, string[]>();
  for (const id of ids) groups.set(find(id), [...(groups.get(find(id)) ?? []), id]);

  return [...groups.values()].map((members) => {
    const pts = members.map((id) => baseToWorld(layout[id].x, layout[id].y));
    const x = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    const z = pts.reduce((s, p) => s + p.z, 0) / pts.length;
    const spread = Math.max(...pts.map((p) => Math.hypot(p.x - x, p.z - z)));
    const vitality = members.reduce((s, id) => s + (views[id]?.vitality ?? 0), 0) / members.length;
    return { ids: members, x, z, radius: Math.max(0.9, spread + 0.9), vitality };
  });
}
