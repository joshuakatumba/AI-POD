import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { isTokenExpired } from "@/utils/jwt";

// Supported locales
const locales = ["en", "ja"];
const defaultLocale = "en";

// Public (no-auth) pages AFTER locale
const PUBLIC_PATHS = ["/login", "/register", "/forgot-password", "/password-reset"];

// Detect locale from cookie (user preference) or Accept-Language header
function getLocale(req: NextRequest): string {
  const cookieLocale = req.cookies.get("locale-preference")?.value;
  if (cookieLocale && locales.includes(cookieLocale)) return cookieLocale;

  const acceptLang = req.headers.get("accept-language");
  if (!acceptLang) return defaultLocale;

  const preferred = acceptLang.split(",")[0]?.split("-")[0] ?? "";
  return locales.includes(preferred) ? preferred : defaultLocale;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Ignore API, static files, Next internals
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/assets")
  ) {
    return NextResponse.next();
  }

  const locale = getLocale(request);
  const token = request.cookies.get("token")?.value;
  const hasValidToken = Boolean(token && !isTokenExpired(token));

  const pathHasLocale = locales.some(
    (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`)
  );

  /* =====================
     ROOT REDIRECT
  ===================== */
  if (pathname === "/" || locales.some((l) => pathname === `/${l}`)) {
    return NextResponse.redirect(
      new URL(hasValidToken ? `/${locale}/dashboard` : `/${locale}/login`, request.url)
    );
  }

  /* =====================
     ADD MISSING LOCALE
  ===================== */
  if (!pathHasLocale) {
    return NextResponse.redirect(
      new URL(`/${locale}${pathname}${request.nextUrl.search}`, request.url)
    );
  }

  /* =====================
     AUTH GUARD
  ===================== */

  // Strip locale from path: /en/login → /login
  const pathWithoutLocale = pathname.replace(/^\/(en|ja)/, "");

  const isPublicPage = PUBLIC_PATHS.some((p) =>
    pathWithoutLocale.startsWith(p)
  );

  // Not logged in + trying to access protected page
  if (!hasValidToken && !isPublicPage) {
    return NextResponse.redirect(
      new URL(`/${locale}/login`, request.url)
    );
  }

  // Logged in + trying to access login page
  if (hasValidToken && isPublicPage) {
    return NextResponse.redirect(
      new URL(`/${locale}/dashboard`, request.url)
    );
  }

  return NextResponse.next();
}

/* =====================
   MATCHER
===================== */
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
