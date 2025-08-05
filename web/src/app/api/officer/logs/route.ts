import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import { promises as fs } from "fs";
import path from "path";
import { z } from "zod";
// Harici tip dosyası kullanılmıyor; şema doğrulamasını bu dosyada inline yapıyoruz.
// (Önceki hatayı veren '../../../../types' importu tamamen kaldırıldı.)

/**
 * GET /api/officer/logs?limit=100&offset=0&event=messageDelete&search=text
 * GET /api/officer/logs?mode=voice-heatmap&days=7
   - Sadece ses eventleri (voiceStateUpdate*) için saat x gün matrisi döner
   - Saat: 0-23, Gün: 0=today,1=yesterday,... (varsayılan 7 gün)
 * - Yalnızca Senior Officer erişimi (Discord guild role doğrulaması ile)
 * - output/site-logs.json içindeki logları döner (sınırsız büyüme uyarısı kabul edildi)
 */

type LogEntry = {
  timestamp: string; // ISO
  event: string;
  guildId?: string;
  // Tam ID zorunlu, kısaltma opsiyonel
  userId?: string;        // tam snowflake (17–19 hane)
  userIdShort?: string;   // opsiyonel: ör. "311103…9628"
  channelId?: string;
  data?: any;
};

const LOG_FILE = path.join(process.cwd(), "output", "site-logs.json");

// Senior Officer doğrulaması (server-side, Discord API ile)
async function assertSeniorOfficer(session: any) {
  const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN!;
  const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID!;
  const SENIOR_ROLE_ID = process.env.SENIOR_OFFICER_ROLE_ID; // varsa ID ile kontrol

  const gmResp = await fetch(`https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/members/${session.user.id}`, {
    headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
    cache: "no-store",
  });
  if (!gmResp.ok) return false;

  const guildMember = await gmResp.json().catch(() => ({} as any));
  const memberRoleIds = Array.isArray(guildMember?.roles) ? (guildMember.roles as string[]) : [];

  if (SENIOR_ROLE_ID) {
    return memberRoleIds.includes(SENIOR_ROLE_ID);
  }

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

type EnrichedUser = {
  id: string;
  username?: string;          // kullanıcı adı (username)
  nickname?: string;          // sunucuya özel takma ad (member.nick)
  globalName?: string;        // global display name (user.global_name)
  avatarUrl?: string;
};

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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const ok = await assertSeniorOfficer(session);
    if (!ok) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Query params + zod doğrulama
    const url = new URL(req.url);
    const qp = {
      limit: Number(url.searchParams.get("limit") ?? 100),
      offset: Number(url.searchParams.get("offset") ?? 0),
      event: url.searchParams.get("event")?.toString().trim().toLowerCase() || "",
      search: url.searchParams.get("search")?.toString().trim().toLowerCase() || "",
      mode: url.searchParams.get("mode")?.toString().trim().toLowerCase() || "",
      days: Number(url.searchParams.get("days") ?? 7),
    };
    const QSchema = z.object({
      limit: z.number().min(1).max(1000),
      offset: z.number().min(0),
      event: z.string(),
      search: z.string(),
      mode: z.string(),
      days: z.number().min(1).max(31),
    });
    const parsed = QSchema.safeParse(qp);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, code: "BAD_QUERY", error: parsed.error.message }, { status: 400 });
    }
    const { limit, offset, event: eventFilter, search, mode, days } = parsed.data;

    // Read logs
    let logs: LogEntry[] = [];
    try {
      const buf = await fs.readFile(LOG_FILE, "utf8");
      logs = JSON.parse(buf) as LogEntry[];
      if (!Array.isArray(logs)) logs = [];
    } catch {
      logs = [];
    }

    // API modu: voice heatmap
    if (mode === "voice-heatmap") {
      // Sadece ses eventleri: voiceStateUpdate*
      const voice = logs.filter((l) => String(l.event || "").toLowerCase().startsWith("voicestateupdate"));

      // En yeni en üstte
      const ordered = voice.slice().reverse();

      // Bugün 00:00
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const windowStart = todayStart - (days - 1) * 24 * 60 * 60 * 1000;

      // Saat x gün matrisi (24 x days)
      const matrix: number[][] = Array.from({ length: 24 }, () => Array.from({ length: days }, () => 0));

      for (const l of ordered) {
        const t = new Date(l.timestamp).getTime();
        if (isNaN(t) || t < windowStart) continue;
        const d = new Date(t);
        const hour = d.getHours(); // 0..23
        const dayIndex = Math.floor((todayStart - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / (24 * 60 * 60 * 1000));
        if (dayIndex >= 0 && dayIndex < days) {
          matrix[hour][dayIndex] += 1;
        }
      }

      const heat = {
        days,
        hours: 24,
        matrix, // matrix[hour][dayFromToday]
        generatedAt: new Date().toISOString(),
      };
      // Basit tip kontrolü (zod şeması dışı)
      const okShape =
        typeof heat.days === "number" &&
        heat.days >= 1 &&
        typeof heat.hours === "number" &&
        heat.hours === 24 &&
        Array.isArray(heat.matrix) &&
        heat.matrix.length === 24;
      if (!okShape) {
        return NextResponse.json({ ok: false, code: "HEATMAP_VALIDATE_FAIL", error: "invalid heatmap shape" }, { status: 500 });
      }
      return NextResponse.json({ ok: true, data: heat }, { status: 200 });
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

    if (eventFilter) {
      filtered = filtered.filter((l) => (l.event || "").toLowerCase() === eventFilter);
    }
    if (search) {
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
        return hay.toLowerCase().includes(search);
      });
    }

    // presenceUpdate loglarını tamamen gizle
    filtered = filtered.filter((l) => (l.event || "").toLowerCase() !== "presenceupdate");

    // Varsayılan olarak en yeni en üstte görmek için tersle
    filtered = filtered.slice().reverse();

    const total = filtered.length;
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
          // Eski "Server - username - id" yerine, daha sade gösterim değerlerini sağlayalım:
          userDisplay: officerUserLine, // UI doğrudan bunu basabilir
          userAvatarUrl: avatarFromData || u?.avatarUrl,
          guildName: guildName,
          displayNameResolved: userDisplayName,
          usernameResolved: usernamePure,
        },
      };
      return merged;
    });

    const payload = {
      total,
      limit,
      offset,
      items: enriched,
    };
    // Basit tip kontrolü (zod şeması dışı)
    const payloadOk =
      typeof payload.total === "number" &&
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
