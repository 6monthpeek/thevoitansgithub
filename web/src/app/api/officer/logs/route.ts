import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import { promises as fs } from "fs";
import path from "path";
import { z } from "zod";

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
 * Sadece Senior Officer erişimi.
 * Kaynak: output/site-logs.json
 */

type LogEntry = {
  timestamp: string; // ISO
  event: string;
  guildId?: string;
  userId?: string;        // tam snowflake (17–19 hane)
  userIdShort?: string;   // opsiyonel
  channelId?: string;
  data?: any;
};

type EnrichedUser = {
  id: string;
  username?: string;          // kullanıcı adı (username)
  nickname?: string;          // sunucuya özel takma ad (member.nick)
  globalName?: string;        // global display name (user.global_name)
  avatarUrl?: string;
};

const LOG_FILE = path.join(process.cwd(), "output", "site-logs.json");

// Senior Officer doğrulaması (server-side, Discord API ile)
async function assertSeniorOfficer(session: any) {
  const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN!;
  const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID!;
  const SENIOR_ROLE_ID = process.env.SENIOR_OFFICER_ROLE_ID; // varsa ID ile kontrol

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

  // Rol adı ile fallback (daha zayıf)
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

  // avatar url: member.avatar (per-guild) > user avatar > default
  const userAvatarHash = m?.user?.avatar || null;
  const memberAvatarHash = m?.avatar || null;

  let avatarUrl: string | undefined = undefined;
  if (memberAvatarHash && id) {
    const ext = memberAvatarHash?.startsWith("a_") ? "gif" : "png";
    // Per-guild avatar endpoint
    avatarUrl = `https://cdn.discordapp.com/guilds/${process.env.DISCORD_GUILD_ID}/${"users"}/${id}/avatars/${memberAvatarHash}.${ext}?size=64`;
  } else if (userAvatarHash && id) {
    const ext = userAvatarHash?.startsWith("a_") ? "gif" : "png";
    avatarUrl = `https://cdn.discordapp.com/avatars/${id}/${userAvatarHash}.${ext}?size=64`;
  } else if (id) {
    // deterministic default
    const sum = id.split("").reduce((acc, ch) => (/\d/.test(ch) ? acc + (ch.charCodeAt(0) - 48) : acc), 0);
    const idx = sum % 5;
    avatarUrl = `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
  }

  return { id, username, nickname, globalName, avatarUrl };
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

    // Read logs
    let logs: LogEntry[] = [];
    try {
      const buf = await fs.readFile(LOG_FILE, "utf8");
      logs = JSON.parse(buf) as LogEntry[];
      if (!Array.isArray(logs)) logs = [];
    } catch {
      logs = [];
    }

    // Filters
    let filtered = logs;

    // Sadece bu guild: 1140361736470409316
    const TARGET_GUILD = "1140361736470409316";
    filtered = filtered.filter((l) => {
      const byTop = String(l.guildId || "").trim() === TARGET_GUILD;
      const byData =
        String(l?.data?.guildId || "").trim() === TARGET_GUILD ||
        String(l?.data?.guild?.id || "").trim() === TARGET_GUILD;
      return byTop || byData;
    });

    // Tarih aralığı (inclusive)
    const toMs = (val?: string) => {
      if (!val) return NaN;
      const n = Number(val);
      if (!isNaN(n)) return n;
      const d = new Date(val);
      return d.getTime();
    };
    const startMs = toMs(start);
    const endMs = toMs(end);
    if (!isNaN(startMs) || !isNaN(endMs)) {
      filtered = filtered.filter((l) => {
        const t = new Date(l.timestamp).getTime();
        if (isNaN(t)) return false;
        if (!isNaN(startMs) && t < startMs) return false;
        if (!isNaN(endMs) && t > endMs) return false;
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
        const uid = String(
          (l as any).userId ?? (l as any)?.data?.userId ?? (l as any)?.data?.author?.id ?? ""
        ).toLowerCase();
        const uname = String(
          (l as any)?.data?.resolvedUser?.username ?? (l as any)?.data?.userName ?? ""
        ).toLowerCase();
        const gname = String(
          (l as any)?.data?.resolvedUser?.globalName ?? (l as any)?.data?.globalName ?? ""
        ).toLowerCase();
        const nick = String((l as any)?.data?.resolvedUser?.nickname ?? "").toLowerCase();
        return (
          (uid && uid.includes(userNeedle)) ||
          (uname && uname.includes(userNeedle)) ||
          (gname && gname.includes(userNeedle)) ||
          (nick && nick.includes(userNeedle))
        );
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
        const hay =
          (l.timestamp || "") +
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
    const userIds = Array.from(
      new Set(
        slice
          .map((l) => String(l.userId || "").trim())
          .filter((s) => !!s)
      )
    );
    const cache = new Map<string, EnrichedUser | null>();
    await Promise.all(
      userIds.map(async (uid) => {
        const u = await fetchGuildMemberSafe(uid).catch(() => null);
        cache.set(uid, u);
      })
    );

    // item'ları enrich et
    const enriched = slice.map((l) => {
      // 1) userId normalize: üst seviye > data.userId > data.author.id
      const uidRaw =
        (l as any).userId ??
        (l as any)?.data?.userId ??
        (l as any)?.data?.author?.id ??
        "";
      const uid = String(uidRaw).trim();

      // 2) Opsiyonel kısa ID
      const userIdShort =
        uid && uid.length >= 8 ? `${uid.slice(0, 6)}…${uid.slice(-4)}` : uid || undefined;

      const u = uid ? cache.get(uid) || null : null;

      // 3) Sunucu adı (tercihen botun zengin verisinden gelir)
      const guildName =
        (l?.data?.guildName as string) ||
        (l?.data?.guild?.name as string) ||
        (l?.data?.guildNameFallback as string) ||
        l.guildId ||
        "Bilinmeyen Sunucu";

      // 4) Kullanıcı görünen ad (nickname > globalName > username > data.displayName)
      const userDisplayName =
        (u?.nickname && String(u.nickname).trim()) ||
        (u?.globalName && String(u.globalName).trim()) ||
        (u?.username && String(u.username).trim()) ||
        String(l?.data?.displayName || l?.data?.globalName || "").trim() ||
        "Bilinmeyen Kullanıcı";

      // 5) Username (yalın)
      const usernamePure =
        (u?.username && String(u.username).trim()) ||
        String(l?.data?.userName || "").trim() ||
        String(l?.data?.authorTag || "").trim() ||
        "kullanici";

      // 6) Full ID
      const fullId = uid || "id";

      // 7) Officer UI’daki kullanıcı satırı: "DisplayName (username)"
      const officerUserLine = `${userDisplayName} (${usernamePure})`;

      const avatarFromData =
        l?.data?.userAvatarUrl || l?.data?.memberAvatarUrl || l?.data?.userAvatar || undefined;

      const merged = {
        ...l,
        userId: fullId,
        userIdShort,
        data: {
          ...l.data,
          resolvedUser: u
            ? {
                id: u.id,
                username: u.username,
                nickname: u.nickname,
                globalName: u.globalName,
                avatarUrl: u.avatarUrl,
              }
            : null,
          // UI için sade gösterim değerleri
          userDisplay: officerUserLine,
          userAvatarUrl: avatarFromData || u?.avatarUrl,
          guildName: guildName,
          displayNameResolved: userDisplayName,
          usernameResolved: usernamePure,
        },
      };
      return merged;
    });

    // Geliştirici modu: ham slice döndür
    if (mode) {
      return NextResponse.json({ ok: true, data: { total, page, limit, offset, items: slice } }, { status: 200 });
    }

    const payload = { total, page, limit, offset, items: enriched };
    // Basit tip kontrolü
    const payloadOk =
      typeof payload.total === "number" &&
      typeof payload.page === "number" &&
      typeof payload.limit === "number" &&
      typeof payload.offset === "number" &&
      Array.isArray(payload.items);
    if (!payloadOk) {
      return NextResponse.json({ ok: false, code: "LOGS_VALIDATE_FAIL", error: "invalid payload" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data: payload }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, code: "UNHANDLED", error: e?.message || "failed" }, { status: 500 });
  }
}
