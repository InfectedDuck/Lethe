// The ground: night, faintly lit from below where memories cluster, with the thin elliptical rings the
// screens show under each group (p1, p3). Living clusters light the ground; fading ones barely do.

import { useFrame } from '@react-three/fiber';
import { useMemo } from 'react';
import * as THREE from 'three';
import { TOKENS } from '../../engine';
import { useGarden } from '../../store/garden';
import { clustersOf } from '../clusters';
import { damp } from '../motion';
import { useLayout } from '../useLayout';

const MAX_SPOTS = 32;

const vertexShader = /* glsl */ `
varying vec2 vWorld;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const fragmentShader = /* glsl */ `
#define MAX_SPOTS ${MAX_SPOTS}
uniform vec3 uNight, uGround, uLift;
uniform vec4 uSpots[MAX_SPOTS]; // x, z, radius, strength
uniform int uCount;
varying vec2 vWorld;
void main() {
  vec3 col = uGround;
  float lift = 0.0, ring = 0.0;
  for (int i = 0; i < MAX_SPOTS; i++) {
    if (i >= uCount) break;
    vec4 s = uSpots[i];
    // Ellipses stretched along x, like the rings in the screens.
    vec2 d = (vWorld - s.xy) / vec2(1.0, 0.62);
    float r = length(d);
    lift += s.w * exp(-(r * r) / (s.z * s.z * 0.8));
    ring += s.w * exp(-pow((r - s.z) / 0.035, 2.0)) * 0.5;
    ring += s.w * exp(-pow((r - s.z * 0.62) / 0.03, 2.0)) * 0.3;
  }
  col += uLift * (lift * 0.05 + ring * 0.035);
  // The ground nearest the viewer lifts toward fog: 5% in linear light at the bottom of the home frame (z ≈ 6), which
  // reads about #1c2026, like screens p3. The garden stands on a faint slate floor instead of floating in black.
  col = mix(col, uLift, smoothstep(0.5, 6.0, vWorld.y) * 0.05);
  // The garden dissolves into night toward the edges.
  float far = smoothstep(9.0, 24.0, length(vWorld * vec2(0.8, 1.0)));
  gl_FragColor = vec4(mix(col, uNight, far), 1.0);
  #include <colorspace_fragment>
}`;

export function Ground() {
  const layout = useLayout();
  const mat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uNight: { value: new THREE.Color(TOKENS.night) },
      uGround: { value: new THREE.Color('#0d1119') },
      uLift: { value: new THREE.Color(TOKENS.fog) },
      uSpots: { value: Array.from({ length: MAX_SPOTS }, () => new THREE.Vector4()) },
      uCount: { value: 0 },
    },
    vertexShader, fragmentShader,
  }), []);

  // Clusters change only when the garden or views change; strengths ease over ~3s each frame.
  const garden = useGarden((s) => s.garden);
  const shown = useGarden((s) => s.shown);
  const clusters = useMemo(() => clustersOf(garden, shown, layout).slice(0, MAX_SPOTS), [garden, shown, layout]);

  useFrame((_, dt) => {
    const spots = mat.uniforms.uSpots.value as THREE.Vector4[];
    const k = damp(1.2, dt);
    clusters.forEach((c, i) => {
      const s = spots[i];
      if (mat.uniforms.uCount.value <= i) s.set(c.x, c.z, c.radius, 0);
      s.x = c.x; s.y = c.z; s.z += (c.radius - s.z) * k;
      s.w += (c.vitality - s.w) * k;
    });
    mat.uniforms.uCount.value = clusters.length;
  });

  return (
    <mesh rotation-x={-Math.PI / 2} position-y={-0.001} material={mat}>
      <planeGeometry args={[60, 60]} />
    </mesh>
  );
}
