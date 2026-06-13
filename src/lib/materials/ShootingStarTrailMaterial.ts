import { PointsNodeMaterial } from "three/webgpu";
import { attribute, vec3 } from "three/tsl";

// Base sprite size; the per-point `aWeight` attribute scales it so the trail is
// widest at its midpoint and tapers thin at the head and tail (elliptical).
const SPRITE_SIZE = 0.9;

/**
 * Trail points for a shooting star. A {@link PointsNodeMaterial} in sprite mode
 * (so sizeNode is honored on WebGPU) reading per-point attributes set by
 * {@link ShootingStars}: `aWeight` shapes the elliptical profile (thin ends, wide
 * middle) and `aAlpha` carries the per-point opacity so individual points fade.
 *
 * Unlike the twinkle stars this draws a raw THREE.Points (no plane geometry, so
 * no `uv`), so it can't sample a uv-based round mask — the dots are small and
 * bloom-blurred, so the plain square sprite reads as a soft point regardless.
 */
export class ShootingStarTrailMaterial extends PointsNodeMaterial {
  constructor() {
    super();
    this.transparent = true;
    this.depthWrite = false;
    this.sizeAttenuation = true;

    const aWeight = attribute<"float">("aWeight", "float");
    const aAlpha = attribute<"float">("aAlpha", "float");

    this.sizeNode = aWeight.mul(SPRITE_SIZE);
    this.colorNode = vec3(1.0);
    this.opacityNode = aAlpha;
  }
}
