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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
const DISCORD_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.DISCORD_GUILD_ID;
const g = globalThis;
const cache = (_a = g.__voitansRoleCache) !== null && _a !== void 0 ? _a : new Map();
g.__voitansRoleCache = cache;
function getCache(key) {
    const e = cache.get(key);
    if (!e)
        return null;
    if (Date.now() > e.expires) {
        cache.delete(key);
        return null;
    }
    return e.value;
}
function setCache(key, value, ttlMs = 10 * 60 * 1000) {
    cache.set(key, { value, expires: Date.now() + ttlMs });
}
function fetchRoles() {
    return __awaiter(this, void 0, void 0, function* () {
        const key = `roles:${GUILD_ID}`;
        const cached = getCache(key);
        if (cached)
            return cached;
        const url = `https://discord.com/api/v10/guilds/${GUILD_ID}/roles`;
        const maxAttempts = 4;
        let attempt = 0;
        while (attempt < maxAttempts) {
            attempt++;
            const res = yield fetch(url, {
                headers: { Authorization: `Bot ${DISCORD_TOKEN}` },
                next: { revalidate: 0 },
            });
            if (res.status === 429) {
                const retryAfter = Number(res.headers.get("retry-after")) || 0;
                const backoff = Math.max(Math.pow(2, attempt - 1) * 500, retryAfter * 1000);
                yield new Promise((r) => setTimeout(r, backoff));
                continue;
            }
            if (!res.ok)
                throw new Error(`Discord roles fetch failed: ${res.status}`);
            const data = (yield res.json());
            const map = {};
            for (const r of data)
                map[r.id] = r.name;
            setCache(key, map);
            return map;
        }
        return {};
    });
}
function GET() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        if (!DISCORD_TOKEN || !GUILD_ID) {
            return server_1.NextResponse.json({ roles: {}, error: "Missing DISCORD_BOT_TOKEN or DISCORD_GUILD_ID" }, { status: 500 });
        }
        try {
            const roles = yield fetchRoles();
            return server_1.NextResponse.json({ roles }, { status: 200 });
        }
        catch (e) {
            return server_1.NextResponse.json({ roles: {}, error: (_a = e === null || e === void 0 ? void 0 : e.message) !== null && _a !== void 0 ? _a : "unknown-error" }, { status: 500 });
        }
    });
}
