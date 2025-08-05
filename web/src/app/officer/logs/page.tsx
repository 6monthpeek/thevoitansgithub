"use client";

import { useEffect, useMemo, useState } from "react";

type LogItem = {
  timestamp: string;
  event: string;
  guildId?: string;
  userId?: string;
  channelId?: string;
  data?: any;
};

type ApiResponse = {
  total: number;
  limit: number;
  offset: number;
  items: LogItem[];
};

function Time({ iso }: { iso: string }) {
  const txt = useMemo(() => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso || "-";
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
  }, [iso]);
  return <span className="text-[12px] text-neutral-400">{txt}</span>;
}

export default function OfficerLogsPage() {
  const [items, setItems] = useState<LogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(100);
  const [offset, setOffset] = useState(0);
  const [eventFilter, setEventFilter] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // Yeni: Canlı toggle ve sayaçlar
  const [live, setLive] = useState(true);
  const [liveIntervalMs, setLiveIntervalMs] = useState(5000);
  const [recentWindowSec, setRecentWindowSec] = useState(60);
  const [last24hCount, setLast24hCount] = useState(0);
  const [recentCount, setRecentCount] = useState(0);

  // Yeni: Üst mini kartlar (özet)
  const [onlineMembers, setOnlineMembers] = useState<number | null>(null);
  const [activeVoiceChannels, setActiveVoiceChannels] = useState<number | null>(null);
  const [eventsLast5m, setEventsLast5m] = useState<number>(0);

  // Yeni: Kullanıcı detay drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerUserId, setDrawerUserId] = useState<string | null>(null);
  const [drawerUser, setDrawerUser] = useState<any>(null);
  const [drawerEvents, setDrawerEvents] = useState<LogItem[]>([]);
  const [drawerLoading, setDrawerLoading] = useState(false);

  // Isı Haritası (sadece ses) durumları
  const [heatmapDays, setHeatmapDays] = useState(7);
  const [heatmap, setHeatmap] = useState<{ days: number; hours: number; matrix: number[][]; generatedAt: string } | null>(null);
  const [heatLoading, setHeatLoading] = useState(false);
  const [heatErr, setHeatErr] = useState("");

  // Preset event grupları
  const PRESET = {
    mesaj: ["messageCreate", "messageUpdate", "messageDelete"],
    ses: ["voiceStateUpdate", "voiceStateUpdate_join", "voiceStateUpdate_leave", "voiceStateUpdate_switch"],
    moderasyon: ["guildBanAdd", "guildBanRemove", "warn", "error"],
  };

  function applyPreset(name: "mesaj" | "ses" | "moderasyon") {
    // Basit: preset seçince event inputuna ilk değeri koy, aramada dizi desteği yoksa filtre backend tek event istiyor olabilir.
    // Bu yüzden frontend filtreyi client-side da uygularız (aşağıda render’da).
    setEventFilter(name); // özel anlam: render sırasında preset algılanacak
    setOffset(0);
    load(); // yine de data güncellensin
  }

  function isPresetActive(name: "mesaj" | "ses" | "moderasyon") {
    return eventFilter === name;
  }

  function matchesPreset(ev: string) {
    const e = ev.toLowerCase();
    if (eventFilter === "mesaj") return PRESET.mesaj.map(s => s.toLowerCase()).includes(e);
    if (eventFilter === "ses") return PRESET.ses.map(s => s.toLowerCase()).includes(e);
    if (eventFilter === "moderasyon") return PRESET.moderasyon.map(s => s.toLowerCase()).includes(e);
    return true;
  }

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const params = new URLSearchParams();
      params.set("limit", String(limit));
      params.set("offset", String(offset));
      // eventFilter yalnızca "gerçek event" ise backend'e gönder
      const ef = eventFilter.trim();
      if (ef && !["mesaj", "ses", "moderasyon"].includes(ef)) params.set("event", ef);
      if (search.trim()) params.set("search", search.trim());
      const r = await fetch(`/api/officer/logs?${params.toString()}`, { cache: "no-store" });
      if (!r.ok) {
        const j = await r.json().catch(() => ({} as any));
        throw new Error(j?.error || `HTTP ${r.status}`);
      }
      const j = (await r.json()) as ApiResponse;
      const all = j.items || [];
      setItems(all);
      setTotal(j.total || 0);

      // Sayaçlar
      const now = Date.now();
      const rc = all.filter(i => {
        const t = new Date(i.timestamp).getTime();
        return now - t <= recentWindowSec * 1000;
      }).length;
      setRecentCount(rc);

      const last5m = all.filter(i => now - new Date(i.timestamp).getTime() <= 5 * 60 * 1000).length;
      setEventsLast5m(last5m);

      const last24h = all.filter(i => now - new Date(i.timestamp).getTime() <= 24 * 60 * 60 * 1000).length;
      setLast24hCount(last24h);

      // Üst kartlar (yaklaşık): online ve aktif ses için kaba tahmin
      const presenceEvents = all.filter(i => i.event.toLowerCase() === "presenceupdate");
      setOnlineMembers(presenceEvents.length ? null : onlineMembers); // gerçek API yoksa null bırak
      const voiceEvents = all.filter(i => i.event.toLowerCase().startsWith("voicestateupdate"));
      setActiveVoiceChannels(voiceEvents.length ? null : activeVoiceChannels);
    } catch (e: any) {
      setErr(e?.message || "Yüklenemedi");
      setItems([]);
      setTotal(0);
      setRecentCount(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit, offset]);

  // Canlı auto-refresh
  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => {
      load();
    }, liveIntervalMs);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, liveIntervalMs, limit, offset, eventFilter, search]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setOffset(0);
    load();
  }

  const canPrev = offset > 0;
  const canNext = offset + limit < total;

  // Drawer loader
  async function openUserDrawer(uid: string) {
    setDrawerOpen(true);
    setDrawerUserId(uid);
    setDrawerLoading(true);
    try {
      // Bu örnekte, eldeki item’lardan userId eşleşen son 20 kaydı seçelim
      const recent = items.filter(i => String(i.userId || "").trim() === uid).slice(0, 20);
      setDrawerEvents(recent);
      // Kullanıcı meta: mevcut item içindeki bir kayıttan al
      const meta = items.find(i => String(i.userId || "").trim() === uid)?.data || {};
      setDrawerUser({
        id: uid,
        displayName: meta.displayNameResolved || meta.displayName || meta.globalName || "Bilinmeyen Kullanıcı",
        username: meta.usernameResolved || meta.userName || "kullanici",
        avatarUrl: meta.userAvatarUrl || meta.resolvedUser?.avatarUrl,
        roles: meta.roles || [],
      });
    } finally {
      setDrawerLoading(false);
    }
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setDrawerUserId(null);
    setDrawerUser(null);
    setDrawerEvents([]);
  }

  // Isı haritasını yükle
  async function loadHeatmap() {
    setHeatLoading(true);
    setHeatErr("");
    try {
      const r = await fetch(`/api/officer/logs?mode=voice-heatmap&days=${heatmapDays}`, { cache: "no-store" });
      if (!r.ok) {
        const j = await r.json().catch(() => ({} as any));
        throw new Error(j?.error || `HTTP ${r.status}`);
      }
      const j = (await r.json()) as { days: number; hours: number; matrix: number[][]; generatedAt: string };
      setHeatmap(j);
    } catch (e: any) {
      setHeatErr(e?.message || "Isı haritası yüklenemedi");
      setHeatmap(null);
    } finally {
      setHeatLoading(false);
    }
  }

  useEffect(() => {
    loadHeatmap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heatmapDays]);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <h1 className="text-xl font-semibold text-neutral-100">Officer / Loglar</h1>

      {/* Üst mini canlı denetim kartları */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded border border-neutral-800 p-3">
          <div className="text-xs text-neutral-400">Son {recentWindowSec}s Event</div>
          <div className="text-2xl font-semibold text-neutral-100">{recentCount}</div>
        </div>
        <div className="rounded border border-neutral-800 p-3">
          <div className="text-xs text-neutral-400">Son 5dk Event</div>
          <div className="text-2xl font-semibold text-neutral-100">{eventsLast5m}</div>
        </div>
        <div className="rounded border border-neutral-800 p-3">
          <div className="text-xs text-neutral-400">Son 24 Saat</div>
          <div className="text-2xl font-semibold text-neutral-100">{last24hCount}</div>
        </div>
        <div className="rounded border border-neutral-800 p-3">
          <div className="text-xs text-neutral-400">Aktif Ses Kanalı</div>
          <div className="text-2xl font-semibold text-neutral-100">{activeVoiceChannels ?? "-"}</div>
        </div>
      </div>

      {/* Isı Haritası (Ses Eventleri) */}
      <div className="rounded border border-neutral-800 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-100">Ses Isı Haritası (saat × gün)</h2>
          <div className="flex items-center gap-2">
            <label className="text-xs text-neutral-400">Gün</label>
            <select
              value={heatmapDays}
              onChange={(e) => setHeatmapDays(Math.max(1, Math.min(31, Number(e.target.value) || 7)))}
              className="bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-sm text-neutral-200"
            >
              <option value={7}>7</option>
              <option value={14}>14</option>
              <option value={21}>21</option>
              <option value={28}>28</option>
            </select>
            <button
              type="button"
              onClick={loadHeatmap}
              className="px-2 py-1 text-xs rounded border border-neutral-700 text-neutral-300 hover:bg-neutral-800"
            >
              Yenile
            </button>
          </div>
        </div>

        {heatLoading ? (
          <div className="text-neutral-400 text-sm">Yükleniyor…</div>
        ) : heatErr ? (
          <div className="text-red-400 text-sm">{heatErr}</div>
        ) : heatmap ? (
          <div className="overflow-x-auto">
            <div className="min-w-[640px]">
              {/* Basit kare grid: satırlar saat (0-23), sütunlar gün (0=today ...) */}
              <div className="grid" style={{ gridTemplateColumns: `auto repeat(${heatmap.days}, 1fr)` }}>
                {/* Header boş hücre + gün başlıkları */}
                <div />
                {Array.from({ length: heatmap.days }).map((_, day) => (
                  <div key={`h-${day}`} className="text-center text-[11px] text-neutral-400">
                    -{day}g
                  </div>
                ))}
                {/* Saat satırları */}
                {Array.from({ length: 24 }).map((_, hour) => (
                  <div key={`row-${hour}`} className="contents">
                    <div className="text-[11px] text-neutral-400 pr-2 text-right">{hour.toString().padStart(2, "0")}:00</div>
                    {Array.from({ length: heatmap.days }).map((_, day) => {
                      const v = heatmap.matrix?.[hour]?.[day] || 0;
                      // basit yoğunluk rengi
                      const level = v === 0 ? 0 : v < 3 ? 1 : v < 7 ? 2 : v < 15 ? 3 : 4;
                      const bg =
                        level === 0 ? "bg-neutral-900" :
                        level === 1 ? "bg-indigo-950" :
                        level === 2 ? "bg-indigo-900" :
                        level === 3 ? "bg-indigo-800" :
                        "bg-indigo-700";
                      return (
                        <div
                          key={`c-${hour}-${day}`}
                          title={`Saat ${hour}:00, -${day}g • ${v} event`}
                          className={`h-5 ${bg} border border-neutral-900`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
              <div className="text-[11px] text-neutral-500 mt-1">generated: {new Date(heatmap.generatedAt).toLocaleString()}</div>
            </div>
          </div>
        ) : (
          <div className="text-neutral-500 text-sm">Veri yok</div>
        )}
      </div>

      <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col">
          <label className="text-xs text-neutral-400">Event</label>
          <input
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
            placeholder="messageDelete, voiceStateUpdate, ..."
            className="bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-sm text-neutral-200 placeholder:text-neutral-500"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-neutral-400">Ara</label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="kullanıcı, kanal, içerik..."
            className="bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-sm text-neutral-200 placeholder:text-neutral-500"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-neutral-400">Limit</label>
          <input
            type="number"
            value={limit}
            min={1}
            max={1000}
            onChange={(e) => setLimit(Math.max(1, Math.min(1000, Number(e.target.value) || 100)))}
            className="bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-sm text-neutral-200 w-24"
          />
        </div>
        {/* Canlı toggle + interval */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-neutral-400">Canlı</label>
          <input
            type="checkbox"
            checked={live}
            onChange={(e) => setLive(e.target.checked)}
          />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-neutral-400">Yenileme</label>
          <select
            value={liveIntervalMs}
            onChange={(e) => setLiveIntervalMs(Number(e.target.value))}
            className="bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-sm text-neutral-200"
          >
            <option value={3000}>3 sn</option>
            <option value={5000}>5 sn</option>
            <option value={10000}>10 sn</option>
          </select>
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-neutral-400">Sayaç Penceresi</label>
          <select
            value={recentWindowSec}
            onChange={(e) => setRecentWindowSec(Number(e.target.value))}
            className="bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-sm text-neutral-200"
          >
            <option value={30}>30 sn</option>
            <option value={60}>60 sn</option>
            <option value={120}>120 sn</option>
          </select>
        </div>

        {/* Preset butonları */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-400">Preset:</span>
          <button type="button" onClick={() => applyPreset("mesaj")} className={`px-2 py-1 rounded border ${isPresetActive("mesaj") ? "bg-neutral-600 text-neutral-100" : "bg-neutral-800 text-neutral-300 border-neutral-700"}`}>Mesaj</button>
          <button type="button" onClick={() => applyPreset("ses")} className={`px-2 py-1 rounded border ${isPresetActive("ses") ? "bg-neutral-600 text-neutral-100" : "bg-neutral-800 text-neutral-300 border-neutral-700"}`}>Ses</button>
          <button type="button" onClick={() => applyPreset("moderasyon")} className={`px-2 py-1 rounded border ${isPresetActive("moderasyon") ? "bg-neutral-600 text-neutral-100" : "bg-neutral-800 text-neutral-300 border-neutral-700"}`}>Moderasyon</button>
        </div>

        <button type="submit" className="px-3 py-1.5 text-sm rounded bg-neutral-700 text-neutral-200 hover:bg-neutral-600">
          Uygula
        </button>
        {loading ? <span className="text-sm text-neutral-400">Yükleniyor...</span> : null}
        {err ? <span className="text-sm text-red-400">{err}</span> : null}
      </form>

      <div className="flex items-center justify-between text-xs text-neutral-400">
        <div>Toplam: {total}</div>
        <div className="flex items-center gap-2">
          <button
            disabled={!canPrev}
            onClick={() => setOffset(Math.max(0, offset - limit))}
            className={`px-2 py-1 rounded border border-neutral-700 ${
              canPrev ? "text-neutral-200 hover:bg-neutral-700" : "text-neutral-600"
            }`}
          >
            Önceki
          </button>
          <span>
            {offset + 1}-{Math.min(offset + limit, total)}
          </span>
          <button
            disabled={!canNext}
            onClick={() => setOffset(offset + limit)}
            className={`px-2 py-1 rounded border border-neutral-700 ${
              canNext ? "text-neutral-200 hover:bg-neutral-700" : "text-neutral-600"
            }`}
          >
            Sonraki
          </button>
        </div>
      </div>

      <div className="border border-neutral-800 rounded">
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 px-3 py-2 text-xs text-neutral-400 border-b border-neutral-800">
          <div>Kullanıcı</div>
          <div>Olay</div>
          <div>Detay</div>
          <div>Zaman</div>
        </div>
        {/* Liste penceresi: sabit yükseklik + iç scroll */}
        <div className="max-h-[520px] overflow-y-auto">
          <ul className="divide-y divide-neutral-800">
            {items
              .filter(l => matchesPreset(l.event))
              .map((l, idx) => {
            // Kullanıcı adı: "DisplayName (username)" — Sunucu-Username-ID formatı yok.
            const displayName =
              String(l?.data?.displayNameResolved || "").trim() ||
              String(l?.data?.displayName || l?.data?.globalName || "").trim() ||
              "Bilinmeyen Kullanıcı";
            const username =
              String(l?.data?.usernameResolved || "").trim() ||
              String(l?.data?.userName || "").trim() ||
              "kullanici";
            const userLine = `${displayName} (${username})`;

            const avatarUrl: string | undefined =
              (l?.data?.userAvatarUrl as string | undefined) ||
              (l?.data?.resolvedUser?.avatarUrl as string | undefined);

            const guildName =
              (l?.data?.guildName as string) ||
              (l?.data?.guild?.name as string) ||
              l.guildId ||
              "-";
            const channelName =
              (l?.data?.channelName as string) ||
              (l?.data?.channel?.name as string) ||
              (l?.channelId ? `${l.channelId}` : "-");

            const event = String(l.event || "").toLowerCase();

            let summary: string | null = null;
            if (event === "messagecreate") {
              const content = (l?.data?.content as string) || "";
              summary = `#${channelName} • ${content ? `“${content}”` : "İçerik yok"}`;
            } else if (event === "messageupdate") {
              const before = (l?.data?.before as string) || "";
              const after = (l?.data?.after as string) || "";
              summary = `#${channelName} • ${before ? `“${before}”` : "…”"} → ${after ? `“${after}”` : "…”"}`;
            } else if (event === "messagedelete") {
              const content = (l?.data?.content as string) || "";
              summary = `#${channelName} • ${content ? `“${content}”` : "İçerik yok"}`;
            } else if (event.startsWith("voicestateupdate")) {
              const oldCh = l?.data?.oldChannel?.name || l?.data?.oldChannel || "-";
              const newCh = l?.data?.newChannel?.name || l?.data?.newChannel || "-";
              summary = `Ses • ${guildName} • ${oldCh} → ${newCh}`;
            } else if (event === "presenceupdate") {
              const oldS = l?.data?.oldStatus || "-";
              const newS = l?.data?.newStatus || "-";
              const map: Record<string, string> = { online: "Çevrimiçi", idle: "Boşta", dnd: "Rahatsız", offline: "Çevrimdışı", invisible: "Görünmez" };
              summary = `Durum • ${map[String(oldS)] || oldS} → ${map[String(newS)] || newS}`;
            }

            return (
              <li key={`${l.timestamp}-${idx}`} className="grid grid-cols-[1fr_auto_auto_auto] gap-3 px-3 py-2 items-center">
                <div className="flex items-center gap-3 min-w-0 max-w-[560px] cursor-pointer" onClick={() => l.userId && openUserDrawer(String(l.userId))}>
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt="" className="size-6 rounded" width={24} height={24} loading="lazy" />
                  ) : (
                    <div className="size-6 rounded bg-neutral-700" />
                  )}
                  <div className="text-[13px] text-neutral-200 truncate" title={displayName}>
                    {userLine}
                  </div>
                </div>
                <div className="text-[12px] text-neutral-300">{l.event}</div>
                <div className="text-[12px] text-neutral-400">
                  {summary ? summary : guildName || "-"}
                </div>
                <div className="justify-self-end">
                  <Time iso={l.timestamp} />
                </div>
              </li>
            );
          })}
            {items.length === 0 ? (
              <li className="px-3 py-6 text-center text-neutral-500 text-sm">Kayıt bulunamadı</li>
            ) : null}
          </ul>
        </div>
      </div>

      {/* Kullanıcı Detay Drawer */}
      {drawerOpen ? (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={closeDrawer} />
          <div className="absolute top-0 right-0 h-full w-full max-w-md bg-neutral-900 border-l border-neutral-800 p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-neutral-100">Kullanıcı Detayı</h2>
              <button onClick={closeDrawer} className="px-2 py-1 rounded border border-neutral-700 text-neutral-300 hover:bg-neutral-800">Kapat</button>
            </div>
            {drawerLoading ? (
              <div className="text-neutral-400">Yükleniyor…</div>
            ) : drawerUser ? (
              <>
                <div className="flex items-center gap-3">
                  {drawerUser.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={drawerUser.avatarUrl} alt="" className="size-10 rounded" />
                  ) : (
                    <div className="size-10 rounded bg-neutral-700" />
                  )}
                  <div>
                    <div className="text-neutral-100 font-medium">{drawerUser.displayName}</div>
                    <div className="text-neutral-400 text-sm">@{drawerUser.username}</div>
                    <div className="text-neutral-500 text-xs mt-1">ID: {drawerUserId}</div>
                  </div>
                </div>

                {Array.isArray(drawerUser.roles) && drawerUser.roles.length > 0 ? (
                  <div className="mt-3">
                    <div className="text-xs text-neutral-400 mb-1">Roller</div>
                    <div className="flex flex-wrap gap-1">
                      {drawerUser.roles.map((r: any, i: number) => (
                        <span key={i} className="px-2 py-0.5 rounded border border-neutral-700 text-neutral-300 text-xs">{String(r)}</span>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="mt-4">
                  <div className="text-xs text-neutral-400 mb-1">Son 20 Etkinlik</div>
                  <ul className="space-y-2">
                    {drawerEvents.map((ev, i) => (
                      <li key={i} className="text-sm text-neutral-300 flex items-center justify-between">
                        <span className="truncate">{ev.event}</span>
                        <Time iso={ev.timestamp} />
                      </li>
                    ))}
                    {drawerEvents.length === 0 ? (
                      <li className="text-sm text-neutral-500">Kayıt yok</li>
                    ) : null}
                  </ul>
                </div>
              </>
            ) : (
              <div className="text-neutral-400">Kullanıcı bilgisi bulunamadı.</div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
