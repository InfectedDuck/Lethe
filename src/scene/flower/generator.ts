// The flower generator, ported from the design system's SVG `Bloom` (lethe-design-system/components/bundle.js)
// to plain data. It keeps the exact order of random calls, so every 3D flower has the same shape as its 2D twin.
// Coordinates are SVG-style design px: origin at the base where the flower meets the ground, y DOWN (negative = up).
// geometry.ts turns this into Three.js buffers. No Three, no React here.

import { rng, type Kind } from '../../engine';

export type V2 = { x: number; y: number };

/** Which colour a part takes. petal = flower colour, stem = stem colour, light = `light`. */
export type Part = 'petal' | 'stem' | 'light';

export type Shape = {
  /** Closed outline, sampled. */
  pts: V2[];
  part: Part;
  /** Fill opacity multiplier in solid states (back petals are 0.55). Fill uniform comes from the state. */
  fill: number;
  /** Outline opacity in solid states. Outline states (ghost/lost) override with one value. */
  line: number;
  /** Only drawn while the flower is solid (vivid/fading): light dots and stamens. */
  solidOnly?: boolean;
  /** Back petals sit slightly behind the head. */
  back?: boolean;
  /** Petals cup toward the viewer around the head. */
  cup?: boolean;
};

export type Stroke = { pts: V2[]; part: Part; line: number; solidOnly?: boolean };

export type Mote = { at: V2; r: number; dx: number; dy: number; delay: number; dur: number };

export type FlowerData = {
  kind: Kind;
  W: number;
  H: number;
  head: V2;
  shapes: Shape[];
  strokes: Stroke[];
  /** Points along the flower, used for particles (lost state, the dissolve). */
  anchors: V2[];
  /** Drifting particles of the lost state (design system: first 44 anchors). */
  motes: Mote[];
};

const f = (n: number) => n; // bundle.js rounds to 2 decimals for SVG; we keep full precision.

/* ---------- curve sampling ---------- */

function cubic(p0: V2, p1: V2, p2: V2, p3: V2, n: number, out: V2[], skipFirst = false) {
  for (let i = skipFirst ? 1 : 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    out.push({
      x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
      y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
    });
  }
  return out;
}

function quad(p0: V2, p1: V2, p2: V2, n: number, out: V2[], skipFirst = false) {
  for (let i = skipFirst ? 1 : 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    out.push({ x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x, y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y });
  }
  return out;
}

function bez(p0: V2, p1: V2, p2: V2, p3: V2, t: number): V2 {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
  };
}

/** SVG `translate(tx,ty) rotate(deg)`: rotate (clockwise on screen, y down) then translate. */
function place(pts: V2[], tx: number, ty: number, deg: number): V2[] {
  const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  return pts.map((p) => ({ x: tx + p.x * c - p.y * s, y: ty + p.x * s + p.y * c }));
}

/** bundle.js petalPath: a leaf-like outline pointing up (−y), base at the origin. Consumes 7 random numbers. */
function petalPath(len: number, w: number, r: () => number): V2[] {
  const j = (k: number) => (r() - 0.5) * k;
  const a = w * (1 + j(0.3)), b = w * (0.85 + j(0.3));
  // Same evaluation order as the SVG string concatenation.
  const y1 = -len * (0.3 + j(0.1));
  const y2 = -len * (0.82 + j(0.1));
  const tipX = j(w * 0.4);
  const y3 = -len * (0.82 + j(0.1));
  const y4 = -len * (0.3 + j(0.1));
  const pts: V2[] = [];
  cubic({ x: 0, y: 0 }, { x: a, y: y1 }, { x: b, y: y2 }, { x: tipX, y: -len }, 10, pts);
  cubic({ x: tipX, y: -len }, { x: -b, y: y3 }, { x: -a, y: y4 }, { x: 0, y: 0 }, 10, pts, true);
  pts.pop(); // closed implicitly
  return pts;
}

function ellipse(cx: number, cy: number, rx: number, ry: number, deg: number, n = 10): V2[] {
  const pts: V2[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    pts.push({ x: Math.cos(t) * rx, y: Math.sin(t) * ry });
  }
  return place(pts, cx, cy, deg);
}

/* ---------- the generator ---------- */

const cache = new Map<string, FlowerData>();

/** Memoised: the same (kind, seed, size) always returns the same object. */
export function generateFlower(kind: Kind, seed: string, size: number): FlowerData {
  const key = `${kind}|${seed}|${size}`;
  let d = cache.get(key);
  if (!d) { d = buildFlower(kind, seed, size); cache.set(key, d); }
  return d;
}

/** Uncached build. Prefer generateFlower. */
export function buildFlower(kind: Kind, seed: string, size: number): FlowerData {
  const W = size, H = W * 1.5;
  const r = rng(`${seed}:${kind}`);
  const shapes: Shape[] = [];
  const strokes: Stroke[] = [];
  const anchors: V2[] = [];
  let head: V2 = { x: 0, y: 0 };

  function petal(px: number, py: number, ang: number, len: number, w: number, opt: { back?: boolean } = {}) {
    const rad = (ang * Math.PI) / 180;
    anchors.push({ x: px + Math.sin(rad) * len, y: py - Math.cos(rad) * len });
    anchors.push({ x: px + Math.sin(rad) * len * 0.5, y: py - Math.cos(rad) * len * 0.5 });
    shapes.push({ pts: place(petalPath(len, w, r), px, py, ang), part: 'petal', fill: opt.back ? 0.55 : 1, line: opt.back ? 0.5 : 0.85, back: opt.back, cup: true });
  }
  function stem(pts: V2[], line = 0.75) { strokes.push({ pts, part: 'stem', line }); }
  function bezStem(p0: V2, p1: V2, p2: V2, p3: V2) {
    stem(cubic(p0, p1, p2, p3, 24, []));
    for (let i = 1; i < 6; i++) anchors.push(bez(p0, p1, p2, p3, i / 6));
  }
  function leaf(p: V2, ang: number, len: number) {
    shapes.push({ pts: place(petalPath(len, len * 0.2, r), p.x, p.y, ang), part: 'stem', fill: 1, line: 0.6 });
  }

  if (kind === 'song') {
    // spiral stem twining upward; a bell hanging from an arching pedicel
    const top = -H * 0.7, turns = 1.8 + r() * 0.8, ph = r() * Math.PI * 2, A = W * 0.07;
    const pts: V2[] = [];
    for (let i = 0; i <= 48; i++) {
      const tt = i / 48;
      pts.push({ x: A * Math.sin(tt * turns * Math.PI * 2 + ph) * (0.35 + 0.65 * tt), y: top * tt });
    }
    stem(pts);
    for (let q = 4; q < pts.length; q += 6) anchors.push(pts[q]);
    leaf(pts[14], -55 - r() * 20, W * 0.16);
    leaf(pts[26], 50 + r() * 20, W * 0.13);
    const P = pts[pts.length - 1], dir = r() > 0.5 ? 1 : -1;
    const B = { x: P.x + W * 0.17 * dir, y: P.y + W * 0.05 };
    stem(quad(P, { x: P.x + W * 0.1 * dir, y: P.y - W * 0.14 }, B, 12, []));
    const L = W * 0.33, w0 = W * 0.05, w1 = W * 0.18, tilt = dir * (8 + r() * 14);
    const bell: V2[] = [];
    cubic({ x: -w0, y: 0 }, { x: -w0 * 1.6, y: L * 0.45 }, { x: -w1 * 0.8, y: L * 0.72 }, { x: -w1, y: L }, 10, bell);
    const lobes = 4;
    for (let k = 0; k < lobes; k++) {
      const xa = -w1 + (2 * w1 * (k + 0.5)) / lobes, xb = -w1 + (2 * w1 * (k + 1)) / lobes;
      quad(bell[bell.length - 1], { x: xa, y: L + W * 0.03 }, { x: xb, y: L }, 4, bell, true);
    }
    cubic({ x: w1, y: L }, { x: w1 * 0.8, y: L * 0.72 }, { x: w0 * 1.6, y: L * 0.45 }, { x: w0, y: 0 }, 10, bell, true);
    shapes.push({ pts: place(bell, B.x, B.y, tilt), part: 'petal', fill: 1, line: 0.9 });
    strokes.push({ pts: place(quad({ x: 0, y: L * 0.35 }, { x: W * 0.01, y: L * 0.8 }, { x: 0, y: L * 1.12 }, 8, []), B.x, B.y, tilt), part: 'light', line: 0.8 });
    shapes.push({ pts: place(ellipse(0, L * 1.14, 1.6, 1.6, 0, 8), B.x, B.y, tilt), part: 'light', fill: 1, line: 0, solidOnly: true });
    const tr = (tilt * Math.PI) / 180;
    head = { x: B.x - Math.sin(tr) * L * 0.6, y: B.y + Math.cos(tr) * L * 0.6 };
    for (let a1 = 0; a1 < 8; a1++) anchors.push({ x: head.x + (r() - 0.5) * w1 * 2, y: head.y + (r() - 0.5) * L * 0.8 });
  } else if (kind === 'place') {
    // a low cluster of many small petals, close to the ground
    const rx = W * 0.34, ry = H * 0.12;
    head = { x: 0, y: -ry * 0.9 };
    for (let s = 0; s < 6; s++) {
      const sx = (r() - 0.5) * rx * 1.4;
      stem(quad({ x: sx * 0.3, y: 0 }, { x: sx * 0.5, y: -ry * 0.5 }, { x: sx, y: -ry * (0.6 + r() * 0.5) }, 8, []));
    }
    leaf({ x: -rx * 0.35, y: 0 }, -70, W * 0.14);
    leaf({ x: rx * 0.35, y: 0 }, 72, W * 0.13);
    const nf = 22 + Math.floor(r() * 12);
    for (let fI = 0; fI < nf; fI++) {
      const ux = r() * 2 - 1;
      const fx = ux * rx, fy = -ry * Math.sqrt(1 - ux * ux) * (0.35 + r() * 0.75) - ry * 0.25;
      const pl = 3.5 + r() * 3, rot = r() * 72;
      for (let pI = 0; pI < 5; pI++) {
        const ang = rot + pI * 72, rad = (ang * Math.PI) / 180;
        const cx = fx + Math.sin(rad) * pl * 0.55, cy = fy - Math.cos(rad) * pl * 0.55;
        // fillOpacity in SVG is fillOp + 0.1; the +0.1 is folded into the multiplier (≈ ×1.16 at vivid).
        shapes.push({ pts: ellipse(cx, cy, pl * 0.32, pl * 0.55, ang, 8), part: 'petal', fill: 1.16, line: 0.8 });
      }
      shapes.push({ pts: ellipse(fx, fy, 0.9, 0.9, 0, 6), part: 'light', fill: 0.9, line: 0, solidOnly: true });
      anchors.push({ x: fx, y: fy });
    }
  } else if (kind === 'photo') {
    // a wide cupped bloom on a medium stem
    const hy = -H * 0.52, hx = (r() - 0.5) * W * 0.1;
    const p0 = { x: 0, y: 0 }, p1 = { x: (r() - 0.5) * W * 0.2, y: hy * 0.35 };
    const p2 = { x: hx + (r() - 0.5) * W * 0.15, y: hy * 0.7 }, p3 = { x: hx, y: hy };
    bezStem(p0, p1, p2, p3);
    const leafAt = bez(p0, p1, p2, p3, 0.35);
    const leafSide = r() > 0.5 ? 1 : -1;
    leaf(leafAt, leafSide * (55 + r() * 15), W * 0.2);
    head = { x: hx, y: hy - W * 0.12 };
    const cupL = W * 0.3;
    for (const a of [-62, -22, 22, 62]) {
      const ang = a + (r() - 0.5) * 8;
      petal(hx, hy, ang, cupL * (0.9 + r() * 0.15), cupL * 0.62, { back: true });
    }
    for (const a of [-36, 0, 36]) {
      const ang = a + (r() - 0.5) * 8;
      petal(hx, hy, ang, cupL * (0.78 + r() * 0.12), cupL * 0.6);
    }
    stem(quad({ x: hx - W * 0.06, y: hy - 2 }, { x: hx, y: hy + W * 0.06 }, { x: hx + W * 0.06, y: hy - 2 }, 8, []), 0.8);
    // Stamens are drawn only while solid; they are generated last so they never shift the other shapes.
    for (let st = 0; st < 7; st++) {
      const sxp = hx + (r() - 0.5) * W * 0.16, syp = hy - cupL * (0.55 + r() * 0.2);
      strokes.push({ pts: [{ x: hx + (sxp - hx) * 0.3, y: hy - cupL * 0.2 }, { x: sxp, y: syp }], part: 'light', line: 0.6, solidOnly: true });
      shapes.push({ pts: ellipse(sxp, syp, 1.1, 1.1, 0, 6), part: 'light', fill: 0.9, line: 0, solidOnly: true });
    }
  } else {
    // sentence: a tall single stem with a few long petals
    const shy = -H * 0.8, shx = (r() - 0.5) * W * 0.16;
    const q0 = { x: 0, y: 0 }, q1 = { x: (r() - 0.5) * W * 0.25, y: shy * 0.3 };
    const q2 = { x: shx + (r() - 0.5) * W * 0.25, y: shy * 0.62 }, q3 = { x: shx, y: shy };
    bezStem(q0, q1, q2, q3);
    leaf(bez(q0, q1, q2, q3, 0.22), -48 - r() * 18, W * 0.24);
    leaf(bez(q0, q1, q2, q3, 0.42), 44 + r() * 18, W * 0.2);
    head = { x: shx, y: shy };
    const np = 4 + Math.floor(r() * 3), spin = r() * 360;
    for (let pi = 0; pi < np; pi++) {
      const pa = spin + (360 / np) * pi + (r() - 0.5) * 22;
      const droop = Math.cos(((pa % 360) * Math.PI) / 180) < 0 ? 0.9 : 1;
      petal(shx, shy, pa, W * (0.27 + r() * 0.08) * droop, W * 0.045);
    }
    shapes.push({ pts: ellipse(shx, shy, 2.6, 2.6, 0, 10), part: 'light', fill: 1, line: 0, solidOnly: true });
  }

  // lost: the shape dissolves into drifting particles (same seed and order as bundle.js)
  const mr = rng(`${seed}:motes`);
  const motes: Mote[] = anchors.slice(0, 44).map((at) => ({
    at, r: f(0.7 + mr() * 1.1), dx: f((mr() - 0.3) * W * 0.35), dy: f(-W * (0.1 + mr() * 0.3)),
    delay: f(-mr() * 9), dur: f(7 + mr() * 6),
  }));

  return { kind, W, H, head, shapes, strokes, anchors, motes };
}
