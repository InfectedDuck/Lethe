// ?sandbox=bloom: the bloom, to tune against storyboard p17.
// Top: six frozen frames of a sentence flower at the storyboard's moments (seed falls, lands, roots, stem, petals,
// glow). Bottom: the four kinds blooming live, replayed every 4s or with the replay button.

import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useEffect, useState } from 'react';
import * as THREE from 'three';
import { TOKENS, type Kind } from '../../engine';
import { Button } from '../../ui/ds';
import { Effects } from '../Effects';
import { Flower } from '../flower/Flower';

const FRAMES = [
  { ms: 120, label: '1 · a seed falls' },
  { ms: 380, label: '2 · it lands' },
  { ms: 700, label: '3 · roots spread as light' },
  { ms: 1000, label: '4 · the stem rises' },
  { ms: 1420, label: '5 · petals unfold' },
  { ms: 2400, label: '6 · the glow settles' },
];
const KINDS: { kind: Kind; seed: string; hue?: string }[] = [
  { kind: 'sentence', seed: 'first-dance' },
  { kind: 'song', seed: 'night-bus' },
  { kind: 'place', seed: 'lake-house' },
  { kind: 'photo', seed: 'grandmother', hue: '#e9a98f' },
];
const REPLAY_MS = 4000;

export function BloomSandbox() {
  const [bornAt, setBornAt] = useState(() => performance.now());
  useEffect(() => {
    const t = setInterval(() => setBornAt(performance.now()), REPLAY_MS);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="stage">
      <Canvas flat dpr={[1, 1.75]} style={{ position: 'absolute', inset: 0 }} camera={{ position: [0, 1.4, 15], fov: 40 }}>
        <color attach="background" args={[TOKENS.night]} />
        <OrbitControls target={[0, 1.4, 0]} enablePan={false} />
        {FRAMES.map((f, i) => (
          <Flower key={f.ms} kind="sentence" seed="first-dance" size={110} state="vivid" bloomAge={f.ms}
            position={new THREE.Vector3((i - 2.5) * 2.3, 2.2, 0)} />
        ))}
        {KINDS.map((k, i) => (
          <Flower key={`${k.kind}${bornAt}`} kind={k.kind} seed={k.seed} hue={k.hue} size={120} state="vivid" bornAt={bornAt}
            position={new THREE.Vector3((i - 1.5) * 3.2, -2.6, 0)} />
        ))}
        <Effects />
      </Canvas>
      <div className="interface-sm edge top-left" style={{ opacity: 1, display: 'grid', gap: 4 }}>
        <span>the bloom · storyboard p17 · {FRAMES.map((f) => f.label).join('  ')}</span>
        <span>below: the four kinds, live, every 4s</span>
      </div>
      <Button variant="pill" className="edge top-right" style={{ opacity: 1 }} onClick={() => setBornAt(performance.now())}>replay</Button>
    </div>
  );
}
