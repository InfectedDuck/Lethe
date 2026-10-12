// The garden: stage (P2), flowers (P3). Threads are still the skeleton version; P4 replaces ThreadArc
// with the shader thread. See docs/build-plan.md.

import { Line } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useMemo } from 'react';
import * as THREE from 'three';
import { threadWeight, TOKENS } from '../engine';
import { useGarden } from '../store/garden';
import { CameraRig, HOME_POS } from './camera/CameraRig';
import { Effects } from './Effects';
import { Flower, flowerHead } from './flower/Flower';
import { FogBanks } from './fog/FogBanks';
import { Ground } from './ground/Ground';
import { baseToWorld } from './layout';
import { useLayout } from './useLayout';

export function GardenScene() {
  return (
    <Canvas
      flat
      dpr={[1, 1.75]}
      style={{ position: 'absolute', inset: 0 }}
      camera={{ position: HOME_POS.toArray(), fov: 40, near: 0.1, far: 80 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onPointerMissed={() => useGarden.getState().focus(null)}
    >
      <color attach="background" args={[TOKENS.night]} />
      <fogExp2 attach="fog" args={[TOKENS.night, 0.045]} />
      <CameraRig />
      <Ground />
      <Flowers />
      <Threads />
      <FogBanks />
      <Effects />
    </Canvas>
  );
}

function Flowers() {
  const garden = useGarden((s) => s.garden);
  const views = useGarden((s) => s.views);
  const layout = useLayout();
  const { hover, focus } = useGarden.getState();
  return (
    <>
      {Object.values(garden.memories).map((m) => {
        const L = layout[m.id];
        if (!L) return null;
        return (
          <Flower key={m.id} kind={m.kind} seed={m.id} hue={m.hue} size={L.size} state={views[m.id].state}
            position={baseToWorld(L.x, L.y)}
            onPointerOver={(e) => { e.stopPropagation(); hover(m.id); document.body.style.cursor = 'pointer'; }}
            onPointerOut={() => { hover(null); document.body.style.cursor = ''; }}
            onClick={(e) => { e.stopPropagation(); focus(m.id); }} />
        );
      })}
    </>
  );
}

function Threads() {
  const garden = useGarden((s) => s.garden);
  const views = useGarden((s) => s.views);
  const hoveredId = useGarden((s) => s.hoveredId);
  const layout = useLayout();
  return (
    <>
      {garden.threads.map((t) => {
        const A = garden.memories[t.a], B = garden.memories[t.b];
        const LA = layout[t.a], LB = layout[t.b];
        if (!A || !B || !LA || !LB) return null;
        const a = flowerHead(A.kind, A.id, LA.size, baseToWorld(LA.x, LA.y));
        const b = flowerHead(B.kind, B.id, LB.size, baseToWorld(LB.x, LB.y));
        // Visual strength: structural weight × how alive both ends are (see docs/systems.md § Thread brightness).
        const s = threadWeight(t) * Math.min(1, Math.sqrt(views[t.a].vitality * views[t.b].vitality) / 0.9);
        const lit = !hoveredId || hoveredId === t.a || hoveredId === t.b;
        return <ThreadArc key={`${t.a}|${t.b}`} a={a} b={b} strength={s * (lit ? 1 : 0.35)} />;
      })}
    </>
  );
}

function ThreadArc({ a, b, strength }: { a: THREE.Vector3; b: THREE.Vector3; strength: number }) {
  const points = useMemo(() => {
    const mid = a.clone().lerp(b, 0.5);
    mid.y += a.distanceTo(b) * 0.28; // threads arc upward
    return new THREE.QuadraticBezierCurve3(a, mid, b).getPoints(48);
  }, [a, b]);
  const color = new THREE.Color(TOKENS.thread).multiplyScalar(0.6 + strength * 1.2);
  return (
    <>
      <Line points={points} color={color} lineWidth={0.6 + strength * 0.8} transparent opacity={0.12 + 0.6 * strength} toneMapped={false} />
      <Line points={points} color={TOKENS.thread} lineWidth={3 + 6 * strength} transparent opacity={0.02 + 0.05 * strength} />
    </>
  );
}
