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
exports.runtime = void 0;
exports.GET = GET;
const server_1 = require("next/server");
const next_auth_1 = require("next-auth");
const auth_1 = require("../../../../../lib/auth");
// Force Node.js runtime (we need fs + intervals)
exports.runtime = "nodejs";
const isProd = process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
const NDJSON_PATH = isProd ? "/tmp/site-logs.ndjson" : "web/output/site-logs.ndjson";
const TARGET_GUILD = "1140361736470409316";
// Officer doğrulaması (server-side, Discord API ile)
function assertSeniorOfficer(userId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
            const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;
            const SENIOR_ROLE_ID = process.env.SENIOR_OFFICER_ROLE_ID;
            if (!userId || !DISCORD_BOT_TOKEN || !DISCORD_GUILD_ID)
                return false;
            const gmResp = yield fetch(`https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/members/${userId}`, {
                headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
                cache: "no-store",
            });
            if (!gmResp.ok)
                return false;
            const guildMember = yield gmResp.json().catch(() => ({}));
            const memberRoleIds = Array.isArray(guildMember === null || guildMember === void 0 ? void 0 : guildMember.roles) ? guildMember.roles : [];
            if (SENIOR_ROLE_ID)
                return memberRoleIds.includes(SENIOR_ROLE_ID);
            const rolesResp = yield fetch(`https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/roles`, {
                headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
                cache: "no-store",
            });
            if (!rolesResp.ok)
                return false;
            const allRoles = (yield rolesResp.json().catch(() => []));
            const seniorRole = allRoles.find((r) => (r.name || "").toLowerCase() === "senior officer");
            return seniorRole ? memberRoleIds.includes(seniorRole.id) : false;
        }
        catch (_a) {
            return false;
        }
    });
}
// Minimal şekle normalize ve guild filtresi
function normalizeAndFilter(raw) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    try {
        const guildId = (raw === null || raw === void 0 ? void 0 : raw.guildId) ||
            ((_a = raw === null || raw === void 0 ? void 0 : raw.data) === null || _a === void 0 ? void 0 : _a.guildId) ||
            ((_c = (_b = raw === null || raw === void 0 ? void 0 : raw.data) === null || _b === void 0 ? void 0 : _b.guild) === null || _c === void 0 ? void 0 : _c.id) ||
            undefined;
        // yalnızca hedef guild
        if (String(guildId || "").trim() !== TARGET_GUILD)
            return null;
        const userId = (raw === null || raw === void 0 ? void 0 : raw.userId) ||
            ((_d = raw === null || raw === void 0 ? void 0 : raw.data) === null || _d === void 0 ? void 0 : _d.userId) ||
            ((_f = (_e = raw === null || raw === void 0 ? void 0 : raw.data) === null || _e === void 0 ? void 0 : _e.author) === null || _f === void 0 ? void 0 : _f.id) ||
            undefined;
        const channelId = (raw === null || raw === void 0 ? void 0 : raw.channelId) ||
            ((_g = raw === null || raw === void 0 ? void 0 : raw.data) === null || _g === void 0 ? void 0 : _g.channelId) ||
            ((_j = (_h = raw === null || raw === void 0 ? void 0 : raw.data) === null || _h === void 0 ? void 0 : _h.channel) === null || _j === void 0 ? void 0 : _j.id) ||
            undefined;
        const ts = String((raw === null || raw === void 0 ? void 0 : raw.timestamp) || new Date().toISOString());
        const event = String((raw === null || raw === void 0 ? void 0 : raw.event) || "unknown");
        const entry = {
            timestamp: ts,
            event,
            guildId: guildId ? String(guildId) : undefined,
            userId: userId ? String(userId) : undefined,
            channelId: channelId ? String(channelId) : undefined,
            data: (_k = raw === null || raw === void 0 ? void 0 : raw.data) !== null && _k !== void 0 ? _k : undefined,
        };
        return entry;
    }
    catch (_l) {
        return null;
    }
}
// SSE publisher helper
function sseResponse(onStart) {
    const stream = new ReadableStream({
        start(controller) {
            onStart(controller);
        },
        cancel() { },
    });
    return new Response(stream, {
        status: 200,
        headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
        },
    });
}
// Publish one event
function publish(controller, data) {
    try {
        const payload = typeof data === "string" ? data : JSON.stringify(data);
        controller.enqueue(`data: ${payload}\n\n`);
    }
    catch (_a) { }
}
function GET(req) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        // Auth + Senior Officer check
        const session = (yield (0, next_auth_1.getServerSession)(auth_1.authOptions).catch(() => null));
        if (!((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.id)) {
            return server_1.NextResponse.json({ ok: false, code: "UNAUTHORIZED" }, { status: 401 });
        }
        const ok = yield assertSeniorOfficer(session.user.id);
        if (!ok) {
            return server_1.NextResponse.json({ ok: false, code: "FORBIDDEN" }, { status: 403 });
        }
        const url = new URL(req.url);
        // opsiyonel: client filtreleri (type/user/channel/q)
        const typeFilters = url.searchParams.getAll("type").map((s) => s.toLowerCase());
        const userNeedle = (url.searchParams.get("user") || "").trim().toLowerCase();
        const channelNeedle = (url.searchParams.get("channel") || "").trim();
        const qNeedle = (url.searchParams.get("q") || "").toLowerCase();
        // 1 sn interval
        const INTERVAL_MS = 1000;
        return sseResponse((controller) => {
            let cancelled = false;
            // offset: okunan byte konumu; polling ile yeni eklenen satırları yakalarız
            let offset = 0;
            let timer = null;
            const tick = () => __awaiter(this, void 0, void 0, function* () {
                var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
                if (cancelled)
                    return;
                try {
                    const fsp = yield import("fs/promises");
                    const fs = yield import("fs");
                    // Dosya mevcut mu?
                    const exists = fs.existsSync(NDJSON_PATH);
                    if (!exists) {
                        // dosya henüz yoksa boş event gönderme; tekrar dene
                        return;
                    }
                    // Stat ile dosya boyutunu al
                    const stat = yield fsp.stat(NDJSON_PATH);
                    const size = stat.size;
                    // İlk bağlantıda sondan devam etmek yerine tam tail için offset'i mevcut boyuta ayarlayabiliriz (yalnızca yeni satırlar)
                    if (offset === 0 && size > 0) {
                        offset = size;
                        publish(controller, { ok: true, ready: true, mode: isProd ? "prod" : "local" });
                        return;
                    }
                    // Yeni veri var mı?
                    if (size > offset) {
                        const fh = yield fsp.open(NDJSON_PATH, "r");
                        try {
                            const len = size - offset;
                            const buf = Buffer.alloc(len);
                            yield fh.read(buf, 0, len, offset);
                            offset = size;
                            const chunk = buf.toString("utf8");
                            const lines = chunk.split("\n").filter((l) => l.trim().length > 0);
                            for (const line of lines) {
                                try {
                                    const raw = JSON.parse(line);
                                    const entry = normalizeAndFilter(raw);
                                    if (!entry)
                                        continue;
                                    // server-side incremental filters
                                    if (typeFilters.length > 0) {
                                        const ev = String(entry.event || "").toLowerCase();
                                        if (!typeFilters.includes(ev))
                                            continue;
                                    }
                                    if (userNeedle) {
                                        const uid = String(entry.userId || "").toLowerCase() ||
                                            String(((_a = entry.data) === null || _a === void 0 ? void 0 : _a.userId) || ((_c = (_b = entry.data) === null || _b === void 0 ? void 0 : _b.author) === null || _c === void 0 ? void 0 : _c.id) || "").toLowerCase();
                                        const uname = String(((_e = (_d = entry.data) === null || _d === void 0 ? void 0 : _d.resolvedUser) === null || _e === void 0 ? void 0 : _e.username) || ((_f = entry.data) === null || _f === void 0 ? void 0 : _f.userName) || "").toLowerCase();
                                        const gname = String(((_h = (_g = entry.data) === null || _g === void 0 ? void 0 : _g.resolvedUser) === null || _h === void 0 ? void 0 : _h.globalName) || ((_j = entry.data) === null || _j === void 0 ? void 0 : _j.globalName) || "").toLowerCase();
                                        const nick = String(((_l = (_k = entry.data) === null || _k === void 0 ? void 0 : _k.resolvedUser) === null || _l === void 0 ? void 0 : _l.nickname) || "").toLowerCase();
                                        if (!(uid.includes(userNeedle) || uname.includes(userNeedle) || gname.includes(userNeedle) || nick.includes(userNeedle))) {
                                            continue;
                                        }
                                    }
                                    if (channelNeedle) {
                                        const chId = String(entry.channelId || "").trim();
                                        if (chId !== channelNeedle)
                                            continue;
                                    }
                                    if (qNeedle) {
                                        const hay = (entry.timestamp || "") +
                                            " " +
                                            (entry.event || "") +
                                            " " +
                                            (entry.guildId || "") +
                                            " " +
                                            (entry.userId || "") +
                                            " " +
                                            (entry.channelId || "") +
                                            " " +
                                            JSON.stringify(entry.data || "");
                                        if (!hay.toLowerCase().includes(qNeedle))
                                            continue;
                                    }
                                    publish(controller, { ok: true, item: entry });
                                }
                                catch (_m) {
                                    // satır parse edilmezse atla
                                }
                            }
                        }
                        finally {
                            yield fh.close();
                        }
                    }
                }
                catch (e) {
                    publish(controller, { ok: false, code: "STREAM_ERR", error: (e === null || e === void 0 ? void 0 : e.message) || "failed" });
                }
            });
            // İlk bildirim (bağlantı kuruldu)
            publish(controller, { ok: true, hello: true, ndjson: NDJSON_PATH, mode: isProd ? "prod" : "local" });
            // Interval başlat
            timer = setInterval(tick, INTERVAL_MS);
            // Abort/close davranışı
            const close = () => {
                if (cancelled)
                    return;
                cancelled = true;
                if (timer) {
                    clearInterval(timer);
                    timer = null;
                }
                try {
                    // SSE channel close
                    controller.close();
                }
                catch (_a) { }
            };
            // Connection lifetime: 2 dakika sonra otomatik kapat; client auto-reconnect (UI backoff ile)
            const lifetime = setTimeout(close, 2 * 60 * 1000);
            // Not: Next.js Route Handlers'da Request.signal ile abort yakalamak mümkün değil.
            // Burada sadece interval ve lifetime ile yönetiyoruz.
        });
    });
}
