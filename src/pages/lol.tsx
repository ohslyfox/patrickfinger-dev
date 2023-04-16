import { useEffect } from "react";

export default function LolRedirect() {
    useEffect(() => {
        window.location.assign("https://slyfox.lol");
    }, []);

    return <></>;
}
