// The design system lays the garden out on a 1440 × 900 canvas (x, y = where a flower meets the ground).
// The 3D garden keeps that arrangement: x → world X, canvas y (lower on screen = nearer) → world Z.
// 1 world unit = 100 design px horizontally. See docs/scene-spec.md § World.

import * as THREE from 'three';
import type { Kind } from '../engine';

export const WORLD = {
  pxPerUnit: 100,
  /** Depth stretch: canvas y differences become larger Z gaps so perspective reads like the mockups. */
  depthScale: 1.6,
  centerX: 720,
  centerY: 560,
  /** Default camera distance from z = 0 (CameraRig HOME_POS.z). */
  viewDistance: 11.5,
};

export function baseToWorld(x: number, y: number): THREE.Vector3 {
  const z = ((y - WORLD.centerY) / WORLD.pxPerUnit) * WORLD.depthScale;
  // Perspective pulls far flowers toward the centre; spread them by depth so that, from the default camera,
  // the garden keeps the design canvas's composition (screens p1/p3) while still standing in real depth.
  const spread = (WORLD.viewDistance - z) / WORLD.viewDistance;
  return new THREE.Vector3(((x - WORLD.centerX) / WORLD.pxPerUnit) * spread, 0, z);
}

/** Where a flower's head sits relative to its base, as a share of its 1.5 × size height (from the design-system Garden page). */
export const HEAD_FRACTION: Record<Kind, number> = { sentence: 0.8, song: 0.62, place: 0.1, photo: 0.62 };

export function flowerHeight(size: number): number {
  return (size * 1.5) / WORLD.pxPerUnit;
}

export function headOf(base: THREE.Vector3, kind: Kind, size: number): THREE.Vector3 {
  return base.clone().add(new THREE.Vector3(0, flowerHeight(size) * HEAD_FRACTION[kind], 0));
}

/** Place a newly planted memory: golden-angle spiral around the garden centre, keeping space-6 (96px) between bases. */
export function placeNew(existing: { x: number; y: number }[], seed: number): { x: number; y: number; size: number } {
  const minGap = 96;
  for (let i = 0; i < 400; i++) {
    const a = (seed + i) * 2.39996;
    const r = 60 + i * 9;
    const x = WORLD.centerX + Math.cos(a) * r * 1.3;
    const y = WORLD.centerY + Math.sin(a) * r * 0.55;
    if (x < 80 || x > 1360 || y < 260 || y > 840) continue;
    if (existing.every((p) => Math.hypot(p.x - x, p.y - y) >= minGap)) return { x, y, size: 140 + ((seed * 37) % 30) };
  }
  return { x: WORLD.centerX, y: WORLD.centerY, size: 140 };
}
