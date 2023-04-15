import styles from "../styles/Home.module.css";
import { Canvas } from "@react-three/fiber";
import { Suspense, useState } from "react";
import DynamicScene from "../lib/DynamicScene";
import EggController, { EggKeys } from "../lib/EggController";

export default function Home() {
    const [adminEnabled, setAdminEnabled] = useState(false);

    const keyMapping = {
        [EggKeys.SLYFOX]: setAdminEnabled,
    };

    return (
        <div className={styles.root}>
            <Canvas style={{ position: "relative" }}>
                <Suspense>
                    <EggController keyMapping={keyMapping} />
                    <DynamicScene adminEnabled={adminEnabled} />
                </Suspense>
            </Canvas>
        </div>
    );
}
