import { PerspectiveCamera } from "@react-three/drei";
import { useRef } from "react";
import { Particles } from "./Particles";
import { PerspectiveCamera as THREEPerspectiveCamera } from "three";
import TextColumnGroup from "./TextColumnGroup";

export default function DynamicScene() {
    const cam = useRef<THREEPerspectiveCamera>(null!);
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
}
