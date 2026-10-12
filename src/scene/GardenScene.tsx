// The garden: stage (P2), flowers (P3), threads (P4). See docs/build-plan.md.

import { Canvas } from '@react-three/fiber';
import { TOKENS } from '../engine';
import { useGarden } from '../store/garden';
import { CameraRig, HOME_POS } from './camera/CameraRig';
import { Effects } from './Effects';
import { Flower } from './flower/Flower';
import { FogBanks } from './fog/FogBanks';
import { Ground } from './ground/Ground';
import { DraftSeed } from './plant/DraftSeed';
import { ScreenProjector } from './ScreenProjector';
import { RIPPLE_TRAVEL_MS } from './thread/ThreadArc';
import { baseToWorld } from './layout';
import { Threads } from './thread/Threads';
import { useLayout } from './useLayout';

/** How far the rest of the garden recedes while one memory is open. */
const FOCUS_DIM = 0.3;

export function GardenScene() {
  return (
    <Canvas
      flat
      dpr={[1, 1.75]}
      style={{ position: 'absolute', inset: 0 }}
      camera={{ position: HOME_POS.toArray(), fov: 40, near: 0.1, far: 80 }}
      // No MSAA here: the post-processing passes render without it (multisampling={0}), so it would be wasted.
      gl={{ antialias: false, powerPreference: 'high-performance' }}
      onPointerMissed={() => useGarden.getState().focus(null)}
    >
      <color attach="background" args={[TOKENS.night]} />
      <fogExp2 attach="fog" args={[TOKENS.night, 0.045]} />
      <CameraRig />
      <ScreenProjector />
      <Ground />
      <Flowers />
      <Threads />
      <DraftSeed />
      <FogBanks />
      <Effects />
    </Canvas>
  );
}

function Flowers() {
  const garden = useGarden((s) => s.garden);
  const shown = useGarden((s) => s.shown);
  const layout = useLayout();
  const events = useGarden((s) => s.events);
  const focusedId = useGarden((s) => s.focusedId);
  const { hover, focus } = useGarden.getState();
  // A tended flower swells at once; its neighbours swell as the ripple reaches them along the thread.
  const swellAt = (id: string) => {
    const e = events.filter((x) => x.id === id && (x.type === 'tend' || x.type === 'ripple' || x.type === 'beckon')).at(-1);
    return e ? e.at + (e.type === 'ripple' ? RIPPLE_TRAVEL_MS : 0) : undefined;
  };
  const diedAt = (id: string) => events.filter((x) => x.id === id && x.type === 'dissolve').at(-1)?.at;
  const bornAt = (id: string) => events.filter((x) => x.id === id && x.type === 'bloom').at(-1)?.at;
  return (
    <>
      {Object.values(garden.memories).map((m) => {
        const L = layout[m.id];
        if (!L) return null;
        return (
          <Flower key={m.id} kind={m.kind} seed={m.id} hue={m.hue} size={L.size} state={shown[m.id].state}
            position={baseToWorld(L.x, L.y)} swellAt={swellAt(m.id)} bornAt={bornAt(m.id)} diedAt={diedAt(m.id)}
            // An open memory stands alone; the rest of the garden recedes, as in screen p2.
            dim={focusedId && focusedId !== m.id ? FOCUS_DIM : 1}
            onPointerOver={(e) => { e.stopPropagation(); hover(m.id); document.body.style.cursor = 'pointer'; }}
            onPointerOut={() => { hover(null); document.body.style.cursor = ''; }}
            onClick={(e) => { e.stopPropagation(); focus(m.id); }} />
        );
      })}
    </>
  );
}
