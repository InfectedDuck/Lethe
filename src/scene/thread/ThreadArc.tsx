// A thread of light between two memories (scene-spec § Threads; design system Thread, p13).
// A thin warm core with a soft glow around it, arcing upward. Above strength 0.3 a pulse of light travels
// along it every 4–7s and a few motes drift along it over 7–13s. Threads to ghosts flicker. Hovering a flower
// brightens its threads and dims the rest. Always `thread` colour, never a flower's, with no nodes or arrows.

import { Line } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { Line2 } from 'three-stdlib';
import { rng, TOKENS } from '../../engine';
import { damp, useReducedMotion } from '../motion';

export type ThreadArcProps = {
  a: THREE.Vector3;
  b: THREE.Vector3;
  /** 0–1 brightness target (engine threadBrightness). Eases over ~3s. */
  strength: number;
  /** Hover emphasis: 1 normal, HOVER_LIT for the hovered flower's threads, HOVER_DIM for the rest. Eases in ~0.4s. */
  emphasis?: number;
  /** Either end is a ghost: the thread flickers. */
  flicker?: boolean;
  /** Dashed preview of a thread a memory could join while it is being planted (P6). */
  suggested?: boolean;
  /** Stable id (the two memory ids), so each thread keeps its own rhythm. */
  seed: string;
  /** A tend just happened at one end: a bright ripple runs to the other end. `at` is performance.now(). */
  ripple?: { at: number; fromB: boolean };
};

export const HOVER_LIT = 1.4;
export const HOVER_DIM = 0.35;
/** A pulse takes this long to cross a thread, then rests until its period comes round. */
const PULSE_TRAVEL_S = 1.8;
/** A tending ripple crosses a thread in this long; the neighbour swells as it arrives. */
export const RIPPLE_TRAVEL_MS = 900;
const ARC_LIFT = 0.28;

const pointsShader = {
  vertexShader: /* glsl */ `
    attribute float aAlpha, aSize;
    uniform float uPixelRatio;
    varying float vAlpha;
    void main() {
      vAlpha = aAlpha;
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * mv;
      gl_PointSize = aSize * uPixelRatio * (11.5 / -mv.z);
    }`,
  fragmentShader: /* glsl */ `
    uniform vec3 uColor;
    varying float vAlpha;
    void main() {
      float d = length(gl_PointCoord - 0.5) * 2.0;
      float a = vAlpha * pow(max(0.0, 1.0 - d), 2.0);
      // Brighter than the core so the bloom pass gives each mote a small halo.
      gl_FragColor = vec4(uColor * 1.8, a);
      #include <colorspace_fragment>
    }`,
};

export function threadCurve(a: THREE.Vector3, b: THREE.Vector3): THREE.QuadraticBezierCurve3 {
  const mid = a.clone().lerp(b, 0.5);
  mid.y += a.distanceTo(b) * ARC_LIFT; // threads arc upward
  return new THREE.QuadraticBezierCurve3(a.clone(), mid, b.clone());
}

export function ThreadArc({ a, b, strength, emphasis = 1, flicker = false, suggested = false, seed, ripple }: ThreadArcProps) {
  // Keyed on coordinates, so a parent passing fresh Vector3s each render doesn't rebuild the curve.
  const curve = useMemo(() => threadCurve(a, b), [a.x, a.y, a.z, b.x, b.y, b.z]);
  const linePoints = useMemo(() => curve.getPoints(48), [curve]);
  const reduced = useReducedMotion();
  const dpr = useThree((s) => s.viewport.dpr);

  // Each thread's own rhythm: pulse period 4–7s, 2–4 motes on 7–13s loops, a flicker phase.
  const rhythm = useMemo(() => {
    const r = rng(`thread:${seed}`);
    const period = 4 + r() * 3, offset = r() * period, flickerPhase = r() * 100;
    const motes = Array.from({ length: 2 + Math.floor(r() * 3) }, () => ({ dur: 7 + r() * 6, offset: r() * 13, size: 1.6 + r() * 1.2 }));
    return { period, offset, flickerPhase, motes };
  }, [seed]);

  // One small point cloud per thread: index 0 is the pulse, 1 the tending ripple, the rest are motes.
  const count = 2 + rhythm.motes.length;
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(new Float32Array(count), 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(count), 1));
    return g;
  }, [count]);
  const material = useMemo(() => new THREE.ShaderMaterial({
    ...pointsShader, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uColor: { value: new THREE.Color(TOKENS.thread) }, uPixelRatio: { value: 1 } },
  }), []);
  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);

  const core = useRef<Line2>(null);
  const glow = useRef<Line2>(null);
  const now = useRef({ s: 0, e: emphasis });
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const base = useMemo(() => new THREE.Color(TOKENS.thread), []);

  useFrame(({ clock }, dt) => {
    const cur = now.current;
    cur.s += (strength - cur.s) * damp(1.2, dt); // state changes: ~3s, like dusk
    cur.e += (emphasis - cur.e) * damp(6, dt); // hover: ~0.4s, like the interface waking
    const s = cur.s, e = cur.e;
    const t = reduced ? 0 : clock.elapsedTime;
    const fl = flicker && !reduced
      ? 0.75 + 0.25 * (0.5 + 0.5 * Math.sin(t * 3 + rhythm.flickerPhase) * Math.sin(t * 5.3 + rhythm.flickerPhase * 0.7))
      : 1;

    const coreMat = core.current?.material, glowMat = glow.current?.material;
    if (coreMat) {
      coreMat.opacity = Math.min(1, (suggested ? 0.5 : 0.12 + 0.6 * s) * e * fl);
      coreMat.linewidth = suggested ? 1 : 0.6 + 0.8 * s;
      coreMat.color.copy(base).multiplyScalar(suggested ? 1 : (0.6 + 1.2 * s) * Math.min(e, 1.2));
    }
    if (glowMat) {
      glowMat.opacity = suggested ? 0 : Math.min(1, (0.02 + 0.05 * s) * e * fl);
      glowMat.linewidth = 3 + 6 * s;
    }

    // Pulse and motes: only on threads strong enough to carry light, never on suggestions or with reduced motion.
    const moving = !suggested && !reduced && s > 0.3;
    const pos = geometry.attributes.position as THREE.BufferAttribute;
    const alpha = geometry.attributes.aAlpha as THREE.BufferAttribute;
    const size = geometry.attributes.aSize as THREE.BufferAttribute;
    const u = ((t + rhythm.offset) % rhythm.period) / PULSE_TRAVEL_S;
    curve.getPoint(Math.min(1, u), tmp);
    pos.setXYZ(0, tmp.x, tmp.y, tmp.z);
    alpha.setX(0, moving && u < 1 ? Math.sin(Math.PI * u) * (0.35 + 0.65 * s) * e * fl : 0);
    size.setX(0, 5 + 3 * s);
    // Tending ripple: twice as bright as a pulse, from the tended flower to its neighbour. Shown even on faint
    // threads, because it is the answer to something the person just did.
    const ru = ripple && !reduced ? (performance.now() - ripple.at) / RIPPLE_TRAVEL_MS : -1;
    const rippling = ru >= 0 && ru <= 1;
    curve.getPoint(rippling ? (ripple!.fromB ? 1 - ru : ru) : 0, tmp);
    pos.setXYZ(1, tmp.x, tmp.y, tmp.z);
    alpha.setX(1, rippling ? Math.min(1, 2 * (0.35 + 0.65 * Math.max(s, 0.4))) * Math.sin(Math.PI * ru) : 0);
    size.setX(1, 9);
    if (rippling && coreMat) coreMat.opacity = Math.min(1, coreMat.opacity * (1 + 0.8 * Math.sin(Math.PI * ru)));
    rhythm.motes.forEach((m, i) => {
      const mu = (((t + m.offset) / m.dur) % 1 + 1) % 1;
      curve.getPoint(mu, tmp);
      pos.setXYZ(i + 2, tmp.x, tmp.y, tmp.z);
      alpha.setX(i + 2, moving ? 0.55 * Math.sin(Math.PI * mu) * s * e * fl : 0);
      size.setX(i + 2, m.size);
    });
    pos.needsUpdate = true; alpha.needsUpdate = true; size.needsUpdate = true;
    material.uniforms.uPixelRatio.value = dpr;
  });

  return (
    <>
      <Line ref={glow} points={linePoints} color={TOKENS.thread} lineWidth={3} transparent opacity={0} depthWrite={false} />
      <Line ref={core} points={linePoints} color={TOKENS.thread} lineWidth={1} transparent opacity={0} depthWrite={false}
        toneMapped={false} dashed={suggested} dashSize={0.06} gapSize={0.05} />
      <points geometry={geometry} material={material} frustumCulled={false} />
    </>
  );
}
