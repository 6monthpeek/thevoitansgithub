"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = robots;
function robots() {
    var _a;
    const base = (_a = process.env.NEXT_PUBLIC_SITE_URL) !== null && _a !== void 0 ? _a : "http://localhost:3030";
    return {
        rules: {
            userAgent: "*",
            allow: "/",
            disallow: [],
        },
        sitemap: `${base}/sitemap.xml`,
    };
}
