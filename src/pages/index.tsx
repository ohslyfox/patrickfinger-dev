import styles from "../styles/Home.module.css";
import dynamic from "next/dynamic";
import { Suspense, useState } from "react";
import EggController, { EggKeys } from "../lib/EggController";
import LoadingSkeleton from "../lib/LoadingSkeleton";
import SceneConfigPanel from "../lib/SceneConfigPanel";
import { sceneConfig } from "../lib/sceneConfig";
import {
  ACESFilmicToneMapping,
  NoToneMapping,
  PCFSoftShadowMap,
} from "three/webgpu";

const Canvas = dynamic(
  () => import("@react-three/fiber/webgpu").then((mod) => mod.Canvas),
  { ssr: false },
);
const DynamicScene = dynamic(() => import("../lib/DynamicScene"), {
  ssr: false,
});

// WebGPURenderer transparently falls back to its WebGL2 backend when WebGPU is
// unavailable, so a single renderer covers both paths. TSL node materials run
// on either backend.
const createRenderer = (props: { canvas: HTMLCanvasElement }) =>
  import("three/webgpu").then(({ WebGPURenderer }) => {
    const renderer = new WebGPURenderer({ ...props, antialias: true });
    renderer.toneMapping = sceneConfig.toneMapping
      ? ACESFilmicToneMapping
      : NoToneMapping;
    renderer.toneMappingExposure = 0.85;
    return renderer;
  });

export default function Home() {
  const [adminEnabled, setAdminEnabled] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  // Bumped whenever a scene option toggles, to remount the scene so it re-reads
  // the (module-level) sceneConfig.
  const [configVersion, setConfigVersion] = useState(0);

  const keyMapping = {
    [EggKeys.SLYFOX]: setAdminEnabled,
  };

  return (
    <div className={styles.root}>
      <Canvas
        style={{ position: "relative" }}
        renderer={createRenderer}
        shadows={
          sceneConfig.directionalLight ? { type: PCFSoftShadowMap } : undefined
        }
      >
        <Suspense>
          <EggController keyMapping={keyMapping} />
          <DynamicScene
            key={configVersion}
            adminEnabled={adminEnabled}
            onReady={() => setSceneReady(true)}
          />
        </Suspense>
      </Canvas>
      <LoadingSkeleton hidden={sceneReady} />
      {adminEnabled && (
        <SceneConfigPanel onChange={() => setConfigVersion((v) => v + 1)} />
      )}
    </div>
  );
}
