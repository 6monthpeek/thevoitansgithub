import { NextResponse } from "next/server";

type LogEntry = {
  timestamp: string; // ISO
  event: string;
  guildId?: string;
  userId?: string;
  channelId?: string;
  data?: any;
};

// Geçici: Prod (Vercel) ortamında kalıcı dosya yazımı yerine no-op.
// Local geliştirmede isterseniz dosyaya yazmaya devam edebiliriz, ancak şu an için botun 500 hatasını kesmek adına tamamen no-op uygulanıyor.
const isProd = process.env.VERCEL === "1" || process.env.NODE_ENV === "production";

export async function POST(req: Request) {
  try {
    const start = Date.now();

    // 1) Shared-secret doğrulaması (opsiyonel ama önerilir)
    // Header adı öncelik sırası:
    //   1) X-Ingest-Token
    //   2) Authorization: Bearer <token>
    const xIngestHeader = req.headers.get("x-ingest-token") || req.headers.get("X-Ingest-Token");
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : undefined;

    const provided = (xIngestHeader || bearer || "").trim();
    const expected = (process.env.SITE_LOG_INGEST_TOKEN || "").trim();

    if (expected && provided !== expected) {
      const mode = xIngestHeader ? "x-ingest-token" : (bearer ? "bearer" : "none");
      return NextResponse.json(
        { error: "forbidden", code: "BAD_TOKEN", mode },
        { status: 403 }
      );
    }

    // 2) Body parse
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "invalid json", code: "BAD_JSON" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    // 3) Normalize
    const normGuildId =
      body?.guildId ||
      body?.data?.guildId ||
      body?.data?.guild?.id ||
      undefined;

    const normUserId =
      body?.userId ||
      body?.data?.userId ||
      body?.data?.author?.id ||
      undefined;

    const normChannelId =
      body?.channelId ||
      body?.data?.channelId ||
      body?.data?.channel?.id ||
      undefined;

    const entry: LogEntry = {
      timestamp: body?.timestamp || now,
      event: String(body?.event || "unknown"),
      guildId: normGuildId ? String(normGuildId) : undefined,
      userId: normUserId ? String(normUserId) : undefined,
      channelId: normChannelId ? String(normChannelId) : undefined,
      data: body?.data ?? undefined,
    };

    if (!entry.event) {
      return NextResponse.json(
        { error: "event field required", code: "MISSING_EVENT" },
        { status: 400 }
      );
    }

    // 4) NO-OP (hem prod hem şimdilik tüm ortamlarda)
    // İleride KV/DB entegre edildiğinde buraya kalıcı yazım eklenecek.
    const took = Date.now() - start;
    return NextResponse.json({ ok: true, tookMs: took, mode: isProd ? "prod-noop" : "noop" }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed", code: "UNHANDLED" }, { status: 500 });
  }
}
