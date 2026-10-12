// A photo memory's flower takes the photo's own colour (design system Bloom: "the consumer extracts it").
// Average a 32 × 32 thumbnail, ignoring near-black and near-white pixels, which are mostly shadow, sky and paper.

const SIZE = 32;
const DARKEST = 0.08;
const LIGHTEST = 0.92;

/** Average colour of RGBA pixels as hex, skipping near-black, near-white and transparent ones. Null if none remain. */
export function averageColor(rgba: Uint8ClampedArray): string | null {
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < rgba.length; i += 4) {
    if (rgba[i + 3] < 128) continue;
    const lum = (0.2126 * rgba[i] + 0.7152 * rgba[i + 1] + 0.0722 * rgba[i + 2]) / 255;
    if (lum < DARKEST || lum > LIGHTEST) continue;
    r += rgba[i]; g += rgba[i + 1]; b += rgba[i + 2]; n++;
  }
  if (!n) return null;
  const hex = (v: number) => Math.round(v / n).toString(16).padStart(2, '0');
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

/** The photo's dominant colour, for its flower. Undefined if the image can't be read (the flower then uses `light`). */
export async function dominantColor(file: Blob): Promise<string | undefined> {
  try {
    const bitmap = await createImageBitmap(file, { resizeWidth: SIZE, resizeHeight: SIZE, resizeQuality: 'medium' });
    const canvas = new OffscreenCanvas(SIZE, SIZE);
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    ctx.drawImage(bitmap, 0, 0, SIZE, SIZE);
    bitmap.close();
    return averageColor(ctx.getImageData(0, 0, SIZE, SIZE).data) ?? undefined;
  } catch {
    return undefined;
  }
}
