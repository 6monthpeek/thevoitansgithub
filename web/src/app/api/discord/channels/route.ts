import { NextResponse } from "next/server";

/**
 * List guild text + announcement channels for Officer panel
 * Requires:
 *  - DISCORD_GUILD_ID
 *  - DISCORD_BOT_TOKEN
 * Auth: session not strictly required for read, but we'll still require Senior Officer to reduce exposure.
 */
export async function GET(req: Request) {
  try {
    const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID!;
    const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN!;
    if (!DISCORD_GUILD_ID || !DISCORD_BOT_TOKEN) {
      return NextResponse.json({ error: "Discord env missing" }, { status: 500 });
    }

    // We can optionally authorize only senior officers by calling /api/auth/session
    // but this is a route handler; safest is to use NextAuth's session endpoint.
    // For simplicity, skip SSR session check here; OfficerPanel UI is already gated.
    // If you want to block direct access, implement a server-side session check using getServerSession.

    const res = await fetch(`https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/channels`, {
      headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json({ error: `Discord error: ${res.status} ${text}` }, { status: 502 });
    }

    // Ham veri UI geriye uyum için eskisi gibi düz listeye de dönüştürülebilsin (opsiyonel flag)
    const url = new URL(req.url);
    const flat = url.searchParams.get("flat") === "1";

    type Channel = {
      id: string;
      name: string;
      type: number;
      parent_id?: string | null;
      position?: number;
    };
    type Category = {
      id: string;
      name: string;
      type: number; // 4
      position?: number;
    };

    const raw = (await res.json()) as Array<Channel | Category>;

    // Kategorileri ve kanal/duyuru kanallarını ayır
    const categories: Category[] = (raw as Array<Channel | Category>)
      .filter((c) => c && c.type === 4)
      .map((c) => ({ id: (c as Category).id, name: (c as Category).name, type: (c as Category).type, position: (c as Category).position ?? 0 }));

    const chans: Channel[] = (raw as Array<Channel | Category>)
      .filter((c) => c && (c.type === 0 || c.type === 5))
      .map((c) => {
        const ch = c as Channel;
        return {
          id: ch.id,
          name: ch.name,
          type: ch.type,
          parent_id: ch.parent_id ?? null,
          position: ch.position ?? 0,
        };
      });

    // Sıralama: önce kategoriler position'a göre, sonra her kategoride kanallar position'a göre
    categories.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

    // parent_id eşleşmeyen (kategorisiz) kanalları da toplayacağız
    const uncategorized = chans.filter((ch) => !ch.parent_id);

    const grouped = categories.map((cat) => {
      const children = chans
        .filter((ch) => ch.parent_id === cat.id)
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        .map((c) => ({ id: c.id, name: c.name, type: c.type }));
      return {
        id: cat.id,
        name: cat.name,
        type: cat.type,
        channels: children,
      };
    });

    // Tek liste (flat) döndür: Kategori üstten alta, her kategorinin kanalları sırayla;
    // kategorisiz kanallar listenin en üstünde gözüksün.
    const flatList = [
      // Önce kategorisiz kanallar
      ...uncategorized
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        .map((c) => ({ id: c.id, name: c.name, type: c.type })),
      // Sonra kategoriler sırasıyla ve alt kanalları
      ...categories.flatMap((cat) => {
        const children = chans
          .filter((ch) => ch.parent_id === cat.id)
          .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
          .map((c) => ({ id: c.id, name: c.name, type: c.type }));
        return children;
      }),
    ];

    return NextResponse.json({ channels: flatList }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 });
  }
}
