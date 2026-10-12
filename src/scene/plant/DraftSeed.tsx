// While a memory is being written (screen p6): a seed waits, glowing softly, above the spot where it will grow,
// with dashed threads to the memories it could join. Planting drops it and the bloom takes over.

import { Billboard } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { KIND_COLOR, previewThreads, threadKey } from '../../engine';
import { useGarden } from '../../store/garden';
import { flowerHead } from '../flower/Flower';
import { baseToWorld } from '../layout';
import { useReducedMotion } from '../motion';
import { ThreadArc } from '../thread/ThreadArc';
import { useLayout } from '../useLayout';

/** The seed waits about head-high for a small flower. */
const SEED_HEIGHT = 1.3;

const seedShader = {
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform vec3 uColor;
    uniform float uBreath;
    varying vec2 vUv;
    void main() {
      vec2 c = (vUv - 0.5) * 2.0;
      float seed = 1.0 - smoothstep(0.16, 0.2, length(c * vec2(2.4, 1.3)));
      float glow = pow(max(0.0, 1.0 - length(c)), 2.5) * (0.35 + 0.15 * uBreath);
      gl_FragColor = vec4(uColor * (1.0 + seed), seed + glow);
      #include <colorspace_fragment>
    }`,
};

export function DraftSeed() {
  const draft = useGarden((s) => (s.planting === 'field' ? s.draft : null));
  const garden = useGarden((s) => s.garden);
  const now = useGarden((s) => s.now);
  const layout = useLayout();
  const reduced = useReducedMotion();
  const group = useRef<THREE.Group>(null);

  const color = draft ? (draft.kind === 'photo' && draft.hue ? draft.hue : KIND_COLOR[draft.kind]) : KIND_COLOR.sentence;
  const material = useMemo(() => new THREE.ShaderMaterial({
    ...seedShader, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uColor: { value: new THREE.Color() }, uBreath: { value: 0 } },
  }), []);
  material.uniforms.uColor.value.set(color);

  const seedAt = useMemo(() => (draft ? baseToWorld(draft.place.x, draft.place.y).setY(SEED_HEIGHT) : null),
    [draft?.place.x, draft?.place.y]);

  // The threads it could join, by the same rules planting will use.
  const suggestions = useMemo(() => {
    if (!draft?.tags || !seedAt) return [];
    return previewThreads(garden, { kind: draft.kind, text: draft.text, ...draft.tags }, now())
      .map((t) => (t.a === '__draft__' ? t.b : t.a))
      .filter((id) => layout[id])
      .map((id) => ({ id, head: flowerHead(garden.memories[id].kind, id, layout[id].size, baseToWorld(layout[id].x, layout[id].y)) }));
  }, [draft?.tags, draft?.kind, draft?.text, garden, layout, seedAt]);

  useFrame(({ clock }) => {
    if (!group.current || !seedAt) return;
    const t = reduced ? 0 : clock.elapsedTime;
    group.current.position.set(seedAt.x, seedAt.y + Math.sin(t * 1.1) * 0.05, seedAt.z);
    material.uniforms.uBreath.value = 0.5 + 0.5 * Math.sin((t / 7) * Math.PI * 2);
  });

  if (!draft || !seedAt) return null;
  return (
    <>
      <group ref={group} position={seedAt}>
        <Billboard>
          <mesh material={material}><planeGeometry args={[0.36, 0.36]} /></mesh>
        </Billboard>
      </group>
      {suggestions.map((s) => (
        <ThreadArc key={threadKey('__draft__', s.id)} seed={`draft:${s.id}`} a={seedAt} b={s.head} strength={0.6} suggested />
      ))}
    </>
  );
}
