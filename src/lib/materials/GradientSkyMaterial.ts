import { BackSide, MeshBasicNodeMaterial } from "three/webgpu";
import {
  positionLocal,
  normalize,
  dot,
  clamp,
  mix,
  sin,
  cos,
  vec3,
  Fn,
} from "three/tsl";
import { uSkyRotation } from "./sharedUniforms";

const SKY_COLOR_A = vec3(0 / 255, 123 / 255, 167 / 255); // #007ba7
const SKY_COLOR_B = vec3(111 / 255, 69 / 255, 110 / 255); // #6f456e

// Axis the rotated view direction projects onto, then a slope/offset that remap
// that projection into [0, 1] for the blue->purple mix.
const GRADIENT_AXIS = normalize(vec3(1.0, -1.0, 0.0));
const GRADIENT_SLOPE = 0.45;
const GRADIENT_OFFSET = 0.8;

// Near-black deep-space floor the gradient is diffused into.
const SKY_FLOOR = vec3(1 / 255, 2 / 255, 6 / 255);
// How much of the vibrant blue->purple gradient shows through the black floor.
// Low so black dominates everywhere; the colors are a subtle, diffused tint
// rather than a bright band — so the middle never blows out.
const COLOR_AMOUNT = 0.068;

/**
 * Background sky: a slowly rotating two-color gradient on the inside of the star
 * sphere. Rotates the world-space view direction around Z by
 * {@link uSkyRotation}, projects it onto {@link GRADIENT_AXIS}, and mixes the
 * sky colors by it.
 */
export class GradientSkyMaterial extends MeshBasicNodeMaterial {
  constructor() {
    super();
    this.side = BackSide;
    this.depthWrite = false;
    // The sky is the backdrop; its darkness is baked into the gradient, so it
    // shouldn't be re-darkened by distance fog (which varies with camera position
    // and caused a bright/uneven edge against the fogged scene).
    this.fog = false;
    this.colorNode = Fn(() => {
      // Local (not world) direction so the gradient is orientation-only — stable
      // as the sky sphere translates to follow the camera (see Starfield).
      const dir = normalize(positionLocal);
      const c = cos(uSkyRotation);
      const s = sin(uSkyRotation);
      const rotatedDir = vec3(
        dir.x.mul(c).add(dir.y.mul(s)),
        dir.x.mul(s).negate().add(dir.y.mul(c)),
        dir.z,
      );
      const along = dot(rotatedDir, GRADIENT_AXIS); // [-1, 1] along the axis
      const t = clamp(along.mul(GRADIENT_SLOPE).add(GRADIENT_OFFSET), 0.0, 1.0);

      // Vibrant blue->purple gradient, diffused into the near-black floor by a low
      // COLOR_AMOUNT so black dominates everywhere and the colors read as a subtle
      // deep-space tint — never a bright band in the middle. Banding handled by
      // the output dither (see SceneEffects).
      const gradient = mix(SKY_COLOR_A, SKY_COLOR_B, t);
      return mix(SKY_FLOOR, gradient, COLOR_AMOUNT);
    })();
  }
}
