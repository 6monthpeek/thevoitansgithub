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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
const next_auth_1 = require("next-auth");
const auth_1 = require("../../../../lib/auth");
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const zod_1 = require("zod");
const LOG_FILE = path_1.default.join(process.cwd(), "output", "site-logs.json");
// Senior Officer doğrulaması (server-side, Discord API ile)
function assertSeniorOfficer(session) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
        const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;
        const SENIOR_ROLE_ID = process.env.SENIOR_OFFICER_ROLE_ID; // varsa ID ile kontrol
        if (!((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.id))
            return false;
        if (!DISCORD_BOT_TOKEN || !DISCORD_GUILD_ID)
            return false;
        const gmResp = yield fetch(`https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/members/${session.user.id}`, {
            headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
            cache: "no-store",
        });
        if (!gmResp.ok)
            return false;
        const guildMember = (yield gmResp.json().catch(() => ({})));
        const memberRoleIds = Array.isArray(guildMember === null || guildMember === void 0 ? void 0 : guildMember.roles) ? guildMember.roles : [];
        if (SENIOR_ROLE_ID)
            return memberRoleIds.includes(SENIOR_ROLE_ID);
        // Rol adı ile fallback (daha zayıf)
        const rolesResp = yield fetch(`https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/roles`, {
            headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
            cache: "no-store",
        });
        if (!rolesResp.ok)
            return false;
        const allRoles = (yield rolesResp.json().catch(() => []));
        const seniorRole = allRoles.find((r) => (r.name || "").toLowerCase() === "senior officer");
        return seniorRole ? memberRoleIds.includes(seniorRole.id) : false;
    });
}
function fetchGuildMemberSafe(userId) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d;
        const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
        const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;
        if (!DISCORD_BOT_TOKEN || !DISCORD_GUILD_ID || !userId)
            return null;
        const r = yield fetch(`https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/members/${userId}`, {
            headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
            cache: "no-store",
        }).catch(() => null);
        if (!r || !r.ok)
            return null;
        const m = (yield r.json().catch(() => null));
        if (!m)
            return null;
        const id = String(((_a = m === null || m === void 0 ? void 0 : m.user) === null || _a === void 0 ? void 0 : _a.id) || userId);
        const username = typeof ((_b = m === null || m === void 0 ? void 0 : m.user) === null || _b === void 0 ? void 0 : _b.username) === "string" ? m.user.username : undefined;
        const globalName = typeof ((_c = m === null || m === void 0 ? void 0 : m.user) === null || _c === void 0 ? void 0 : _c.global_name) === "string" ? m.user.global_name : undefined;
        const nickname = typeof (m === null || m === void 0 ? void 0 : m.nick) === "string" ? m.nick : undefined;
        // avatar url: member.avatar (per-guild) > user avatar > default
        const userAvatarHash = ((_d = m === null || m === void 0 ? void 0 : m.user) === null || _d === void 0 ? void 0 : _d.avatar) || null;
        const memberAvatarHash = (m === null || m === void 0 ? void 0 : m.avatar) || null;
        let avatarUrl = undefined;
        if (memberAvatarHash && id) {
            const ext = (memberAvatarHash === null || memberAvatarHash === void 0 ? void 0 : memberAvatarHash.startsWith("a_")) ? "gif" : "png";
            // Per-guild avatar endpoint
            avatarUrl = `https://cdn.discordapp.com/guilds/${process.env.DISCORD_GUILD_ID}/${"users"}/${id}/avatars/${memberAvatarHash}.${ext}?size=64`;
        }
        else if (userAvatarHash && id) {
            const ext = (userAvatarHash === null || userAvatarHash === void 0 ? void 0 : userAvatarHash.startsWith("a_")) ? "gif" : "png";
            avatarUrl = `https://cdn.discordapp.com/avatars/${id}/${userAvatarHash}.${ext}?size=64`;
        }
        else if (id) {
            // deterministic default
            const sum = id.split("").reduce((acc, ch) => (/\d/.test(ch) ? acc + (ch.charCodeAt(0) - 48) : acc), 0);
            const idx = sum % 5;
            avatarUrl = `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
        }
        return { id, username, nickname, globalName, avatarUrl };
    });
}
function GET(req) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            const session = (yield (0, next_auth_1.getServerSession)(auth_1.authOptions).catch(() => null));
            if (!((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.id)) {
                return server_1.NextResponse.json({ ok: false, code: "UNAUTHORIZED" }, { status: 401 });
            }
            const ok = yield assertSeniorOfficer(session);
            if (!ok) {
                return server_1.NextResponse.json({ ok: false, code: "FORBIDDEN" }, { status: 403 });
            }
            // Query params (güçlü filtre seti)
            const url = new URL(req.url);
            const qp = {
                start: url.searchParams.get("start") || "",
                end: url.searchParams.get("end") || "",
                type: url.searchParams.getAll("type"),
                user: url.searchParams.get("user") || "",
                channel: url.searchParams.get("channel") || "",
                q: url.searchParams.get("q") || "",
                page: Number(url.searchParams.get("page") || "1"),
                limit: Number(url.searchParams.get("limit") || "50"),
                mode: (url.searchParams.get("mode") || "").toLowerCase() === "json",
            };
            const QSchema = zod_1.z.object({
                start: zod_1.z.string().optional(),
                end: zod_1.z.string().optional(),
                type: zod_1.z.array(zod_1.z.string()).optional(),
                user: zod_1.z.string().optional(),
                channel: zod_1.z.string().optional(),
                q: zod_1.z.string().optional(),
                page: zod_1.z.number().int().min(1).default(1),
                limit: zod_1.z.number().int().min(1).max(200).default(50),
                mode: zod_1.z.boolean().default(false),
            });
            const parsed = QSchema.safeParse(qp);
            if (!parsed.success) {
                return server_1.NextResponse.json({ ok: false, code: "BAD_QUERY", error: parsed.error.message }, { status: 400 });
            }
            const { start, end, type, user, channel, q, page, limit, mode } = parsed.data;
            // Read logs
            let logs = [];
            try {
                const buf = yield fs_1.promises.readFile(LOG_FILE, "utf8");
                logs = JSON.parse(buf);
                if (!Array.isArray(logs))
                    logs = [];
            }
            catch (_b) {
                logs = [];
            }
            // Filters
            let filtered = logs;
            // Sadece bu guild: 1140361736470409316
            const TARGET_GUILD = "1140361736470409316";
            filtered = filtered.filter((l) => {
                var _a, _b, _c;
                const byTop = String(l.guildId || "").trim() === TARGET_GUILD;
                const byData = String(((_a = l === null || l === void 0 ? void 0 : l.data) === null || _a === void 0 ? void 0 : _a.guildId) || "").trim() === TARGET_GUILD ||
                    String(((_c = (_b = l === null || l === void 0 ? void 0 : l.data) === null || _b === void 0 ? void 0 : _b.guild) === null || _c === void 0 ? void 0 : _c.id) || "").trim() === TARGET_GUILD;
                return byTop || byData;
            });
            // Tarih aralığı (inclusive)
            const toMs = (val) => {
                if (!val)
                    return NaN;
                const n = Number(val);
                if (!isNaN(n))
                    return n;
                const d = new Date(val);
                return d.getTime();
            };
            const startMs = toMs(start);
            const endMs = toMs(end);
            if (!isNaN(startMs) || !isNaN(endMs)) {
                filtered = filtered.filter((l) => {
                    const t = new Date(l.timestamp).getTime();
                    if (isNaN(t))
                        return false;
                    if (!isNaN(startMs) && t < startMs)
                        return false;
                    if (!isNaN(endMs) && t > endMs)
                        return false;
                    return true;
                });
            }
            // Event türü (tekli/çoklu)
            const typeSet = new Set((type || []).map((s) => s.toLowerCase()));
            if (typeSet.size > 0) {
                filtered = filtered.filter((l) => typeSet.has(String(l.event || "").toLowerCase()));
            }
            // Kullanıcı ID veya username/global_name/nick’de arama
            const userNeedle = (user || "").trim().toLowerCase();
            if (userNeedle) {
                filtered = filtered.filter((l) => {
                    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u;
                    const uid = String((_f = (_c = (_a = l.userId) !== null && _a !== void 0 ? _a : (_b = l === null || l === void 0 ? void 0 : l.data) === null || _b === void 0 ? void 0 : _b.userId) !== null && _c !== void 0 ? _c : (_e = (_d = l === null || l === void 0 ? void 0 : l.data) === null || _d === void 0 ? void 0 : _d.author) === null || _e === void 0 ? void 0 : _e.id) !== null && _f !== void 0 ? _f : "").toLowerCase();
                    const uname = String((_l = (_j = (_h = (_g = l === null || l === void 0 ? void 0 : l.data) === null || _g === void 0 ? void 0 : _g.resolvedUser) === null || _h === void 0 ? void 0 : _h.username) !== null && _j !== void 0 ? _j : (_k = l === null || l === void 0 ? void 0 : l.data) === null || _k === void 0 ? void 0 : _k.userName) !== null && _l !== void 0 ? _l : "").toLowerCase();
                    const gname = String((_r = (_p = (_o = (_m = l === null || l === void 0 ? void 0 : l.data) === null || _m === void 0 ? void 0 : _m.resolvedUser) === null || _o === void 0 ? void 0 : _o.globalName) !== null && _p !== void 0 ? _p : (_q = l === null || l === void 0 ? void 0 : l.data) === null || _q === void 0 ? void 0 : _q.globalName) !== null && _r !== void 0 ? _r : "").toLowerCase();
                    const nick = String((_u = (_t = (_s = l === null || l === void 0 ? void 0 : l.data) === null || _s === void 0 ? void 0 : _s.resolvedUser) === null || _t === void 0 ? void 0 : _t.nickname) !== null && _u !== void 0 ? _u : "").toLowerCase();
                    return ((uid && uid.includes(userNeedle)) ||
                        (uname && uname.includes(userNeedle)) ||
                        (gname && gname.includes(userNeedle)) ||
                        (nick && nick.includes(userNeedle)));
                });
            }
            // Kanal ID
            const channelNeedle = (channel || "").trim();
            if (channelNeedle) {
                filtered = filtered.filter((l) => String(l.channelId || "").trim() === channelNeedle);
            }
            // İçerik metni (full-text simple)
            const qNeedle = (q || "").toLowerCase();
            if (qNeedle) {
                filtered = filtered.filter((l) => {
                    const hay = (l.timestamp || "") +
                        " " +
                        (l.event || "") +
                        " " +
                        (l.guildId || "") +
                        " " +
                        (l.userId || "") +
                        " " +
                        (l.channelId || "") +
                        " " +
                        JSON.stringify(l.data || "");
                    return hay.toLowerCase().includes(qNeedle);
                });
            }
            // presenceUpdate loglarını tamamen gizle (çeşitli adlandırmalar dahil)
            filtered = filtered.filter((l) => {
                const ev = String(l.event || "").toLowerCase();
                return ev !== "presenceupdate" && ev !== "presence_update" && ev !== "presence-update";
            });
            // Varsayılan olarak en yeni en üstte görmek için tersle
            filtered = filtered.slice().reverse();
            // Pagination (page/limit)
            const total = filtered.length;
            const offset = (page - 1) * limit;
            const slice = filtered.slice(offset, offset + limit);
            // userId setini çıkar ve toplu resolve et (basit cache ile)
            const userIds = Array.from(new Set(slice
                .map((l) => String(l.userId || "").trim())
                .filter((s) => !!s)));
            const cache = new Map();
            yield Promise.all(userIds.map((uid) => __awaiter(this, void 0, void 0, function* () {
                const u = yield fetchGuildMemberSafe(uid).catch(() => null);
                cache.set(uid, u);
            })));
            // item'ları enrich et
            const enriched = slice.map((l) => {
                var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s;
                // 1) userId normalize: üst seviye > data.userId > data.author.id
                const uidRaw = (_f = (_c = (_a = l.userId) !== null && _a !== void 0 ? _a : (_b = l === null || l === void 0 ? void 0 : l.data) === null || _b === void 0 ? void 0 : _b.userId) !== null && _c !== void 0 ? _c : (_e = (_d = l === null || l === void 0 ? void 0 : l.data) === null || _d === void 0 ? void 0 : _d.author) === null || _e === void 0 ? void 0 : _e.id) !== null && _f !== void 0 ? _f : "";
                const uid = String(uidRaw).trim();
                // 2) Opsiyonel kısa ID
                const userIdShort = uid && uid.length >= 8 ? `${uid.slice(0, 6)}…${uid.slice(-4)}` : uid || undefined;
                const u = uid ? cache.get(uid) || null : null;
                // 3) Sunucu adı (tercihen botun zengin verisinden gelir)
                const guildName = ((_g = l === null || l === void 0 ? void 0 : l.data) === null || _g === void 0 ? void 0 : _g.guildName) ||
                    ((_j = (_h = l === null || l === void 0 ? void 0 : l.data) === null || _h === void 0 ? void 0 : _h.guild) === null || _j === void 0 ? void 0 : _j.name) ||
                    ((_k = l === null || l === void 0 ? void 0 : l.data) === null || _k === void 0 ? void 0 : _k.guildNameFallback) ||
                    l.guildId ||
                    "Bilinmeyen Sunucu";
                // 4) Kullanıcı görünen ad (nickname > globalName > username > data.displayName)
                const userDisplayName = ((u === null || u === void 0 ? void 0 : u.nickname) && String(u.nickname).trim()) ||
                    ((u === null || u === void 0 ? void 0 : u.globalName) && String(u.globalName).trim()) ||
                    ((u === null || u === void 0 ? void 0 : u.username) && String(u.username).trim()) ||
                    String(((_l = l === null || l === void 0 ? void 0 : l.data) === null || _l === void 0 ? void 0 : _l.displayName) || ((_m = l === null || l === void 0 ? void 0 : l.data) === null || _m === void 0 ? void 0 : _m.globalName) || "").trim() ||
                    "Bilinmeyen Kullanıcı";
                // 5) Username (yalın)
                const usernamePure = ((u === null || u === void 0 ? void 0 : u.username) && String(u.username).trim()) ||
                    String(((_o = l === null || l === void 0 ? void 0 : l.data) === null || _o === void 0 ? void 0 : _o.userName) || "").trim() ||
                    String(((_p = l === null || l === void 0 ? void 0 : l.data) === null || _p === void 0 ? void 0 : _p.authorTag) || "").trim() ||
                    "kullanici";
                // 6) Full ID
                const fullId = uid || "id";
                // 7) Officer UI’daki kullanıcı satırı: "DisplayName (username)"
                const officerUserLine = `${userDisplayName} (${usernamePure})`;
                const avatarFromData = ((_q = l === null || l === void 0 ? void 0 : l.data) === null || _q === void 0 ? void 0 : _q.userAvatarUrl) || ((_r = l === null || l === void 0 ? void 0 : l.data) === null || _r === void 0 ? void 0 : _r.memberAvatarUrl) || ((_s = l === null || l === void 0 ? void 0 : l.data) === null || _s === void 0 ? void 0 : _s.userAvatar) || undefined;
                const merged = Object.assign(Object.assign({}, l), { userId: fullId, userIdShort, data: Object.assign(Object.assign({}, l.data), { resolvedUser: u
                            ? {
                                id: u.id,
                                username: u.username,
                                nickname: u.nickname,
                                globalName: u.globalName,
                                avatarUrl: u.avatarUrl,
                            }
                            : null, 
                        // UI için sade gösterim değerleri
                        userDisplay: officerUserLine, userAvatarUrl: avatarFromData || (u === null || u === void 0 ? void 0 : u.avatarUrl), guildName: guildName, displayNameResolved: userDisplayName, usernameResolved: usernamePure }) });
                return merged;
            });
            // Geliştirici modu: ham slice döndür
            if (mode) {
                return server_1.NextResponse.json({ ok: true, data: { total, page, limit, offset, items: slice } }, { status: 200 });
            }
            const payload = { total, page, limit, offset, items: enriched };
            // Basit tip kontrolü
            const payloadOk = typeof payload.total === "number" &&
                typeof payload.page === "number" &&
                typeof payload.limit === "number" &&
                typeof payload.offset === "number" &&
                Array.isArray(payload.items);
            if (!payloadOk) {
                return server_1.NextResponse.json({ ok: false, code: "LOGS_VALIDATE_FAIL", error: "invalid payload" }, { status: 500 });
            }
            return server_1.NextResponse.json({ ok: true, data: payload }, { status: 200 });
        }
        catch (e) {
            return server_1.NextResponse.json({ ok: false, code: "UNHANDLED", error: (e === null || e === void 0 ? void 0 : e.message) || "failed" }, { status: 500 });
        }
    });
}
