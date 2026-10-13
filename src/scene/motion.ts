import { useEffect, useState } from 'react';

const query = '(prefers-reduced-motion: reduce)';

/** Reduced motion keeps every state's look but stops drift, breathing and motes (design system § motion). */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduced;
}

/** Exponential damping factor: frame-rate independent "ease toward". k = 1.2 → about 2.5s to settle. */
export const damp = (k: number, dt: number) => 1 - Math.exp(-k * dt);
