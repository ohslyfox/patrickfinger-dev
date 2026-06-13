import {
  Float32BufferAttribute,
  InstancedBufferAttribute,
  InstancedMesh,
  Object3D,
  PlaneGeometry,
  PointsNodeMaterial,
} from "three/webgpu";
import {
  sin,
  fract,
  smoothstep,
  vec2,
  vec3,
  float,
  attribute,
  uv,
  distance,
} from "three/tsl";
import { uTime, uTwinkle } from "./sharedUniforms";

// Per-star twinkle phase, derived from position to match the original GLSL seed.
const SEED_X = 73.17;
const SEED_Y = 91.31;
const SEED_Z = 37.19;
const SEED_PERIOD = 6.2831; // ~2π

const TWINKLE_SPEED = 40.0;
const TWINKLE_SIZE_AMOUNT = 0.25;
const TWINKLE_ALPHA_AMOUNT = 0.45;

// With sizeAttenuation the sprite path treats this like a screen-space point
// size (gl_PointSize convention), so it is resolution dependent, not world
// units. Reconciles the original GLSL `300.0 / -mvPos.z` point size.
const SPRITE_SIZE = 0.0027;

const ALPHA_BASE = 0.35;
const ALPHA_SIZE_SCALE = 0.25;

// Each star gets a fixed baseline brightness drawn from its seed (so brightness
// varies star-to-star, not just by size), spanning MIN..MIN+RANGE. Larger stars
// get an extra lift on top via the size smoothstep.
const BRIGHTNESS_MIN = 0.35;
const BRIGHTNESS_RANGE = 0.55;
const SIZE_BRIGHTNESS_LIFT = 0.3;
const SIZE_FADE_START = 0.7;
const SIZE_FADE_END = 2.0;

// Round sprite radius in uv space (centered at 0.5): soft falloff to POINT_CORE,
// hard cutoff at POINT_EDGE.
const POINT_RADIUS = 0.5;
const POINT_CORE = 0.1;
const POINT_EDGE = 0.49;

/**
 * Twinkling background stars. WebGPU renders native THREE.Points at a fixed 1px
 * regardless of sizeNode, so the stars are instanced billboard sprites instead:
 * a PointsNodeMaterial in sprite mode (on an InstancedMesh of a unit plane),
 * which honors sizeNode on both backends. Per-star size and twinkle phase come
 * from the `aSize` / `aSeed` attributes built in {@link buildTwinkleMesh}.
 */
export class TwinkleStarsMaterial extends PointsNodeMaterial {
  constructor() {
    super();
    this.transparent = true;
    this.depthWrite = false;
    this.sizeAttenuation = true;

    const aSize = attribute<"float">("aSize", "float");
    const aSeed = attribute<"float">("aSeed", "float");
    // uTwinkle (0/1) scales the oscillation so the stars can be held steady.
    const twinkle = sin(uTime.mul(TWINKLE_SPEED).add(aSeed)).mul(uTwinkle);

    this.sizeNode = aSize
      .mul(float(1.0).add(twinkle.mul(TWINKLE_SIZE_AMOUNT)))
      .mul(SPRITE_SIZE);

    const alpha = float(ALPHA_BASE)
      .add(aSize.mul(ALPHA_SIZE_SCALE))
      .add(twinkle.mul(TWINKLE_ALPHA_AMOUNT));
    // Per-star baseline from the seed (fract gives a stable 0..1 per star), so
    // brightness varies between stars; larger stars get an additional lift.
    const seedBrightness = fract(aSeed.mul(SEED_X));
    const brightness = float(BRIGHTNESS_MIN)
      .add(seedBrightness.mul(BRIGHTNESS_RANGE))
      .add(
        smoothstep(SIZE_FADE_START, SIZE_FADE_END, aSize).mul(
          SIZE_BRIGHTNESS_LIFT,
        ),
      );

    // Sprite mode uses the plane's own uv, not pointUV: pointUV generates
    // `gl_PointCoord`, which is invalid on WGSL and only valid for native points.
    const radial = distance(uv(), vec2(POINT_RADIUS));
    this.colorNode = vec3(brightness);
    // Soft falloff times a hard cutoff, replacing the original `if (d>0.5) discard`.
    this.opacityNode = alpha
      .mul(smoothstep(POINT_RADIUS, POINT_CORE, radial))
      .mul(smoothstep(POINT_RADIUS, POINT_EDGE, radial));
  }
}

/**
 * Builds the {@link TwinkleStarsMaterial}'s instanced mesh: one unit-plane
 * instance per star, positioned at its location with `aSize` / `aSeed` attributes.
 */
export function buildTwinkleMesh(
  positions: Float32BufferAttribute,
  sizes: Float32BufferAttribute,
  material: TwinkleStarsMaterial,
): InstancedMesh {
  const count = sizes.count;
  const sizeAttr = new Float32Array(count);
  const seedAttr = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    sizeAttr[i] = sizes.getX(i);
    const x = positions.getX(i);
    const y = positions.getY(i);
    const z = positions.getZ(i);
    seedAttr[i] = Math.abs(x * SEED_X + y * SEED_Y + z * SEED_Z) % SEED_PERIOD;
  }

  const geometry = new PlaneGeometry(1, 1);
  geometry.setAttribute("aSize", new InstancedBufferAttribute(sizeAttr, 1));
  geometry.setAttribute("aSeed", new InstancedBufferAttribute(seedAttr, 1));

  const mesh = new InstancedMesh(geometry, material, count);
  const placement = new Object3D();
  for (let i = 0; i < count; i++) {
    placement.position.set(
      positions.getX(i),
      positions.getY(i),
      positions.getZ(i),
    );
    placement.updateMatrix();
    mesh.setMatrixAt(i, placement.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.frustumCulled = false;
  return mesh;
}
