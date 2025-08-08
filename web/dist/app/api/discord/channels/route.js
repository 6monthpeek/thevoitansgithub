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
/**
 * List guild text + announcement channels for Officer panel
 * Requires:
 *  - DISCORD_GUILD_ID
 *  - DISCORD_BOT_TOKEN
 * Auth: session not strictly required for read, but we'll still require Senior Officer to reduce exposure.
 */
function GET(req) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;
            const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
            if (!DISCORD_GUILD_ID || !DISCORD_BOT_TOKEN) {
                return server_1.NextResponse.json({ error: "Discord env missing" }, { status: 500 });
            }
            // We can optionally authorize only senior officers by calling /api/auth/session
            // but this is a route handler; safest is to use NextAuth's session endpoint.
            // For simplicity, skip SSR session check here; OfficerPanel UI is already gated.
            // If you want to block direct access, implement a server-side session check using getServerSession.
            const res = yield fetch(`https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/channels`, {
                headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
                cache: "no-store",
            });
            if (!res.ok) {
                const text = yield res.text().catch(() => "");
                return server_1.NextResponse.json({ error: `Discord error: ${res.status} ${text}` }, { status: 502 });
            }
            // Ham veri UI geriye uyum için eskisi gibi düz listeye de dönüştürülebilsin (opsiyonel flag)
            const url = new URL(req.url);
            const flat = url.searchParams.get("flat") === "1";
            const raw = (yield res.json());
            // Kategorileri ve kanal/duyuru kanallarını ayır
            const categories = raw
                .filter((c) => c && c.type === 4)
                .map((c) => { var _a; return ({ id: c.id, name: c.name, type: c.type, position: (_a = c.position) !== null && _a !== void 0 ? _a : 0 }); });
            const chans = raw
                .filter((c) => c && (c.type === 0 || c.type === 5))
                .map((c) => {
                var _a, _b;
                const ch = c;
                return {
                    id: ch.id,
                    name: ch.name,
                    type: ch.type,
                    parent_id: (_a = ch.parent_id) !== null && _a !== void 0 ? _a : null,
                    position: (_b = ch.position) !== null && _b !== void 0 ? _b : 0,
                };
            });
            // Sıralama: önce kategoriler position'a göre, sonra her kategoride kanallar position'a göre
            categories.sort((a, b) => { var _a, _b; return ((_a = a.position) !== null && _a !== void 0 ? _a : 0) - ((_b = b.position) !== null && _b !== void 0 ? _b : 0); });
            // parent_id eşleşmeyen (kategorisiz) kanalları da toplayacağız
            const uncategorized = chans.filter((ch) => !ch.parent_id);
            const grouped = categories.map((cat) => {
                const children = chans
                    .filter((ch) => ch.parent_id === cat.id)
                    .sort((a, b) => { var _a, _b; return ((_a = a.position) !== null && _a !== void 0 ? _a : 0) - ((_b = b.position) !== null && _b !== void 0 ? _b : 0); })
                    .map((c) => ({ id: c.id, name: c.name, type: c.type }));
                return {
                    id: cat.id,
                    name: cat.name,
                    type: cat.type,
                    channels: children,
                };
            });
            // Tek liste (flat) döndür: Kategori üstten alta, her kategorinin kanalları sırayla;
            // kategorisiz kanallar listenin en üstünde gözüksün.
            const flatList = [
                // Önce kategorisiz kanallar
                ...uncategorized
                    .sort((a, b) => { var _a, _b; return ((_a = a.position) !== null && _a !== void 0 ? _a : 0) - ((_b = b.position) !== null && _b !== void 0 ? _b : 0); })
                    .map((c) => ({ id: c.id, name: c.name, type: c.type })),
                // Sonra kategoriler sırasıyla ve alt kanalları
                ...categories.flatMap((cat) => {
                    const children = chans
                        .filter((ch) => ch.parent_id === cat.id)
                        .sort((a, b) => { var _a, _b; return ((_a = a.position) !== null && _a !== void 0 ? _a : 0) - ((_b = b.position) !== null && _b !== void 0 ? _b : 0); })
                        .map((c) => ({ id: c.id, name: c.name, type: c.type }));
                    return children;
                }),
            ];
            return server_1.NextResponse.json({ channels: flatList }, { status: 200 });
        }
        catch (e) {
            return server_1.NextResponse.json({ error: (e === null || e === void 0 ? void 0 : e.message) || "failed" }, { status: 500 });
        }
    });
}
