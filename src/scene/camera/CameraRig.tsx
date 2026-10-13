// Camera (scene-spec § World): drag to turn within limits, scroll to come close or rise above the garden.
// After 5s without touching it, the camera drifts gently around wherever the person left it. Focusing a memory
// glides close to it; closing the focus glides back. Nothing bounces, nothing snaps.

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
 * Focus framing (screen p2): look a little to the right of the flower's head, from in front of and slightly
 * above it, so the flower stands at about a third of the width and its words fit on the right half.
 * The offset keeps the polar angle at ~81°, inside the 83° limit, so the glide never fights the controls.
 */
const FOCUS_LOOK_SHIFT = new THREE.Vector3(1.0, 0, 0);
const FOCUS_OFFSET = new THREE.Vector3(0, 0.7, 4.4);

const DEG = Math.PI / 180;
/**
 * The reveal (scene-spec § The reveal, screen p12): rise over the garden and look down at ~36°, with the garden
 * shifted right of centre so the list of people and places has the left of the screen.
 */
const REVEAL_TARGET = new THREE.Vector3(-2.4, 0.4, 0.6);
const REVEAL_POS = new THREE.Vector3(-2.4, 7.2, 10.0);
const REVEAL_MIN_POLAR = 45 * DEG;
/** Polar limits (scene-spec): 55°–83°. Zooming out lowers the ceiling from 83° to 55°, so the camera rises. */
const MIN_POLAR = 55 * DEG;
const NEAR = { dist: 11.5, maxPolar: 83 * DEG };
const FAR = { dist: 16, maxPolar: 55 * DEG };
/** Drift waits this long after the last touch, then fades in over DRIFT_FADE_S. */
const IDLE_S = 5;
const DRIFT_FADE_S = 2;

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

  /** Where the person left the camera. Drift is added on top once they have been still for a while. */
  const rest = useRef({ pos: HOME_POS.clone(), target: HOME_TARGET.clone() });
  const lastTouch = useRef(-Infinity);
  const dragging = useRef(false);
  /** The focused memory's framing, worked out once per focus rather than every frame. */
  const focus = useRef<{ id: string | null; lost?: boolean; overridden: boolean; target?: THREE.Vector3; pos?: THREE.Vector3 }>({ id: null, overridden: false });
  const drift = useRef(new THREE.Vector3());
  /** The reveal's pose holds until the person moves the camera themselves. */
  const reveal = useRef({ open: false, overridden: false });
  const want = useRef(new THREE.Vector3());

  useFrame((_, dt) => {
    const c = controls.current;
    if (!c) return;
    const t = clock.elapsedTime;

    // Scrolling out rises above the garden: the further away, the lower the max polar angle.
    const dist = camera.position.distanceTo(c.target);
    c.maxPolarAngle = THREE.MathUtils.lerp(NEAR.maxPolar, FAR.maxPolar, THREE.MathUtils.smoothstep(dist, NEAR.dist, FAR.dist));

    const { focusedId, garden } = useGarden.getState();
    // Re-frame when the focus changes, or when the open memory is lost or returned (seed ↔ flower).
    const focusedLost = focusedId ? garden.memories[focusedId]?.lost : undefined;
    if (focusedId !== focus.current.id || focusedLost !== focus.current.lost) {
      const m = focusedId ? garden.memories[focusedId] : null;
      const L = focusedId ? layout[focusedId] : null;
      // A lost memory is only its dark seed: come close to the seed on the ground.
      const point = m && L ? (m.lost ? baseToWorld(L.x, L.y).setY(0.35) : flowerHead(m.kind, m.id, L.size, baseToWorld(L.x, L.y))) : undefined;
      const target = point?.add(FOCUS_LOOK_SHIFT);
      focus.current = { id: focusedId, lost: focusedLost, overridden: false, target, pos: target?.clone().add(FOCUS_OFFSET) };
    }
    const revealing = useGarden.getState().reveal.open;
    if (revealing !== reveal.current.open) reveal.current = { open: revealing, overridden: false };
    c.minPolarAngle = revealing ? REVEAL_MIN_POLAR : MIN_POLAR;
    if (dragging.current) return;

    const f = focus.current;
    let wantTarget: THREE.Vector3;
    if (revealing) {
      if (reveal.current.overridden) return;
      wantTarget = REVEAL_TARGET;
      want.current.copy(REVEAL_POS);
    } else if (f.id && f.target && f.pos) {
      if (f.overridden) return; // the person moved the camera while focused: leave it where they put it
      wantTarget = f.target;
      want.current.copy(f.pos);
    } else {
      wantTarget = rest.current.target;
      const idle = t - lastTouch.current;
      const weight = reduced ? 0 : THREE.MathUtils.smoothstep(idle, IDLE_S, IDLE_S + DRIFT_FADE_S);
      want.current.copy(rest.current.pos).addScaledVector(driftAt(t, drift.current), weight);
    }
    const k = damp(f.id || revealing ? 1.2 : 0.8, dt);
    camera.position.lerp(want.current, k);
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
      minPolarAngle={MIN_POLAR}
      maxPolarAngle={NEAR.maxPolar}
      target={HOME_TARGET.toArray()}
      onStart={() => { dragging.current = true; }}
      onEnd={() => {
        dragging.current = false;
        lastTouch.current = clock.elapsedTime;
        const c = controls.current;
        if (!c) return;
        if (reveal.current.open) { reveal.current.overridden = true; return; }
        if (focus.current.id) { focus.current.overridden = true; return; }
        rest.current.pos.copy(camera.position);
        rest.current.target.copy(c.target);
      }}
    />
  );
}
