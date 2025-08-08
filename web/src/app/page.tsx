"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { 
  SkyrimTitle, 
  SkyrimSubtitle, 
  MagicCardSkyrimMinimal, 
  MagicButtonSkyrim, 
  MagicBadgeSkyrimMinimal,
  MagicDivider,
  GlowText,
  StaggeredList,
  ListItem,
  MagicGrid
} from "../components/magic-ui-skyrim";
// Cursor arkaplan efektleri temizlendi
import { MemberCard } from "../components/MemberCard";
import AdventuresTabs from "../components/AdventuresTabs";
import LazyTwitch from "../components/LazyTwitch";
import { SplashCursor } from "../components/SplashCursor";
import { AnimatedBackground } from "../components/AnimatedBackground";
import { TypeWriter, GradientText, RotatingText, CountUp } from "../components/TextAnimations";
import { ChromaGrid } from "../components/ChromaGrid";
import { GooeyNav } from "../components/GooeyNav";
import { LightRaysBackground } from "../components/LightRaysBackground";

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&")
    .replaceAll("<", "<")
    .replaceAll(">", ">");
}

function renderMarkdownSubset(input: string) {
  let s = input;
  s = s.replace(/\r\n/g, "\n");
  
  s = s.replace(/(^|\s)@everyone\b/g, `$1<span class="mention discord-pill --everyone">@everyone</span>`);
  s = s.replace(/(^|\s)@here\b/g, `$1<span class="mention discord-pill --here">@here</span>`);
  s = s.replace(/<@&(\d+)>/g, (_m, id) => {
    const key = String(id);
    const resolveName = () => {
      try {
        if (typeof window !== "undefined") {
          const state = (window as any).__ROLE_NAME_CACHE__ as { roles?: Record<string, string> } | undefined;
          const nm = state?.roles?.[key];
          if (nm && typeof nm === "string") return nm;
        }
      } catch {}
      return null;
    };
    const nm = resolveName();
    const label = nm ? nm : "rol";
    return `<span class="mention role discord-pill" data-role-id="${key}">@${label}</span>`;
  });

  s = s.replace(/^\s*###\s+(.*)$/gm, `<h3 class="mt-3 text-sm font-semibold text-zinc-200">$1</h3>`);
  s = s.replace(/^\s*##\s+(.*)$/gm, `<h2 class="mt-4 text-base font-semibold text-zinc-100">$1</h2>`);
  s = s.replace(/^\s*#\s+(.*)$/gm, `<h1 class="mt-5 text-lg font-semibold text-zinc-100">$1</h1>`);

  s = s.replace(/\*\*(.+?)\*\*/g, `<strong class="text-zinc-100">$1</strong>`);
  s = s.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, `$1<em class="text-zinc-300">$2</em>`);

  s = s.replace(/`([^`]+?)`/g, `<code class="px-1.5 py-0.5 text-[11px] rounded bg-white/5 border border-white/10 text-zinc-200">$1</code>`);

  s = s.replace(/^\s*-\s+(.*)$/gm, `<li class="ml-5 list-disc text-zinc-300">$1</li>`);
  s = s.replace(/(?:\s*<li[\s\S]*?<\/li>)+/g, (block) => {
    const trimmed = block.trim();
    return `<ul class="space-y-1">${trimmed}</ul>`;
  });

  s = s.replace(/\n{2,}/g, "<br/><br/>");
  return s;
}

function AnnounceRoleColorizer({ roleColors }: { roleColors: Record<string, string> }) {
  useEffect(() => {
    try {
      const nodes = document.querySelectorAll<HTMLSpanElement>(".discord-pill.role");
      nodes.forEach((n) => {
        const attrId = n.getAttribute("data-role-id");
        let roleId = attrId || "";
        if (!roleId) {
          const txt = n.textContent || "";
          const m = txt.match(/\((\d{5,})\)$/);
          if (m) roleId = m[1];
        }
        if (roleId && roleColors[roleId]) {
          const col = roleColors[roleId];
          n.style.background = `linear-gradient(180deg, ${col} 0%, ${col} 85%)`;
          n.style.color = "#fff";
          n.style.borderColor = "rgba(0,0,0,.25)";
          n.setAttribute("data-role-id", roleId);
        } else {
          if (roleId) n.setAttribute("data-role-id", roleId);
        }
      });
    } catch {}
  }, [roleColors]);
  return null;
}

function Announcements() {
  const [items, setItems] = useState<Array<{ id: string; content: string; createdAt?: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [roleColors, setRoleColors] = useState<Record<string, string>>({});

  useEffect(() => {
    let alive = true;
    async function primeRoles() {
      try {
        const r = await fetch("/api/resolve/roles", { cache: "no-store" });
        if (!r.ok) return;
        const payload = (await r.json()) as { roles?: Record<string, string>; colors?: Record<string, string> };
        if (!alive) return;
        if (typeof window !== "undefined") {
          (window as any).__ROLE_NAME_CACHE__ = { roles: payload?.roles ?? {} };
        }
        if (payload?.colors && typeof payload.colors === "object") {
          setRoleColors(payload.colors);
        }
        setItems((prev) => [...prev]);
      } catch {}
    }
    primeRoles();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const r = await fetch("/api/announcements", { cache: "no-store" });
        const j = await r.json();
        if (!alive) return;
        const arr = (j.items ?? []) as Array<{ id: string; content: string; createdAt?: string }>;
        setItems(arr);
      } catch {
        if (!alive) return;
        setItems([]);
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return <div className="text-sm text-zinc-400">Yükleniyor…</div>;
  }
  if (!items.length) {
    return <div className="text-sm text-zinc-500">Gösterilecek duyuru yok.</div>;
  }
  return (
    <StaggeredList className="space-y-4">
      {items.map((m, index) => {
        const safe = escapeHtml(m.content ?? "");
        const html = renderMarkdownSubset(safe);
        return (
          <ListItem key={m.id} className="announcement-card">
            <MagicCardSkyrimMinimal className="rounded-xl border border-white/10 bg-white/5 p-4 transition-all duration-300 hover:border-white/20 hover:shadow-lg hover:shadow-white/10">
              {m.createdAt && (
                <div className="mb-2">
                  <time
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-[11px] text-zinc-400"
                    dateTime={new Date(m.createdAt).toISOString()}
                  >
                    {new Date(m.createdAt).toLocaleString("tr-TR", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    })
                      .replaceAll(".", " ")
                      .replace(/\s(\d{2}):(\d{2}).*$/, " $1:$2")}
                  </time>
                </div>
              )}
              <style jsx global>{`
                .mention { display: inline; }
                :root .discord-pill {
                  --pill-bg: linear-gradient(180deg, #4F67F7 0%, #4053C8 100%);
                  display: inline-flex;
                  align-items: center;
                  padding: 0 8px;
                  border-radius: 999px;
                  font-size: 12px;
                  line-height: 18px;
                  height: 18px;
                  color: #EAF0FF;
                  background: var(--pill-bg);
                  border: 1px solid rgba(255,255,255,0.10);
                  box-shadow: 0 1px 0 rgba(0,0,0,0.25) inset, 0 1px 2px rgba(0,0,0,0.25);
                  vertical-align: baseline;
                  transform: translateY(-1px);
                  white-space: nowrap;
                }
                :root .discord-pill.--everyone,
                :root .discord-pill.--here {
                  --pill-bg: linear-gradient(180deg, #6A7AFF 0%, #5463E0 100%);
                }
                :root .discord-pill.role[data-role-id] {
                  border-color: rgba(255,255,255,0.14);
                  color: #F7FAFF;
                }
              `}</style>
              <div className="prose prose-invert max-w-none">
                <div dangerouslySetInnerHTML={{ __html: html }} />
              </div>
              <style jsx>{`
                :global(.discord-pill.role[data-role-id]) {
                  background: linear-gradient(180deg, rgba(88,101,242,0.95) 0%, rgba(71,82,196,0.95) 100%);
                }
              `}</style>
              <AnnounceRoleColorizer roleColors={roleColors} />
            </MagicCardSkyrimMinimal>
          </ListItem>
        );
      })}
    </StaggeredList>
  );
}

function WeeklySchedule() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [data, setData] = useState<{
    week: { start: string; end: string };
    events: Array<{
      id: string;
      title: string;
      start: string;
      end: string;
      allDay: boolean;
      location?: string;
    }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch(`/api/schedule/weekly?weekOffset=${weekOffset}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (alive) setData(j);
      })
      .catch(() => {
        if (alive) setData(null);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [weekOffset]);

  const fmtDay = (d: Date) =>
    d.toLocaleDateString("tr-TR", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
    });

  const isoToLocalDate = (iso: string) => new Date(iso);

  const range: Date[] = (() => {
    if (!data || !data.week || !data.week.start) return [];
    const start = new Date(data.week.start);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setUTCDate(d.getUTCDate() + i);
      d.setUTCHours(0, 0, 0, 0);
      return d;
    });
  })();

  const eventsByDay = (() => {
    const map: Record<string, Array<any>> = {};
    if (!data) return map;
    for (const d of range) map[d.toISOString().slice(0, 10)] = [];
    for (const ev of data.events ?? []) {
      const sd = new Date(ev.start);
      const key = sd.toISOString().slice(0, 10);
      if (map[key]) map[key].push(ev);
    }
    for (const k of Object.keys(map)) {
      map[k].sort(
        (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
      );
    }
    return map;
  })();

  const now = new Date();

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-zinc-400">
          {data && data.week ? (
            <>
              Hafta:{" "}
              {new Date(data.week.start).toLocaleDateString("tr-TR", {
                day: "2-digit",
                month: "2-digit",
              })}{" "}
              –{" "}
              {new Date(data.week.end).toLocaleDateString("tr-TR", {
                day: "2-digit",
                month: "2-digit",
              })}
            </>
          ) : loading ? (
            "Yükleniyor…"
          ) : (
            "Takvim verisi alınamadı"
          )}
        </div>
        <div className="flex items-center gap-2">
          <MagicButtonSkyrim onClick={() => setWeekOffset((w) => w - 1)} className="text-sm">
            Önceki
          </MagicButtonSkyrim>
          <MagicButtonSkyrim onClick={() => setWeekOffset(0)} className="text-sm">
            Bu Hafta
          </MagicButtonSkyrim>
          <MagicButtonSkyrim onClick={() => setWeekOffset((w) => w + 1)} className="text-sm">
            Sonraki
          </MagicButtonSkyrim>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 sm:grid-cols-7 gap-3">
        {range.map((d, i) => {
          const key = d.toISOString().slice(0, 10);
          const isToday =
            now.toDateString() ===
            new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()).toDateString();
          return (
            <div
              key={i}
              className="rounded-xl border border-white/10 bg-black/40 p-3 backdrop-blur"
            >
              <div className="flex items-center justify-between">
                <div className="text-xs uppercase tracking-wide text-zinc-400">
                  {fmtDay(d)}
                </div>
                {isToday && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-zinc-300">
                    Bugün
                  </span>
                )}
              </div>
              <div className="mt-2 space-y-2">
                {(eventsByDay[key] ?? []).length === 0 && (
                  <div className="text-xs text-zinc-500">Etkinlik yok</div>
                )}
                {(eventsByDay[key] ?? []).map((ev: any) => {
                  const s = isoToLocalDate(ev.start).toLocaleTimeString("tr-TR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  const e = isoToLocalDate(ev.end).toLocaleTimeString("tr-TR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  return (
                    <div
                      key={ev.id}
                      className="rounded-lg border border-white/10 bg-white/5 p-2 hover:border-white/20 transition-colors"
                    >
                      <div className="text-[13px] text-zinc-100">{ev.title}</div>
                      <div className="text-[11px] text-zinc-400">
                        {ev.allDay ? "Tüm gün" : `${s} – ${e}`}
                        {ev.location ? ` • ${ev.location}` : ""}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {loading && (
        <div className="mt-3 text-xs text-zinc-500">Takvim yükleniyor…</div>
      )}
      {!loading && (!data || !data.week) && (
        <div className="mt-3 text-xs text-rose-400">
          Takvim verisi alınamadı. Lütfen .env.local içinde CALENDAR_ICS_URL tanımlı ve dev
          sunucusu yeniden başlatılmış olsun.
        </div>
      )}
    </div>
  );
}

type Member = {
  id: string;
  username?: string;
  avatarUrl?: string;
  dominantRole?: string | null;
  dominantRoleColor?: string | null;
  dominantRoleName?: string | null;
};

function MembersSection() {
  const [members, setMembers] = useState<Member[]>([]);
  const [meta, setMeta] = useState<{ loading: boolean; error: string | null; page: number; totalPages: number }>({
    loading: true,
    error: null,
    page: 1,
    totalPages: 1,
  });
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<
    "all" | "guildmaster" | "seniorofficer" | "marshal" | "fieldofficer" | "veteran" | "voitans"
  >("all");
  const sort: "rolePriority" | "name" = "rolePriority";
  const order: "asc" | "desc" = "asc";

  const debouncedQ = useMemo(() => q.trim(), [q]);

  const controls = useMemo(
    () => ({
      page: meta.page,
      q: debouncedQ,
      role: roleFilter,
      sort,
      order,
      limit: 12,
    }),
    [meta.page, debouncedQ, roleFilter, sort, order]
  );

  useEffect(() => {
    const ctrl = new AbortController();
    const run = async () => {
      setMeta((m) => ({ ...m, loading: true, error: null }));
      try {
        const params = new URLSearchParams();
        params.set("page", String(controls.page));
        params.set("limit", String(controls.limit));
        if (controls.q) params.set("q", controls.q);
        if (controls.role !== "all") params.set("role", controls.role);
        params.set("sort", controls.sort);
        params.set("order", controls.order);

        const r = await fetch(`/api/members?${params.toString()}`, { cache: "no-store", signal: ctrl.signal });
        const j = await r.json().catch(() => ({}));
        if (ctrl.signal.aborted) return;

        if (!r.ok) {
          setMembers([]);
          setMeta((m) => ({ ...m, loading: false, totalPages: 1, error: (j as any)?.error || "Üyeler yüklenemedi" }));
        } else {
          const list = (j.members ?? []) as Member[];
          setMembers(list);
          setMeta((m) => ({
            ...m,
            loading: false,
            totalPages: Number(j.totalPages ?? 1),
            error: null,
          }));
        }
      } catch (e: any) {
        if (ctrl.signal.aborted) return;
        setMembers([]);
        setMeta((m) => ({ ...m, loading: false, totalPages: 1, error: "Bağlantı hatası. Lütfen tekrar deneyin." }));
      }
    };
    run();
    return () => ctrl.abort();
  }, [controls]);

  const cards = useMemo(() => {
    return members.map((m) => {
      const roleName = m.dominantRoleName ?? (m.dominantRole ? undefined : undefined);
      let roleColor = m.dominantRoleColor || undefined;
      if (!roleColor && roleName) {
        const map: Record<string, string> = {
          "Guild Master": "#f59e0b",
          "Senior Officer": "#22d3ee",
          "Marshal": "#a78bfa",
          "Field Officer": "#34d399",
          "Veteran": "#60a5fa",
          "Voitans": "#9ca3af",
        };
        roleColor = map[roleName] || undefined;
      }
      return (
        <MemberCard
          key={m.id}
          username={m.username || "Discord User"}
          avatarUrl={m.avatarUrl}
          dominantRole={m.dominantRole || undefined}
          dominantRoleColor={roleColor}
          dominantRoleName={roleName}
        />
      );
    });
  }, [members]);

  const [totalMembers, setTotalMembers] = useState(0);

  // Üye sayısını al
  useEffect(() => {
    const fetchTotalMembers = async () => {
      try {
        const response = await fetch('/api/members?limit=1');
        const data = await response.json();
        setTotalMembers(data.total || 0);
      } catch (error) {
        console.error('Üye sayısı alınamadı:', error);
      }
    };
    fetchTotalMembers();
  }, []);

  return (
    <section className="space-y-4">
      {/* Üye Sayısı */}
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-white mb-2">Toplam Üye Sayısı</h3>
        <CountUp 
          end={totalMembers} 
          className="text-3xl font-bold text-purple-400"
          suffix=" Üye"
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <input
          aria-label="Üye ara"
          placeholder="Ara..."
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setMeta((m) => ({ ...m, page: 1 }));
          }}
          className="rounded-xl border border-white/10 bg-black/30 text-sm px-3 py-2 text-zinc-200 outline-none focus:border-white/20"
        />
        {!!q && (
          <button
            aria-label="Aramayı temizle"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
            onClick={() => {
              setQ("");
              setMeta((m) => ({ ...m, page: 1 }));
            }}
          >
            ×
          </button>
        )}

        <div className="flex-1" />

        <label className="inline-flex items-center gap-2 text-sm text-zinc-300">
          Rol:
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value as typeof roleFilter);
              setMeta((m) => ({ ...m, page: 1 }));
            }}
            className="rounded-lg border border-white/10 bg-black/30 text-sm px-3 py-2 text-zinc-200 outline-none focus:border-white/20 appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEwIDgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIi8+Cjwvc3ZnPg==')] bg-no-repeat bg-right-2.5 py-1.5 pr-8"
          >
            <option value="all">Tümü</option>
            <option value="guildmaster">Guild Master</option>
            <option value="seniorofficer">Senior Officer</option>
            <option value="marshal">Marshal</option>
            <option value="fieldofficer">Field Officer</option>
            <option value="veteran">Veteran</option>
            <option value="voitans">Voitans</option>
          </select>
        </label>
      </div>

      {meta.loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" aria-live="polite" aria-busy="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="w-12 h-12 rounded-lg bg-white/10 mb-3"></div>
              <div className="space-y-2">
                <div className="h-4 bg-white/10 rounded w-3/4"></div>
                <div className="h-3 bg-white/10 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      ) : meta.error ? (
        <div role="alert" className="text-sm text-rose-400 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2">
          {meta.error}
        </div>
      ) : members.length === 0 ? (
        <div className="text-sm text-zinc-400 rounded-xl border border-white/10 bg-white/5 px-3 py-6 text-center">
          Kriterlere uyan üye bulunamadı.
        </div>
      ) : (
        <>
          <ChromaGrid 
            items={members.map(m => ({
              id: m.id,
              title: m.username || "Discord User",
              subtitle: m.dominantRoleName || "Üye",
              color: m.dominantRoleColor || "#8b5cf6"
            }))}
            className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          />

          <div className="flex items-center justify-center gap-3 mt-2" aria-live="polite">
            <MagicButtonSkyrim 
              onClick={() => setMeta((m) => ({ ...m, page: Math.max(1, m.page - 1) }))} 
              disabled={meta.page <= 1}
              className="text-sm"
            >
              Önceki
            </MagicButtonSkyrim>
            <span className="text-sm text-zinc-400">
              {meta.page} / {meta.totalPages}
            </span>
            <MagicButtonSkyrim 
              onClick={() => setMeta((m) => ({ ...m, page: Math.min(m.totalPages, m.page + 1) }))} 
              disabled={meta.page >= meta.totalPages}
              className="text-sm"
            >
              Sonraki
            </MagicButtonSkyrim>
          </div>
        </>
      )}
    </section>
  );
}

function OfficerAnnounce(): React.JSX.Element {
  const { data: session } = useSession() as any;
  const raw = Array.isArray(session?.user?.guildMember?.roles) ? session.user.guildMember.roles : [];
  const roles: Array<{ id: string; name?: string }> = raw.map((r: any) => ({ id: String(r?.id ?? r), name: r?.name }));

  const SENIOR_OFFICER_ROLE_ID =
    (typeof process !== "undefined" && (process.env.NEXT_PUBLIC_SENIOR_OFFICER_ROLE_ID || process.env.SENIOR_OFFICER_ROLE_ID)) ||
    "1249512318929342505";

  const canView =
    roles.some((r) => String(r.id) === String(SENIOR_OFFICER_ROLE_ID)) ||
    roles.some((r) => (r?.name || "").toLowerCase() === "senior officer");

  const [channels, setChannels] = useState<Array<{ id: string; name: string; type: number }>>([]);
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [form, setForm] = useState({ channelId: "", content: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    let alive = true;
    async function loadChannels() {
      setLoadingChannels(true);
      try {
        const r = await fetch("/api/discord/channels", { cache: "no-store" });
        const j = await r.json().catch(() => ({}));
        if (!alive) return;
        setChannels(Array.isArray(j?.channels) ? j.channels : []);
      } catch {
        if (!alive) return;
        setChannels([]);
      } finally {
        if (alive) setLoadingChannels(false);
      }
    }
    if (canView) loadChannels();
    return () => {
      alive = false;
    };
  }, [canView]);

  const disabled = submitting || !form.content.trim() || !form.channelId.trim();
  const postAnnouncement = async () => {
    setSubmitting(true);
    setError(null);
    setOk(false);
    try {
      const r = await fetch("/api/officer/announce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId: form.channelId, content: form.content }),
      });
      const j = await r.json().catch(() => ({} as any));
      if (!r.ok) throw new Error((j as any)?.error || "Gönderilemedi");
      setOk(true);
      setForm((f) => ({ ...f, content: "" }));
    } catch (e: any) {
      setError(e?.message || "Gönderim sırasında hata oluştu");
    } finally {
      setSubmitting(false);
    }
  };

  if (!canView) return <div className="text-sm text-zinc-400">Bu alan yalnızca Senior Officer içindir.</div>;

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="rounded-xl border border-white/10 bg-white/5 p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-zinc-100">Kanallar</h3>
          {loadingChannels && <span className="text-xs text-zinc-400">Yükleniyor…</span>}
        </div>
        <div className="max-h-72 overflow-auto pr-1">
          {!channels.length && !loadingChannels ? (
            <div className="text-xs text-zinc-500">Kanal bulunamadı.</div>
          ) : (
            <ul className="space-y-1">
              {channels.map((c) => (
                <li key={c.id}>
                  <button
                    className={`w-full text-left rounded-md border border-white/10 px-2 py-1.5 text-xs hover:border-white/20 ${
                      form.channelId === c.id ? "bg-white/10" : "bg-transparent"
                    }`}
                    onClick={() => setForm((f) => ({ ...f, channelId: c.id }))}
                    title={c.id}
                  >
                    #{c.name} {c.type === 5 ? "(announcement)" : ""}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-3">
        <h3 className="text-sm font-semibold text-zinc-100 mb-2">Duyuru Gönder</h3>
        <div className="grid gap-1.5">
          <label className="text-sm text-zinc-300">Hedef Kanal</label>
          <select
            value={form.channelId}
            onChange={(e) => setForm((f) => ({ ...f, channelId: e.target.value }))}
            className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-white/20"
            disabled={loadingChannels}
          >
            <option value="">{loadingChannels ? "Kanallar yükleniyor…" : "Kanal seçin"}</option>
            {channels.map((c) => (
              <option key={c.id} value={c.id}>
                #{c.name} {c.type === 5 ? "(announcement)" : ""}
              </option>
            ))}
          </select>

          <label className="text-sm text-zinc-300 mt-2">İçerik</label>
          <textarea
            value={form.content}
            onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            rows={6}
            placeholder="Duyuru içeriğini yazın…"
            className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-white/20"
          />
        </div>

        {error && (
          <div className="mt-2 rounded-lg border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
            {error}
          </div>
        )}
        {ok && (
          <div className="mt-2 rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
            Duyuru gönderildi.
          </div>
        )}

        <div className="mt-3">
          <button
            disabled={disabled}
            onClick={postAnnouncement}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200 disabled:opacity-50 hover:border-white/20"
          >
            {submitting ? "Gönderiliyor…" : "Duyuruyu Gönder"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const { data: session } = useSession();
  const roles: Array<{ id: string; name: string }> =
    ((session?.user as any)?.guildMember?.roles as any[])?.map((r: any) => ({ id: String(r.id), name: r.name })) ?? [];

  const SENIOR_OFFICER_ROLE_ID =
    (typeof process !== "undefined" && (process.env.NEXT_PUBLIC_SENIOR_OFFICER_ROLE_ID || process.env.SENIOR_OFFICER_ROLE_ID)) ||
    "1249512318929342505";
  const isSeniorOfficer = (roles.some((r) => String(r.id) === String(SENIOR_OFFICER_ROLE_ID)) || 
    ((session?.user as any)?.discordRoles as string[])?.includes(SENIOR_OFFICER_ROLE_ID)) ?? false;

  const [tab, setTab] = useState<
    "home" | "about" | "adventures" | "members" | "announcements" | "streams" | "schedule" | "officer"
  >("home");
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setBooting(false), 600);
    return () => clearTimeout(t);
  }, []);

  const pathname = usePathname();
  const locale = pathname?.split("/")[1] === "en" ? "en" : "tr";

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0A0B0D] home-page">
      <AnimatedBackground />
      <LightRaysBackground />
      
      <main className="relative z-10">
        <div className="absolute inset-0 z-5 pointer-events-none">
          <SplashCursor className="default" />
        </div>
        
        <div className="px-6 sm:px-10 pb-8">
          <div className="max-w-6xl mx-auto px-1">
                            <div className="tablist flex items-center justify-center gap-2 py-3 px-4" role="tablist" aria-label="Site sekmeleri">
              <GooeyNav
                items={[
                  { id: "home", label: "Ana Sayfa", onClick: () => setTab("home") },
                  { id: "about", label: "Hakkımızda", onClick: () => setTab("about") },
                  { id: "adventures", label: "Maceralarımız", onClick: () => setTab("adventures") },
                  { id: "members", label: "Üyeler", onClick: () => setTab("members") },
                  { id: "announcements", label: "Duyurular", onClick: () => setTab("announcements") },
                  { id: "streams", label: "Yayınlar", onClick: () => setTab("streams") },
                  { id: "schedule", label: "Takvim", onClick: () => setTab("schedule") },
                  ...(isSeniorOfficer ? [{ id: "officer", label: "Officer", onClick: () => setTab("officer") }] as const : []),
                ]}
                className="mx-auto"
              />
            </div>

            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -12, filter: "blur(4px)" }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            >
              {tab === "home" && (
                <section id="panel-home" role="tabpanel" aria-labelledby="tab-home" className="mt-4">
                  <div className="text-center">
                    <SkyrimTitle className="text-2xl md:text-4xl xl:text-5xl font-extrabold tracking-tighter leading-[1.06] mx-auto text-center">
                      <span className="block whitespace-nowrap">
                        <RotatingText 
                          texts={["BİR LONCANIN NİYE", "BİR LONCANIN NİYE"]} 
                          className="text-white"
                        />
                        <span className="mx-2 inline-block">
                          <GradientText 
                            colors={["#8b5cf6", "#a855f7", "#c084fc", "#8b5cf6"]}
                            className="bg-clip-text text-transparent"
                          >
                            WEB SİTESİ
                          </GradientText>
                        </span>
                      </span>
                      <span className="block whitespace-nowrap">OLUR?</span>
                    </SkyrimTitle>
                    <SkyrimSubtitle className="mt-4 text-lg md:text-xl text-zinc-300 max-w-3xl mx-auto">
                      <TypeWriter 
                        text="Çünkü burası sadece bir oyun listesi değil; iradenin, disiplinin ve kader ortaklığının duvara kazındığı yer. Burası, dağınık sesleri tek bir savaş çığlığına dönüştüren merkez. Ve evet—burası, senin hikâyenin başladığı yer."
                        speed={50}
                        className="text-zinc-300"
                      />
                    </SkyrimSubtitle>
                    <div className="mt-6 flex items-center justify-center gap-4">
                      <button className="h-12 px-8 text-[15px] font-semibold bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-full transition-all duration-300 shadow-lg hover:shadow-xl">
                        Discord'a Katıl
                      </button>
                                              <button
                          type="button"
                          onClick={() => {
                            const el = document.getElementById("intro-content-border");
                            if (!el) return;
                            
                            // Efekt zaten aktifse tekrar tetikleme
                            if (el.classList.contains("ring-highlight")) return;
                            
                            // Logo ve intro metnini kapsayan container'ın border efektini tetikle
                            el.classList.remove("dimmed");
                            el.classList.add("ring-highlight");
                            
                            // 1 saniye sonra normale dön
                            setTimeout(() => {
                              el.classList.remove("ring-highlight");
                              el.classList.add("dimmed");
                            }, 1000);
                          }}
                          className="px-6 py-3 text-white border border-white/20 hover:border-purple-400/50 hover:text-purple-300 transition-all duration-300 relative overflow-hidden group rounded-full shadow-lg hover:shadow-xl"
                        >
                        <span className="relative z-10">Neden VOITANS?</span>
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/5 to-purple-500/0 transform -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                      </button>
                    </div>
                  </div>

                  <section id="voitans-intro" className="mt-8">
                    <div className="max-w-3xl mx-auto p-6 rounded-xl transition-all duration-500">
                      <div id="intro-content-border" className="flex items-start gap-6 p-4 border border-purple-500/30 rounded-lg dimmed">
                        <div className="flex-shrink-0 mt-1.5">
                          <div className="size-16 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                            <video
                              src="/voitans.mp4"
                              className="w-full h-full object-cover"
                              style={{ display: 'block', objectPosition: 'center 40%' }}
                              autoPlay
                              loop
                              muted
                              playsInline
                              preload="auto"
                            />
                          </div>
                        </div>
                        <div className="flex-1 space-y-3 text-[14px] leading-relaxed text-white">
                          <p>
                            Burası THE VOITANS. Sadece bir lonca değil; oyuna girdiğinde sana "kimsin, neredesin, neye ihtiyacın var?" diye soran bir ekip.
                            Bazen günaydınla başlarız, bazen "akşam 19:30 Discord" diyerek plan kurarız; kimi gün drop kovalayıp build tartışır,
                            kimi gün birimizin sevincine ortak olur, kaybında omuz veririz. Bizim için lonca, listelerde bir isim değil;
                            <span className="text-white font-medium">emek veren, birbirini kollayan, aynı çağrıda toplanan insanlar</span> demek.
                          </p>
                          <p>
                            Burada "hoş geldin" demek bir formalite değil. Yeni katılanın adını anmak, birinin saatler süren emeğini takdir etmek,
                            "geliyorum" deyip sözünde durmak, denk geldiğinde yayını açıp paylaşmak… hepsi aynı kültürün parçaları.
                            Kimi gün bir tartışma çıkar, kimi gün yalnızca "iyi geceler" yazılır; ama bir sonraki gün yine aynı çağrıda buluşuruz.
                          </p>
                          <p>
                            Eğer aradığın şey sadece bir etiket, bir rozet ya da rastgele bir kalabalık değilse; doğru yerdesin.
                            Burada başarı kibirle değil, yardımla büyür. Kural basittir:
                            <strong className="text-white font-semibold"> Saygı, disiplin, birlik.</strong>
                            Bir şey eksik kaldıysa söyler, birlikte tamamlarız. Çünkü hikâye yazılırken herkesin bir satırı vardır ve belki de seninki,
                            <span className="text-white font-medium"> bugün burada başlar.</span>
                            <span className="inline-block align-middle ml-2 size-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(139,240,203,0.6)] animate-pulse" />
                          </p>
                        </div>
                      </div>
                    </div>
                  </section>
                </section>
              )}

              {tab === "about" && (
                <section id="panel-about" role="tabpanel" aria-labelledby="tab-about" className="max-w-6xl mx-auto space-y-8">
                  <div className="text-center">
                    <SkyrimTitle className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-purple-500">
                      HAKKIMIZDA
                    </SkyrimTitle>
                    <SkyrimSubtitle className="text-lg sm:text-xl text-purple-50/90 max-w-3xl mx-auto">
                      THE VOITANS'ın hikayesi ve değerleri
                    </SkyrimSubtitle>
                  </div>

                  <MagicGrid columns={2} gap={8}>
                    <MagicCardSkyrimMinimal className="border-purple-500/20 hover:border-purple-500/40 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/10">
                      <div className="mb-4">
                        <h3 className="text-xl font-semibold text-purple-100 mb-2">Bizim Hikayemiz</h3>
                        <MagicBadgeSkyrimMinimal className="bg-gradient-to-r from-purple-600 to-purple-700 text-purple-100">VOITANS</MagicBadgeSkyrimMinimal>
                      </div>
                      <p className="text-zinc-300">
                        VOITANS, sadece bir oyun loncası değil, bir aile ve destek sistemidir. 
                        2023 yılında kurulan topluluğumuz, oyun deneyimini paylaşan ve birbirine destek olan üyelerden oluşur.
                      </p>
                    </MagicCardSkyrimMinimal>
                    
                    <MagicCardSkyrimMinimal className="border-purple-500/20 hover:border-purple-500/40 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/10">
                      <div className="mb-4">
                        <h3 className="text-xl font-semibold text-purple-100 mb-2">Değerlerimiz</h3>
                        <MagicBadgeSkyrimMinimal className="bg-gradient-to-r from-purple-600 to-purple-700 text-purple-100">TEMEL İLKELER</MagicBadgeSkyrimMinimal>
                      </div>
                      <ul className="space-y-2 text-zinc-300">
                        <li>• <strong>Saygı:</strong> Tüm üyelerimize karşı saygılı davranış</li>
                        <li>• <strong>Disiplin:</strong> Ortak hedefler için organize çalışma</li>
                        <li>• <strong>Birlik:</strong> Zor zamanlarda birbirine destek olma</li>
                      </ul>
                    </MagicCardSkyrimMinimal>
                  </MagicGrid>
                </section>
              )}

              {tab === "adventures" && (
                <section id="panel-adventures" role="tabpanel" aria-labelledby="tab-adventures" className="max-w-6xl mx-auto mt-8">
                  <AdventuresTabs />
                </section>
              )}

              {tab === "members" && (
                <section id="panel-members" role="tabpanel" aria-labelledby="tab-members" className="max-w-6xl mx-auto mt-8">
                  <MembersSection />
                </section>
              )}

              {tab === "announcements" && (
                <section id="panel-announcements" role="tabpanel" aria-labelledby="tab-announcements" className="max-w-6xl mx-auto mt-8">
                  <Announcements />
                </section>
              )}

              {tab === "streams" && (
                <section id="panel-streams" role="tabpanel" aria-labelledby="tab-streams" className="max-w-6xl mx-auto mt-8">
                  <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4">
                    <div className="relative aspect-video rounded-xl overflow-hidden">
                      <LazyTwitch className="relative h-full" type="player" title="Twitch Player" />
                    </div>
                    <div className="relative h-[480px] lg:h-auto rounded-xl overflow-hidden">
                      <LazyTwitch className="relative h-full" type="chat" title="Twitch Chat" />
                    </div>
                  </div>
                </section>
              )}

              {tab === "schedule" && (
                <section id="panel-schedule" role="tabpanel" aria-labelledby="tab-schedule" className="max-w-6xl mx-auto mt-8">
                  <WeeklySchedule />
                </section>
              )}

              {tab === "officer" && (
                <section id="panel-officer" role="tabpanel" aria-labelledby="tab-officer" className="max-w-6xl mx-auto mt-8">
                  <OfficerAnnounce />
                </section>
              )}
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}
