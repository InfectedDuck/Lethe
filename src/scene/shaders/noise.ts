// GLSL value noise + fbm, shared by fog banks and (later) petals and dissolve.
export const NOISE_GLSL = /* glsl */ `
float lt_hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float lt_noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(lt_hash(i), lt_hash(i + vec2(1.0, 0.0)), u.x),
             mix(lt_hash(i + vec2(0.0, 1.0)), lt_hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float lt_fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  mat2 r = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 5; i++) { v += a * lt_noise(p); p = r * p * 2.02 + 17.0; a *= 0.5; }
  return v;
}
`;
