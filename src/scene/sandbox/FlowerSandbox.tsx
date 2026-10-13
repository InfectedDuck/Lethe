// ?sandbox=flowers: the four kinds in the four states, with the same seeds as the design system's Bloom page
// (lethe-design-system/components/Bloom/preview.html), so the 3D flowers can be compared with their 2D twins.
// ?sandbox=flowers&seed=m1 grows every kind from one seed. Drag to orbit and check the flowers read in depth.

import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useEffect, useState } from 'react';
import * as THREE from 'three';
import { TOKENS, type Kind, type MemoryState } from '../../engine';
import { Effects } from '../Effects';
import { Flower } from '../flower/Flower';

const KINDS: { kind: Kind; seed: string; hue?: string }[] = [
  { kind: 'sentence', seed: 'first-dance' },
  { kind: 'song', seed: 'night-bus' },
  { kind: 'place', seed: 'lake-house' },
  { kind: 'photo', seed: 'grandmother', hue: '#e9a98f' },
];
const STATES: MemoryState[] = ['vivid', 'fading', 'ghost', 'lost'];

export function FlowerSandbox() {
  const params = new URLSearchParams(location.search);
  const seedParam = params.get('seed');
  const [size, setSize] = useState(Number(params.get('size')) || 140);
  const colW = 3.2, rowH = 2.9;
  return (
    <div className="stage">
      <Canvas flat dpr={[1, 1.75]} style={{ position: 'absolute', inset: 0 }}
        camera={{ position: [0, 0, 15.5], fov: 40 }} gl={{ antialias: true }}>
        <color attach="background" args={[TOKENS.night]} />
        <OrbitControls target={[0, 0, 0]} enablePan={false} />
        {STATES.map((state, si) => KINDS.map((k, ki) => {
          const x = (ki - 1.5) * colW, y = (1.5 - si) * rowH - 1.1;
          return (
            <Flower key={`${state}${k.kind}`} kind={k.kind} seed={seedParam ?? k.seed} hue={k.hue} size={size} state={state}
              position={new THREE.Vector3(x, y, 0)} />
          );
        }))}
        <Effects />
      </Canvas>
      <Labels colW={colW} rowH={rowH} />
      <label className="interface-sm edge top-right" style={{ display: 'grid', gap: 8 }}>
        size {size}px
        <input type="range" min={80} max={220} value={size} onChange={(e) => setSize(Number(e.target.value))} />
      </label>
    </div>
  );
}

/** Labels under each flower, placed with the same projection as the default camera (they drift if you orbit). */
function Labels({ colW, rowH }: { colW: number; rowH: number }) {
  const [, force] = useState(0);
  useEffect(() => { const on = () => force((n) => n + 1); addEventListener('resize', on); return () => removeEventListener('resize', on); }, []);
  const halfH = 15.5 * Math.tan((20 * Math.PI) / 180), aspect = innerWidth / innerHeight;
  return (
    <>
      {STATES.map((state, si) => KINDS.map((k, ki) => {
        const x = (ki - 1.5) * colW, y = (1.5 - si) * rowH - 1.1;
        return (
          <span key={`${state}${k.kind}`} className="interface-sm"
            style={{ position: 'absolute', left: `${50 + (x / (halfH * aspect)) * 50}%`, top: `calc(${50 - (y / halfH) * 50}% + 8px)`,
              transform: 'translateX(-50%)', color: 'var(--fog)', whiteSpace: 'nowrap', pointerEvents: 'none' }}>
            {k.kind} · {state}
          </span>
        );
      }))}
    </>
  );
}
