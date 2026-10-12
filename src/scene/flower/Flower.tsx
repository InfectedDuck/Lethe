// One memory's flower in 3D: the design-system Bloom, grown from its seed, standing on the ground and
// turning to face the camera around its own stem. Its state eases in over ~3s, like dusk falling.

import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { flowerColor, hashSeed, mixOklab, TOKENS, type Kind, type MemoryState } from '../../engine';
import { damp, useReducedMotion } from '../motion';
import { generateFlower } from './generator';
import { flowerGeometry } from './geometry';
import { makeMaterials, makeUniforms } from './materials';

/** Uniform targets per state (scene-spec § Flowers). */
export const STATE_STYLE: Record<MemoryState, {
  fill: number; leafFill: number; solid: number; outline: number; lineOp: number; glow: number; halo: number;
  motes: number; droop: number; sway: number;
}> = {
  vivid: { fill: 0.62, leafFill: 0.35, solid: 1, outline: 0, lineOp: 0.4, glow: 1, halo: 0.5, motes: 0, droop: 0, sway: 0.012 },
  fading: { fill: 0.34, leafFill: 0.35, solid: 0.75, outline: 0, lineOp: 0.4, glow: 0.45, halo: 0.2, motes: 0, droop: 0.03, sway: 0.012 },
  ghost: { fill: 0, leafFill: 0, solid: 0, outline: 1, lineOp: 0.4, glow: 0, halo: 0, motes: 0, droop: 0.07, sway: 0.008 },
  lost: { fill: 0, leafFill: 0, solid: 0, outline: 1, lineOp: 0.12, glow: 0, halo: 0, motes: 1, droop: 0.05, sway: 0 },
};

export type FlowerProps = {
  kind: Kind;
  /** The memory's id. Never re-seed a memory. */
  seed: string;
  /** Photo flowers: the photo's dominant colour. */
  hue?: string;
  /** Design px: the drawing is size wide and 1.5 × size tall. */
  size: number;
  state: MemoryState;
  /** Where the flower meets the ground, in world units. */
  position: THREE.Vector3 | [number, number, number];
  /** 0–1, for dimming everything but what is held (reveal) or hovered threads. */
  dim?: number;
  onPointerOver?: (e: ThreeEvent<PointerEvent>) => void;
  onPointerOut?: (e: ThreeEvent<PointerEvent>) => void;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
};

export function Flower({ kind, seed, hue, size, state, position, dim = 1, onPointerOver, onPointerOut, onClick }: FlowerProps) {
  const data = generateFlower(kind, seed, size);
  const geo = flowerGeometry(data);
  const uniforms = useMemo(() => makeUniforms(geo.height), [geo]);
  const mats = useMemo(() => makeMaterials(uniforms), [uniforms]);
  useEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);

  const group = useRef<THREE.Group>(null);
  const halo = useRef<THREE.Mesh>(null);
  const first = useRef(true);
  const droop = useRef(0);
  const reduced = useReducedMotion();
  const dpr = useThree((s) => s.viewport.dpr);
  const phase = useMemo(() => (hashSeed(seed) % 1000) / 1000 * Math.PI * 2, [seed]);

  const target = useMemo(() => {
    const color = flowerColor(kind, state, hue);
    return {
      ...STATE_STYLE[state],
      color: new THREE.Color(color),
      stem: new THREE.Color(state === 'lost' ? TOKENS.fog : mixOklab(color, TOKENS.fog, 0.45)),
      light: new THREE.Color(state === 'lost' ? TOKENS.fog : TOKENS.light),
    };
  }, [kind, state, hue]);

  useFrame(({ camera, clock }, dt) => {
    const u = uniforms, t = target;
    const k = first.current ? 1 : damp(1.2, dt);
    first.current = false;
    u.uColor.value.lerp(t.color, k); u.uStem.value.lerp(t.stem, k); u.uLight.value.lerp(t.light, k);
    u.uFill.value += (t.fill - u.uFill.value) * k;
    u.uLeafFill.value += (t.leafFill - u.uLeafFill.value) * k;
    u.uSolid.value += (t.solid - u.uSolid.value) * k;
    u.uOutline.value += (t.outline - u.uOutline.value) * k;
    u.uLineOp.value += (t.lineOp - u.uLineOp.value) * k;
    u.uGlow.value += (t.glow - u.uGlow.value) * k;
    u.uHalo.value += (t.halo - u.uHalo.value) * k;
    u.uMotes.value += (t.motes - u.uMotes.value) * k;
    u.uOpacity.value += (dim - u.uOpacity.value) * k;

    const time = reduced ? 0 : clock.elapsedTime;
    u.uTime.value = time;
    u.uStill.value = reduced ? 1 : 0;
    u.uPixelRatio.value = dpr;
    // Each flower sways on its own two sines, never in sync with the others.
    const sway = reduced ? 0 : (Math.sin(time * 0.5 + phase) + 0.5 * Math.sin(time * 0.31 + phase * 1.7)) * t.sway;
    droop.current += (t.droop - droop.current) * k;
    u.uBend.value = droop.current + sway;

    // Turn to face the camera around the stem (Y-billboard).
    const g = group.current;
    if (g) g.rotation.y = Math.atan2(camera.position.x - g.position.x, camera.position.z - g.position.z);
    // The halo follows the head as the stem bends.
    if (halo.current) {
      const h = geo.head.y / geo.height;
      halo.current.position.x = geo.head.x + u.uBend.value * h * h * geo.height;
    }
  });

  const haloW = geo.width * 0.96, haloH = kind === 'place' ? geo.height * 0.4 : haloW;
  const pos = Array.isArray(position) ? position : position.toArray();

  return (
    <group ref={group} position={pos as [number, number, number]}>
      <mesh ref={halo} position={[geo.head.x, geo.head.y, -0.05]} material={mats.halo}>
        <planeGeometry args={[haloW, haloH]} />
      </mesh>
      <mesh geometry={geo.fill} material={mats.fill} />
      <lineSegments geometry={geo.lines} material={mats.lines} />
      <points geometry={geo.motes} material={mats.motes} />
      {/* Invisible hit area: the whole drawing box, so thin flowers are easy to reach. */}
      <mesh position={[0, geo.height / 2, 0]} onPointerOver={onPointerOver} onPointerOut={onPointerOut} onClick={onClick}>
        <planeGeometry args={[geo.width * 0.7, geo.height]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
    </group>
  );
}

/** Head of a flower in world space (unrotated), for threads and the camera. */
export function flowerHead(kind: Kind, seed: string, size: number, base: THREE.Vector3): THREE.Vector3 {
  return base.clone().add(flowerGeometry(generateFlower(kind, seed, size)).head);
}
