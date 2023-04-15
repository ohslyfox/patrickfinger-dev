import { Dispatch, SetStateAction, useEffect } from "react";

interface KeyPressEvent {
    keyCode: number;
    key: string;
}

export enum EggKeys {
    SLYFOX = "SLYFOX",
}

interface Props {
    keyMapping: Record<string, Dispatch<SetStateAction<boolean>>>;
}

export default function EggController({ keyMapping }: Props) {
    useEffect(() => {
        let keyString = "";

        const handleCheckKeyMapping = (str: string): void => {
            const match = keyMapping[str];
            if (!match) return;

            match(true);
        };

        const handleKeyUp = (event: KeyPressEvent) => {
            if (keyString.length + 1 > 6) {
                keyString = "";
            }
            keyString = `${keyString}${event.key.toUpperCase()}`;
            handleCheckKeyMapping(keyString);
        };

        // Add event listener for keydown event
        window.addEventListener("keyup", handleKeyUp);

        // Remove event listener when component unmounts
        return () => {
            window.removeEventListener("keyup", handleKeyUp);
        };
    }, []);

    return null;
}
