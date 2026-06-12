import { PerspectiveCamera } from "@react-three/drei";
import { useRef, useState } from "react";
import { Particles } from "./Particles";
import { PerspectiveCamera as THREEPerspectiveCamera, FogExp2 } from "three";
import { useFrame } from "@react-three/fiber";
import { map } from "./util/util";
import AdminControls from "./AdminControls";
import FadingTextColumnGroup from "./FadingTextColumnGroup";
import SceneEffects from "./SceneEffects";
import Starfield from "./Starfield";
import { sceneConfig, SCENE_BG_COLOR } from "./sceneConfig";

interface Props {
  adminEnabled: boolean;
}

const fog = sceneConfig.fog ? new FogExp2(SCENE_BG_COLOR, 0.0025) : null;

export default function DynamicScene({ adminEnabled }: Props) {
  const cam = useRef<THREEPerspectiveCamera>(null!);
  const [offset] = useState(() => 1_000 * Math.random());
  const sceneReady = useRef(false);

  useFrame((state) => {
    if (!sceneReady.current) {
      state.scene.fog = fog;
      state.scene.background = null;
      sceneReady.current = true;
    }

    if (adminEnabled) return;

    const t = state.elapsed + offset;
    const timeScalingConstant = 10;
    const time = t / timeScalingConstant;
    const radius = map(Math.sin(time) + Math.cos(time), -1.5, 1.5, -5, 5);
    const x = radius * Math.cos(time);
    const y = radius * Math.sin(time);
    cam.current.lookAt(0, 0, -390);
    cam.current.position.set(x, y, radius - 23);
  });

  return (
    <>
      <PerspectiveCamera
        ref={cam}
        position={[0, 0, 0]}
        fov={70}
        near={10}
        far={1000}
      >
        <AdminControls enabled={adminEnabled} />
        <ambientLight intensity={sceneConfig.directionalLight ? 1 : 3} />
        {sceneConfig.directionalLight && (
          <directionalLight
            position={[50, 50, 0]}
            intensity={2}
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
            shadow-camera-far={500}
          />
        )}
        <Particles emissive={sceneConfig.emissiveStars} />
        <FadingTextColumnGroup
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
          position={{ x: 0, y: 0, z: -60 }}
        />
      </PerspectiveCamera>
      {sceneConfig.sceneBackground && <Starfield />}
      <SceneEffects />
    </>
  );
}
