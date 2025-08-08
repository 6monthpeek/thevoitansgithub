import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import { z } from "zod";
import clientPromise from "@/lib/mongo";
import type { Document, WithId } from "mongodb";

/**
 * Powerful Officer Logs API
 * GET /api/officer/logs
 * Query:
 *   - start, end: ISO veya epoch ms (tarih aralığı, inclusive)
 *   - type: event adı (çoklu destek için ?type=a&type=b)
 *   - user: userId/username/global_name/nick içerir
 *   - channel: kanal ID eşit
 *   - q: içerik full-text arama (JSON stringify üstünden)
 *   - page, limit: sayfalama (default page=1, limit=50, max=200)
 *   - mode=json: true ise raw slice döner (geliştirici modu)
 * MongoDB'den okur.
 * Sadece Senior Officer erişimi.
 */

type LogEntry = {
  _id?: string;
  ts: Date;
  event: string;
  guildId?: string;
  userId?: string;
  channelId?: string;
  severity?: number;
  source?: string;
  payload?: any;
  createdAt?: Date;
};

type EnrichedUser = {
  id: string;
  username?: string;
  nickname?: string;
  globalName?: string;
  avatarUrl?: string;
};

// Senior Officer doğrulaması (server-side, Discord API ile)
async function assertSeniorOfficer(session: any) {
  const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN!;
  const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID!;
  const SENIOR_ROLE_ID = process.env.SENIOR_OFFICER_ROLE_ID;

  if (!session?.user?.id) return false;
  if (!DISCORD_BOT_TOKEN || !DISCORD_GUILD_ID) return false;

  const gmResp = await fetch(`https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/members/${session.user.id}`, {
    headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
    cache: "no-store",
  });
  if (!gmResp.ok) return false;

  const guildMember = (await gmResp.json().catch(() => ({}))) as any;
  const memberRoleIds = Array.isArray(guildMember?.roles) ? (guildMember.roles as string[]) : [];

  if (SENIOR_ROLE_ID) return memberRoleIds.includes(SENIOR_ROLE_ID);

  // Rol adı ile fallback
  const rolesResp = await fetch(`https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/roles`, {
    headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
    cache: "no-store",
  });
  if (!rolesResp.ok) return false;

  const allRoles = (await rolesResp.json().catch(() => [])) as Array<{ id: string; name: string }>;
  const seniorRole = allRoles.find((r) => (r.name || "").toLowerCase() === "senior officer");
  return seniorRole ? memberRoleIds.includes(seniorRole.id) : false;
}

async function fetchGuildMemberSafe(userId: string): Promise<EnrichedUser | null> {
  const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN!;
  const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID!;
  if (!DISCORD_BOT_TOKEN || !DISCORD_GUILD_ID || !userId) return null;

  const r = await fetch(`https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/members/${userId}`, {
    headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
    cache: "no-store",
  }).catch(() => null);
  if (!r || !r.ok) return null;

  const m = (await r.json().catch(() => null)) as any;
  if (!m) return null;

  const id = String(m?.user?.id || userId);
  const username = typeof m?.user?.username === "string" ? m.user.username : undefined;
  const globalName = typeof m?.user?.global_name === "string" ? m.user.global_name : undefined;
  const nickname = typeof m?.nick === "string" ? m.nick : undefined;

  const userAvatarHash = m?.user?.avatar || null;
  const memberAvatarHash = m?.avatar || null;

  let avatarUrl: string | undefined = undefined;
  if (memberAvatarHash && id) {
    const ext = memberAvatarHash?.startsWith("a_") ? "gif" : "png";
    avatarUrl = `https://cdn.discordapp.com/guilds/${DISCORD_GUILD_ID}/users/${id}/avatars/${memberAvatarHash}.${ext}?size=64`;
  } else if (userAvatarHash && id) {
    const ext = userAvatarHash?.startsWith("a_") ? "gif" : "png";
    avatarUrl = `https://cdn.discordapp.com/avatars/${id}/${userAvatarHash}.${ext}?size=64`;
  } else if (id) {
    const defaultAvatarId = (BigInt(id) >> 22n) % 6n;
    avatarUrl = `https://cdn.discordapp.com/embed/avatars/${defaultAvatarId}.png`;
  }

  return { id, username, globalName, nickname, avatarUrl };
}

export async function GET(req: Request) {
  try {
    const session = (await getServerSession(authOptions).catch(() => null)) as any;
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false, code: "UNAUTHORIZED" }, { status: 401 });
    }
    const ok = await assertSeniorOfficer(session);
    if (!ok) {
      return NextResponse.json({ ok: false, code: "FORBIDDEN" }, { status: 403 });
    }

    // Query params
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
    const QSchema = z.object({
      start: z.string().optional(),
      end: z.string().optional(),
      type: z.array(z.string()).optional(),
      user: z.string().optional(),
      channel: z.string().optional(),
      q: z.string().optional(),
      page: z.number().int().min(1).default(1),
      limit: z.number().int().min(1).max(200).default(50),
      mode: z.boolean().default(false),
    });
    const parsed = QSchema.safeParse(qp);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, code: "BAD_QUERY", error: parsed.error.message }, { status: 400 });
    }
    const { start, end, type, user, channel, q, page, limit, mode } = parsed.data;

    // MongoDB'ye bağlan
    const client = await clientPromise;
    if (!client) {
      return NextResponse.json(
        { ok: false, code: "MONGODB_NOT_CONFIGURED", error: "MongoDB not configured", items: [], total: 0 },
        { status: 503 }
      );
    }
    
    const db = client.db('voitans');
    const collection = db.collection('logs');

    // Query builder
    const query: any = {};

    // Guild filter (sadece VOITANS guild)
    const TARGET_GUILD = "1140361736470409316";
    query.$or = [
      { guildId: TARGET_GUILD },
      { "payload.guildId": TARGET_GUILD },
      { "payload.guild.id": TARGET_GUILD }
    ];

    // Tarih aralığı
    if (start || end) {
      query.ts = {};
      if (start) {
        const startDate = isNaN(Number(start)) ? new Date(start) : new Date(Number(start));
        query.ts.$gte = startDate;
      }
      if (end) {
        const endDate = isNaN(Number(end)) ? new Date(end) : new Date(Number(end));
        query.ts.$lte = endDate;
      }
    }

    // Event türü
    if (type && type.length > 0) {
      query.event = { $in: type.map(t => t.toLowerCase()) };
    }

    // Kullanıcı arama
    if (user) {
      const userNeedle = user.trim().toLowerCase();
      query.$or = query.$or || [];
      query.$or.push(
        { userId: { $regex: userNeedle, $options: 'i' } },
        { "payload.userId": { $regex: userNeedle, $options: 'i' } },
        { "payload.author.id": { $regex: userNeedle, $options: 'i' } },
        { "payload.resolvedUser.username": { $regex: userNeedle, $options: 'i' } },
        { "payload.userName": { $regex: userNeedle, $options: 'i' } }
      );
    }

    // Kanal arama
    if (channel) {
      query.$or = query.$or || [];
      query.$or.push(
        { channelId: channel },
        { "payload.channelId": channel },
        { "payload.channel.id": channel }
      );
    }

    // Full-text arama
    if (q) {
      query.$text = { $search: q };
    }

    // MongoDB'den veri çek
    const skip = (page - 1) * limit;
    const cursor = collection.find(query)
      .sort({ ts: -1 })
      .skip(skip)
      .limit(limit);

    const logs = await cursor.toArray() as WithId<Document>[];
    const total = await collection.countDocuments(query);

    // Kullanıcı bilgilerini zenginleştir
    const enrichedLogs = await Promise.all(
      logs.map(async (log: WithId<Document>) => {
        const logData = log as unknown as LogEntry;
        let enrichedUser: EnrichedUser | null = null;
        if (logData.userId) {
          enrichedUser = await fetchGuildMemberSafe(logData.userId);
        }

        return {
          ...logData,
          timestamp: logData.ts.toISOString(),
          userIdShort: logData.userId ? logData.userId.slice(-4) : undefined,
          data: logData.payload,
          enrichedUser
        };
      })
    );

    if (mode) {
      return NextResponse.json({
        ok: true,
        logs: enrichedLogs,
        total,
        page,
        limit,
        offset: skip
      });
    }

    return NextResponse.json({
      ok: true,
      items: enrichedLogs,
      total,
      page,
      limit,
      offset: skip
    });

  } catch (error) {
    console.error('Logs API error:', error);
    return NextResponse.json(
      { ok: false, code: "INTERNAL_ERROR", error: "Internal server error" },
      { status: 500 }
    );
  }
}
