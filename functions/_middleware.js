export function onRequest(context) {
    try {
        if (/Mobi/i.test(context.request.headers.get("User-Agent") || "")) {
            return new Response(new URL("https://m.patrickfinger.dev"), {
                status: 301,
            });
        }
        return context.next();
    } catch (err) {
        return new Response(`${err.message}`, { status: 500 });
    }
}
