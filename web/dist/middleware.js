"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.middleware = middleware;
const server_1 = require("next/server");
const LOCALES = ["tr", "en"];
function getLocaleFromPath(pathname) {
    const seg = pathname.split("/")[1];
    if (LOCALES.includes(seg))
        return seg;
    return null;
}
function middleware(req) {
    const { pathname } = req.nextUrl;
    // Allow next internals and public files
    if (pathname.startsWith("/_next") ||
        pathname.startsWith("/api") ||
        pathname.includes(".") // assets
    ) {
        return server_1.NextResponse.next();
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
        return server_1.NextResponse.rewrite(rewritten);
    }
    return server_1.NextResponse.next();
}
exports.config = {
    matcher: [
        "/((?!_next|.*\\..*).*)",
    ],
};
