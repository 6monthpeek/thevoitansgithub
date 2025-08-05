import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const LOCALES = ["tr", "en"] as const;
type Locale = (typeof LOCALES)[number];

function getLocaleFromPath(pathname: string): Locale | null {
  const seg = pathname.split("/")[1];
  if (LOCALES.includes(seg as Locale)) return seg as Locale;
  return null;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow next internals and public files
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".") // assets
  ) {
    return NextResponse.next();
  }

  // We removed /tr page. Keep root (/) as the canonical entry.
  // Backward-compat: rewrite /tr and /en to root so old links keep working.
  const locale = getLocaleFromPath(pathname);
  if (locale) {
    // /tr -> /
    const rewritten = req.nextUrl.clone();
    // strip first segment (locale)
    const rest = pathname.split("/").slice(2).join("/");
    rewritten.pathname = "/" + (rest || "");
    return NextResponse.rewrite(rewritten);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|.*\\..*).*)",
  ],
};
