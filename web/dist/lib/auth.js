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
exports.authOptions = void 0;
const discord_1 = __importDefault(require("next-auth/providers/discord"));
/**
 * Tek kaynak NextAuth options
 * - Handler export'u sadece /api/auth/[...nextauth]/route.ts içinde yapılır.
 * - Burada SADECE config tanımlanır.
 */
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const SITE_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";
exports.authOptions = {
    providers: [
        (0, discord_1.default)({
            clientId: DISCORD_CLIENT_ID,
            clientSecret: DISCORD_CLIENT_SECRET,
            authorization: {
                params: { scope: "identify guilds" },
            },
            // Ek teşhis: provider hazırlandığında kritik env ve auth URL’i logla
            profile(profile, tokens) {
                return __awaiter(this, void 0, void 0, function* () {
                    try {
                        console.error("[next-auth][discord][profile]", {
                            got_profile_id: (profile === null || profile === void 0 ? void 0 : profile.id) || "-",
                            has_access_token: !!(tokens === null || tokens === void 0 ? void 0 : tokens.access_token),
                        });
                    }
                    catch (_a) { }
                    // Orijinal minimal mapping (id zorunlu)
                    return {
                        id: profile === null || profile === void 0 ? void 0 : profile.id,
                        name: (profile === null || profile === void 0 ? void 0 : profile.global_name) || (profile === null || profile === void 0 ? void 0 : profile.username) || "Discord User",
                        image: (profile === null || profile === void 0 ? void 0 : profile.avatar)
                            ? `https://cdn.discordapp.com/avatars/${profile === null || profile === void 0 ? void 0 : profile.id}/${profile === null || profile === void 0 ? void 0 : profile.avatar}.png?size=64`
                            : null,
                    };
                });
            },
        }),
    ],
    pages: { error: "/api/auth/error" },
    cookies: {
        sessionToken: {
            name: `next-auth.session-token`,
            options: {
                httpOnly: true,
                sameSite: "lax",
                path: "/",
                secure: SITE_URL.startsWith("https://"),
            },
        },
        csrfToken: {
            name: "next-auth.csrf-token",
            options: {
                httpOnly: true,
                sameSite: "lax",
                path: "/",
                secure: SITE_URL.startsWith("https://"),
            },
        },
        state: {
            name: "next-auth.state",
            options: {
                httpOnly: true,
                sameSite: "lax",
                path: "/",
                secure: SITE_URL.startsWith("https://"),
            },
        },
    },
    session: { strategy: "jwt" },
    callbacks: {
        jwt(_a) {
            return __awaiter(this, arguments, void 0, function* ({ token, account, profile }) {
                var _b, _c;
                if (account && profile && account.provider === "discord") {
                    const p = profile;
                    const pid = (_c = (_b = p === null || p === void 0 ? void 0 : p.id) !== null && _b !== void 0 ? _b : token.sub) !== null && _c !== void 0 ? _c : "";
                    token.discordId = pid;
                    token.username = (p === null || p === void 0 ? void 0 : p.global_name) || (p === null || p === void 0 ? void 0 : p.username) || "Discord User";
                    token.avatar = (p === null || p === void 0 ? void 0 : p.avatar)
                        ? `https://cdn.discordapp.com/avatars/${pid}/${p.avatar}.png?size=64`
                        : `https://cdn.discordapp.com/embed/avatars/${Number(pid || 0) % 5}.png`;
                }
                return token;
            });
        },
        session(_a) {
            return __awaiter(this, arguments, void 0, function* ({ session, token }) {
                var _b, _c, _d, _e, _f;
                if (session.user) {
                    session.user.id = token.discordId || token.sub;
                    session.user.username = token.username || ((_b = session.user) === null || _b === void 0 ? void 0 : _b.name) || "Discord User";
                    session.user.avatar = token.avatar || ((_c = session.user) === null || _c === void 0 ? void 0 : _c.image) || null;
                    // HYDRATE: Discord guildMember.roles -> session.user.guildMember.roles + düz dizi discordRoles
                    // Server-side çağrı; Vercel'de çalışır.
                    try {
                        const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
                        const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;
                        const userId = session.user.id;
                        if (DISCORD_BOT_TOKEN && DISCORD_GUILD_ID && userId) {
                            const gm = yield fetch(`https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/members/${userId}`, {
                                headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
                                cache: "no-store",
                            });
                            if (gm.ok) {
                                const j = (yield gm.json().catch(() => ({})));
                                const roleIds = Array.isArray(j === null || j === void 0 ? void 0 : j.roles) ? j.roles : [];
                                // Düz dizi: UI ve API kontrolleri için
                                session.user.discordRoles = roleIds;
                                // Opsiyonel detay objesi
                                const roles = roleIds.map((id) => ({ id }));
                                session.user.guildMember = Object.assign(Object.assign({}, (session.user.guildMember || {})), { nick: (_d = j === null || j === void 0 ? void 0 : j.nick) !== null && _d !== void 0 ? _d : ((_f = (_e = session.user.guildMember) === null || _e === void 0 ? void 0 : _e.nick) !== null && _f !== void 0 ? _f : null), roles });
                            }
                            else {
                                console.error("[next-auth][hydrate][guildMember] failed", gm.status);
                            }
                        }
                        else {
                            console.error("[next-auth][hydrate][guildMember] missing DISCORD_BOT_TOKEN or DISCORD_GUILD_ID");
                        }
                    }
                    catch (e) {
                        console.error("[next-auth][hydrate][guildMember] error", (e === null || e === void 0 ? void 0 : e.message) || e);
                    }
                }
                return session;
            });
        },
    },
    debug: true,
    events: {
        // Authorization request/response sürecinde görülen hataları yakala
        linkAccount(message) {
            return __awaiter(this, void 0, void 0, function* () {
                var _a, _b, _c;
                try {
                    console.error("[next-auth][events][linkAccount]", {
                        provider: (_a = message === null || message === void 0 ? void 0 : message.account) === null || _a === void 0 ? void 0 : _a.provider,
                        has_access_token: !!((_b = message === null || message === void 0 ? void 0 : message.account) === null || _b === void 0 ? void 0 : _b.access_token),
                        has_refresh_token: !!((_c = message === null || message === void 0 ? void 0 : message.account) === null || _c === void 0 ? void 0 : _c.refresh_token),
                    });
                }
                catch (_d) { }
            });
        },
        signIn(message) {
            return __awaiter(this, void 0, void 0, function* () {
                var _a, _b, _c, _d;
                try {
                    console.error("[next-auth][events][signIn]", {
                        user: ((_a = message === null || message === void 0 ? void 0 : message.user) === null || _a === void 0 ? void 0 : _a.id) || ((_b = message === null || message === void 0 ? void 0 : message.user) === null || _b === void 0 ? void 0 : _b.email) || "-",
                        accountProvider: ((_c = message === null || message === void 0 ? void 0 : message.account) === null || _c === void 0 ? void 0 : _c.provider) || "-",
                        profileId: ((_d = message === null || message === void 0 ? void 0 : message.profile) === null || _d === void 0 ? void 0 : _d.id) || "-",
                    });
                }
                catch (_e) { }
            });
        },
        signOut(message) {
            try {
                console.error("[next-auth][events][signOut]", { session: !!(message === null || message === void 0 ? void 0 : message.session) });
            }
            catch (_a) { }
        },
    },
};
