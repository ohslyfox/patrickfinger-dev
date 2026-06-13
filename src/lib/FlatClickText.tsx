import FlatText from "./FlatText";
import { useSpring } from "@react-spring/core";
import { useFrame } from "@react-three/fiber";
import { useRef, useState, useCallback } from "react";
import { Group } from "three";

export interface FlatClickTextOps {
  readonly displayText: string;
  readonly size: {
    default: number;
    hovered: number;
  };
  readonly color: {
    default: string;
    hovered: string;
  };
  readonly position: {
    x: number;
    y: number;
    z: number;
  };
  readonly opacity?: number;
  readonly url?: string;
  // Reports hover enter/leave so the owner can decide the page cursor (it also
  // needs to hide the cursor entirely when the text is faded out). When omitted,
  // this text manages the cursor itself.
  readonly onHoverChange?: (hovered: boolean) => void;
}

export default function FlatClickText(opts: FlatClickTextOps) {
  const [isHovered, setIsHovered] = useState(false);
  const groupRef = useRef<Group>(null!);
  const { onHoverChange } = opts;

  const { scale } = useSpring({
    scale: isHovered ? opts.size.hovered : opts.size.default,
    config: {
      tension: 800,
      friction: 24,
      precision: 0.001,
    },
  });

  useFrame(() => {
    groupRef.current.scale.setScalar(scale.get());
  });

  const onPointerOver = useCallback(() => {
    setIsHovered(true);
    if (onHoverChange) onHoverChange(true);
    else document.body.style.cursor = "pointer";
  }, [onHoverChange]);

  const onPointerOut = useCallback(() => {
    setIsHovered(false);
    if (onHoverChange) onHoverChange(false);
    else document.body.style.cursor = "auto";
  }, [onHoverChange]);

  const onClick = useCallback(
    (e: any) => {
      if (opts.url) {
        e.stopPropagation();
        window.open(opts.url);
      }
    },
    [opts.url],
  );

  return (
    <group
      onPointerOut={onPointerOut}
      onPointerOver={onPointerOver}
      onClick={onClick}
    >
      <group
        ref={groupRef}
        position={[opts.position.x, opts.position.y, opts.position.z]}
        scale={opts.size.default}
      >
        <FlatText
          font="./juliaMono.json"
          text={opts.displayText}
          size={0.6}
          hitPadding={0.15}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial
            color={isHovered ? opts.color.hovered : opts.color.default}
            emissive={isHovered ? opts.color.hovered : opts.color.default}
            // Fade the emissive with opacity so the bloom glow fades out together
            // with the text — otherwise the (opacity-independent) bloom halo lingers
            // and the text appears to blur away instead of fading.
            emissiveIntensity={0.6 * (opts.opacity ?? 1)}
            opacity={opts.opacity}
            transparent={true}
            depthTest={true}
            roughness={0.9}
            metalness={0.3}
            toneMapped={false}
          />
        </FlatText>
      </group>
    </group>
  );
}
