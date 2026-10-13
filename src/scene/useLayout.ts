import { useMemo } from 'react';
import { layoutOf, type Place } from '../data/placement';
import { useGarden } from '../store/garden';

/**
 * Where each memory stands on the 1440 × 900 design canvas. Sample memories use the designed layout; planted
 * ones use the spot the store chose when they were planted, so they never move. P10 persists those spots.
 */
export function useLayout(): Record<string, Place> {
  const ids = useGarden((s) => Object.keys(s.garden.memories).join(','));
  const positions = useGarden((s) => s.positions);
  return useMemo(() => layoutOf(ids.split(',').filter(Boolean), positions), [ids, positions]);
}
