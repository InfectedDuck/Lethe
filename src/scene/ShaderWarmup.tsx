// Compiles the shaders that would otherwise compile the first time they are needed. On Windows (Direct3D) a first
// compile can stall a frame for half a second, and the first bloom is the garden growing in: the moment that must
// not stutter. So for a moment at start the bloom's and the dissolve's parts stand out of sight under the ground,
// `gl.compile` builds every program in the scene at once, and they are taken away again.

import { useThree } from '@react-three/fiber';
import { useEffect, useState } from 'react';
import { BloomGrowth } from './fx/BloomGrowth';
import { DarkSeed } from './fx/DarkSeed';

export function ShaderWarmup() {
  const [done, setDone] = useState(false);
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    gl.compile(scene, camera);
    const t = requestAnimationFrame(() => setDone(true));
    return () => cancelAnimationFrame(t);
  }, [gl, scene, camera]);
  if (done) return null;
  return (
    <group position={[0, -40, 0]}>
      <BloomGrowth bornAt={0} age={900} seed="warmup" />
      <DarkSeed age={4400} />
    </group>
  );
}
