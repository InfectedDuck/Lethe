// ?sandbox=dissolve: the dissolve, to tune against storyboard p18.
// Top: six frozen frames of a ghost becoming lost (ghost, petals detach, particles, threads flicker, last thread
// out, a dark seed). Bottom: a ghost and its thread to a vivid neighbour, dissolving live every 7s.

import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useEffect, useState } from 'react';
import * as THREE from 'three';
import { TOKENS } from '../../engine';
import { Button } from '../../ui/ds';
import { Effects } from '../Effects';
import { flowerHead, Flower } from '../flower/Flower';
import { threadDeparture } from '../fx/dissolveTimeline';
import { ThreadArc } from '../thread/ThreadArc';

const FRAMES = [
  { ms: 300, label: '1 · a ghost' },
  { ms: 1200, label: '2 · petals detach' },
  { ms: 2200, label: '3 · petals turn to particles' },
  { ms: 3000, label: '4 · its threads flicker' },
  { ms: 3900, label: '5 · the last thread goes out' },
  { ms: 6500, label: '6 · an empty spot, a small dark seed' },
];
const REPLAY_MS = 7000;
const GHOST = { kind: 'sentence' as const, seed: 'first-dance', size: 120 };
const NEIGHBOUR = { kind: 'place' as const, seed: 'lake-house', size: 140 };

export function DissolveSandbox() {
  const [diedAt, setDiedAt] = useState(() => performance.now() + 1500);
  useEffect(() => {
    const t = setInterval(() => setDiedAt(performance.now() + 1500), REPLAY_MS);
    return () => clearInterval(t);
  }, []);
  const ghostBase = new THREE.Vector3(-1.6, -2.9, 0), neighbourBase = new THREE.Vector3(1.8, -2.9, 0);
  return (
    <div className="stage">
      <Canvas flat dpr={[1, 1.75]} style={{ position: 'absolute', inset: 0 }} camera={{ position: [0, 0.6, 15], fov: 40 }}>
        <color attach="background" args={[TOKENS.night]} />
        <OrbitControls target={[0, 0.6, 0]} enablePan={false} />
        {FRAMES.map((f, i) => (
          <Flower key={f.ms} {...GHOST} state="lost" dissolveAge={f.ms} position={new THREE.Vector3((i - 2.5) * 2.3, 1.4, 0)} />
        ))}
        {/* Live: before it starts it is a ghost, then it dissolves; its thread flickers and goes out. */}
        <Flower key={`ghost${diedAt}`} {...GHOST} state="lost" diedAt={diedAt} position={ghostBase} />
        <Flower {...NEIGHBOUR} state="vivid" position={neighbourBase} />
        <ThreadArc key={`thread${diedAt}`} seed="sandbox-thread" strength={0.5} departing={threadDeparture(diedAt)}
          a={flowerHead(GHOST.kind, GHOST.seed, GHOST.size, ghostBase)} b={flowerHead(NEIGHBOUR.kind, NEIGHBOUR.seed, NEIGHBOUR.size, neighbourBase)} />
        <Effects />
      </Canvas>
      <div className="interface-sm edge top-left" style={{ opacity: 1, display: 'grid', gap: 4 }}>
        <span>the dissolve · storyboard p18 · {FRAMES.map((f) => f.label).join('  ')}</span>
        <span>below: a ghost and its thread, dissolving live every 7s</span>
      </div>
      <Button variant="pill" className="edge top-right" style={{ opacity: 1 }} onClick={() => setDiedAt(performance.now() + 300)}>replay</Button>
    </div>
  );
}
