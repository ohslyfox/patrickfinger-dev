import { CameraControls, FlyControls } from "@react-three/drei";
import { Text } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import { Vector3 } from "three";

interface Props {
    enabled: boolean;
}

export default function AdminControls({ enabled }: Props) {
    const textRef = useRef<any>(null!);
    const { camera } = useThree();

    useFrame(() => {
        if (!enabled || !textRef.current) return;

        // Calculate the text's position based on the camera's position and orientation
        const textPositionOffset = new Vector3(0, 0, 60);
        const cameraDirection = new Vector3();
        camera.getWorldDirection(cameraDirection);
        const textPosition = new Vector3();
        textPosition
            .copy(camera.position)
            .add(cameraDirection.multiplyScalar(textPositionOffset.z));
        textPosition.y += textPositionOffset.y;

        // Set the text's position and orientation
        textRef.current.position.copy(textPosition);
        textRef.current.lookAt(camera.position);
    });

    return enabled ? (
        <>
            <Text
                ref={textRef}
                font="./JuliaMono-Regular.ttf"
                anchorX="center"
                anchorY="middle"
            >
                {"slyfox was here"}
                <meshStandardMaterial
                    attach="material"
                    color={"#FFFFFF"}
                    opacity={0.3}
                    transparent={true}
                    depthTest={true}
                    roughness={0.9}
                    metalness={0.3}
                    displacementScale={0.1}
                    displacementBias={0.05}
                />
            </Text>
            <CameraControls minDistance={0} maxDistance={500} />
        </>
    ) : null;
}
