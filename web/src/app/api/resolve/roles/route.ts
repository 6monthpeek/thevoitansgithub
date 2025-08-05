import { NextResponse } from "next/server";

const DISCORD_TOKEN = process.env.DISCORD_BOT_TOKEN!;
const GUILD_ID = process.env.DISCORD_GUILD_ID!;

// 10 dk memory cache
type CacheEntry = { value: any; expires: number };
const g = globalThis as unknown as { __voitansRoleCache?: Map<string, CacheEntry> };
const cache: Map<string, CacheEntry> = g.__voitansRoleCache ?? new Map();
g.__voitansRoleCache = cache;

function getCache<T>(key: string): T | null {
  const e = cache.get(key);
  if (!e) return null;
  if (Date.now() > e.expires) {
    cache.delete(key);
    return null;
  }
  return e.value as T;
}
function setCache(key: string, value: any, ttlMs = 10 * 60 * 1000) {
  cache.set(key, { value, expires: Date.now() + ttlMs });
}

async function fetchRoles() {
  const key = `roles:${GUILD_ID}`;
  const cached = getCache<Record<string, string>>(key);
  if (cached) return cached;

  const url = `https://discord.com/api/v10/guilds/${GUILD_ID}/roles`;
  const maxAttempts = 4;
  let attempt = 0;
  while (attempt < maxAttempts) {
    attempt++;
    const res = await fetch(url, {
      headers: { Authorization: `Bot ${DISCORD_TOKEN}` },
      next: { revalidate: 0 },
    });

    if (res.status === 429) {
      const retryAfter = Number(res.headers.get("retry-after")) || 0;
      const backoff = Math.max(Math.pow(2, attempt - 1) * 500, retryAfter * 1000);
      await new Promise((r) => setTimeout(r, backoff));
      continue;
    }
    if (!res.ok) throw new Error(`Discord roles fetch failed: ${res.status}`);

    const data = (await res.json()) as Array<{ id: string; name: string }>;
    const map: Record<string, string> = {};
    for (const r of data) map[r.id] = r.name;
    setCache(key, map);
    return map;
  }
  return {};
}

export async function GET() {
  if (!DISCORD_TOKEN || !GUILD_ID) {
    return NextResponse.json({ roles: {}, error: "Missing DISCORD_BOT_TOKEN or DISCORD_GUILD_ID" }, { status: 500 });
  }
  try {
    const roles = await fetchRoles();
    return NextResponse.json({ roles }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ roles: {}, error: e?.message ?? "unknown-error" }, { status: 500 });
  }
}
