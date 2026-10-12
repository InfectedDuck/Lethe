import { useEffect, useRef } from 'react';
import { projectMemory, type ScreenPoint } from '../scene/screen';

/**
 * Calls `place` every animation frame with where the memory's flower is on screen, so DOM interface
 * (recollections, keyboard focus rings, the tend mote) can follow the 3D garden without React re-renders.
 */
export function useFollow(ids: string[] | string | null, place: (id: string, p: ScreenPoint | null) => void) {
  const placeRef = useRef(place);
  placeRef.current = place;
  const key = Array.isArray(ids) ? ids.join('|') : ids ?? '';
  useEffect(() => {
    if (!key) return;
    const list = key.split('|');
    let raf = 0;
    const tick = () => {
      for (const id of list) placeRef.current(id, projectMemory(id));
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [key]);
}
