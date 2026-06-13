import { Color, SRGBColorSpace } from "three";
import { lerp, TrimmedColor } from "./util";

export const rainbowColors: TrimmedColor[] = [
  { r: 255, g: 0, b: 0 },
  { r: 255, g: 255, b: 0 },
  { r: 0, g: 255, b: 0 },
  { r: 0, g: 255, b: 255 },
  { r: 75, g: 25, b: 255 },
  { r: 255, g: 0, b: 255 },
];

export const pastelRainbowColors: TrimmedColor[] = [
  { r: 255, g: 100, b: 100 },
  { r: 255, g: 255, b: 100 },
  { r: 100, g: 255, b: 100 },
  { r: 100, g: 255, b: 255 },
  { r: 175, g: 125, b: 255 },
  { r: 255, g: 100, b: 255 },
];

/**
 * A continuous loop through a palette. `phase` is measured in palette segments,
 * so phase N..N+1 interpolates colors[N]..colors[N+1], wrapping at the end.
 * Sampling is pure ({@link sampleInto} writes into a caller-owned Color), so a
 * single instance can color many objects at different phase offsets without
 * per-call allocations.
 */
export class ColorLerp {
  private readonly colors: TrimmedColor[];
  private readonly speed: number;
  private phaseValue: number;

  constructor(colors: TrimmedColor[], speed = 0.001) {
    this.colors = colors;
    this.speed = speed;
    this.phaseValue = Math.random() * colors.length;
  }

  /** Current loop position, in palette segments. */
  get phase(): number {
    return this.phaseValue;
  }

  /** Advance the loop by one step. */
  step(): void {
    this.phaseValue = (this.phaseValue + this.speed) % this.colors.length;
  }

  /**
   * Writes the palette color at `phase` (segments, any real value — wrapped)
   * into `target`. The palette is authored in sRGB (like the old CSS-string
   * path), so it's interpreted as such. Does not allocate.
   */
  sampleInto(phase: number, target: Color): Color {
    const n = this.colors.length;
    const wrapped = ((phase % n) + n) % n;
    const i = Math.floor(wrapped);
    const frac = wrapped - i;
    const a = this.colors[i];
    const b = this.colors[(i + 1) % n];
    return target.setRGB(
      lerp(a.r, b.r, frac) / 255,
      lerp(a.g, b.g, frac) / 255,
      lerp(a.b, b.b, frac) / 255,
      SRGBColorSpace,
    );
  }
}
