// ?sandbox=threads: the thread in every form, to tune against the design system's Thread page (p13).
// Rows: strong, holding, thin (the three on p13), a thread to a ghost (flickers), a suggested thread (dashed),
// and a hovered pair: lit (×1.4) beside dimmed (×0.35). Drag to orbit.

import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { TOKENS } from '../../engine';
import { Effects } from '../Effects';
import { HOVER_DIM, HOVER_LIT, ThreadArc } from '../thread/ThreadArc';

const ROWS: { label: string; strength: number; flicker?: boolean; suggested?: boolean; emphasis?: number }[] = [
  { label: 'strong · 0.95', strength: 0.95 },
  { label: 'holding · 0.55', strength: 0.55 },
  { label: 'thin · 0.15', strength: 0.15 },
  { label: 'to a ghost · flickers', strength: 0.4, flicker: true },
  { label: 'suggested · while planting', strength: 0.6, suggested: true },
  { label: 'hovered · lit', strength: 0.85, emphasis: HOVER_LIT },
  { label: 'hovered · dimmed', strength: 0.85, emphasis: HOVER_DIM },
];
const ROW_H = 0.95;
const HALF = 2.6; // half a thread's length; the arc rises 0.28 × length above its ends
const y = (i: number) => 2.3 - i * ROW_H;

export function ThreadSandbox() {
  return (
    <div className="stage">
      <Canvas flat dpr={[1, 1.75]} style={{ position: 'absolute', inset: 0 }} camera={{ position: [0, 0, 11.5], fov: 40 }}>
        <color attach="background" args={[TOKENS.night]} />
        <OrbitControls enablePan={false} />
        {ROWS.map((r, i) => (
          <ThreadArc key={r.label} seed={r.label} a={new THREE.Vector3(-HALF, y(i), 0)} b={new THREE.Vector3(HALF, y(i), 0)}
            strength={r.strength} flicker={r.flicker} suggested={r.suggested} emphasis={r.emphasis} />
        ))}
        <Effects />
      </Canvas>
      {ROWS.map((r, i) => {
        const halfH = 11.5 * Math.tan((20 * Math.PI) / 180);
        return (
          <span key={r.label} className="interface-sm" style={{ position: 'absolute', left: 'calc(50% + 26%)',
            top: `calc(${50 - (y(i) / halfH) * 50}% - 9px)`, color: 'var(--fog)', whiteSpace: 'nowrap' }}>
            {r.label}
          </span>
        );
      })}
    </div>
  );
}
