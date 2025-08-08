"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
const server_1 = require("next/server");
/**
 * Plain-text error endpoint to avoid browser 405/406 and to surface real error details.
 * NextAuth will redirect to /api/auth/error?error=SomeCode
 * Example codes: OAuthSignin, OAuthCallback, OAuthAccountNotLinked, Configuration, Callback
 */
function GET(req) {
    return __awaiter(this, void 0, void 0, function* () {
        const url = new URL(req.url);
        const code = url.searchParams.get("error") || "unknown";
        const ua = req.headers.get("user-agent") || "-";
        const ref = req.headers.get("referer") || "-";
        const host = req.headers.get("host") || "-";
        const xfproto = req.headers.get("x-forwarded-proto") || "-";
        const xfhost = req.headers.get("x-forwarded-host") || "-";
        // Basic runtime visibility in server logs
        console.error("[next-auth][error]", {
            code,
            host,
            xfproto,
            xfhost,
            ref,
            ua,
            NEXTAUTH_URL: process.env.NEXTAUTH_URL ? "[set]" : "[missing]",
            NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? "[set]" : "[missing]",
            DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID ? "[set]" : "[missing]",
            DISCORD_CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET ? "[set]" : "[missing]",
        });
        const hint = code === "Configuration"
            ? "Check NEXTAUTH_URL / NEXTAUTH_SECRET and provider credentials."
            : code === "OAuthCallback"
                ? "Check Discord Redirect URL and Client Secret / ID match."
                : code === "OAuthSignin"
                    ? "Provider initiation failed. Verify clientId/secret and scopes."
                    : "";
        const body = `Auth Error\n` +
            `Code: ${code}\n` +
            (hint ? `Hint: ${hint}\n` : "") +
            `Runtime headers:\n` +
            `- host: ${host}\n` +
            `- x-forwarded-proto: ${xfproto}\n` +
            `- x-forwarded-host: ${xfhost}\n` +
            `- referer: ${ref}\n` +
            `If running locally, ensure:\n` +
            `- NEXTAUTH_URL=http://localhost:3000 (prod: your https URL)\n` +
            `- NEXTAUTH_SECRET is a strong random string (server restarted after change)\n` +
            `- Discord Redirect URL: <BASE_URL>/api/auth/callback/discord\n`;
        return new server_1.NextResponse(body, {
            status: 200,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
    });
}
// Disallow other methods explicitly to avoid 405 noise
function POST() {
    return __awaiter(this, void 0, void 0, function* () {
        return new server_1.NextResponse("Method Not Allowed", { status: 405 });
    });
}
