import { NextResponse } from "next/server";

type DiscordRole = {
  id: string;
  name: string;
  color: number; // decimal int from Discord
  position: number;
  hoist: boolean;
  managed: boolean;
};

function intColorToHex(intColor: number): string {
  // Discord color int to #RRGGBB
  const hex = intColor.toString(16).padStart(6, "0");
  return `#${hex}`;
}

export async function GET() {
  const token = process.env.DISCORD_BOT_TOKEN || process.env.DISCORD_TOKEN;
  const guildId = process.env.DISCORD_GUILD_ID;

  if (!token || !guildId) {
    return NextResponse.json(
      { error: "Missing DISCORD_BOT_TOKEN/DISCORD_TOKEN or DISCORD_GUILD_ID" },
      { status: 500 }
    );
  }

  try {
    const url = `https://discord.com/api/v10/guilds/${guildId}/roles`;
    const maxAttempts = 4;
    let attempt = 0;
    let lastStatus = 0;
    let lastText = "";

    while (attempt < maxAttempts) {
      attempt++;
      const res = await fetch(url, {
        headers: { Authorization: `Bot ${token}` },
        cache: "no-store",
        next: { revalidate: 0 },
      });

      lastStatus = res.status;

      if (res.status === 429) {
        const retryAfter = Number(res.headers.get("retry-after")) || 0;
        const base = Math.pow(2, attempt - 1) * 300; // 300, 600, 1200, 2400 ms
        const jitter = Math.floor(Math.random() * 150);
        const wait = Math.max(base + jitter, retryAfter * 1000);
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }

      if (!res.ok) {
        lastText = await res.text().catch(() => "");
        // Retry only on 5xx
        if (res.status >= 500 && res.status < 600 && attempt < maxAttempts) {
          const base = Math.pow(2, attempt - 1) * 300;
          const jitter = Math.floor(Math.random() * 150);
          await new Promise((r) => setTimeout(r, base + jitter));
          continue;
        }
        return NextResponse.json(
          { error: "discord-fetch-failed", status: res.status, details: lastText, attempt },
          { status: 502 }
        );
      }

      const roles = (await res.json()) as DiscordRole[];

      const mapped = roles
        .map((r) => ({
          id: r.id,
          name: r.name,
          colorHex: r.color ? intColorToHex(r.color) : null,
          position: r.position,
          hoist: r.hoist,
          managed: r.managed,
        }))
        .sort((a, b) => b.position - a.position);

      return NextResponse.json({ roles: mapped, meta: { attempt } }, { status: 200 });
    }

    return NextResponse.json(
      { error: "discord-retry-exhausted", status: lastStatus, details: lastText },
      { status: 502 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: "unexpected-error", details: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
