export function onRequest(context) {
    try {
        const userAgent = context.request.headers.get("User-Agent") || "";
        const isMobile = /Mobi/i.test(userAgent);
        if (isMobile) {
            return new Response(new URL("https://m.patrickfinger.dev"), {
                status: 301,
            });
        }
        return context.next();
    } catch (err) {
        return new Response(`${err.message}`, { status: 500 });
    }
}
