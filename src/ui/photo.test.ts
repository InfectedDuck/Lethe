import { describe, expect, it } from 'vitest';
import { averageColor } from './photo';

const pixels = (...colors: [number, number, number, number?][]) =>
  new Uint8ClampedArray(colors.flatMap(([r, g, b, a = 255]) => [r, g, b, a]));

describe('photo colour', () => {
  it('averages the mid-tones', () => {
    expect(averageColor(pixels([232, 168, 124], [232, 168, 124]))).toBe('#e8a87c');
    expect(averageColor(pixels([200, 100, 0], [100, 200, 0]))).toBe('#969600');
  });

  it('ignores near-black shadow, near-white sky and transparent pixels', () => {
    expect(averageColor(pixels([232, 168, 124], [0, 0, 0], [255, 255, 255], [10, 200, 10, 0]))).toBe('#e8a87c');
  });

  it('returns null when nothing is left', () => {
    expect(averageColor(pixels([0, 0, 0], [255, 255, 255]))).toBeNull();
  });
});
