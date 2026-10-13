// The parts of the bloom that aren't the flower itself (storyboard p17): the glowing seed that falls, the ripple
// where it lands, and roots spreading as light along the ground. Lives inside a Flower's group while it blooms;
// the flower's own growth (stem rising, petals unfolding, glow settling) is in its shaders.

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { rng, TOKENS } from '../../engine';
import { useReducedMotion } from '../motion';
import { bloomBeats } from './bloomTimeline';

const seedShader = {
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform vec3 uColor;
    uniform float uAlpha;
    varying vec2 vUv;
    void main() {
      // A small seed (an upright almond) inside a soft glow.
      vec2 c = (vUv - 0.5) * 2.0;
      float seed = 1.0 - smoothstep(0.16, 0.2, length(c * vec2(2.4, 1.3)));
      float glow = pow(max(0.0, 1.0 - length(c)), 2.5) * 0.55;
      gl_FragColor = vec4(uColor * (1.0 + seed), (seed + glow) * uAlpha);
      #include <colorspace_fragment>
    }`,
};

export function BloomGrowth({ bornAt, age, seed }: { bornAt: number; age?: number; seed: string }) {
  const reduced = useReducedMotion();
  const seedMesh = useRef<THREE.Mesh>(null);
  const ring = useRef<THREE.Mesh>(null);
  const roots = useRef<THREE.LineSegments>(null);

  const seedMat = useMemo(() => new THREE.ShaderMaterial({
    ...seedShader, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uColor: { value: new THREE.Color(TOKENS.light) }, uAlpha: { value: 0 } },
  }), []);
  const ringMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: TOKENS.thread, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  }), []);
  const rootsMat = useMemo(() => new THREE.LineBasicMaterial({
    color: TOKENS.light, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
  }), []);

  // 3–5 roots, seeded by the memory, curving outward along the ground.
  const rootsGeo = useMemo(() => {
    const r = rng(`roots:${seed}`);
    const pts: number[] = [];
    const n = 3 + Math.floor(r() * 3);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + r() * 0.8, len = 0.25 + r() * 0.25, bendBy = (r() - 0.5) * 0.8;
      let prev = new THREE.Vector3(0, 0.01, 0);
      for (let s = 1; s <= 8; s++) {
        const t = s / 8, ang = a + bendBy * t;
        const next = new THREE.Vector3(Math.cos(ang) * len * t, 0.01, Math.sin(ang) * len * t * 0.6);
        pts.push(prev.x, prev.y, prev.z, next.x, next.y, next.z);
        prev = next;
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, [seed]);

  useEffect(() => () => { seedMat.dispose(); ringMat.dispose(); rootsMat.dispose(); rootsGeo.dispose(); }, [seedMat, ringMat, rootsMat, rootsGeo]);

  useFrame(() => {
    const b = bloomBeats(age ?? performance.now() - bornAt, reduced);
    if (seedMesh.current) { seedMesh.current.position.y = b.seedY + 0.06; seedMat.uniforms.uAlpha.value = b.seedAlpha; }
    if (ring.current) { const s = Math.max(0.001, b.ringR); ring.current.scale.set(s, s, s); ringMat.opacity = b.ringAlpha * 0.5; }
    if (roots.current) {
      rootsGeo.setDrawRange(0, Math.floor((rootsGeo.attributes.position.count / 2) * b.roots) * 2);
      rootsMat.opacity = b.rootsAlpha * 0.7;
    }
  });

  return (
    <>
      <mesh ref={seedMesh} material={seedMat}>
        <planeGeometry args={[0.32, 0.32]} />
      </mesh>
      {/* Flat on the ground: the ring and roots lie in x–z. */}
      <mesh ref={ring} material={ringMat} rotation-x={-Math.PI / 2} position-y={0.005}>
        <ringGeometry args={[0.92, 1, 48]} />
      </mesh>
      <lineSegments ref={roots} geometry={rootsGeo} material={rootsMat} />
    </>
  );
}
