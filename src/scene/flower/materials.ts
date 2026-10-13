// Shaders for one flower. All four materials share one uniforms object, so a state change is
// just a handful of numbers easing toward new targets (see STATE_STYLE in Flower.tsx).

import * as THREE from 'three';

export type FlowerUniforms = {
  uColor: { value: THREE.Color };
  uStem: { value: THREE.Color };
  uLight: { value: THREE.Color };
  /** Petal fill opacity (vivid 0.62, fading 0.34, outline states 0). */
  uFill: { value: number };
  /** Leaf fill opacity (0.35 while solid). */
  uLeafFill: { value: number };
  /** 1 while solid (vivid), 0.75 fading, 0 in outline states: light dots and stamens. */
  uSolid: { value: number };
  /** 0 = solid strokes, 1 = every stroke at uLineOp (ghost 0.4, lost 0.12). */
  uOutline: { value: number };
  uLineOp: { value: number };
  /** Drives bloom: how much brighter than its colour the flower draws. */
  uGlow: { value: number };
  uHalo: { value: number };
  uMotes: { value: number };
  /** Whole-flower opacity, for the reveal's dimming. */
  uOpacity: { value: number };
  /** Lean of the stem as a share of height: droop + sway. */
  uBend: { value: number };
  uHeight: { value: number };
  uTime: { value: number };
  uStill: { value: number };
  uPixelRatio: { value: number };
  /** Bloom: stems and leaves are drawn up to uGrow × height (0 → 1 as the stem rises). */
  uGrow: { value: number };
  /** Bloom: petals and light parts open out from the head (0 closed → 1 open). */
  uUnfold: { value: number };
  /** The head in flower-local units, the point petals unfold from. */
  uHead: { value: THREE.Vector2 };
  /** Dissolve: petals and light parts drifting off the head (0 attached → 1 gone). */
  uDetach: { value: number };
  /** Dissolve: a one-shot scatter of the particles (0 → 1); −1 means the usual slow lost-state drift. */
  uScatter: { value: number };
};

export function makeUniforms(height: number, head = new THREE.Vector2()): FlowerUniforms {
  return {
    uColor: { value: new THREE.Color() }, uStem: { value: new THREE.Color() }, uLight: { value: new THREE.Color() },
    uFill: { value: 0 }, uLeafFill: { value: 0 }, uSolid: { value: 0 }, uOutline: { value: 0 }, uLineOp: { value: 0.4 },
    uGlow: { value: 0 }, uHalo: { value: 0 }, uMotes: { value: 0 }, uOpacity: { value: 1 },
    uBend: { value: 0 }, uHeight: { value: height }, uTime: { value: 0 }, uStill: { value: 0 },
    uPixelRatio: { value: 1 },
    uGrow: { value: 1 }, uUnfold: { value: 1 }, uHead: { value: head.clone() },
    uDetach: { value: 0 }, uScatter: { value: -1 },
  };
}

const BEND = /* glsl */ `
uniform float uBend, uHeight;
vec3 bend(vec3 p) {
  float h = clamp(p.y / uHeight, 0.0, 1.5);
  p.x += uBend * h * h * uHeight;
  return p;
}`;

/** Bloom growth: petals (part 0) and light parts (part 2+) open out from the head; stems and leaves (part 1) don't move. */
const GROW = /* glsl */ `
uniform float uUnfold, uDetach;
uniform vec2 uHead;
vec3 grow(vec3 p, float part) {
  if (part < 0.5 || part > 1.5) {
    p.xy = uHead + (p.xy - uHead) * mix(0.06, 1.0, uUnfold);
    p.z *= uUnfold;
    // The dissolve: each petal drifts away from the head, a little upward, as it lets go.
    vec2 away = p.xy - uHead;
    p.xy += away / (length(away) + 1e-4) * uDetach * 0.45 + vec2(0.0, uDetach * 0.35);
    p.z += uDetach * 0.15;
  }
  return p;
}`;

/** Bloom growth in the fragment: stems and leaves appear from the ground up; petals fade in as they open. */
const REVEAL = /* glsl */ `
uniform float uGrow, uHeight, uDetach;
float reveal(float part, float y) {
  if (part > 0.5 && part < 1.5) return y > uGrow * uHeight * 1.02 ? 0.0 : 1.0;
  return smoothstep(0.0, 0.35, uUnfold) * (1.0 - uDetach);
}`;

/** How much brighter than its colour each part draws at full glow (feeds the bloom pass). */
const GLOW_DEFINES = /* glsl */ `
#define GLOW_FILL 0.2
#define GLOW_LINE 0.15
#define GLOW_LIGHT 1.0
#define GLOW_HALO 0.4
`;

const fillShader = {
  vertexShader: /* glsl */ `
    attribute float aPart, aAlpha, aSolidOnly;
    varying float vPart, vAlpha, vSolidOnly, vY;
    ${BEND}
    ${GROW}
    void main() {
      vPart = aPart; vAlpha = aAlpha; vSolidOnly = aSolidOnly; vY = position.y;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(bend(grow(position, aPart)), 1.0);
    }`,
  fragmentShader: /* glsl */ `${GLOW_DEFINES}
    uniform vec3 uColor, uStem, uLight;
    uniform float uFill, uLeafFill, uSolid, uGlow, uOpacity, uUnfold;
    varying float vPart, vAlpha, vSolidOnly, vY;
    ${REVEAL}
    void main() {
      float shown = reveal(vPart, vY);
      if (shown <= 0.0) discard;
      vec3 col; float a;
      if (vPart < 0.5) { col = uColor; a = uFill * vAlpha; }
      else if (vPart < 1.5) { col = uStem; a = uLeafFill * vAlpha; }
      else { col = uLight; a = uSolid * vAlpha; }
      if (vSolidOnly > 0.5) a *= uSolid;
      // Light parts burn a little brighter so the bloom pass gives the flower a warm centre.
      // Tuned against the design-system Bloom page: a soft glow, never blown out to white.
      col *= vPart > 1.5 ? 1.0 + GLOW_LIGHT * uGlow : 1.0 + GLOW_FILL * uGlow;
      gl_FragColor = vec4(col, a * shown * uOpacity);
      #include <colorspace_fragment>
    }`,
};

const lineShader = {
  vertexShader: /* glsl */ `
    attribute float aPart, aAlpha;
    varying float vPart, vAlpha, vY;
    ${BEND}
    ${GROW}
    void main() {
      vPart = aPart; vAlpha = aAlpha; vY = position.y;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(bend(grow(position, aPart)), 1.0);
    }`,
  fragmentShader: /* glsl */ `${GLOW_DEFINES}
    uniform vec3 uColor, uStem, uLight;
    uniform float uOutline, uLineOp, uSolid, uGlow, uOpacity, uUnfold;
    varying float vPart, vAlpha, vY;
    ${REVEAL}
    void main() {
      float shown = reveal(vPart, vY);
      if (shown <= 0.0) discard;
      vec3 col = vPart < 0.5 ? uColor : (vPart < 1.5 ? uStem : uLight);
      float a = mix(vAlpha, uLineOp, uOutline);
      if (vPart > 2.5) a = vAlpha * uSolid; // stamens: only while solid
      gl_FragColor = vec4(col * (1.0 + GLOW_LINE * uGlow), a * shown * uOpacity);
      #include <colorspace_fragment>
    }`,
};

const moteShader = {
  vertexShader: /* glsl */ `
    attribute vec2 aDrift, aTime;
    attribute float aSize;
    uniform float uTime, uStill, uPixelRatio, uScatter;
    varying float vA;
    void main() {
      // Same keyframes as the design system: 0% → 0, 12% → 0.75, 100% → 0, drifting 7–13s.
      float ph = fract((uTime - aTime.x) / aTime.y);
      float a = ph < 0.12 ? ph / 0.12 * 0.75 : 0.75 * (1.0 - (ph - 0.12) / 0.88);
      vA = mix(a, 0.5, uStill);
      vec3 p = position + vec3(aDrift * ph * (1.0 - uStill), 0.0);
      if (uScatter >= 0.0) {
        // The dissolve: every particle leaves the flower's shape at once, drifting up and out, then fades.
        float s = uScatter;
        p = position + vec3(aDrift * (0.25 + 1.2 * s), 0.0) + vec3(0.0, 0.25 * s, 0.0);
        vA = 0.8 * sin(3.14159 * min(1.0, s * 1.15 + 0.05));
      }
      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      gl_Position = projectionMatrix * mv;
      gl_PointSize = aSize * 2.0 * uPixelRatio * (11.5 / -mv.z);
    }`,
  fragmentShader: /* glsl */ `
    uniform vec3 uColor;
    uniform float uMotes, uOpacity;
    varying float vA;
    void main() {
      vec2 c = gl_PointCoord - 0.5;
      if (dot(c, c) > 0.25) discard;
      gl_FragColor = vec4(uColor, vA * uMotes * uOpacity);
      #include <colorspace_fragment>
    }`,
};

const haloShader = {
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `${GLOW_DEFINES}
    uniform vec3 uColor;
    uniform float uHalo, uGlow, uOpacity, uTime, uStill;
    varying vec2 vUv;
    void main() {
      // Breathes on a 7s cycle: opacity 0.8 → 1, radius 1 → 1.06.
      float s = mix(0.5 - 0.5 * cos(uTime * 6.2831853 / 7.0), 1.0, uStill);
      float r = length(vUv - 0.5) * 2.0 / (1.0 + 0.06 * s);
      float a = uHalo * max(0.0, 1.0 - r) * (0.8 + 0.2 * s);
      gl_FragColor = vec4(uColor * (1.0 + GLOW_HALO * uGlow), a * a * 1.2 * uOpacity);
      #include <colorspace_fragment>
    }`,
};

const base = { transparent: true, depthWrite: false };

export function makeMaterials(u: FlowerUniforms) {
  const uniforms = u as unknown as Record<string, THREE.IUniform>;
  return {
    fill: new THREE.ShaderMaterial({ ...base, ...fillShader, uniforms, side: THREE.DoubleSide }),
    lines: new THREE.ShaderMaterial({ ...base, ...lineShader, uniforms }),
    motes: new THREE.ShaderMaterial({ ...base, ...moteShader, uniforms }),
    // Additive, like threads and motes: a halo adds light around the head instead of laying a veil over it.
    halo: new THREE.ShaderMaterial({ ...base, ...haloShader, uniforms, blending: THREE.AdditiveBlending }),
  };
}
