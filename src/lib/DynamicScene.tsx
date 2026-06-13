import { PerspectiveCamera } from "@react-three/drei";
import { useEffect, useRef, useState } from "react";
import { Particles } from "./Particles";
import {
  PerspectiveCamera as THREEPerspectiveCamera,
  FogExp2,
  ACESFilmicToneMapping,
  NoToneMapping,
} from "three/webgpu";
import { useFrame, useThree } from "@react-three/fiber";
import {
  FlyCameraController,
  createInput,
  type FlyInput,
} from "./FlyCameraController";
import AdminControls from "./AdminControls";
import FadingTextColumnGroup from "./FadingTextColumnGroup";
import SceneEffects from "./SceneEffects";
import Starfield from "./Starfield";
import { sceneConfig, SCENE_BG_COLOR } from "./sceneConfig";

interface Props {
  adminEnabled: boolean;
  onReady?: () => void;
}

// Exponential fog fades distant content to the dark background, giving the
// "deep space" backdrop behind the gradient sky. Density controls how quickly it
// falls off — higher = thicker/closer, but a longer dark ramp that's more prone
// to banding (mitigated by the output dither in SceneEffects).
const FOG_DENSITY = 0.002;

// How far in front of the camera the link column floats as it follows along.
const TEXT_FOLLOW_DISTANCE = 200;

// Keys that drive each flight direction (WASD + arrows).
const KEY_BINDINGS: Record<string, keyof FlyInput> = {
  KeyW: "forward",
  ArrowUp: "forward",
  KeyS: "back",
  ArrowDown: "back",
  KeyA: "left",
  ArrowLeft: "left",
  KeyD: "right",
  ArrowRight: "right",
};

export default function DynamicScene({ adminEnabled, onReady }: Props) {
  const cam = useRef<THREEPerspectiveCamera>(null!);
  const get = useThree((s) => s.get);
  const sceneReady = useRef(false);
  const [controller] = useState(
    () => new FlyCameraController(1_000 * Math.random()),
  );
  const input = useRef<FlyInput>(createInput());
  // Forward-flight progress in [0, 1], shared with the link column so it shrinks
  // as the camera moves forward and grows moving back.
  const forwardProgress = useRef(0);

  // Apply fog + tone mapping from the current config. Read here (not at module
  // scope / renderer-creation time) so a config toggle that remounts this
  // component re-evaluates them.
  useEffect(() => {
    const { scene, renderer } = get();
    scene.fog = sceneConfig.fog
      ? new FogExp2(SCENE_BG_COLOR, FOG_DENSITY)
      : null;
    scene.background = null;
    if (renderer) {
      renderer.toneMapping = sceneConfig.toneMapping
        ? ACESFilmicToneMapping
        : NoToneMapping;
    }
    return () => {
      get().scene.fog = null;
    };
  }, [get]);

  useEffect(() => {
    // In admin mode AdminControls owns the keyboard; don't also drive fly input.
    if (adminEnabled) return;
    const setKey = (code: string, pressed: boolean) => {
      const dir = KEY_BINDINGS[code];
      if (!dir) return;
      input.current[dir] = pressed;
      if (pressed) controller.beginManual();
    };
    const onKeyDown = (e: KeyboardEvent) => setKey(e.code, true);
    const onKeyUp = (e: KeyboardEvent) => setKey(e.code, false);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      input.current = createInput();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [controller, adminEnabled]);

  useFrame((state, delta) => {
    if (!sceneReady.current) {
      sceneReady.current = true;
      onReady?.();
    }

    if (adminEnabled) return;

    controller.update(cam.current, state.elapsed, delta, input.current);
    forwardProgress.current = controller.forwardProgress;
  });

  return (
    <>
      {/* No `position` prop: r3f re-applies element props on every render, so a
          static position would snap the camera back to it whenever this component
          re-renders (e.g. when admin mode toggles). The controllers drive the
          camera position every frame instead. */}
      <PerspectiveCamera ref={cam} makeDefault fov={70} near={1} far={1000} />
      <AdminControls enabled={adminEnabled} />

      {/* The link column follows the camera in world space (so it stays in
          view) but counter-scales with forward progress: shrinks flying in,
          grows flying back. */}
      <FadingTextColumnGroup
        cameraRef={cam}
        progressRef={forwardProgress}
        followDistance={TEXT_FOLLOW_DISTANCE}
        follow={!adminEnabled}
        textArray={[
          { displayText: "résumé", url: "./resume.pdf" },
          {
            displayText: "github",
            url: "https://github.com/ohslyfox",
          },
          {
            displayText: "linkedin",
            url: "https://www.linkedin.com/in/patrick-f-50ab75132",
          },
        ]}
        position={{ x: 0, y: 0, z: 0 }}
      />
      <ambientLight intensity={0.06} />
      {sceneConfig.directionalLight && (
        <directionalLight
          position={[50, 50, 200]}
          intensity={1.2}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-far={500}
        />
      )}
      <Particles emissive={sceneConfig.emissiveStars} />
      {sceneConfig.sceneBackground && <Starfield />}
      <SceneEffects />
    </>
  );
}
