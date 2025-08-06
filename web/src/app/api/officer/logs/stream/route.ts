import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/auth";

// Force Node.js runtime (we need fs + intervals)
export const runtime = "nodejs";

type EnrichedUser = {
  id: string;
  username?: string;
  nickname?: string;
  globalName?: string;
  avatarUrl?: string;
};

type LogEntry = {
  timestamp: string;
  event: string;
  guildId?: string;
  userId?: string;
  userIdShort?: string;
  channelId?: string;
  data?: any;
};

const isProd = process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
const NDJSON_PATH = isProd ? "/tmp/site-logs.ndjson" : "web/output/site-logs.ndjson";
const TARGET_GUILD = "1140361736470409316";

// Officer doğrulaması (server-side, Discord API ile)
async function assertSeniorOfficer(userId: string | undefined): Promise<boolean> {
  try {
    const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN!;
    const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID!;
    const SENIOR_ROLE_ID = process.env.SENIOR_OFFICER_ROLE_ID;

    if (!userId || !DISCORD_BOT_TOKEN || !DISCORD_GUILD_ID) return false;

    const gmResp = await fetch(`https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/members/${userId}`, {
      headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
      cache: "no-store",
    });
    if (!gmResp.ok) return false;

    const guildMember = await gmResp.json().catch(() => ({} as any));
    const memberRoleIds = Array.isArray(guildMember?.roles) ? (guildMember.roles as string[]) : [];
    if (SENIOR_ROLE_ID) return memberRoleIds.includes(SENIOR_ROLE_ID);

    const rolesResp = await fetch(`https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/roles`, {
      headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
      cache: "no-store",
    });
    if (!rolesResp.ok) return false;

    const allRoles = (await rolesResp.json().catch(() => [])) as Array<{ id: string; name: string }>;
    const seniorRole = allRoles.find((r) => (r.name || "").toLowerCase() === "senior officer");
    return seniorRole ? memberRoleIds.includes(seniorRole.id) : false;
  } catch {
    return false;
  }
}

// Minimal şekle normalize ve guild filtresi
function normalizeAndFilter(raw: any): LogEntry | null {
  try {
    const guildId =
      raw?.guildId ||
      raw?.data?.guildId ||
      raw?.data?.guild?.id ||
      undefined;

    // yalnızca hedef guild
    if (String(guildId || "").trim() !== TARGET_GUILD) return null;

    const userId =
      raw?.userId ||
      raw?.data?.userId ||
      raw?.data?.author?.id ||
      undefined;

    const channelId =
      raw?.channelId ||
      raw?.data?.channelId ||
      raw?.data?.channel?.id ||
      undefined;

    const ts = String(raw?.timestamp || new Date().toISOString());
    const event = String(raw?.event || "unknown");
    const entry: LogEntry = {
      timestamp: ts,
      event,
      guildId: guildId ? String(guildId) : undefined,
      userId: userId ? String(userId) : undefined,
      channelId: channelId ? String(channelId) : undefined,
      data: raw?.data ?? undefined,
    };
    return entry;
  } catch {
    return null;
  }
}

// SSE publisher helper
function sseResponse(onStart: (controller: ReadableStreamDefaultController) => void) {
  const stream = new ReadableStream({
    start(controller) {
      onStart(controller);
    },
    cancel() {},
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

// Publish one event
function publish(controller: ReadableStreamDefaultController, data: any) {
  try {
    const payload = typeof data === "string" ? data : JSON.stringify(data);
    controller.enqueue(`data: ${payload}\n\n`);
  } catch {}
}

export async function GET(req: Request) {
  // Auth + Senior Officer check
  const session = (await getServerSession(authOptions).catch(() => null)) as any;
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, code: "UNAUTHORIZED" }, { status: 401 });
  }
  const ok = await assertSeniorOfficer(session.user.id);
  if (!ok) {
    return NextResponse.json({ ok: false, code: "FORBIDDEN" }, { status: 403 });
  }

  const url = new URL(req.url);
  // opsiyonel: client filtreleri (type/user/channel/q)
  const typeFilters = url.searchParams.getAll("type").map((s) => s.toLowerCase());
  const userNeedle = (url.searchParams.get("user") || "").trim().toLowerCase();
  const channelNeedle = (url.searchParams.get("channel") || "").trim();
  const qNeedle = (url.searchParams.get("q") || "").toLowerCase();

  // 1 sn interval
  const INTERVAL_MS = 1000;

  return sseResponse((controller) => {
    let cancelled = false;
    // offset: okunan byte konumu; polling ile yeni eklenen satırları yakalarız
    let offset = 0;
    let timer: NodeJS.Timeout | null = null;

    const tick = async () => {
      if (cancelled) return;
      try {
        const fsp = await import("fs/promises");
        const fs = await import("fs");

        // Dosya mevcut mu?
        const exists = fs.existsSync(NDJSON_PATH);
        if (!exists) {
          // dosya henüz yoksa boş event gönderme; tekrar dene
          return;
        }

        // Stat ile dosya boyutunu al
        const stat = await fsp.stat(NDJSON_PATH);
        const size = stat.size;

        // İlk bağlantıda sondan devam etmek yerine tam tail için offset'i mevcut boyuta ayarlayabiliriz (yalnızca yeni satırlar)
        if (offset === 0 && size > 0) {
          offset = size;
          publish(controller, { ok: true, ready: true, mode: isProd ? "prod" : "local" });
          return;
        }

        // Yeni veri var mı?
        if (size > offset) {
          const fh = await fsp.open(NDJSON_PATH, "r");
          try {
            const len = size - offset;
            const buf = Buffer.alloc(len);
            await fh.read(buf, 0, len, offset);
            offset = size;

            const chunk = buf.toString("utf8");
            const lines = chunk.split("\n").filter((l) => l.trim().length > 0);

            for (const line of lines) {
              try {
                const raw = JSON.parse(line);
                const entry = normalizeAndFilter(raw);
                if (!entry) continue;

                // server-side incremental filters
                if (typeFilters.length > 0) {
                  const ev = String(entry.event || "").toLowerCase();
                  if (!typeFilters.includes(ev)) continue;
                }
                if (userNeedle) {
                  const uid =
                    String(entry.userId || "").toLowerCase() ||
                    String(entry.data?.userId || entry.data?.author?.id || "").toLowerCase();
                  const uname = String(entry.data?.resolvedUser?.username || entry.data?.userName || "").toLowerCase();
                  const gname = String(entry.data?.resolvedUser?.globalName || entry.data?.globalName || "").toLowerCase();
                  const nick = String(entry.data?.resolvedUser?.nickname || "").toLowerCase();
                  if (
                    !(uid.includes(userNeedle) || uname.includes(userNeedle) || gname.includes(userNeedle) || nick.includes(userNeedle))
                  ) {
                    continue;
                  }
                }
                if (channelNeedle) {
                  const chId = String(entry.channelId || "").trim();
                  if (chId !== channelNeedle) continue;
                }
                if (qNeedle) {
                  const hay =
                    (entry.timestamp || "") +
                    " " +
                    (entry.event || "") +
                    " " +
                    (entry.guildId || "") +
                    " " +
                    (entry.userId || "") +
                    " " +
                    (entry.channelId || "") +
                    " " +
                    JSON.stringify(entry.data || "");
                  if (!hay.toLowerCase().includes(qNeedle)) continue;
                }

                publish(controller, { ok: true, item: entry });
              } catch {
                // satır parse edilmezse atla
              }
            }
          } finally {
            await fh.close();
          }
        }
      } catch (e: any) {
        publish(controller, { ok: false, code: "STREAM_ERR", error: e?.message || "failed" });
      }
    };

    // İlk bildirim (bağlantı kuruldu)
    publish(controller, { ok: true, hello: true, ndjson: NDJSON_PATH, mode: isProd ? "prod" : "local" });

    // Interval başlat
    timer = setInterval(tick, INTERVAL_MS);

    // Abort/close davranışı
    const close = () => {
      if (cancelled) return;
      cancelled = true;
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      try {
        // SSE channel close
        controller.close();
      } catch {}
    };

    // Connection lifetime: 2 dakika sonra otomatik kapat; client auto-reconnect (UI backoff ile)
    const lifetime = setTimeout(close, 2 * 60 * 1000);

    // Not: Next.js Route Handlers'da Request.signal ile abort yakalamak mümkün değil.
    // Burada sadece interval ve lifetime ile yönetiyoruz.

  });
}
