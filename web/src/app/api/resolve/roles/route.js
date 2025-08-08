"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
const DISCORD_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.DISCORD_GUILD_ID;
const g = globalThis;
const cache = g.__voitansRoleCache ?? new Map();
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
async function fetchRoles() {
    const key = `roles:${GUILD_ID}`;
    const cached = getCache(key);
    if (cached)
        return cached;
    const url = `https://discord.com/api/v10/guilds/${GUILD_ID}/roles`;
    const maxAttempts = 4;
    let attempt = 0;
    while (attempt < maxAttempts) {
        attempt++;
        const res = await fetch(url, {
            headers: { Authorization: `Bot ${DISCORD_TOKEN}` },
            next: { revalidate: 0 },
        });
        if (res.status === 429) {
            const retryAfter = Number(res.headers.get("retry-after")) || 0;
            const backoff = Math.max(Math.pow(2, attempt - 1) * 500, retryAfter * 1000);
            await new Promise((r) => setTimeout(r, backoff));
            continue;
        }
        if (!res.ok)
            throw new Error(`Discord roles fetch failed: ${res.status}`);
        const data = (await res.json());
        const map = {};
        for (const r of data)
            map[r.id] = r.name;
        setCache(key, map);
        return map;
    }
    return {};
}
async function GET() {
    if (!DISCORD_TOKEN || !GUILD_ID) {
        return server_1.NextResponse.json({ roles: {}, error: "Missing DISCORD_BOT_TOKEN or DISCORD_GUILD_ID" }, { status: 500 });
    }
    try {
        const roles = await fetchRoles();
        return server_1.NextResponse.json({ roles }, { status: 200 });
    }
    catch (e) {
        return server_1.NextResponse.json({ roles: {}, error: e?.message ?? "unknown-error" }, { status: 500 });
    }
}
