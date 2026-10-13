// Fog itself (scene-spec § Fog): large soft banks of `fog` colour drifting over the ground.
// Thin banks cover the open garden and thicken as more memories fade; thick banks gather in front of
// fading, ghost and lost memories so fainter memories sit deeper in the fog.

import { Billboard } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { TOKENS, type MemoryState } from '../../engine';
import { useShallow } from 'zustand/react/shallow';
import { useGarden } from '../../store/garden';
import { baseToWorld, flowerHeight } from '../layout';
import { damp, useReducedMotion } from '../motion';
import { NOISE_GLSL } from '../shaders/noise';
import { useLayout } from '../useLayout';

/** Opacity tokens from the design system. */
const FOG_THIN = 0.06;
const FOG_THICK = 0.14;
/** Thin fog rises by this much as the garden is neglected (share of fading/ghost/lost memories, 0–1). */
const NEGLECT_EXTRA = 0.1;
/** Fog in front of a memory, by state. */
/** Lost memories get only thin fog, so their dark seed stays legible (review: a thick bank over it hid it). */
const MEMORY_FOG: Record<MemoryState, number> = { vivid: 0, fading: 0.07, ghost: FOG_THICK, lost: 0.05 };

/**
 * Thin banks over the open garden, low to the ground. Deterministic so the garden looks the same every visit.
 * From the camera several banks overlap along each line of sight, so each carries only a share of fog-thin.
 */
const THIN_BANKS = [
  { x: -6, z: -4, w: 12, h: 2.0, period: 70 },
  { x: 3, z: -6.5, w: 14, h: 2.2, period: 85 },
  { x: -2, z: 1.5, w: 10, h: 1.4, period: 55 },
  { x: 6.5, z: 0.5, w: 9, h: 1.8, period: 62 },
  { x: 0, z: -10, w: 18, h: 2.6, period: 90 },
  { x: -8.5, z: 4, w: 8, h: 1.3, period: 48 },
  { x: 8, z: 4.5, w: 8, h: 1.5, period: 44 },
  { x: 1.5, z: 6.5, w: 13, h: 1.1, period: 66 },
];
/** Typical number of thin banks overlapping along one line of sight. */
const THIN_OVERLAP = 3;

const vertexShader = /* glsl */ `
varying vec2 vUv;
varying float vWorldY;
void main() {
  vUv = uv;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorldY = w.y;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const fragmentShader = /* glsl */ `
// Peak alpha = token opacity × GAIN. Tuned by screenshot against screens p3 (fog should be barely there).
#define GAIN 1.1
uniform float uTime, uOpacity, uSeed, uPeriod, uAspect;
uniform vec3 uColor;
varying vec2 vUv;
varying float vWorldY;
${NOISE_GLSL}
void main() {
  vec2 c = (vUv - 0.5) * 2.0;
  // Soft ellipse, a little heavier near the ground.
  float edge = 1.0 - smoothstep(0.3, 1.0, length(c * vec2(1.0, 1.2)));
  edge *= mix(1.0, 0.55, smoothstep(-0.2, 1.0, c.y));
  float drift = uTime / uPeriod;
  vec2 p = vec2(vUv.x * uAspect * 0.55, vUv.y * 1.1) + vec2(drift + uSeed, uSeed * 0.37 + drift * 0.2);
  float n = lt_fbm(p * 1.7);
  float shape = smoothstep(0.28, 0.78, n);
  // Fade out where the bank meets the ground, so its vertical plane never shows a cut line.
  float ground = smoothstep(0.0, 0.7, vWorldY);
  gl_FragColor = vec4(uColor, uOpacity * edge * shape * ground * GAIN);
  #include <colorspace_fragment>
}`;

function useFogMaterial(seed: number, period: number, aspect: number) {
  return useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 }, uOpacity: { value: 0 }, uSeed: { value: seed }, uPeriod: { value: period },
      uAspect: { value: aspect }, uColor: { value: new THREE.Color(TOKENS.fog) },
    },
    vertexShader, fragmentShader, transparent: true, depthWrite: false,
  }), [seed, period, aspect]);
}

function Bank({ position, width, height, period, seed, target }: {
  position: [number, number, number]; width: number; height: number; period: number; seed: number;
  /** Read each frame, so banks follow the garden without re-rendering React. */
  target: () => number;
}) {
  const mat = useFogMaterial(seed, period, width / height);
  const group = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.Mesh>(null);
  const reduced = useReducedMotion();
  useFrame(({ clock }, dt) => {
    const t = reduced ? 0 : clock.elapsedTime;
    mat.uniforms.uTime.value = t;
    // State changes ease over ~3s, like dusk falling.
    mat.uniforms.uOpacity.value += (target() - mat.uniforms.uOpacity.value) * damp(1.2, dt);
    if (mesh.current) mesh.current.visible = mat.uniforms.uOpacity.value > 0.002;
    if (group.current) group.current.position.x = position[0] + Math.sin((t / period) * Math.PI * 2 + seed) * 0.5;
  });
  return (
    <group ref={group} position={position}>
      <Billboard lockX lockZ>
        {/* Same render order as flowers, so transparent sorting by distance puts fog in front of or behind them. */}
        <mesh ref={mesh} material={mat}>
          <planeGeometry args={[width, height]} />
        </mesh>
      </Billboard>
    </group>
  );
}

/** Share of memories that are no longer vivid. Drives how thick the open-garden fog is. */
function neglect(): number {
  const views = Object.values(useGarden.getState().shown);
  if (!views.length) return 0;
  return views.filter((v) => v.state !== 'vivid').length / views.length;
}

export function FogBanks() {
  const ids = useGarden(useShallow((s) => Object.keys(s.garden.memories)));
  const layout = useLayout();
  return (
    <>
      {THIN_BANKS.map((b, i) => (
        <Bank key={`thin${i}`} position={[b.x, b.h * 0.45, b.z]} width={b.w} height={b.h} period={b.period} seed={i * 3.7 + 1}
          target={() => (FOG_THIN + NEGLECT_EXTRA * neglect()) / THIN_OVERLAP} />
      ))}
      {ids.map((id, i) => {
        const L = layout[id];
        if (!L) return null;
        const base = baseToWorld(L.x, L.y);
        const h = flowerHeight(L.size);
        // Just in front of the flower (toward the default camera), wide enough to veil it.
        return (
          <Bank key={id} position={[base.x, h * 0.5, base.z + 0.8]} width={3.4} height={Math.max(2.2, h * 1.1)}
            period={40 + (i * 13) % 50} seed={i * 1.93 + 11}
            target={() => MEMORY_FOG[useGarden.getState().shown[id]?.state ?? 'vivid']} />
        );
      })}
    </>
  );
}
