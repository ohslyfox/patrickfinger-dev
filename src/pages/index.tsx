import styles from "../styles/Home.module.css";
import { PerspectiveCamera } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useMemo, useRef } from "react";
import * as Three from "three";
import { Particles } from "../dynamic-background/Particles";

const DynamicBackground = () => {
    const cam = useRef<Three.PerspectiveCamera>(null!);
    const offset = useMemo(() => Math.random() * 400, []);

    useFrame((state) => {
        const t = offset + state.clock.getElapsedTime();
        cam.current.rotation.x = Math.cos(t / 200);
        cam.current.rotation.y = Math.sin(t / 200);
    });

    return (
        <>
            <PerspectiveCamera
                ref={cam}
                makeDefault
                position={[0, 0, 0]}
                fov={75}
                near={0.1}
                far={1000}
            >
                <ambientLight />
                <Particles />
            </PerspectiveCamera>
        </>
    );
};

export default function Home() {
    return (
        <div className={styles.bodyDisplay}>
            <Canvas>
                <Suspense>
                    <DynamicBackground />
                </Suspense>
            </Canvas>
        </div>
    );
}
