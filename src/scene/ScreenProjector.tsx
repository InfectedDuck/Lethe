// Registers the projector used by the DOM interface (see screen.ts). Lives inside the canvas so it can read
// the camera and the canvas size; it renders nothing.

import { useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useGarden } from '../store/garden';
import { flowerHead } from './flower/Flower';
import { baseToWorld } from './layout';
import { setProjector } from './screen';
import { useLayout } from './useLayout';

export function ScreenProjector() {
  const camera = useThree((s) => s.camera);
  // R3F measures the canvas on resize; reading it here costs nothing, while getBoundingClientRect() per memory
  // forced a layout for every flower every frame (P12.1).
  const size = useThree((s) => s.size);
  const sizeRef = useRef(size);
  sizeRef.current = size;
  const layout = useLayout();
  const layoutRef = useRef(layout);
  layoutRef.current = layout;

  useEffect(() => {
    const v = new THREE.Vector3(), side = new THREE.Vector3();
    setProjector((id) => {
      const m = useGarden.getState().garden.memories[id];
      const L = layoutRef.current[id];
      if (!m || !L) return null;
      const { left, top, width, height } = sizeRef.current;
      const rect = { left, top, width, height, right: left + width, bottom: top + height };
      const base = baseToWorld(L.x, L.y);
      // A lost memory is only its dark seed now: point at the seed, not where the head used to be.
      const head = m.lost ? base.clone().setY(0.2) : flowerHead(m.kind, m.id, L.size, base);
      const toPx = (p: THREE.Vector3) => {
        v.copy(p).project(camera);
        return { x: rect.left + (v.x + 1) / 2 * rect.width, y: rect.top + (1 - v.y) / 2 * rect.height, z: v.z };
      };
      const h = toPx(head);
      // Half the flower's width, measured along the camera's right vector so it holds when the camera turns.
      side.setFromMatrixColumn(camera.matrixWorld, 0).multiplyScalar((L.size / 100) * 0.48).add(head);
      const s = toPx(side);
      const b = toPx(base);
      const onScreen = h.z < 1 && h.x > -50 && h.x < rect.right + 50 && h.y > -50 && h.y < rect.bottom + 50;
      return { x: h.x, y: h.y, r: Math.max(12, Math.hypot(s.x - h.x, s.y - h.y)), baseY: b.y, onScreen };
    });
    return () => setProjector(null);
  }, [camera]);

  return null;
}
