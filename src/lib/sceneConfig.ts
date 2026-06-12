export interface SceneConfig {
  bloom: boolean;
  fog: boolean;
  directionalLight: boolean;
  sceneBackground: boolean;
  toneMapping: boolean;
  emissiveStars: boolean;
  depthOfField: boolean;
  shootingStars: boolean;
  twinkle: boolean;
  gradientRotation: boolean;
}

export const SCENE_BG_COLOR = "#070b1a";

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
};
