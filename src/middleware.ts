import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const userAgent = request.headers.get('User-Agent') || '';
  const isMobile = /Mobi/i.test(userAgent);
  if (isMobile) {
    return NextResponse.redirect(new URL("https://m.patrickfinger.dev"));
  }
}


export const config = {
  matcher: '/',
}