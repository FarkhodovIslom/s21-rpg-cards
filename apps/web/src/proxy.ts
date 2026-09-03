import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Presence-only session check for /card. The cookie's HMAC is verified by the
 * API's SessionGuard — a forged-but-present cookie is rejected there with 401,
 * which the card page turns into a redirect to /login.
 */
export function proxy(request: NextRequest) {
  if (!request.cookies.has("session")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/card/:path*", "/browse/:path*", "/participant/:path*"],
};
