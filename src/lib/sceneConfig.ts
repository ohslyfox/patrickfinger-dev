// How the particle rainbow is distributed across the tornado:
//  - solid:  every particle shares one cycling color
//  - band:   color offset advances along the helix (banded revolutions)
//  - stripe: color offset follows the angle around the axis (radial stripes)
export type ColorLerpStyle = "solid" | "band" | "stripe";
export const COLOR_LERP_STYLES: ColorLerpStyle[] = ["solid", "band", "stripe"];

export interface SceneConfig {
  bloom: boolean;
  fog: boolean;
  directionalLight: boolean;
  sceneBackground: boolean;
  toneMapping: boolean;
  emissiveStars: boolean;
  /** @deprecated No TSL/WebGPU equivalent; inert after the WebGPU migration. */
  depthOfField: boolean;
  shootingStars: boolean;
  twinkle: boolean;
  gradientRotation: boolean;
  colorLerpStyle: ColorLerpStyle;
}

// Near-black with a faint blue tint matching the sky's dark floor, so fog fades
// distant content into the background instead of to a flat black that would
// stand out against the sky.
export const SCENE_BG_COLOR = "#1c1f29";

export const sceneConfig: SceneConfig = {
  bloom: true,
  fog: true,
  directionalLight: true,
  sceneBackground: true,
  toneMapping: true,
  emissiveStars: true,
  depthOfField: true,
  shootingStars: true,
  twinkle: true,
  gradientRotation: true,
  colorLerpStyle: "band",
};

// Randomize the particle color style on each page load.
sceneConfig.colorLerpStyle =
  COLOR_LERP_STYLES[Math.floor(Math.random() * COLOR_LERP_STYLES.length)];

// The boolean (toggleable) keys of SceneConfig.
export type BooleanConfigKey = {
  [K in keyof SceneConfig]: SceneConfig[K] extends boolean ? K : never;
}[keyof SceneConfig];

/** Flips a boolean scene option in place (used by the admin config panel). */
export function toggleSceneOption(key: BooleanConfigKey): void {
  sceneConfig[key] = !sceneConfig[key];
}

export function setColorLerpStyle(style: ColorLerpStyle): void {
  sceneConfig.colorLerpStyle = style;
}
