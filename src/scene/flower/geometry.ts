// FlowerData (design px, y down) → merged Three.js buffers in world units (1 unit = 100px, y up).
// One flower = 1 fill mesh + 1 line set + 1 mote cloud + 1 halo quad, whatever its kind.
// Per-vertex attributes tell the shaders which colour and opacity each part takes; the state lives in uniforms.

import * as THREE from 'three';
import type { FlowerData, Part, V2 } from './generator';

export const PART_CODE: Record<Part, number> = { petal: 0, stem: 1, light: 2 };
/** Line part code 3 = light-coloured stroke drawn only while solid (photo stamens). */
const SOLID_LIGHT_LINE = 3;

const PX = 100;
/** How far petals cup toward the viewer around the head (world units per unit²). */
const CUP = 0.35;

export type FlowerGeometry = {
  fill: THREE.BufferGeometry;
  lines: THREE.BufferGeometry;
  motes: THREE.BufferGeometry;
  /** Head position in flower-local world units (y up). */
  head: THREE.Vector3;
  /** Full height in world units, for the bend in the shaders. */
  height: number;
  width: number;
};

const cache = new Map<FlowerData, FlowerGeometry>();

export function flowerGeometry(d: FlowerData): FlowerGeometry {
  let g = cache.get(d);
  if (!g) { g = build(d); cache.set(d, g); }
  return g;
}

function build(d: FlowerData): FlowerGeometry {
  const hx = d.head.x / PX, hy = -d.head.y / PX;
  const toWorld = (p: V2, z = 0) => [p.x / PX, -p.y / PX, z] as const;

  /* ---------- fills: triangulated shapes ---------- */
  const fPos: number[] = [], fPart: number[] = [], fAlpha: number[] = [], fSolid: number[] = [];
  for (const s of d.shapes) {
    if (s.fill <= 0) continue;
    const contour = s.pts.map((p) => new THREE.Vector2(p.x, p.y));
    if (THREE.ShapeUtils.isClockWise(contour)) contour.reverse();
    const tris = THREE.ShapeUtils.triangulateShape(contour, []);
    for (const tri of tris) {
      for (const i of tri) {
        const [x, y] = toWorld({ x: contour[i].x, y: contour[i].y });
        const dist2 = (x - hx) ** 2 + (y - hy) ** 2;
        const z = (s.cup ? CUP * dist2 : 0) + (s.back ? -0.02 : 0) + (s.part === 'light' ? 0.01 : 0);
        fPos.push(x, y, z);
        fPart.push(PART_CODE[s.part]);
        fAlpha.push(s.fill);
        fSolid.push(s.solidOnly ? 1 : 0);
      }
    }
  }
  const fill = new THREE.BufferGeometry();
  fill.setAttribute('position', new THREE.Float32BufferAttribute(fPos, 3));
  fill.setAttribute('aPart', new THREE.Float32BufferAttribute(fPart, 1));
  fill.setAttribute('aAlpha', new THREE.Float32BufferAttribute(fAlpha, 1));
  fill.setAttribute('aSolidOnly', new THREE.Float32BufferAttribute(fSolid, 1));

  /* ---------- lines: outlines of shapes + strokes, as segment pairs ---------- */
  const lPos: number[] = [], lPart: number[] = [], lAlpha: number[] = [];
  const pushPolyline = (pts: V2[], closed: boolean, part: number, alpha: number, cup: boolean, back: boolean) => {
    const n = closed ? pts.length : pts.length - 1;
    for (let i = 0; i < n; i++) {
      for (const p of [pts[i], pts[(i + 1) % pts.length]]) {
        const [x, y] = toWorld(p);
        const z = (cup ? CUP * ((x - hx) ** 2 + (y - hy) ** 2) : 0) + (back ? -0.02 : 0) + 0.002;
        lPos.push(x, y, z); lPart.push(part); lAlpha.push(alpha);
      }
    }
  };
  for (const s of d.shapes) if (s.line > 0) pushPolyline(s.pts, true, PART_CODE[s.part], s.line, !!s.cup, !!s.back);
  for (const s of d.strokes) pushPolyline(s.pts, false, s.solidOnly ? SOLID_LIGHT_LINE : PART_CODE[s.part], s.line, false, false);
  const lines = new THREE.BufferGeometry();
  lines.setAttribute('position', new THREE.Float32BufferAttribute(lPos, 3));
  lines.setAttribute('aPart', new THREE.Float32BufferAttribute(lPart, 1));
  lines.setAttribute('aAlpha', new THREE.Float32BufferAttribute(lAlpha, 1));

  /* ---------- motes: lost-state particles ---------- */
  const mPos: number[] = [], mDrift: number[] = [], mTime: number[] = [], mSize: number[] = [];
  for (const m of d.motes) {
    const [x, y] = toWorld(m.at);
    mPos.push(x, y, 0.01);
    mDrift.push(m.dx / PX, -m.dy / PX);
    mTime.push(m.delay, m.dur);
    mSize.push(m.r);
  }
  const motes = new THREE.BufferGeometry();
  motes.setAttribute('position', new THREE.Float32BufferAttribute(mPos, 3));
  motes.setAttribute('aDrift', new THREE.Float32BufferAttribute(mDrift, 2));
  motes.setAttribute('aTime', new THREE.Float32BufferAttribute(mTime, 2));
  motes.setAttribute('aSize', new THREE.Float32BufferAttribute(mSize, 1));

  return { fill, lines, motes, head: new THREE.Vector3(hx, hy, 0), height: d.H / PX, width: d.W / PX };
}
