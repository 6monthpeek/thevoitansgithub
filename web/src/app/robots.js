"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = robots;
function robots() {
    const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3030";
    return {
        rules: {
            userAgent: "*",
            allow: "/",
            disallow: [],
        },
        sitemap: `${base}/sitemap.xml`,
    };
}
