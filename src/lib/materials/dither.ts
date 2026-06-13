import { screenCoordinate, dot, sin, fract, vec2 } from "three/tsl";
import type { Node } from "three/webgpu";

type ColorNode = Node<"vec4">;

// Standard hash constants for fract(sin(dot(...))) value noise.
const HASH_DOT = vec2(12.9898, 78.233);
const HASH_SCALE = 43758.5453;

// Dither amplitude in linear space (applied before the pipeline's tone-map +
// sRGB encode). Half a quantization step is enough to dissolve 8-bit banding in
// the smooth dark ramps while staying below the threshold of visible grain.
// Raise if bands persist, lower if it looks noisy.
const DITHER_AMOUNT = 1 / 255;

/**
 * Adds triangular-PDF dither to a color node: two independent per-pixel hashes
 * differenced, giving noise in (-1, 1) with a flat floor, scaled to ~one
 * quantization step. Texture-free. Apply to the final output so it covers
 * everything that quantizes (fog, gradient, bloom).
 */
export function dithered(color: ColorNode): ColorNode {
  const coord = screenCoordinate.xy;
  const r1 = fract(sin(dot(coord, HASH_DOT)).mul(HASH_SCALE));
  const r2 = fract(sin(dot(coord.add(1.0), HASH_DOT)).mul(HASH_SCALE));
  const dither = r1.sub(r2).mul(DITHER_AMOUNT);
  return color.add(dither);
}
