import styles from "../styles/Home.module.css";
import dynamic from "next/dynamic";
import { Suspense, useState } from "react";
import EggController, { EggKeys } from "../lib/EggController";
import { sceneConfig } from "../lib/sceneConfig";

const Canvas = dynamic(
  () => import("@react-three/fiber").then((mod) => mod.Canvas),
  { ssr: false },
);
const DynamicScene = dynamic(() => import("../lib/DynamicScene"), {
  ssr: false,
});

export default function Home() {
  const [adminEnabled, setAdminEnabled] = useState(false);

  const keyMapping = {
    [EggKeys.SLYFOX]: setAdminEnabled,
  };

  return (
    <div className={styles.root}>
      <Canvas
        style={{ position: "relative" }}
        flat={!sceneConfig.toneMapping}
        shadows={sceneConfig.directionalLight ? "soft" : undefined}
        gl={sceneConfig.toneMapping ? { toneMappingExposure: 0.85 } : undefined}
      >
        <Suspense>
          <EggController keyMapping={keyMapping} />
          <DynamicScene adminEnabled={adminEnabled} />
        </Suspense>
      </Canvas>
    </div>
  );
}
