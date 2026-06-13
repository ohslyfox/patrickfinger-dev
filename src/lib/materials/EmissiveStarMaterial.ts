import { Color, MeshStandardNodeMaterial } from "three/webgpu";
import { varyingProperty, vec3, max, mix } from "three/tsl";

// Floor on the instance color so the base-color division never hits zero.
const MIN_INSTANCE_CHANNEL = 0.001;

interface EmissiveStarOptions {
  /** Instance-color tint of the lit albedo: 0 = white, 1 = fully saturated. */
  baseTint?: number;
  /** Strength of the per-instance colored emissive glow (feeds bloom). */
  emissiveIntensity?: number;
}

/**
 * Material for the helix star particles, used with drei's <Instances>. The
 * per-instance color mostly drives the emissive glow while the lit albedo stays
 * near-white (the original MeshStandardMaterial + `totalEmissiveRadiance *=
 * vColor` look).
 *
 * three's instancing node multiplies the instance color into the base color with
 * no opt-out, so we set `colorNode = desiredBase / vInstanceColor` — the
 * auto-multiply then resolves back to `desiredBase`, a mostly-white pastel blend.
 */
export class EmissiveStarMaterial extends MeshStandardNodeMaterial {
  constructor({
    baseTint = 0.67,
    // High enough that the per-particle glow clears the bloom threshold on its
    // own — so bloom reads consistently whether or not the directional light is
    // dimming/shaping the lit albedo.
    emissiveIntensity = 0.6,
  }: EmissiveStarOptions = {}) {
    super({
      emissive: new Color("#ffffff"),
      roughness: 0.3,
      metalness: 0.1,
    });

    const instanceColor = varyingProperty("vec3", "vInstanceColor");
    const safeInstanceColor = max(instanceColor, vec3(MIN_INSTANCE_CHANNEL));
    const desiredBase = mix(vec3(1, 1, 1), instanceColor, baseTint);

    this.colorNode = desiredBase.div(safeInstanceColor);
    this.emissiveNode = instanceColor.mul(emissiveIntensity);
  }
}
