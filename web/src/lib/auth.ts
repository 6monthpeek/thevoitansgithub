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
      authorization: { params: { scope: "identify guilds" } },
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
      }
      return session;
    },
  },
  debug: true,
  events: {
    signIn(message: any) {
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
