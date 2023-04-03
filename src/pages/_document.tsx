import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
    return (
        <Html lang="en">
            <Head>
                <meta property="og:url" content="https://patrickfinger.dev" />
                <meta
                    property="og:image"
                    content="https://i.imgur.com/Y4s5Ej2.png"
                />
                <meta property="og:title" content="Patrick Finger" />
                <meta property="og:description" content="Developer Portfolio" />
            </Head>
            <body>
                <Main />
                <NextScript />
            </body>
        </Html>
    );
}
