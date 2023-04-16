import { useEffect } from "react";

export default function ResumeRedirect() {
    useEffect(() => {
        window.location.assign("./resume.pdf");
    }, []);

    return <></>;
}
