import { Text } from "@react-three/drei";
import { useState } from "react";
import { useSpring, animated } from "@react-spring/three";

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

const AnimatedText = animated(Text);

export default function FlatClickText(opts: FlatClickTextOps) {
    const [isHovered, setIsHovered] = useState(false);
    const onPointerOver = (_e: any) => {
        setIsHovered(true);
    };

    const onPointerOut = (_e: any) => {
        setIsHovered(false);
    };

    const onClick = (_e: any) => {
        if (opts.url) {
            window.open(opts.url);
        }
    };

    const spring = useSpring({
        from: { scale: opts.size.default },
        to: { scale: isHovered ? opts.size.hovered : opts.size.default },
        config: {
            tension: 500,
            friction: 20,
            precision: 0.0001,
        },
    });

    return (
        <group
            onPointerOut={onPointerOut}
            onPointerOver={onPointerOver}
            onClick={onClick}
        >
            <AnimatedText
                {...spring}
                font="./JuliaMono-Regular.ttf"
                anchorX="center"
                anchorY="middle"
                position={[opts.position.x, opts.position.y, opts.position.z]}
                material-transparent={true}
                material-roughness={0.1}
                material-metalness={0.1}
                castShadow={true}
                receiveShadow={true}
            >
                {opts.displayText}
                <meshStandardMaterial
                    attach="material"
                    color={isHovered ? opts.color.hovered : opts.color.default}
                    opacity={opts.opacity}
                    transparent={true}
                    depthTest={true}
                    roughness={0.9}
                    metalness={0.3}
                    displacementScale={0.1}
                    displacementBias={0.05}
                />
            </AnimatedText>
        </group>
    );
}
