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
}

export default function FlatClickText(opts: FlatClickTextOps) {
    const [isHovered, setIsHovered] = useState(false);
    const groupRef = useRef<Group>(null!);

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
        document.body.style.cursor = "pointer";
    }, []);

    const onPointerOut = useCallback(() => {
        setIsHovered(false);
        document.body.style.cursor = "auto";
    }, []);

    const onClick = useCallback(
        (e: any) => {
            if (opts.url) {
                e.stopPropagation();
                window.open(opts.url);
            }
        },
        [opts.url]
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
                        opacity={opts.opacity}
                        transparent={true}
                        depthTest={true}
                        roughness={0.9}
                        metalness={0.3}
                    />
                </FlatText>
            </group>
        </group>
    );
}
