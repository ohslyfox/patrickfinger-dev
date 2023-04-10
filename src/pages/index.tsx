import styles from "../styles/Home.module.css";
import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import DynamicScene from "../lib/DynamicScene";

export default function Home() {
    return (
        <div className={styles.root}>
            <Canvas>
                <Suspense>
                    <DynamicScene />
                </Suspense>
            </Canvas>
        </div>
    );
}
