// Camera (scene-spec § World): drag to turn within limits, scroll to come close or rise above the garden.
// The camera always drifts gently around wherever the person left it. Focusing a memory glides close to it;
// closing the focus glides back. Nothing bounces, nothing snaps.

import { OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useGarden } from '../../store/garden';
import { flowerHead } from '../flower/Flower';
import { baseToWorld } from '../layout';
import { damp, useReducedMotion } from '../motion';
import { useLayout } from '../useLayout';

export const HOME_POS = new THREE.Vector3(0, 3.4, 11.5);
export const HOME_TARGET = new THREE.Vector3(0, 1.1, 0);
/**
 * Focus framing (screen p2): look a little to the right of the flower's head, from in front of it, so the
 * flower stands at about a third of the width and its words fit on the right half.
 */
const FOCUS_LOOK_SHIFT = new THREE.Vector3(1.0, 0, 0);
const FOCUS_OFFSET = new THREE.Vector3(0, 0.35, 4.4);

const DEG = Math.PI / 180;
const NEAR = { dist: 11.5, maxPolar: 83 * DEG };
const FAR = { dist: 16, maxPolar: 50 * DEG }; // zoomed all the way out → looking down over the garden

/** Drift: x ± 0.8 over 40s, y ± 0.15 over 55s. */
function driftAt(t: number, out: THREE.Vector3) {
  return out.set(Math.sin((t / 40) * Math.PI * 2) * 0.8, Math.sin((t / 55) * Math.PI * 2) * 0.15, 0);
}

export function CameraRig() {
  const controls = useRef<OrbitControlsImpl>(null);
  const camera = useThree((s) => s.camera);
  const clock = useThree((s) => s.clock);
  const layout = useLayout();
  const reduced = useReducedMotion();

  /** Where the person left the camera, minus the drift at that moment (so drift resumes without a jump). */
  const rest = useRef({ pos: HOME_POS.clone(), target: HOME_TARGET.clone() });
  const dragging = useRef(false);
  const focus = useRef<{ id: string | null; overridden: boolean }>({ id: null, overridden: false });
  const tmp = useRef(new THREE.Vector3());

  useFrame((_, dt) => {
    const c = controls.current;
    if (!c) return;
    const t = reduced ? 0 : clock.elapsedTime;

    // Scrolling out rises above the garden: the further away, the lower the max polar angle.
    const dist = camera.position.distanceTo(c.target);
    c.maxPolarAngle = THREE.MathUtils.lerp(NEAR.maxPolar, FAR.maxPolar, THREE.MathUtils.smoothstep(dist, NEAR.dist, FAR.dist));

    const { focusedId, garden } = useGarden.getState();
    if (focusedId !== focus.current.id) focus.current = { id: focusedId, overridden: false };
    if (dragging.current) return;

    const m = focusedId ? garden.memories[focusedId] : null;
    const L = focusedId ? layout[focusedId] : null;
    let wantPos: THREE.Vector3, wantTarget: THREE.Vector3;
    if (m && L && !focus.current.overridden) {
      wantTarget = flowerHead(m.kind, m.id, L.size, baseToWorld(L.x, L.y)).add(FOCUS_LOOK_SHIFT);
      wantPos = wantTarget.clone().add(FOCUS_OFFSET);
    } else if (m && L) {
      return; // the person moved the camera while focused: leave it where they put it
    } else {
      wantTarget = rest.current.target;
      wantPos = tmp.current.copy(rest.current.pos).add(driftAt(t, new THREE.Vector3()));
    }
    const k = damp(m ? 1.2 : 0.8, dt);
    camera.position.lerp(wantPos, k);
    c.target.lerp(wantTarget, k);
    c.update();
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enablePan={false}
      enableDamping
      dampingFactor={0.06}
      rotateSpeed={0.4}
      zoomSpeed={0.6}
      minDistance={4}
      maxDistance={FAR.dist}
      minAzimuthAngle={-25 * DEG}
      maxAzimuthAngle={25 * DEG}
      minPolarAngle={35 * DEG}
      maxPolarAngle={NEAR.maxPolar}
      target={HOME_TARGET.toArray()}
      onStart={() => { dragging.current = true; }}
      onEnd={() => {
        dragging.current = false;
        const c = controls.current;
        if (!c) return;
        if (focus.current.id) { focus.current.overridden = true; return; }
        const t = reduced ? 0 : clock.elapsedTime;
        rest.current.pos.copy(camera.position).sub(driftAt(t, new THREE.Vector3()));
        rest.current.target.copy(c.target);
      }}
    />
  );
}
