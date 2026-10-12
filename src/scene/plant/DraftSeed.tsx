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

/** A glowing seed, breathing on the 7s cycle and bobbing a little: the planting seed, or the empty garden's (p14). */
export function GlowSeed({ at, color, bob = 0.05 }: { at: THREE.Vector3; color: string; bob?: number }) {
  const reduced = useReducedMotion();
  const group = useRef<THREE.Group>(null);
  const material = useMemo(() => new THREE.ShaderMaterial({
    ...seedShader, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uColor: { value: new THREE.Color() }, uBreath: { value: 0 } },
  }), []);
  material.uniforms.uColor.value.set(color);
  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = reduced ? 0 : clock.elapsedTime;
    group.current.position.set(at.x, at.y + Math.sin(t * 1.1) * bob, at.z);
    material.uniforms.uBreath.value = 0.5 + 0.5 * Math.sin((t / 7) * Math.PI * 2);
  });
  return (
    <group ref={group} position={at}>
      <Billboard>
        <mesh material={material}><planeGeometry args={[0.36, 0.36]} /></mesh>
      </Billboard>
    </group>
  );
}

/** An empty garden (screen p14): one seed glowing in the middle, waiting for the first memory. */
export function EmptyGardenSeed() {
  const empty = useGarden((s) => s.phase === 'garden' && Object.keys(s.garden.memories).length === 0 && s.planting === 'closed');
  const at = useMemo(() => baseToWorld(720, 560).setY(0.25), []);
  return empty ? <GlowSeed at={at} color={KIND_COLOR.sentence} bob={0.02} /> : null;
}

export function DraftSeed() {
  const draft = useGarden((s) => (s.planting === 'field' ? s.draft : null));
  const garden = useGarden((s) => s.garden);
  const now = useGarden((s) => s.now);
  const layout = useLayout();
  const color = draft ? (draft.kind === 'photo' && draft.hue ? draft.hue : KIND_COLOR[draft.kind]) : KIND_COLOR.sentence;

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

  if (!draft || !seedAt) return null;
  return (
    <>
      <GlowSeed at={seedAt} color={color} />
      {suggestions.map((s) => (
        <ThreadArc key={threadKey('__draft__', s.id)} seed={`draft:${s.id}`} a={seedAt} b={s.head} strength={0.6} suggested />
      ))}
    </>
  );
}
