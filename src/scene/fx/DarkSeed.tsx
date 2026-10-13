// What a lost memory leaves (storyboard p18, last frame): a small dark seed in an empty spot, with a faint ring,
// lying on the ground where the flower stood. It can be returned to: clicking it opens the memory with "return".

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { TOKENS } from '../../engine';
import { useReducedMotion } from '../motion';
import { dissolveBeats } from './dissolveTimeline';

const seedShader = {
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform vec3 uDark, uFog;
    uniform float uAlpha;
    varying vec2 vUv;
    void main() {
      vec2 c = (vUv - 0.5) * 2.0;
      // The seed: a small dark almond, darker than the ground, with a hairline of fog around it.
      float r = length(c * vec2(1.0, 1.7));
      float seed = 1.0 - smoothstep(0.17, 0.2, r);
      float rim = exp(-pow((r - 0.2) / 0.03, 2.0)) * 0.45;
      // A faint ring around the empty spot.
      float rr = length(c);
      float ring = exp(-pow((rr - 0.85) / 0.025, 2.0)) * 0.18;
      vec3 col = mix(uFog, uDark, seed);
      float a = max(seed * 0.92, rim + ring);
      gl_FragColor = vec4(col, a * uAlpha);
      #include <colorspace_fragment>
    }`,
};

export function DarkSeed({ diedAt, age }: { diedAt?: number; age?: number }) {
  const reduced = useReducedMotion();
  const material = useMemo(() => new THREE.ShaderMaterial({
    ...seedShader, transparent: true, depthWrite: false,
    uniforms: { uDark: { value: new THREE.Color('#05070b') }, uFog: { value: new THREE.Color(TOKENS.fog) }, uAlpha: { value: 0 } },
  }), []);
  useEffect(() => () => material.dispose(), [material]);

  useFrame(() => {
    const b = dissolveBeats(age ?? (diedAt === undefined ? Infinity : performance.now() - diedAt), reduced);
    material.uniforms.uAlpha.value = b.seed;
  });

  return (
    // Flat on the ground, just above it so the ground never hides it.
    <mesh material={material} rotation-x={-Math.PI / 2} position-y={0.006}>
      <planeGeometry args={[0.55, 0.55]} />
    </mesh>
  );
}
