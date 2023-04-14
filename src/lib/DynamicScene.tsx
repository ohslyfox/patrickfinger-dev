import { CameraControls, PerspectiveCamera } from "@react-three/drei";
import { useRef } from "react";
import { Particles } from "./Particles";
import { PerspectiveCamera as THREEPerspectiveCamera } from "three";
import TextColumnGroup from "./TextColumnGroup";
import { useFrame } from "@react-three/fiber";
import { map } from "./util/util";

export default function DynamicScene() {
    const cam = useRef<THREEPerspectiveCamera>(null!);
    const offset = 1_000 * Math.random();

    useFrame((state) => {
        const t = state.clock.elapsedTime + offset;
        const timeScalingConstant = 10;
        const time = t / timeScalingConstant;
        const radius = map(Math.sin(time) + Math.cos(time), -1.5, 1.5, -5, 5);
        const x = radius * Math.cos(time);
        const y = radius * Math.sin(time);
        cam.current.lookAt(0, 0, -390);
        cam.current.position.set(x, y, 0);
    });

    return (
        <>
            <PerspectiveCamera
                ref={cam}
                position={[0, 0, 0]}
                fov={70}
                near={0.1}
                far={1000}
            >
                <ambientLight intensity={0.7} />
                <pointLight
                    color="#ffffff"
                    intensity={0.7}
                    distance={300}
                    position={[0, 0, 0]}
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
                    position={{ x: 0, y: 0, z: -60 }}
                />
            </PerspectiveCamera>
        </>
    );
}
