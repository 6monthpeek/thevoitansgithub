"use strict";
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
            async profile(profile, tokens) {
                try {
                    console.error("[next-auth][discord][profile]", {
                        got_profile_id: profile?.id || "-",
                        has_access_token: !!tokens?.access_token,
                    });
                }
                catch { }
                // Orijinal minimal mapping (id zorunlu)
                return {
                    id: profile?.id,
                    name: profile?.global_name || profile?.username || "Discord User",
                    image: profile?.avatar
                        ? `https://cdn.discordapp.com/avatars/${profile?.id}/${profile?.avatar}.png?size=64`
                        : null,
                };
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
        async jwt({ token, account, profile }) {
            if (account && profile && account.provider === "discord") {
                const p = profile;
                const pid = p?.id ?? token.sub ?? "";
                token.discordId = pid;
                token.username = p?.global_name || p?.username || "Discord User";
                token.avatar = p?.avatar
                    ? `https://cdn.discordapp.com/avatars/${pid}/${p.avatar}.png?size=64`
                    : `https://cdn.discordapp.com/embed/avatars/${Number(pid || 0) % 5}.png`;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.discordId || token.sub;
                session.user.username = token.username || session.user?.name || "Discord User";
                session.user.avatar = token.avatar || session.user?.image || null;
                // HYDRATE: Discord guildMember.roles -> session.user.guildMember.roles + düz dizi discordRoles
                // Server-side çağrı; Vercel'de çalışır.
                try {
                    const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
                    const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;
                    const userId = session.user.id;
                    if (DISCORD_BOT_TOKEN && DISCORD_GUILD_ID && userId) {
                        const gm = await fetch(`https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/members/${userId}`, {
                            headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
                            cache: "no-store",
                        });
                        if (gm.ok) {
                            const j = (await gm.json().catch(() => ({})));
                            const roleIds = Array.isArray(j?.roles) ? j.roles : [];
                            // Düz dizi: UI ve API kontrolleri için
                            session.user.discordRoles = roleIds;
                            // Opsiyonel detay objesi
                            const roles = roleIds.map((id) => ({ id }));
                            session.user.guildMember = {
                                ...(session.user.guildMember || {}),
                                nick: j?.nick ?? (session.user.guildMember?.nick ?? null),
                                roles,
                            };
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
                    console.error("[next-auth][hydrate][guildMember] error", e?.message || e);
                }
            }
            return session;
        },
    },
    debug: true,
    events: {
        // Authorization request/response sürecinde görülen hataları yakala
        async linkAccount(message) {
            try {
                console.error("[next-auth][events][linkAccount]", {
                    provider: message?.account?.provider,
                    has_access_token: !!message?.account?.access_token,
                    has_refresh_token: !!message?.account?.refresh_token,
                });
            }
            catch { }
        },
        async signIn(message) {
            try {
                console.error("[next-auth][events][signIn]", {
                    user: message?.user?.id || message?.user?.email || "-",
                    accountProvider: message?.account?.provider || "-",
                    profileId: message?.profile?.id || "-",
                });
            }
            catch { }
        },
        signOut(message) {
            try {
                console.error("[next-auth][events][signOut]", { session: !!message?.session });
            }
            catch { }
        },
    },
};
