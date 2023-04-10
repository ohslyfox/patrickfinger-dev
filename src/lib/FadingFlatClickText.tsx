import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import FlatClickText, { FlatClickTextOps } from "./FlatClickText";
import { useSpring } from "@react-spring/core";

export type Props = Omit<FlatClickTextOps, "opacity">;

export default function FadingFlatClickText(props: Props) {
    const [opacity, setOpacity] = useState(1);
    const [movementTime, setMovementTime] = useState(0);
    const [show, setShow] = useState(true);
    const tRef = useRef(0);

    const { scale } = useSpring({
        scale: show ? 1 : 0,
        config: {
            tension: 400,
            friction: 100,
            precision: 0.001,
        },
    });

    useFrame((state) => {
        tRef.current = state.clock.elapsedTime;
        if (movementTime === 0) {
            setMovementTime(tRef.current);
        }
        const delta = tRef.current - movementTime;

        if (delta > 5) {
            setShow(false);
        } else if (!show) {
            setShow(true);
        }

        setOpacity(scale.get());
    });

    useEffect(() => {
        const handleMouseMove = (_e: MouseEvent) => {
            setMovementTime(tRef.current);
        };
        window.addEventListener("mousemove", handleMouseMove);
        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
        };
    }, []);

    return (
        <group>
            <FlatClickText {...props} opacity={opacity} />
        </group>
    );
}
