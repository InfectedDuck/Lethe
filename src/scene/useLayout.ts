import { useMemo } from 'react';
import { SAMPLE_LAYOUT } from '../data/sample';
import { useGarden } from '../store/garden';
import { placeNew } from './layout';

type Place = { x: number; y: number; size: number };

/**
 * Where each memory stands on the 1440 × 900 design canvas. Sample memories use the designed layout;
 * new ones are placed deterministically so they never jump. P10 persists this with the memory.
 */
export function useLayout(): Record<string, Place> {
  const ids = useGarden((s) => Object.keys(s.garden.memories).join(','));
  return useMemo(() => {
    const out: Record<string, Place> = {};
    const taken: { x: number; y: number }[] = [];
    for (const id of ids.split(',').filter(Boolean)) {
      if (SAMPLE_LAYOUT[id]) { out[id] = SAMPLE_LAYOUT[id]; taken.push(out[id]); }
    }
    let n = 0;
    for (const id of ids.split(',').filter(Boolean)) {
      if (out[id]) continue;
      out[id] = placeNew(taken, ++n * 7 + id.length);
      taken.push(out[id]);
    }
    return out;
  }, [ids]);
}
