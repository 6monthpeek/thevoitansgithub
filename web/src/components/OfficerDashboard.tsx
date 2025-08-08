"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

interface LogEntry {
  _id?: string;
  event: string;
  timestamp: string;
  enrichedUser?: {
    avatarUrl?: string;
    username?: string;
    nickname?: string;
    globalName?: string;
  };
  data?: {
    content?: string;
    commandName?: string;
  };
}

export default function OfficerDashboard() {
  const { data: session } = useSession();
  const roles: Array<{ id: string; name: string }> =
    ((session?.user as any)?.guildMember?.roles as any[])?.map((r: any) => ({ id: String(r.id), name: r.name })) ?? [];

  const SENIOR_OFFICER_ROLE_ID =
    (typeof process !== "undefined" && (process.env.NEXT_PUBLIC_SENIOR_OFFICER_ROLE_ID || process.env.SENIOR_OFFICER_ROLE_ID)) ||
    "1249512318929342505";
  const isSeniorOfficer = (roles.some((r) => String(r.id) === String(SENIOR_OFFICER_ROLE_ID)) || 
    ((session?.user as any)?.discordRoles as string[])?.includes(SENIOR_OFFICER_ROLE_ID)) ?? false;

  const [activeTab, setActiveTab] = useState<"announcements" | "logs">("announcements");
  const [channels, setChannels] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedChannel, setSelectedChannel] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Logs state
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [logsError, setLogsError] = useState<string | null>(null);
  const [logsFilters, setLogsFilters] = useState({
    page: 1,
    limit: 20,
    type: [] as string[],
    user: "",
    channel: "",
    q: ""
  });

  // Event types for filtering
  const eventTypes = [
    'messageCreate',
    'messageUpdate',
    'messageDelete',
    'interactionCreate',
    'guildMemberAdd',
    'guildMemberRemove'
  ];

  // Load channels
  useEffect(() => {
    let alive = true;
    async function loadChannels() {
      try {
        const r = await fetch("/api/discord/channels", { cache: "no-store" });
        const j = await r.json();
        if (!alive) return;
        setChannels(j.channels ?? []);
      } catch {
        if (!alive) return;
        setChannels([]);
      }
    }
    loadChannels();
    return () => { alive = false; };
  }, []);

  // Load logs
  useEffect(() => {
    let alive = true;
    async function loadLogs() {
      if (!isSeniorOfficer) return;

      setLoadingLogs(true);
      setLogsError(null);

      try {
        const params = new URLSearchParams({
          page: logsFilters.page.toString(),
          limit: logsFilters.limit.toString(),
          ...(logsFilters.type.length > 0 && { type: logsFilters.type.join(',') }),
          ...(logsFilters.user && { user: logsFilters.user }),
          ...(logsFilters.channel && { channel: logsFilters.channel }),
          ...(logsFilters.q && { q: logsFilters.q })
        });

        const r = await fetch(`/api/officer/logs?${params}`, { cache: "no-store" });
        const j = await r.json().catch(() => ({}));

        if (!alive) return;

        if (!r.ok) {
          throw new Error(j.error || 'Loglar yüklenemedi');
        }

        setLogs(j.items || []);
      } catch (e: any) {
        if (!alive) return;
        setLogsError(e?.message || 'Loglar yüklenirken hata oluştu');
        setLogs([]);
      } finally {
        if (alive) setLoadingLogs(false);
      }
    }

    loadLogs();

    // Real-time güncelleme için interval
    const interval = setInterval(() => {
      if (alive && isSeniorOfficer) {
        loadLogs();
      }
    }, 30000); // 30 saniyede bir güncelle

    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, [isSeniorOfficer, logsFilters]);

  // Post announcement
  async function postAnnouncement() {
    if (!announcement.trim() || !selectedChannel) return;

    setLoading(true);
    setError(null);

    try {
      const r = await fetch("/api/officer/announce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId: selectedChannel, content: announcement }),
      });

      const j = await r.json();

      if (!r.ok) {
        throw new Error(j.error || "Duyuru gönderilemedi");
      }

      setAnnouncement("");
      setSelectedChannel("");
    } catch (e: any) {
      setError(e?.message || "Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  }

  if (!isSeniorOfficer) {
    return (
      <div className="text-center py-12">
        <div className="text-lg font-semibold text-zinc-300 mb-2">Erişim Reddedildi</div>
        <div className="text-sm text-zinc-500">Bu sayfaya erişim yetkiniz bulunmamaktadır.</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-white/10">
        <button
          onClick={() => setActiveTab("announcements")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "announcements"
              ? "text-white border-b-2 border-purple-400"
              : "text-zinc-400 hover:text-zinc-300"
          }`}
        >
          Duyuru Gönder
        </button>
        <button
          onClick={() => setActiveTab("logs")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "logs"
              ? "text-white border-b-2 border-purple-400"
              : "text-zinc-400 hover:text-zinc-300"
          }`}
        >
          Sistem Logları
        </button>
      </div>

      {/* Announcements Tab */}
      {activeTab === "announcements" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <h3 className="text-lg font-semibold text-zinc-100 mb-4">Duyuru Gönder</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Kanal Seç
                </label>
                <select
                  value={selectedChannel}
                  onChange={(e) => setSelectedChannel(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-white/20"
                >
                  <option value="">Kanal seçin...</option>
                  {channels.map((channel) => (
                    <option key={channel.id} value={channel.id}>
                      #{channel.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Duyuru İçeriği
                </label>
                <textarea
                  value={announcement}
                  onChange={(e) => setAnnouncement(e.target.value)}
                  placeholder="Duyuru içeriğini yazın..."
                  rows={4}
                  className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-white/20 resize-none"
                />
              </div>

              {error && (
                <div className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              <button
                onClick={postAnnouncement}
                disabled={loading || !announcement.trim() || !selectedChannel}
                className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
              >
                {loading ? "Gönderiliyor..." : "Duyuru Gönder"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logs Tab */}
      {activeTab === "logs" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-zinc-100">Sistem Logları</h3>
              <div className="flex items-center gap-2">
                {loadingLogs && <span className="text-xs text-zinc-400">Yükleniyor…</span>}
                <button
                  onClick={() => setLogsFilters(f => ({ ...f, page: 1 }))}
                  disabled={loadingLogs}
                  className="px-3 py-1 text-xs text-zinc-300 hover:text-white disabled:opacity-50 rounded-lg border border-white/10 hover:border-white/20"
                >
                  ↻ Yenile
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
              <input
                type="text"
                placeholder="Kullanıcı ara..."
                value={logsFilters.user}
                onChange={(e) => setLogsFilters(f => ({ ...f, user: e.target.value, page: 1 }))}
                className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-white/20"
              />
              <input
                type="text"
                placeholder="Kanal ara..."
                value={logsFilters.channel}
                onChange={(e) => setLogsFilters(f => ({ ...f, channel: e.target.value, page: 1 }))}
                className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-white/20"
              />
              <input
                type="text"
                placeholder="İçerik ara..."
                value={logsFilters.q}
                onChange={(e) => setLogsFilters(f => ({ ...f, q: e.target.value, page: 1 }))}
                className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-white/20"
              />
              <select
                value={logsFilters.type[0] || ""}
                onChange={(e) => setLogsFilters(f => ({
                  ...f,
                  type: e.target.value ? [e.target.value] : [],
                  page: 1
                }))}
                className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-white/20"
              >
                <option value="">Tüm Eventler</option>
                {eventTypes.map(type => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <select
                value={logsFilters.limit}
                onChange={(e) => setLogsFilters(f => ({ ...f, limit: Number(e.target.value), page: 1 }))}
                className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-white/20"
              >
                <option value={10}>10 log</option>
                <option value={20}>20 log</option>
                <option value={50}>50 log</option>
              </select>
            </div>

            {/* Logs List */}
            <div className="max-h-96 overflow-auto">
              {logsError ? (
                <div className="text-sm text-rose-400">{logsError}</div>
              ) : loadingLogs ? (
                <div className="text-sm text-zinc-400">Loglar yükleniyor...</div>
              ) : logs.length === 0 ? (
                <div className="text-sm text-zinc-500">Log bulunamadı.</div>
              ) : (
                <div className="space-y-2">
                  {logs.map((log) => {
                    // Event türüne göre renk belirleme
                    const getEventColor = (event: string) => {
                      switch (event) {
                        case 'messageCreate': return 'bg-blue-500';
                        case 'messageUpdate': return 'bg-yellow-500';
                        case 'messageDelete': return 'bg-red-500';
                        case 'interactionCreate': return 'bg-purple-500';
                        case 'guildMemberAdd': return 'bg-green-500';
                        case 'guildMemberRemove': return 'bg-orange-500';
                        default: return 'bg-gray-500';
                      }
                    };

                    return (
                      <div key={log._id || log.timestamp} className="flex items-start gap-3 p-3 rounded-lg border border-white/10 bg-black/20 hover:bg-black/30 transition-colors">
                        <div className="flex-shrink-0">
                          <div className={`w-2 h-2 rounded-full ${getEventColor(log.event)}`}></div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-zinc-300 bg-zinc-700 px-2 py-1 rounded">
                              {log.event}
                            </span>
                            <span className="text-xs text-zinc-500">
                              {new Date(log.timestamp).toLocaleString('tr-TR')}
                            </span>
                          </div>
                          {log.enrichedUser && (
                            <div className="flex items-center gap-2 mb-1">
                              <img
                                src={log.enrichedUser.avatarUrl || "https://cdn.discordapp.com/embed/avatars/0.png"}
                                alt={log.enrichedUser.username || "User"}
                                className="w-4 h-4 rounded-full"
                              />
                              <span className="text-xs text-zinc-300">
                                {log.enrichedUser.nickname || log.enrichedUser.globalName || log.enrichedUser.username || "Unknown User"}
                              </span>
                            </div>
                          )}
                          {log.data?.content && (
                            <div className="text-sm text-zinc-400 mt-1">
                              {log.data.content.length > 200
                                ? `${log.data.content.substring(0, 200)}...`
                                : log.data.content
                              }
                            </div>
                          )}
                          {log.data?.commandName && (
                            <div className="text-xs text-zinc-500 mt-1">
                              Komut: /{log.data.commandName}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Pagination */}
            {logs.length > 0 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
                <button
                  onClick={() => setLogsFilters(f => ({ ...f, page: Math.max(1, f.page - 1) }))}
                  disabled={logsFilters.page === 1}
                  className="px-3 py-1 text-sm text-zinc-300 disabled:opacity-50 hover:text-white"
                >
                  ← Önceki
                </button>
                <span className="text-sm text-zinc-400">
                  Sayfa {logsFilters.page}
                </span>
                <button
                  onClick={() => setLogsFilters(f => ({ ...f, page: f.page + 1 }))}
                  disabled={logs.length < logsFilters.limit}
                  className="px-3 py-1 text-sm text-zinc-300 disabled:opacity-50 hover:text-white"
                >
                  Sonraki →
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
