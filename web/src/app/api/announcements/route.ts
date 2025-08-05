import { NextResponse } from "next/server";

const DISCORD_TOKEN = process.env.DISCORD_BOT_TOKEN!;
const CHANNEL_ID = process.env.DISCORD_ANNOUNCEMENTS_CHANNEL_ID || "1140669615421280356";

// Simple in-memory cache (5 min) to protect rate limits
type CacheEntry = { value: any; expires: number };
const g = globalThis as unknown as { __voitansCache2?: Map<string, CacheEntry> };
const memory: Map<string, CacheEntry> = g.__voitansCache2 ?? new Map();
g.__voitansCache2 = memory;

function getCache<T>(key: string): T | null {
  const e = memory.get(key);
  if (!e) return null;
  if (Date.now() > e.expires) {
    memory.delete(key);
    return null;
  }
  return e.value as T;
}
function setCache(key: string, value: any, ttlMs = 5 * 60 * 1000) {
  memory.set(key, { value, expires: Date.now() + ttlMs });
}

async function fetchChannelMessages(limit = 5) {
  const cacheKey = `announcements:${CHANNEL_ID}:${limit}`;
  const cached = getCache<any[]>(cacheKey);
  if (cached) return cached;

  const url = `https://discord.com/api/v10/channels/${CHANNEL_ID}/messages?limit=${limit}`;
  const maxAttempts = 4;
  let attempt = 0;
  let lastStatus = 0;
  let lastText = "";

  while (attempt < maxAttempts) {
    attempt++;
    const res = await fetch(url, {
      headers: { Authorization: `Bot ${DISCORD_TOKEN}` },
      cache: "no-store",
      next: { revalidate: 0 },
    });

    lastStatus = res.status;

    if (res.status === 429) {
      const retryAfter = Number(res.headers.get("retry-after")) || 0;
      const base = Math.pow(2, attempt - 1) * 400; // 400, 800, 1600, 3200 ms
      const jitter = Math.floor(Math.random() * 200);
      const backoff = Math.max(base + jitter, retryAfter * 1000);
      await new Promise((r) => setTimeout(r, backoff));
      continue;
    }

    if (!res.ok) {
      lastText = await res.text().catch(() => "");
      // retry 5xx
      if (res.status >= 500 && res.status < 600 && attempt < maxAttempts) {
        const base = Math.pow(2, attempt - 1) * 400;
        const jitter = Math.floor(Math.random() * 200);
        await new Promise((r) => setTimeout(r, base + jitter));
        continue;
      }
      throw new Error(`Discord fetch failed: ${res.status} ${lastText}`);
    }

    const data = (await res.json()) as Array<{
      id: string;
      content: string;
      timestamp: string;
      author: { id: string; username: string };
    }>;

    const items = data
      .filter((m) => (m.content ?? "").trim().length > 0)
      .map((m) => ({
        id: m.id,
        // Discord markdown uyumlu görünüm için orijinal içerik korunur
        content: m.content,
        createdAt: m.timestamp,
      }));

    setCache(cacheKey, items);
    return items;
  }

  // Retry tükendi
  console.warn("[/api/announcements] retry-exhausted", { lastStatus, lastText });
  return [];
}

export async function GET() {
  if (!DISCORD_TOKEN) {
    return NextResponse.json({ items: [], error: "Missing DISCORD_BOT_TOKEN" }, { status: 500 });
  }
  try {
    const items = await fetchChannelMessages(5);
    return NextResponse.json({ items }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ items: [], error: e?.message ?? "unknown-error" }, { status: 500 });
  }
}
