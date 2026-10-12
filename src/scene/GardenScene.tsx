// The garden: stage (P2), flowers (P3), threads (P4). See docs/build-plan.md.

import { Canvas } from '@react-three/fiber';
import { TOKENS } from '../engine';
import { useGarden } from '../store/garden';
import { CameraRig, HOME_POS } from './camera/CameraRig';
import { Effects } from './Effects';
import { Flower } from './flower/Flower';
import { FogBanks } from './fog/FogBanks';
import { Ground } from './ground/Ground';
import { baseToWorld } from './layout';
import { Threads } from './thread/Threads';
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
