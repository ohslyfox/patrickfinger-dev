import { Color } from "three";
import { lerp } from "./util";

export interface TrimmedColor {
  r: number;
  g: number;
  b: number;
}

export const rainbowColors: TrimmedColor[] = [
  { r: 255, g: 0, b: 0 },
  { r: 255, g: 255, b: 0 },
  { r: 0, g: 255, b: 0 },
  { r: 0, g: 255, b: 255 },
  { r: 75, g: 25, b: 255 },
  { r: 255, g: 0, b: 255 },
];

export interface ColorLerpProp {
  colorLerp: ColorLerp;
}

export class ColorLerp {
  private colors: TrimmedColor[];
  private currentColor: TrimmedColor;
  private idx: number;
  private lerpVal: number;
  private lerpAmt: number;

  constructor(colors: TrimmedColor[], lerpAmt = 0.001) {
    this.colors = colors;
    this.currentColor = new Color(colors[0].r, colors[0].g, colors[0].b);
    this.idx = 0;
    this.lerpVal = 0;
    this.lerpAmt = lerpAmt;
  }

  public get color(): TrimmedColor {
    return this.currentColor;
  }

  public step(): TrimmedColor {
    this.lerpVal = Math.min(1, this.lerpVal + this.lerpAmt);
    if (this.lerpVal >= 1) {
      this.idx = (this.idx + 1) % this.colors.length;
      this.lerpVal = 0;
    }

    const nextIndex = this.idx === this.colors.length - 1 ? 0 : this.idx + 1;
    const currentColor = this.colors[this.idx];
    const nextColor = this.colors[nextIndex];
    this.currentColor.r = Math.round(
      lerp(currentColor.r, nextColor.r, this.lerpVal)
    );
    this.currentColor.g = Math.round(
      lerp(currentColor.g, nextColor.g, this.lerpVal)
    );
    this.currentColor.b = Math.round(
      lerp(currentColor.b, nextColor.b, this.lerpVal)
    );
    return this.currentColor;
  }
}
