import React, { useMemo } from "react";
import FadingFlatClickText from "./FadingFlatClickText";

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

export default function TextColumnGroup(props: Props) {
    const textDistance = 12.5; // Distance between each line of text
    const columnOffset = (textDistance * (props.textArray.length - 1)) / 2; // Offset to center the column vertically

    const textElements = useMemo(() => {
        return props.textArray.map((text, index) => {
            return (
                <FadingFlatClickText
                    key={index}
                    displayText={text.displayText}
                    url={text.url}
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
    }, [props.textArray, props.position, textDistance, columnOffset]);

    return <>{textElements}</>;
}
