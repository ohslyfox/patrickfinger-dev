export function onRequest(context) {
    try {
        if (/Mobi/i.test(context.request.headers.get("User-Agent") || "")) {
            return Response.redirect(new URL("https://m.patrickfinger.dev"));
        }
        return context.next();
    } catch (err) {
        return new Response(`${err.message}`, { status: 500 });
    }
}
