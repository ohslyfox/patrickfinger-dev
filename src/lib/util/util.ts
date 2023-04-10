export interface TrimmedColor {
  r: number;
  g: number;
  b: number;
}

export const lerp = (start: number, end: number, t: number): number => {
  return start * (1 - t) + end * t;
};

export const map = (
  input: number,
  y1: number,
  y2: number,
  y3: number,
  y4: number
): number => {
  return y3 + ((y4 - y3) / (y2 - y1)) * (input - y1);
};

export const mapAndBound = (
  input: number,
  y1: number,
  y2: number,
  y3: number,
  y4: number
): number => {
  const val = map(input, y1, y2, y3, y4);
  return Math.max(y3, Math.min(y4, val));
};

export const shadeColor = (color: TrimmedColor, percent: number): TrimmedColor => {
  return {
    r: Math.round(Math.max(0, Math.min(color.r * (100 + percent) / 100, 255))),
    g: Math.round(Math.max(0, Math.min(color.g * (100 + percent) / 100, 255))),
    b: Math.round(Math.max(0, Math.min(color.b * (100 + percent) / 100, 255)))
  }
}
