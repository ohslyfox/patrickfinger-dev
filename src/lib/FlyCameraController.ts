import { Vector3 } from "three/webgpu";
import { map } from "./util/util";
import { tornado } from "./Particles";

// Point every camera mode keeps in frame (matches the original auto-cam).
export const LOOK_TARGET = new Vector3(0, 0, -390);
const WORLD_UP = new Vector3(0, 1, 0);

// Manual-flight physics.
const ACCELERATION = 140; // units/s² applied per held axis
const MAX_SPEED = 60; // units/s clamp on velocity
const DRAG = 1.6; // air resistance: velocity *= exp(-DRAG * dt); lower = coasts longer
// Keep the camera this fraction inside the cone wall so stars don't clip past it.
const BOUNDS_FRACTION = 0.8;
// Minimum usable radius near the cone tip so the camera always has room to move.
const MIN_BOUND_RADIUS = 6;
// Distance from a boundary over which velocity heading into it is eased to zero,
// so the camera glides to a smooth stop at the edge instead of snapping.
const BOUNDARY_CUSHION = 30;

// Idle handling.
const IDLE_TIMEOUT = 10; // seconds of no input before returning to auto
const RETURN_DURATION = 1.5; // seconds to glide back onto the auto path

type Mode = "auto" | "manual" | "returning";

export interface FlyInput {
  forward: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
}

export function createInput(): FlyInput {
  return { forward: false, back: false, left: false, right: false };
}

/**
 * Drives the scene camera. By default it follows the gentle auto-orbit; when
 * WASD/arrow input arrives it switches to physics-based free flight (camera-
 * relative, with acceleration, drag, and bounds that keep it inside the particle
 * tornado), always facing the tornado center. After {@link IDLE_TIMEOUT} seconds
 * idle it glides back onto the auto path and resumes.
 */
export class FlyCameraController {
  private mode: Mode = "auto";
  private idleTime = 0;
  private returnTime = 0;

  private readonly position = new Vector3();
  private readonly velocity = new Vector3();

  // Reused scratch vectors so update() never allocates.
  private readonly forward = new Vector3();
  private readonly right = new Vector3();
  private readonly accel = new Vector3();
  private readonly autoPos = new Vector3();
  private readonly returnFrom = new Vector3();

  // Random phase so multiple loads don't share the same orbit timing.
  constructor(private readonly autoOffset: number) {}

  /** Current camera world position (read-only; do not mutate). */
  get cameraPosition(): Vector3 {
    return this.position;
  }

  /**
   * How far forward into the tornado the camera has flown, in [0, 1]: 0 at the
   * near/back limit, 1 deep in. Drives the link column's counter-scaling.
   */
  get forwardProgress(): number {
    const { flightZNear, flightZFar } = tornado;
    const t = (this.position.z - flightZNear) / (flightZFar - flightZNear);
    return Math.max(0, Math.min(1, t));
  }

  /** Called on any key press to take manual control. */
  beginManual(): void {
    if (this.mode === "auto" || this.mode === "returning") {
      this.mode = "manual";
    }
    this.idleTime = 0;
  }

  /**
   * Advances the camera one frame and writes its transform.
   * @param camera object with position + lookAt (the drei PerspectiveCamera)
   * @param elapsed total scene time (for the auto orbit)
   * @param dt frame delta in seconds
   * @param input current key state
   */
  update(
    camera: { position: Vector3; lookAt: (v: Vector3) => void },
    elapsed: number,
    dt: number,
    input: FlyInput,
  ): void {
    this.computeAutoPosition(elapsed, this.autoPos);

    switch (this.mode) {
      case "auto":
        this.position.copy(this.autoPos);
        break;
      case "manual":
        this.stepManual(dt, input);
        break;
      case "returning":
        this.stepReturn(dt);
        break;
    }

    camera.position.copy(this.position);
    camera.lookAt(LOOK_TARGET);
  }

  // The original gentle Lissajous orbit near the tornado mouth.
  private computeAutoPosition(elapsed: number, target: Vector3): void {
    const time = (elapsed + this.autoOffset) / 10;
    const radius = map(Math.sin(time) + Math.cos(time), -1.5, 1.5, -5, 5);
    target.set(radius * Math.cos(time), radius * Math.sin(time), radius - 23);
  }

  private stepManual(dt: number, input: FlyInput): void {
    // The camera looks at the target, so "forward" is toward it and "right" is
    // the horizontal perpendicular (cross with world up). Derived each frame from
    // the current position.
    this.forward.copy(LOOK_TARGET).sub(this.position).normalize();
    this.right.crossVectors(this.forward, WORLD_UP).normalize();

    this.accel.set(0, 0, 0);
    if (input.forward) this.accel.addScaledVector(this.forward, 1);
    if (input.back) this.accel.addScaledVector(this.forward, -1);
    if (input.right) this.accel.addScaledVector(this.right, 1);
    if (input.left) this.accel.addScaledVector(this.right, -1);
    if (this.accel.lengthSq() > 0) {
      this.accel.normalize().multiplyScalar(ACCELERATION);
    }

    // Integrate velocity with acceleration, then apply drag and clamp speed.
    this.velocity.addScaledVector(this.accel, dt);
    this.velocity.multiplyScalar(Math.exp(-DRAG * dt));
    if (this.velocity.lengthSq() > MAX_SPEED * MAX_SPEED) {
      this.velocity.setLength(MAX_SPEED);
    }

    // Ease velocity heading into the z-limits so the camera decelerates into the
    // edge instead of overshooting and snapping back at the clamp.
    this.cushionZ();

    this.position.addScaledVector(this.velocity, dt);
    // Only redirect momentum along the wall while a strafe key is held; otherwise
    // the camera just stops at the wall and any residual orbit decays via drag.
    const strafing = input.left || input.right;
    this.applyBounds(strafing);

    // Idle bookkeeping: any held key keeps us manual; otherwise count toward auto.
    const active = input.forward || input.back || input.left || input.right;
    this.idleTime = active ? 0 : this.idleTime + dt;
    if (this.idleTime >= IDLE_TIMEOUT) {
      this.mode = "returning";
      this.returnTime = 0;
      this.returnFrom.copy(this.position);
    }
  }

  // Glide from where flight left off back onto the live auto-orbit position.
  private stepReturn(dt: number): void {
    this.returnTime += dt;
    const t = Math.min(1, this.returnTime / RETURN_DURATION);
    const eased = t * t * (3 - 2 * t); // smoothstep
    this.position.lerpVectors(this.returnFrom, this.autoPos, eased);
    if (t >= 1) {
      this.mode = "auto";
      this.velocity.set(0, 0, 0);
    }
  }

  // Eases the z-velocity to zero as the camera nears a z-limit, so it glides to
  // a stop at the edge. Only damps velocity heading *toward* the boundary, so you
  // can always accelerate back away from it.
  private cushionZ(): void {
    const { flightZNear, flightZFar } = tornado;
    if (this.velocity.z > 0) {
      const room = flightZNear - this.position.z; // distance to the near limit
      if (room < BOUNDARY_CUSHION) {
        this.velocity.z *= Math.max(0, room / BOUNDARY_CUSHION);
      }
    } else if (this.velocity.z < 0) {
      const room = this.position.z - flightZFar; // distance to the far limit
      if (room < BOUNDARY_CUSHION) {
        this.velocity.z *= Math.max(0, room / BOUNDARY_CUSHION);
      }
    }
  }

  // Clamp z to the flight range and the xy-radius to the cone at that depth, so
  // the camera stays inside the tornado. While `strafing`, the outward velocity
  // at the radial wall is redirected into a slide along the wall (tangent of the
  // boundary circle) so the strafe carries you around the edge; otherwise the
  // outward velocity is just cancelled, so the camera stops and any residual
  // orbit decays via drag rather than spinning forever.
  private applyBounds(strafing: boolean): void {
    if (this.position.z > tornado.flightZNear) {
      this.position.z = tornado.flightZNear;
      this.velocity.z = Math.min(0, this.velocity.z);
    } else if (this.position.z < tornado.flightZFar) {
      this.position.z = tornado.flightZFar;
      this.velocity.z = Math.max(0, this.velocity.z);
    }

    const maxRadius = Math.max(
      MIN_BOUND_RADIUS,
      tornado.radiusAt(this.position.z) * BOUNDS_FRACTION,
    );
    const r = Math.hypot(this.position.x, this.position.y);
    if (r <= maxRadius) return;

    this.position.x *= maxRadius / r;
    this.position.y *= maxRadius / r;

    const nx = this.position.x / maxRadius;
    const ny = this.position.y / maxRadius;
    const radialSpeed = this.velocity.x * nx + this.velocity.y * ny;
    if (radialSpeed <= 0) return;

    if (strafing) {
      // CCW tangent of the outward normal (-y, x); flip to match current motion.
      let tx = -ny;
      let ty = nx;
      if (this.velocity.x * tx + this.velocity.y * ty < 0) {
        tx = -tx;
        ty = -ty;
      }
      // Move the outward radial momentum onto the tangent (slide along the wall).
      this.velocity.x += radialSpeed * (tx - nx);
      this.velocity.y += radialSpeed * (ty - ny);
    } else {
      // Not strafing: just cancel the outward component so it doesn't pile up.
      this.velocity.x -= radialSpeed * nx;
      this.velocity.y -= radialSpeed * ny;
    }
  }
}
