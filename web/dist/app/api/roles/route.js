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
const server_1 = require("next/server");
function intColorToHex(intColor) {
    // Discord color int to #RRGGBB
    const hex = intColor.toString(16).padStart(6, "0");
    return `#${hex}`;
}
function GET() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const token = process.env.DISCORD_BOT_TOKEN || process.env.DISCORD_TOKEN;
        const guildId = process.env.DISCORD_GUILD_ID;
        if (!token || !guildId) {
            return server_1.NextResponse.json({ error: "Missing DISCORD_BOT_TOKEN/DISCORD_TOKEN or DISCORD_GUILD_ID" }, { status: 500 });
        }
        try {
            const url = `https://discord.com/api/v10/guilds/${guildId}/roles`;
            const maxAttempts = 4;
            let attempt = 0;
            let lastStatus = 0;
            let lastText = "";
            while (attempt < maxAttempts) {
                attempt++;
                const res = yield fetch(url, {
                    headers: { Authorization: `Bot ${token}` },
                    cache: "no-store",
                    next: { revalidate: 0 },
                });
                lastStatus = res.status;
                if (res.status === 429) {
                    const retryAfter = Number(res.headers.get("retry-after")) || 0;
                    const base = Math.pow(2, attempt - 1) * 300; // 300, 600, 1200, 2400 ms
                    const jitter = Math.floor(Math.random() * 150);
                    const wait = Math.max(base + jitter, retryAfter * 1000);
                    yield new Promise((r) => setTimeout(r, wait));
                    continue;
                }
                if (!res.ok) {
                    lastText = yield res.text().catch(() => "");
                    // Retry only on 5xx
                    if (res.status >= 500 && res.status < 600 && attempt < maxAttempts) {
                        const base = Math.pow(2, attempt - 1) * 300;
                        const jitter = Math.floor(Math.random() * 150);
                        yield new Promise((r) => setTimeout(r, base + jitter));
                        continue;
                    }
                    return server_1.NextResponse.json({ error: "discord-fetch-failed", status: res.status, details: lastText, attempt }, { status: 502 });
                }
                const roles = (yield res.json());
                const mapped = roles
                    .map((r) => ({
                    id: r.id,
                    name: r.name,
                    colorHex: r.color ? intColorToHex(r.color) : null,
                    position: r.position,
                    hoist: r.hoist,
                    managed: r.managed,
                }))
                    .sort((a, b) => b.position - a.position);
                return server_1.NextResponse.json({ roles: mapped, meta: { attempt } }, { status: 200 });
            }
            return server_1.NextResponse.json({ error: "discord-retry-exhausted", status: lastStatus, details: lastText }, { status: 502 });
        }
        catch (err) {
            return server_1.NextResponse.json({ error: "unexpected-error", details: (_a = err === null || err === void 0 ? void 0 : err.message) !== null && _a !== void 0 ? _a : String(err) }, { status: 500 });
        }
    });
}
