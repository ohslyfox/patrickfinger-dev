import { Vector3 } from "three";

/**
 * Writes a uniformly-distributed random unit vector (a point on the unit sphere)
 * into `target` and returns it. Uses the standard inverse-CDF sampling so the
 * directions don't bunch at the poles.
 */
export function randomDirection(target: Vector3): Vector3 {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  const sinPhi = Math.sin(phi);
  return target.set(
    sinPhi * Math.cos(theta),
    sinPhi * Math.sin(theta),
    Math.cos(phi),
  );
}
