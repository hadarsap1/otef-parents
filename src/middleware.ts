import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public routes
  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/cron") ||
    pathname === "/login" ||
    pathname === "/privacy" ||
    pathname === "/terms" ||
    pathname === "/" ||
    pathname === "/walkthrough" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.match(/\.(png|jpg|svg|ico|json|xml|txt|html|webmanifest)$/)
  ) {
    return NextResponse.next();
  }

  // Database sessions use a session-token cookie
  const sessionToken =
    req.cookies.get("__Secure-next-auth.session-token")?.value ||
    req.cookies.get("next-auth.session-token")?.value;

  // Redirect unauthenticated users to login for dashboard pages
  if (!sessionToken && pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Return 401 for unauthenticated API requests
  if (!sessionToken && pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*"],
};
