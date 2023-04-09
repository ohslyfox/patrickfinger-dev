import styles from "../styles/Home.module.css";
import { PerspectiveCamera } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useRef } from "react";
import * as Three from "three";
import { Particles } from "../dynamic-background/Particles";
import TextColumnGroup from "../dynamic-background/TextColumnGroup";

const DynamicBackground = () => {
    const cam = useRef<Three.PerspectiveCamera>(null!);
    return (
        <>
            <PerspectiveCamera
                ref={cam}
                makeDefault
                position={[0, 0, 0]}
                fov={50}
                near={0.1}
                far={1000}
            >
                <ambientLight intensity={0.7} />
                <pointLight
                    color="white"
                    intensity={0.6}
                    distance={300}
                    position={[0, 0, -60]}
                />
                <Particles />
                <TextColumnGroup
                    textArray={[
                        { displayText: "résumé", url: "./resume.pdf" },
                        {
                            displayText: "github",
                            url: "https://github.com/ohslyfox",
                        },
                        {
                            displayText: "linkedin",
                            url: "https://www.linkedin.com/in/patrick-finger-50ab75132",
                        },
                    ]}
                    position={{ x: 0, y: 0, z: -100 }}
                />
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
