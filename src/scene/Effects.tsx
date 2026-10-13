// Post-processing (scene-spec § Post-processing) with an automatic quality step-down.

import { PerformanceMonitor } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { Bloom, EffectComposer, Noise, Vignette } from '@react-three/postprocessing';
import { useState } from 'react';

export type Quality = 'high' | 'low';

/**
 * Explicit ?quality=low|high in the URL wins (for testing on a weak laptop). Once quality drops it stays low
 * for the session: switching back up on a marginal machine would only make it yo-yo.
 */
const forced = new URLSearchParams(location.search).get('quality') as Quality | null;

export function Effects() {
  const [quality, setQuality] = useState<Quality>(forced ?? 'high');
  const setDpr = useThree((s) => s.setDpr);
  return (
    <>
      <PerformanceMonitor
        onDecline={() => { if (!forced) { setQuality('low'); setDpr(1); } }}
        flipflops={3}
        onFallback={() => { if (!forced) { setQuality('low'); setDpr(1); } }}
      />
      {/* One composer for both qualities: swapping two composers at runtime left the first one's cost behind
          (P12.1: a declined ?stress=100 stayed at 15–20 fps, while starting at ?quality=low ran at ~68). */}
      <EffectComposer multisampling={0}>
        <Bloom key={quality} mipmapBlur={quality === 'high'} intensity={quality === 'high' ? 0.85 : 0.65}
          luminanceThreshold={0.3} luminanceSmoothing={0.45} />
        <Vignette offset={0.3} darkness={0.75} />
        {quality === 'high' ? <Noise opacity={0.025} premultiply /> : <></>}
      </EffectComposer>
    </>
  );
}
