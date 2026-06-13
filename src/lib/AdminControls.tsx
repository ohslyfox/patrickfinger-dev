import { CameraControls } from "@react-three/drei";
import FlatText from "./FlatText";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, type ComponentRef } from "react";
import { Vector3 } from "three";
import { LOOK_TARGET } from "./FlyCameraController";

type CameraControlsImpl = ComponentRef<typeof CameraControls>;

interface Props {
  enabled: boolean;
}

// Distance the camera moves per second while an arrow key is held.
const ROAM_SPEED = 120;

// How far in front of the camera the "slyfox" text floats.
const TEXT_DISTANCE = 60;

export default function AdminControls({ enabled }: Props) {
  const groupRef = useRef<any>(null!);
  const controls = useRef<CameraControlsImpl>(null!);
  const { camera } = useThree();
  // Arrow-key state for free-roam movement.
  const roam = useRef({ up: false, down: false, left: false, right: false });
  const forward = useRef(new Vector3());
  // Camera position captured at the moment admin is enabled, plus a countdown of
  // frames over which to (re-)seat CameraControls into it. CameraControls resets
  // its target to the origin on mount and may not be connected on the exact first
  // frame, so we re-apply the seat for a few frames until it sticks.
  const seatPos = useRef(new Vector3());
  const seatFrames = useRef(0);

  // On enabling admin, capture the camera's current position to seat the controls
  // into, looking at the tornado center (so the view never snaps/looks away).
  useEffect(() => {
    if (!enabled) return;
    camera.updateMatrixWorld();
    seatPos.current.copy(camera.position);
    seatFrames.current = 5;
  }, [enabled, camera]);

  useEffect(() => {
    if (!enabled) return;
    const set = (code: string, pressed: boolean): boolean => {
      switch (code) {
        case "ArrowUp":
        case "KeyW":
          roam.current.up = pressed;
          return true;
        case "ArrowDown":
        case "KeyS":
          roam.current.down = pressed;
          return true;
        case "ArrowLeft":
        case "KeyA":
          roam.current.left = pressed;
          return true;
        case "ArrowRight":
        case "KeyD":
          roam.current.right = pressed;
          return true;
        default:
          return false;
      }
    };
    const onDown = (e: KeyboardEvent) => {
      if (set(e.code, true)) e.preventDefault();
    };
    const onUp = (e: KeyboardEvent) => set(e.code, false);
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      roam.current = { up: false, down: false, left: false, right: false };
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, [enabled]);

  useFrame((_, delta) => {
    if (controls.current) {
      // Re-seat the controls at the captured position, looking at the tornado
      // center, for a few frames after enabling — so it keeps the view instead of
      // snapping to CameraControls' default origin target.
      if (seatFrames.current > 0) {
        controls.current.setLookAt(
          seatPos.current.x,
          seatPos.current.y,
          seatPos.current.z,
          LOOK_TARGET.x,
          LOOK_TARGET.y,
          LOOK_TARGET.z,
          false,
        );
        seatFrames.current -= 1;
      }

      const step = ROAM_SPEED * delta;
      const r = roam.current;
      // Arrows fly along the current view (forward) and strafe (truck).
      if (r.up) controls.current.forward(step, false);
      if (r.down) controls.current.forward(-step, false);
      if (r.right) controls.current.truck(step, 0, false);
      if (r.left) controls.current.truck(-step, 0, false);
    }

    if (!enabled || !groupRef.current) return;
    // World-space: float the text TEXT_DISTANCE ahead of the camera and match its
    // orientation so it stays readable (FlatText faces +z, same as the camera).
    camera.getWorldDirection(forward.current);
    groupRef.current.position
      .copy(camera.position)
      .addScaledVector(forward.current, TEXT_DISTANCE);
    groupRef.current.quaternion.copy(camera.quaternion);
  });

  return enabled ? (
    <>
      <group ref={groupRef}>
        <FlatText font="./juliaMono.json" text="slyfox was here" size={1}>
          <meshStandardMaterial
            color={"#FFFFFF"}
            opacity={0.3}
            transparent={true}
            depthTest={true}
            roughness={0.9}
            metalness={0.3}
          />
        </FlatText>
      </group>
      {/* Free roam: unbounded dolly/zoom, mouse-orbit, scroll-zoom, and arrow
          keys (handled above) to fly through the world. */}
      <CameraControls ref={controls} minDistance={0} maxDistance={Infinity} />
    </>
  ) : null;
}
