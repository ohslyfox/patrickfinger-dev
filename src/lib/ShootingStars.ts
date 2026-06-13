import {
  BufferGeometry,
  Float32BufferAttribute,
  Line,
  LineBasicMaterial,
  Object3D,
  Points,
  Vector3,
} from "three/webgpu";
import { ShootingStarTrailMaterial } from "./materials/ShootingStarTrailMaterial";

const MAX_SHOOTING_STARS = 5;
const SPAWN_CHANCE = 0.008; // per idle slot, per frame
const TRAIL_POINTS = 24;

// Stars spawn somewhere between these distances from the (camera-following) dome
// center, so some read as nearer and some as farther.
const SPAWN_RADIUS_MIN = 120;
const SPAWN_RADIUS_MAX = 300;

// Over its life a streak drifts radially by up to this fraction of its spawn
// radius — half drift nearer, half farther — so the depth keeps changing.
const DRIFT_FRACTION = 0.25;

const MIN_LENGTH = 12;
const LENGTH_RANGE = 8;
const MIN_SPEED = 0.4;
const SPEED_RANGE = 0.4;

const TRAIL_SCATTER = 0.8;
const HEAD_LENGTH_FRACTION = 0.3;

// The streak's body is widest at its midpoint and tapers to this fraction at the
// head and tail, giving the elliptical (lens) profile.
const TRAIL_END_WEIGHT = 0.12;

// A streak fades in over the first FADE_IN_DISTANCE of travel, fades out over
// FADE_OUT_LENGTHS streak-lengths past its full length, and is retired after
// DESPAWN_LENGTHS streak-lengths.
const FADE_IN_DISTANCE = 5;
const FADE_OUT_LENGTHS = 3;
const DESPAWN_LENGTHS = 4;

const HEAD_OPACITY = 0.9;
const TRAIL_OPACITY = 0.5;

interface Streak {
  active: boolean;
  progress: number;
  speed: number;
  length: number;
  origin: Vector3;
  direction: Vector3;
  radial: Vector3; // unit radial at spawn, for depth drift
  drift: number; // signed radial drift distance applied over the streak's life
}

function createStreak(): Streak {
  return {
    active: false,
    progress: 0,
    speed: 0,
    length: 0,
    origin: new Vector3(),
    direction: new Vector3(),
    radial: new Vector3(),
    drift: 0,
  };
}

function randomPointOnSphere(radius: number, target: Vector3): Vector3 {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  return target.set(
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.sin(phi) * Math.sin(theta),
    radius * Math.cos(phi),
  );
}

// Writes a random unit vector perpendicular to `normal` into `target`. Builds
// the tangent basis from the world axis least aligned with `normal`, so it can't
// degenerate to NaN the way `randomVector.cross(normal)` does when collinear.
function randomTangent(normal: Vector3, target: Vector3, scratch: Vector3) {
  const ax = Math.abs(normal.x);
  const ay = Math.abs(normal.y);
  const az = Math.abs(normal.z);
  if (ax <= ay && ax <= az) scratch.set(1, 0, 0);
  else if (ay <= az) scratch.set(0, 1, 0);
  else scratch.set(0, 0, 1);

  const tangentA = target.crossVectors(normal, scratch).normalize();
  const tangentB = scratch.crossVectors(normal, tangentA).normalize();
  const angle = Math.random() * Math.PI * 2;
  return target
    .multiplyScalar(Math.cos(angle))
    .addScaledVector(tangentB, Math.sin(angle))
    .normalize();
}

/**
 * A pool of shooting-star streaks, each a bright head line trailing a scatter of
 * fading points whose body is widest at the middle and thin at the ends. Owns
 * its Three.js objects (a Line + a Points per slot); a consumer renders
 * {@link objects} and calls {@link update} each frame.
 */
export class ShootingStars {
  readonly objects: Object3D[];

  private readonly streaks: Streak[];
  private readonly heads: Line[];
  private readonly trails: Points[];
  private readonly scratch = new Vector3();
  private readonly driftOffset = new Vector3();

  constructor() {
    this.streaks = Array.from({ length: MAX_SHOOTING_STARS }, createStreak);
    this.heads = Array.from({ length: MAX_SHOOTING_STARS }, () =>
      this.createHead(),
    );
    this.trails = Array.from({ length: MAX_SHOOTING_STARS }, () =>
      this.createTrail(),
    );
    this.objects = [...this.heads, ...this.trails];
  }

  /** Advances every streak one frame; `enabled` gates new spawns. */
  update(enabled: boolean): void {
    for (let i = 0; i < MAX_SHOOTING_STARS; i++) {
      const streak = this.streaks[i];
      if (!streak.active) {
        if (enabled && Math.random() < SPAWN_CHANCE) this.spawn(streak);
        continue;
      }
      this.advance(streak, this.heads[i], this.trails[i]);
    }
  }

  /** Releases the geometries and materials owned by every streak. */
  dispose(): void {
    for (const object of this.objects) {
      const renderable = object as Line | Points;
      renderable.geometry.dispose();
      (
        renderable.material as LineBasicMaterial | ShootingStarTrailMaterial
      ).dispose();
    }
  }

  private createHead(): Line {
    const geometry = new BufferGeometry();
    geometry.setAttribute(
      "position",
      new Float32BufferAttribute([0, 0, 0, 0, 0, 0], 3),
    );
    const material = new LineBasicMaterial({
      color: "#ffffff",
      transparent: true,
      opacity: 0,
    });
    const line = new Line(geometry, material);
    // The geometry's bounding sphere is computed from the initial origin points
    // and never recomputed as the streak moves, so without this the renderer
    // frustum-culls the streak (thinking it's a point at the origin).
    line.frustumCulled = false;
    return line;
  }

  private createTrail(): Points {
    const geometry = new BufferGeometry();
    geometry.setAttribute(
      "position",
      new Float32BufferAttribute(new Float32Array(TRAIL_POINTS * 3), 3),
    );
    // Per-point size profile (elliptical) and opacity, driven each frame.
    geometry.setAttribute(
      "aWeight",
      new Float32BufferAttribute(new Float32Array(TRAIL_POINTS), 1),
    );
    geometry.setAttribute(
      "aAlpha",
      new Float32BufferAttribute(new Float32Array(TRAIL_POINTS), 1),
    );
    const points = new Points(geometry, new ShootingStarTrailMaterial());
    points.frustumCulled = false; // see createHead — bounding sphere isn't updated
    return points;
  }

  private spawn(streak: Streak): void {
    const radius =
      SPAWN_RADIUS_MIN + Math.random() * (SPAWN_RADIUS_MAX - SPAWN_RADIUS_MIN);
    randomPointOnSphere(radius, streak.origin);
    streak.radial.copy(streak.origin).normalize();
    randomTangent(streak.radial, streak.direction, this.scratch);
    streak.length = MIN_LENGTH + Math.random() * LENGTH_RANGE;
    streak.speed = MIN_SPEED + Math.random() * SPEED_RANGE;
    // Signed drift in [-DRIFT_FRACTION, +DRIFT_FRACTION] * radius: nearer or farther.
    streak.drift = (Math.random() * 2 - 1) * DRIFT_FRACTION * radius;
    streak.progress = 0;
    streak.active = true;
  }

  private advance(streak: Streak, head: Line, trail: Points): void {
    const fadePhase =
      streak.progress > streak.length
        ? (streak.progress - streak.length) / (streak.length * FADE_OUT_LENGTHS)
        : 0;
    streak.progress += streak.speed * (1 - fadePhase * 0.8);

    // Radial depth drift, eased over the streak's life (despawn distance).
    const life = Math.min(
      1,
      streak.progress / (streak.length * DESPAWN_LENGTHS),
    );
    this.driftOffset.copy(streak.radial).multiplyScalar(streak.drift * life);

    // Whole-streak fade (in over spawn, out near despawn); the head uses it as a
    // material-wide opacity, the trail folds it into each point's aAlpha.
    const fadeIn = Math.min(1, streak.progress / FADE_IN_DISTANCE);
    const fadeOut = Math.max(
      0,
      1 -
        (streak.progress - streak.length) / (streak.length * FADE_OUT_LENGTHS),
    );
    const streakOpacity = Math.min(fadeIn, fadeOut);

    this.updateHeadGeometry(streak, head, fadePhase);
    this.updateTrailGeometry(streak, trail, fadePhase, streakOpacity);
    this.headMaterial(head).opacity = streakOpacity * HEAD_OPACITY;

    if (streak.progress > streak.length * DESPAWN_LENGTHS) {
      streak.active = false;
      this.headMaterial(head).opacity = 0;
    }
  }

  private updateHeadGeometry(
    streak: Streak,
    head: Line,
    fadePhase: number,
  ): void {
    const headPos = streak.origin
      .clone()
      .addScaledVector(streak.direction, streak.progress)
      .add(this.driftOffset);
    const headLen = streak.length * HEAD_LENGTH_FRACTION * (1 - fadePhase);
    const tailPos = streak.origin
      .clone()
      .addScaledVector(streak.direction, Math.max(0, streak.progress - headLen))
      .add(this.driftOffset);

    const position = head.geometry.getAttribute("position");
    position.setXYZ(0, tailPos.x, tailPos.y, tailPos.z);
    position.setXYZ(1, headPos.x, headPos.y, headPos.z);
    position.needsUpdate = true;
  }

  private updateTrailGeometry(
    streak: Streak,
    trail: Points,
    fadePhase: number,
    streakOpacity: number,
  ): void {
    const position = trail.geometry.getAttribute("position");
    const weight = trail.geometry.getAttribute("aWeight");
    const alpha = trail.geometry.getAttribute("aAlpha");
    // The visible body retracts toward the head as the streak fades out.
    const visibleLength = streak.length * (1 - fadePhase * 0.7);

    for (let p = 0; p < TRAIL_POINTS; p++) {
      const u = p / (TRAIL_POINTS - 1); // 0 at head, 1 at tail
      const trailProgress = streak.progress - visibleLength * u;
      if (trailProgress < 0) {
        weight.setX(p, 0);
        alpha.setX(p, 0);
        continue;
      }
      const point = this.scratch
        .copy(streak.origin)
        .addScaledVector(streak.direction, trailProgress)
        .add(this.driftOffset);
      // Scatter grows toward the tail (u=0 is the head).
      const scatter = (1 - (1 - u) * (1 - u)) * TRAIL_SCATTER;
      point.x += (Math.random() - 0.5) * scatter;
      point.y += (Math.random() - 0.5) * scatter;
      point.z += (Math.random() - 0.5) * scatter;
      position.setXYZ(p, point.x, point.y, point.z);

      // Elliptical width: widest at the midpoint (u=0.5), thin at both ends.
      const ellipse = Math.sin(u * Math.PI);
      weight.setX(p, TRAIL_END_WEIGHT + (1 - TRAIL_END_WEIGHT) * ellipse);
      // Points nearer the head are brighter; the whole trail dims as it fades,
      // both with its body retraction (fadePhase) and the streak's overall fade.
      alpha.setX(p, (1 - u) * (1 - fadePhase) * streakOpacity * TRAIL_OPACITY);
    }
    position.needsUpdate = true;
    weight.needsUpdate = true;
    alpha.needsUpdate = true;
  }

  private headMaterial(head: Line): LineBasicMaterial {
    return head.material as LineBasicMaterial;
  }
}
