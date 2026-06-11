import { useFont, Center } from "@react-three/drei";
import { ThreeElements } from "@react-three/fiber";
import React, { useMemo } from "react";
import { Box3, Vector3 } from "three";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";

interface FlatTextProps {
    font: string;
    text: string;
    size?: number;
    curveSegments?: number;
    centered?: boolean;
    hitPadding?: number;
    children?: React.ReactNode;
}

export default function FlatText({
    font: fontPath,
    text,
    size = 1,
    curveSegments = 8,
    centered = true,
    hitPadding,
    children,
    ...meshProps
}: FlatTextProps & Omit<ThreeElements["mesh"], "children" | "args">) {
    const font = useFont(fontPath);

    const geometry = useMemo(() => {
        return new TextGeometry(text, {
            font,
            size,
            depth: 0,
            bevelEnabled: false,
            curveSegments,
        });
    }, [font, text, size, curveSegments]);

    const hitPlane = useMemo(() => {
        if (hitPadding === undefined) return null;
        geometry.computeBoundingBox();
        const box = geometry.boundingBox ?? new Box3();
        const dim = new Vector3();
        const center = new Vector3();
        box.getSize(dim);
        box.getCenter(center);
        return {
            width: dim.x + hitPadding * 2,
            height: dim.y + hitPadding * 2,
            center: [center.x, center.y, 0.01] as const,
        };
    }, [geometry, hitPadding]);

    const mesh = (
        <mesh geometry={geometry} {...meshProps}>
            {children}
        </mesh>
    );

    const content = (
        <>
            {mesh}
            {hitPlane && (
                <mesh position={hitPlane.center}>
                    <planeGeometry args={[hitPlane.width, hitPlane.height]} />
                    <meshBasicMaterial visible={false} />
                </mesh>
            )}
        </>
    );

    return centered ? <Center>{content}</Center> : content;
}
