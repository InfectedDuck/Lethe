// Post-processing (scene-spec § Post-processing) with an automatic quality step-down.

import { PerformanceMonitor } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { Bloom, EffectComposer, Noise, Vignette } from '@react-three/postprocessing';
import { useState } from 'react';

export type Quality = 'high' | 'low';

/** Explicit ?quality=low|high in the URL wins (for testing on a weak laptop). */
const forced = new URLSearchParams(location.search).get('quality') as Quality | null;

export function Effects() {
  const [quality, setQuality] = useState<Quality>(forced ?? 'high');
  const setDpr = useThree((s) => s.setDpr);
  return (
    <>
      <PerformanceMonitor
        onDecline={() => { if (!forced) { setQuality('low'); setDpr(1); } }}
        onIncline={() => { if (!forced) { setQuality('high'); setDpr(Math.min(1.75, window.devicePixelRatio)); } }}
        flipflops={3}
        onFallback={() => { if (!forced) { setQuality('low'); setDpr(1); } }}
      />
      {quality === 'high' ? (
        <EffectComposer multisampling={0}>
          <Bloom mipmapBlur intensity={0.85} luminanceThreshold={0.3} luminanceSmoothing={0.45} />
          <Vignette offset={0.3} darkness={0.75} />
          <Noise opacity={0.025} premultiply />
        </EffectComposer>
      ) : (
        <EffectComposer multisampling={0}>
          <Bloom intensity={0.65} luminanceThreshold={0.3} luminanceSmoothing={0.45} />
          <Vignette offset={0.3} darkness={0.75} />
        </EffectComposer>
      )}
    </>
  );
}
