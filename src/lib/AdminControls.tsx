import { CameraControls } from "@react-three/drei";
import FlatText from "./FlatText";
import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import { Vector3 } from "three";

interface Props {
  enabled: boolean;
}

export default function AdminControls({ enabled }: Props) {
  const groupRef = useRef<any>(null!);
  const { camera } = useThree();

  useFrame(() => {
    if (!enabled || !groupRef.current) return;

    const textPositionOffset = new Vector3(0, 0, 60);
    const cameraDirection = new Vector3();
    camera.getWorldDirection(cameraDirection);
    const textPosition = new Vector3();
    textPosition
      .copy(camera.position)
      .add(cameraDirection.multiplyScalar(textPositionOffset.z));
    textPosition.y += textPositionOffset.y;

    groupRef.current.position.copy(textPosition);
    groupRef.current.lookAt(camera.position);
  });

  return enabled ? (
    <>
      <group ref={groupRef}>
        <FlatText font="./juliaMono.json" text="slyfox was here" size={1}>
          <meshStandardMaterial
            color={"#FFFFFF"}
            opacity={0.3}
            transparent={true}
            depthTest={true}
            roughness={0.9}
            metalness={0.3}
          />
        </FlatText>
      </group>
      <CameraControls minDistance={0} maxDistance={500} />
    </>
  ) : null;
}
