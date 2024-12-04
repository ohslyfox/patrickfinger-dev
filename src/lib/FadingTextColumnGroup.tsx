import React, { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useSpring } from "@react-spring/core";
import FlatClickText from "./FlatClickText";

interface TextProps {
    readonly displayText: string;
    readonly url?: string;
}

interface Props {
    readonly textArray: TextProps[];
    readonly position: {
        readonly x: number;
        readonly y: number;
        readonly z: number;
    };
}

export default function FadingTextColumnGroup(props: Props) {
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

    const textDistance = 12.5; // Distance between each line of text
    const columnOffset = (textDistance * (props.textArray.length - 1)) / 2; // Offset to center the column vertically

    const textElements = useMemo(() => {
        return props.textArray.map((text, index) => {
            return (
                <FlatClickText
                    key={index}
                    displayText={text.displayText}
                    url={text.url}
                    opacity={opacity}
                    position={{
                        x: props.position.x,
                        y:
                            props.position.y -
                            textDistance * index +
                            columnOffset,
                        z: props.position.z,
                    }}
                    size={{ default: 8, hovered: 10 }}
                    color={{
                        default: "#4cc1ff",
                        hovered: "#ffc04c",
                    }}
                />
            );
        });
    }, [props.textArray, props.position, opacity, columnOffset]);

    return <>{textElements}</>;
}
