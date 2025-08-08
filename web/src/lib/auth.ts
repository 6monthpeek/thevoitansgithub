import DiscordProvider from "next-auth/providers/discord";
import type { NextAuthOptions } from "next-auth";
import type { JWT } from "next-auth/jwt";

/**
 * Tek kaynak NextAuth options
 * - Handler export'u sadece /api/auth/[...nextauth]/route.ts içinde yapılır.
 * - Burada SADECE config tanımlanır.
 */
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID!;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET!;
const SITE_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

export const authOptions: NextAuthOptions = {
  providers: [
    DiscordProvider({
      clientId: DISCORD_CLIENT_ID,
      clientSecret: DISCORD_CLIENT_SECRET,
      authorization: {
        params: { scope: "identify guilds" },
      },
      // Ek teşhis: provider hazırlandığında kritik env ve auth URL’i logla
      async profile(profile, tokens) {
        try {
          console.error("[next-auth][discord][profile]", {
            got_profile_id: (profile as any)?.id || "-",
            has_access_token: !!tokens?.access_token,
          });
        } catch {}
        // Orijinal minimal mapping (id zorunlu)
        return {
          id: (profile as any)?.id,
          name: (profile as any)?.global_name || (profile as any)?.username || "Discord User",
          image: (profile as any)?.avatar
            ? `https://cdn.discordapp.com/avatars/${(profile as any)?.id}/${(profile as any)?.avatar}.png?size=64`
            : null,
        } as any;
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
    async jwt({ token, account, profile }: { token: JWT; account: any; profile?: any }) {
      if (account && profile && account.provider === "discord") {
        const p = profile as unknown as {
          id?: string;
          username?: string;
          global_name?: string;
          avatar?: string | null;
        };

        const pid = p?.id ?? token.sub ?? "";
        (token as any).discordId = pid;
        (token as any).username = p?.global_name || p?.username || "Discord User";
        (token as any).avatar = p?.avatar
          ? `https://cdn.discordapp.com/avatars/${pid}/${p.avatar}.png?size=64`
          : `https://cdn.discordapp.com/embed/avatars/${Number(pid || 0) % 5}.png`;
      }
      return token;
    },
    async session({ session, token }: { session: any; token: JWT }) {
      if (session.user) {
        session.user.id = (token as any).discordId || token.sub;
        session.user.username = (token as any).username || session.user?.name || "Discord User";
        session.user.avatar = (token as any).avatar || session.user?.image || null;

        // HYDRATE: Discord guildMember.roles -> session.user.guildMember.roles + düz dizi discordRoles
        // Server-side çağrı; Vercel'de çalışır.
        try {
          const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
          const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;
          const userId = session.user.id as string | undefined;

          if (DISCORD_BOT_TOKEN && DISCORD_GUILD_ID && userId) {
            const gm = await fetch(`https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/members/${userId}`, {
              headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
              cache: "no-store",
            });
            if (gm.ok) {
              const j = (await gm.json().catch(() => ({}))) as { roles?: string[]; nick?: string | null };
              const roleIds = Array.isArray(j?.roles) ? (j.roles as string[]) : [];

              // Düz dizi: UI ve API kontrolleri için
              (session.user as any).discordRoles = roleIds;

              // Opsiyonel detay objesi
              const roles = roleIds.map((id) => ({ id }));
              session.user.guildMember = {
                ...(session.user.guildMember || {}),
                nick: j?.nick ?? (session.user.guildMember?.nick ?? null),
                roles,
              };
            } else {
              console.error("[next-auth][hydrate][guildMember] failed", gm.status);
            }
          } else {
            console.error("[next-auth][hydrate][guildMember] missing DISCORD_BOT_TOKEN or DISCORD_GUILD_ID");
          }
        } catch (e: any) {
          console.error("[next-auth][hydrate][guildMember] error", e?.message || e);
        }
      }
      return session;
    },
  },
  debug: process.env.NODE_ENV === 'development',
  events: {
    // Authorization request/response sürecinde görülen hataları yakala
    async linkAccount(message) {
      try {
        console.error("[next-auth][events][linkAccount]", {
          provider: (message as any)?.account?.provider,
          has_access_token: !!(message as any)?.account?.access_token,
          has_refresh_token: !!(message as any)?.account?.refresh_token,
        });
      } catch {}
    },
    async signIn(message: any) {
      try {
        console.error("[next-auth][events][signIn]", {
          user: message?.user?.id || message?.user?.email || "-",
          accountProvider: message?.account?.provider || "-",
          profileId: (message as any)?.profile?.id || "-",
        });
      } catch {}
    },
    signOut(message: any) {
      try {
        console.error("[next-auth][events][signOut]", { session: !!message?.session });
      } catch {}
    },
  },
};
