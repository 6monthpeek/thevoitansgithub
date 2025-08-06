import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Senior Officer rol ID (env veya fallback sabit)
const SENIOR_ROLE = process.env.SENIOR_OFFICER_ROLE_ID || "1249512318929342505";
const RENDER_BASE = process.env.RENDER_GUARDS_BASE; // örn: https://thevoitansgithub.onrender.com
const SHARED_SECRET = process.env.GUARDS_SHARED_SECRET;

// Basit rol doğrulama: session.user.discordRoles içinde SENIOR_ROLE var mı?
async function ensureSenior(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) return { ok: false, reason: "unauthorized" };

  // Session üzerinde roller var ise
  const roles = (session.user as any).discordRoles as string[] | undefined;

  if (Array.isArray(roles) && roles.includes(SENIOR_ROLE)) {
    return { ok: true, session };
  }

  // Yoksa mevcut roles resolver API'niz varsa buradan çekebilirsiniz.
  // Güvenlik gereği 403 dönelim; gerekirse bu kısım genişletilir.
  return { ok: false, reason: "forbidden" };
}

function badConfig() {
  if (!RENDER_BASE || !SHARED_SECRET) {
    return NextResponse.json(
      { ok: false, error: "Server not configured. Set RENDER_GUARDS_BASE and GUARDS_SHARED_SECRET envs." },
      { status: 500 }
    );
  }
  return null;
}

export async function GET(req: NextRequest) {
  const auth = await ensureSenior(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.reason }, { status: auth.reason === "unauthorized" ? 401 : 403 });
  }
  const mis = badConfig();
  if (mis) return mis;

  try {
    const r = await fetch(`${RENDER_BASE}/guards/status`, {
      headers: { "x-guards-secret": SHARED_SECRET as string }
    });
    const data = await r.json();
    return NextResponse.json(data, { status: r.status });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "fetch_error" }, { status: 502 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await ensureSenior(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.reason }, { status: auth.reason === "unauthorized" ? 401 : 403 });
  }
  const mis = badConfig();
  if (mis) return mis;

  let body: any = {};
  try {
    body = await req.json();
  } catch {}
  const action = String(body.action || "");
  try {
    if (action === "enable" || action === "disable") {
      const r = await fetch(`${RENDER_BASE}/guards/${action}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-guards-secret": SHARED_SECRET as string
        },
        body: JSON.stringify({ guard: body.guard })
      });
      const data = await r.json();
      return NextResponse.json(data, { status: r.status });
    }
    if (action === "config-set") {
      const r = await fetch(`${RENDER_BASE}/guards/config-set`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-guards-secret": SHARED_SECRET as string
        },
        body: JSON.stringify({ path: body.path, value: body.value })
      });
      const data = await r.json();
      return NextResponse.json(data, { status: r.status });
    }

    return NextResponse.json({ ok: false, error: "invalid_action" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "proxy_error" }, { status: 502 });
  }
}
