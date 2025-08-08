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
exports.POST = POST;
const server_1 = require("next/server");
const next_auth_1 = require("next-auth");
const auth_1 = require("../../../../lib/auth");
/**
 * Officer announce endpoint
 * Body: { channelId: string, content: string }
 * Requirements:
 *  - Authenticated session AND has "Senior Officer" role in guildMember.roles
 *  - ENV: DISCORD_GUILD_ID, DISCORD_BOT_TOKEN
 * Sends a message to the given channel via Discord Bot.
 */
function POST(req) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;
            const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
            const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
            if (!DISCORD_GUILD_ID || !DISCORD_BOT_TOKEN) {
                return server_1.NextResponse.json({ error: "Discord env missing" }, { status: 500 });
            }
            // Authorize: must be logged in and have Senior Officer role
            const session = yield (0, next_auth_1.getServerSession)(auth_1.authOptions).catch(() => null);
            if (!((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.id)) {
                return server_1.NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            }
            // Sunucuda sağlam doğrulama: Kullanıcının guild'deki rollerini Discord API ile sorgula
            const SENIOR_ROLE_ID = process.env.SENIOR_OFFICER_ROLE_ID; // önerilen: env ile sabit rol ID
            // Guild member fetch
            const gmResp = yield fetch(`https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/members/${session.user.id}`, {
                headers: { "Authorization": `Bot ${DISCORD_BOT_TOKEN}` },
                cache: "no-store",
            });
            if (!gmResp.ok) {
                const gmText = yield gmResp.text().catch(() => "");
                return server_1.NextResponse.json({ error: `Guild member fetch failed: ${gmResp.status} ${gmText}` }, { status: 502 });
            }
            const guildMember = yield gmResp.json().catch(() => ({}));
            const memberRoleIds = Array.isArray(guildMember === null || guildMember === void 0 ? void 0 : guildMember.roles) ? guildMember.roles : [];
            let isSeniorOfficer = false;
            if (SENIOR_ROLE_ID) {
                isSeniorOfficer = memberRoleIds.includes(SENIOR_ROLE_ID);
            }
            else {
                // Fallback: Rol adı ile kontrol (daha zayıf). Rol adlarını almak için guild roles listesini çek.
                const rolesResp = yield fetch(`https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/roles`, {
                    headers: { "Authorization": `Bot ${DISCORD_BOT_TOKEN}` },
                    cache: "no-store",
                });
                if (!rolesResp.ok) {
                    const rt = yield rolesResp.text().catch(() => "");
                    return server_1.NextResponse.json({ error: `Roles fetch failed: ${rolesResp.status} ${rt}` }, { status: 502 });
                }
                const allRoles = yield rolesResp.json().catch(() => []);
                const seniorRole = allRoles.find(r => (r.name || "").toLowerCase() === "senior officer");
                if (seniorRole) {
                    isSeniorOfficer = memberRoleIds.includes(seniorRole.id);
                }
            }
            if (!isSeniorOfficer) {
                return server_1.NextResponse.json({ error: "Forbidden: Senior Officer role required" }, { status: 403 });
            }
            const body = yield req.json().catch(() => ({}));
            const channelId = String((body === null || body === void 0 ? void 0 : body.channelId) || "");
            const content = String((body === null || body === void 0 ? void 0 : body.content) || "").trim();
            if (!channelId || !content) {
                return server_1.NextResponse.json({ error: "channelId ve content zorunludur" }, { status: 400 });
            }
            // Önce botun kanala erişimi ve yazma iznini doğrulayalım (Forbidden teşhisinde yardımcı olur)
            // fetch channel to check existence/visibility
            const chResp = yield fetch(`https://discord.com/api/v10/channels/${channelId}`, {
                headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
                cache: "no-store",
            });
            if (chResp.status === 404) {
                return server_1.NextResponse.json({ error: "Kanal bulunamadı (404) – Bot bu kanalı göremiyor olabilir." }, { status: 502 });
            }
            if (chResp.status === 403) {
                return server_1.NextResponse.json({ error: "Bot kanalı göremiyor (403). Yetkileri veya kanal izinlerini kontrol edin." }, { status: 502 });
            }
            const channel = yield chResp.json().catch(() => ({}));
            if (!chResp.ok) {
                // 50013 Missing Permissions gibi detayları taşımak için gövdeyi eklemeye çalış
                const errBody = typeof channel === "object" ? JSON.stringify(channel) : String(channel || "");
                return server_1.NextResponse.json({ error: `Kanal sorgusu başarısız: ${chResp.status} ${errBody}` }, { status: 502 });
            }
            // type 0=text, 5=announcement
            const isAnnouncement = (channel === null || channel === void 0 ? void 0 : channel.type) === 5;
            // Discord mesaj gönderimi
            const payload = {
                content,
                allowed_mentions: { parse: [] },
            };
            const msgResp = yield fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
                method: "POST",
                headers: {
                    "Authorization": `Bot ${DISCORD_BOT_TOKEN}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });
            if (!msgResp.ok) {
                const text = yield msgResp.text().catch(() => "");
                // 50013 Missing Permissions sıklıkla Forbidden olarak görünür (role hierarchy / channel overwrite)
                return server_1.NextResponse.json({ error: `Discord error: ${msgResp.status} ${text}` }, { status: 502 });
            }
            const msg = yield msgResp.json();
            // Announcement kanalıysa (type 5), publish etmeyi deneyelim (opsiyonel)
            if (isAnnouncement && (msg === null || msg === void 0 ? void 0 : msg.id)) {
                yield fetch(`https://discord.com/api/v10/channels/${channelId}/messages/${msg.id}/crosspost`, {
                    method: "POST",
                    headers: { "Authorization": `Bot ${DISCORD_BOT_TOKEN}` },
                }).catch(() => { });
            }
            return server_1.NextResponse.json({ ok: true, messageId: msg === null || msg === void 0 ? void 0 : msg.id }, { status: 200 });
        }
        catch (e) {
            return server_1.NextResponse.json({ error: (e === null || e === void 0 ? void 0 : e.message) || "failed" }, { status: 500 });
        }
    });
}
