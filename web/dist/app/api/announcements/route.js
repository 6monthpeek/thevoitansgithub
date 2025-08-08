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
const CHANNEL_ID = process.env.DISCORD_ANNOUNCEMENTS_CHANNEL_ID || "1140669615421280356";
const g = globalThis;
const memory = (_a = g.__voitansCache2) !== null && _a !== void 0 ? _a : new Map();
g.__voitansCache2 = memory;
function getCache(key) {
    const e = memory.get(key);
    if (!e)
        return null;
    if (Date.now() > e.expires) {
        memory.delete(key);
        return null;
    }
    return e.value;
}
function setCache(key, value, ttlMs = 5 * 60 * 1000) {
    memory.set(key, { value, expires: Date.now() + ttlMs });
}
function fetchChannelMessages() {
    return __awaiter(this, arguments, void 0, function* (limit = 5) {
        const cacheKey = `announcements:${CHANNEL_ID}:${limit}`;
        const cached = getCache(cacheKey);
        if (cached)
            return cached;
        const url = `https://discord.com/api/v10/channels/${CHANNEL_ID}/messages?limit=${limit}`;
        const maxAttempts = 4;
        let attempt = 0;
        let lastStatus = 0;
        let lastText = "";
        while (attempt < maxAttempts) {
            attempt++;
            const res = yield fetch(url, {
                headers: { Authorization: `Bot ${DISCORD_TOKEN}` },
                cache: "no-store",
                next: { revalidate: 0 },
            });
            lastStatus = res.status;
            if (res.status === 429) {
                const retryAfter = Number(res.headers.get("retry-after")) || 0;
                const base = Math.pow(2, attempt - 1) * 400; // 400, 800, 1600, 3200 ms
                const jitter = Math.floor(Math.random() * 200);
                const backoff = Math.max(base + jitter, retryAfter * 1000);
                yield new Promise((r) => setTimeout(r, backoff));
                continue;
            }
            if (!res.ok) {
                lastText = yield res.text().catch(() => "");
                // retry 5xx
                if (res.status >= 500 && res.status < 600 && attempt < maxAttempts) {
                    const base = Math.pow(2, attempt - 1) * 400;
                    const jitter = Math.floor(Math.random() * 200);
                    yield new Promise((r) => setTimeout(r, base + jitter));
                    continue;
                }
                throw new Error(`Discord fetch failed: ${res.status} ${lastText}`);
            }
            const data = (yield res.json());
            const items = data
                .filter((m) => { var _a; return ((_a = m.content) !== null && _a !== void 0 ? _a : "").trim().length > 0; })
                .map((m) => ({
                id: m.id,
                // Discord markdown uyumlu görünüm için orijinal içerik korunur
                content: m.content,
                createdAt: m.timestamp,
            }));
            setCache(cacheKey, items);
            return items;
        }
        // Retry tükendi
        console.warn("[/api/announcements] retry-exhausted", { lastStatus, lastText });
        return [];
    });
}
function GET() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        if (!DISCORD_TOKEN) {
            return server_1.NextResponse.json({ items: [], error: "Missing DISCORD_BOT_TOKEN" }, { status: 500 });
        }
        try {
            const items = yield fetchChannelMessages(5);
            return server_1.NextResponse.json({ items }, { status: 200 });
        }
        catch (e) {
            return server_1.NextResponse.json({ items: [], error: (_a = e === null || e === void 0 ? void 0 : e.message) !== null && _a !== void 0 ? _a : "unknown-error" }, { status: 500 });
        }
    });
}
