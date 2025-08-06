"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  NeonButton,
  PaginationCapsule,
  Parallax,
  ParallaxLayer,
  LiquidLoader,
} from "../components/ui";
import LazyTwitch from "../components/LazyTwitch";
import { MemberCard } from "../components/MemberCard";
import AdventuresTabs from "../components/AdventuresTabs";
import Cursor from "../components/Cursor";

/* rotator removed for simpler hero */

/* stats bar removed for simpler layout */

/* style helpers as inline components to keep file self-contained */
function MottoStyles() {
  return (
    <style jsx global>{`
      .duration-600 {
        transition-duration: 600ms !important;
      }
    `}</style>
  );
}
function StatsStyles() {
  return null;
}

function escapeHtml(s: string) {
  // Proper HTML escaping before markdown-like transforms
  return s
    .replaceAll("&", "&")
    .replaceAll("<", "<")
    .replaceAll(">", ">");
}

// very small markdown subset + mention badge conversion
function renderMarkdownSubset(input: string) {
  // Input burada ESCAPED gelir (escapeHtml sonrası). Bu yüzden özel işaretler < > vs.
  let s = input;

  // satır sonu normalizasyonu
  s = s.replace(/\r\n/g, "\n");

  // mention rozetleri: @everyone, @here, <@&roleId> (escaped formu)
  // everyone/here rozetlerini de aynı "pill" stile yaklaştır
  s = s.replace(/(^|\s)@everyone\b/g, `$1<span class="mention discord-pill --everyone">@everyone</span>`);
  s = s.replace(/(^|\s)@here\b/g, `$1<span class="mention discord-pill --here">@here</span>`);
  // Escaped rol mention: <@&123456> -> sunucudan rol adını çek (fallback: "@rol")
  // Hedef stil: Discord etiketine daha yakın "pill" + gradient + hafif iç gölge.
  // Not: HTML escape edilmiş içerikte < ve > karakterleri korunur; Discord biçimi de zaten <@&id> şeklinde gelir.
  // Burada roleId'yi işleyip data-role-id ekliyoruz ki renklendirici doğru bağlansın.
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
    // data-role-id ekle ki renklendirme scripti doğrudan hedefleyebilsin
    return `<span class="mention role discord-pill" data-role-id="${key}">@${label}</span>`;
  });

  // başlıklar (###, ##, #) — satır başında boşlukları tolere et
  s = s.replace(/^\s*###\s+(.*)$/gm, `<h3 class="mt-3 text-sm font-semibold text-zinc-200">$1</h3>`);
  s = s.replace(/^\s*##\s+(.*)$/gm, `<h2 class="mt-4 text-base font-semibold text-zinc-100">$1</h2>`);
  s = s.replace(/^\s*#\s+(.*)$/gm, `<h1 class="mt-5 text-lg font-semibold text-zinc-100">$1</h1>`);

  // kalın ve italik — iç içe olasılıklarına minimal destek (önce bold)
  s = s.replace(/\*\*(.+?)\*\*/g, `<strong class="text-zinc-100">$1</strong>`);
  s = s.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, `$1<em class="text-zinc-300">$2</em>`);

  // inline code `code`
  s = s.replace(/`([^`]+?)`/g, `<code class="px-1.5 py-0.5 text-[11px] rounded bg-white/5 border border-white/10 text-zinc-200">$1</code>`);

  // unordered listeleri bir blok içinde topla: ardışık "- " satırlarını <ul> sarmala
  // Önce liste item'larını işaretle
  s = s.replace(/^\s*-\s+(.*)$/gm, `<li class="ml-5 list-disc text-zinc-300">$1</li>`);
  // Ardışık <li> gruplarını <ul> ile sar
  s = s.replace(/(?:\s*<li[\s\S]*?<\/li>)+/g, (block) => {
    // blok baş ve sonundaki boşlukları koru
    const trimmed = block.trim();
    return `<ul class="space-y-1">${trimmed}</ul>`;
  });

  // paragraf kırımları: iki veya daha fazla yeni satır -> <br/><br/> yerine p blokları basitleştirilmiş
  s = s.replace(/\n{2,}/g, "<br/><br/>");

  return s;
}

function AnnounceRoleColorizer({ roleColors }: { roleColors: Record<string, string> }) {
  // Rol id’si içeren pill’lara özel arka plan uygular
  useEffect(() => {
    try {
      const nodes = document.querySelectorAll<HTMLSpanElement>(".discord-pill.role");
      nodes.forEach((n) => {
        // İç metinden role id yakalamayı dener: "@RoleName (1234567890)" veya data-role-id attr
        const attrId = n.getAttribute("data-role-id");
        let roleId = attrId || "";
        if (!roleId) {
          const txt = n.textContent || "";
          const m = txt.match(/\((\d{5,})\)$/);
          if (m) roleId = m[1];
        }
        if (roleId && roleColors[roleId]) {
          const col = roleColors[roleId];
          // Rengi gradiente uygula, okunabilirlik için beyaz metin ve border
          n.style.background = `linear-gradient(180deg, ${col} 0%, ${col} 85%)`;
          n.style.color = "#fff";
          n.style.borderColor = "rgba(0,0,0,.25)";
          n.setAttribute("data-role-id", roleId);
        } else {
          // fallback: varsayılan mavi gradient kalır, yalnızca data-role-id işaretle
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
  // Rol etiket renkleri (roleId -> hex/rgb)
  const [roleColors, setRoleColors] = useState<Record<string, string>>({});

  // Rol adlarını ve renklerini önceden doldur: /api/resolve/roles
  useEffect(() => {
    let alive = true;
    async function primeRoles() {
      try {
        const r = await fetch("/api/resolve/roles", { cache: "no-store" });
        if (!r.ok) return;
        // Beklenen: { roles: { [id]: name }, colors?: { [id]: colorHex } }
        const payload = (await r.json()) as { roles?: Record<string, string>; colors?: Record<string, string> };
        if (!alive) return;
        if (typeof window !== "undefined") {
          (window as any).__ROLE_NAME_CACHE__ = { roles: payload?.roles ?? {} };
        }
        if (payload?.colors && typeof payload.colors === "object") {
          setRoleColors(payload.colors);
        }
        // Duyuruları rol isimleri ile yeniden işlemek için reflow tetikle
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
    <div className="space-y-4">
      {items.map((m) => {
        const safe = escapeHtml(m.content ?? "");
        const html = renderMarkdownSubset(safe);
        return (
          <article
            key={m.id}
            className="rounded-xl border border-white/10 bg-white/5 p-4 hover:border-white/20 transition-colors"
          >
            {/* Tarih üstte, okunaklı ve zarif kapsül */}
            {m.createdAt ? (
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
            ) : null}

            {/* Küresel kapsam: dangerouslySetInnerHTML içeriğine kesin uygulanması için :global kullan */}
            <style jsx global>{`
              .mention { display: inline; }
              /* Sade ve net kapsül: düşük gölge, daha küçük yükseklik, daha iyi kontrast */
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
                box-shadow:
                  0 1px 0 rgba(0,0,0,0.25) inset,
                  0 1px 2px rgba(0,0,0,0.25);
                vertical-align: baseline;
                transform: translateY(-1px);
                white-space: nowrap;
              }
              /* everyone/here için ton */
              :root .discord-pill.--everyone,
              :root .discord-pill.--here {
                --pill-bg: linear-gradient(180deg, #6A7AFF 0%, #5463E0 100%);
              }
              /* Rol rengi inline style ile gelirse, sadece border/kontrastı koru */
              :root .discord-pill.role[data-role-id] {
                border-color: rgba(255,255,255,0.14);
                color: #F7FAFF;
              }
            `}</style>
            <div className="prose prose-invert max-w-none">
              <div
                dangerouslySetInnerHTML={{
                  __html: html,
                }}
              />
            </div>
            {/* Dinamik rol etiket renklendirme: data-role-id ile renk uygula */}
            <style jsx>{`
              :global(.discord-pill.role[data-role-id]) {
                /* Varsayılan rol kapsülü rengi – JS inline style ile override edilebilir */
                background: linear-gradient(180deg, rgba(88,101,242,0.95) 0%, rgba(71,82,196,0.95) 100%);
              }
            `}</style>
            <AnnounceRoleColorizer roleColors={roleColors} />
          </article>
        );
      })}
    </div>
  );
}

/* Minimal cursor client component - removed (using imported Cursor component) */

/* Weekly schedule (kept from working logic) */
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
          <NeonButton variant="outline" onClick={() => setWeekOffset((w) => w - 1)}>
            Önceki
          </NeonButton>
          <NeonButton onClick={() => setWeekOffset(0)}>Bu Hafta</NeonButton>
          <NeonButton variant="outline" onClick={() => setWeekOffset((w) => w + 1)}>
            Sonraki
          </NeonButton>
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

/* Members */
type Member = {
  id: string;
  username?: string;
  avatarUrl?: string;
  dominantRole?: string | null;
  dominantRoleColor?: string | null;
  dominantRoleName?: string | null;
};

function MembersSection() {
  // PERF: render sayısını azaltmak için controlled state'leri bir arada tut ve memoize et
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
  // Sıralama sabit (API default)
  const sort: "rolePriority" | "name" = "rolePriority";
  const order: "asc" | "desc" = "asc";

  // debounce search (useMemo + setTimeout ile stable)
  const debouncedQ = useMemo(() => q.trim(), [q]);
  useEffect(() => {
    const id = setTimeout(() => {
      // sadece trigger amacıyla state'i aynı değere set etmiyoruz; fetch effect debouncedQ'yu dependency olarak kullanacak
    }, 0);
    return () => clearTimeout(id);
  }, [debouncedQ]);

  // PREFETCH: İlk mount’ta 1. sayfayı prefetch eden üst Home effect’i var. Burada ayrıca network çakışmasını azaltmak için
  // küçük bir bekleme penceresi ekle.
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

  // fetch members with AbortController to cancel stale requests
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
          // STABLE KEYS: id zaten mevcut, render sırasında Order değişimini min. tut
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

  // Memoize edilen kart listesi (re-render azaltma)
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

  // Basit sanal listeleme (CSS contain + will-change) – gerçek virtualization olmadan paint maliyetini azalt
  // Not: Üye sayısı çok büyürse react-virtualized/virtual ile ilerlenebilir.
  return (
    <section className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <style jsx>{`
          .tv-select {
            appearance: none;
            -webkit-appearance: none;
            -moz-appearance: none;
            color-scheme: dark;
            background:
              linear-gradient(to bottom, rgba(255,255,255,0.06), rgba(255,255,255,0.04)) border-box,
              radial-gradient(200px 200px at var(--mx,50%) var(--my,50%), rgba(57,208,255,0.12), transparent 60%) border-box;
            border: 1px solid rgba(255,255,255,0.10);
            color: #E5E7EB;
            padding: 8px 36px 8px 10px;
            border-radius: 10px;
            outline: none;
            transition: border-color .2s ease, box-shadow .2s ease, background-color .2s ease;
          }
          .tv-select:focus {
            border-color: rgba(255,255,255,0.25);
            box-shadow: 0 0 0 3px rgba(57,208,255,0.20);
          }
          .tv-select:hover {
            border-color: rgba(255,255,255,0.18);
          }
          .tv-select-wrap { position: relative; }
          .tv-select-wrap::after {
            content: "";
            position: absolute;
            right: 10px;
            top: 50%;
            width: 8px;
            height: 8px;
            border-right: 2px solid #9CA3AF;
            border-bottom: 2px solid #9CA3AF;
            transform: translateY(-60%) rotate(45deg);
            pointer-events: none;
            opacity: .85;
          }
          select.tv-select option { background-color: #0b0f19; color: #E5E7EB; }
          select.tv-select optgroup { background-color: #0b0f19; color: #9CA3AF; }
          select.tv-select::-ms-expand { background: transparent; }
          @supports (-webkit-touch-callout: none) {
            select.tv-select { background-color: rgba(17,24,39,0.7); }
          }
          @-moz-document url-prefix() {
            select.tv-select { color-scheme: dark; }
          }
          /* Skeletons */
          .skeleton { border-radius: 14px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.04); padding: 12px; display: grid; grid-template-columns: 56px 1fr; gap: 12px; contain: content; }
          .sk-avatar { width:56px; height:56px; border-radius: 12px; background: rgba(255,255,255,0.06); }
          .sk-lines { display:flex; flex-direction:column; gap:8px; }
          .sk-line { height:14px; border-radius: 6px; background: rgba(255,255,255,0.06); }
          .sk-badge { width: 90px; height: 18px; border-radius: 999px; background: rgba(255,255,255,0.06); }
          .shimmer { position: relative; overflow: hidden; }
          .shimmer::after { content:""; position:absolute; inset:0; transform: translateX(-100%); background: linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent); animation: shimmer 1.3s infinite; }
          @keyframes shimmer { 100% { transform: translateX(100%); } }
        `}</style>

        <div className="relative">
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
        </div>

        <div className="flex-1" />

        <label className="inline-flex items-center gap-2 text-sm text-zinc-300">
          Rol:
          <span className="tv-select-wrap">
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value as typeof roleFilter);
                setMeta((m) => ({ ...m, page: 1 }));
              }}
              className="tv-select"
              aria-label="Rol filtresi"
            >
              <option value="all">Tümü</option>
              <option value="guildmaster">Guild Master</option>
              <option value="seniorofficer">Senior Officer</option>
              <option value="marshal">Marshal</option>
              <option value="fieldofficer">Field Officer</option>
              <option value="veteran">Veteran</option>
              <option value="voitans">Voitans</option>
            </select>
          </span>
        </label>
      </div>

      {/* Content */}
      {meta.loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" aria-live="polite" aria-busy="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton">
              <div className="sk-avatar shimmer" />
              <div className="sk-lines">
                <div className="sk-line shimmer" />
                <div className="sk-badge shimmer" />
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
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 [contain:content] will-change-[contents]"
            style={{ contentVisibility: "auto" as any }}
          >
            {cards}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-center gap-3 mt-2" aria-live="polite">
            <button
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-zinc-200 disabled:opacity-50"
              onClick={() => setMeta((m) => ({ ...m, page: Math.max(1, m.page - 1) }))}
              disabled={meta.page <= 1}
            >
              Önceki
            </button>
            <span className="text-sm text-zinc-400">
              {meta.page} / {meta.totalPages}
            </span>
            <button
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-zinc-200 disabled:opacity-50"
              onClick={() => setMeta((m) => ({ ...m, page: Math.min(m.totalPages, m.page + 1) }))}
              disabled={meta.page >= meta.totalPages}
            >
              Sonraki
            </button>
          </div>
        </>
      )}
    </section>
  );
}

/**
 * OfficerAnnounce inline – görünürlük garantisi için bağımsız duyuru formu
 * Tanım: Home bileşeninden ÖNCE olmalı, aksi halde JSX referansı bulunamaz.
 * - Kanal listesi: GET /api/discord/channels
 * - Gönderim: POST /api/officer/announce
 * - Görünürlük: ID ve isim bazlı kontrol (SENIOR_OFFICER_ROLE_ID veya "Senior Officer")
 */
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
      {/* Sol: Kanal listesi */}
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

      {/* Sağ: Duyuru formu */}
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
  const { data: session } = useSession() as any;
  const roles: Array<{ id: string; name: string }> =
    (session?.user?.guildMember?.roles as any[])?.map((r) => ({ id: String(r.id), name: r.name })) ?? [];

  // ID bazlı kontrol (isim bağımsız)
  const SENIOR_OFFICER_ROLE_ID =
    (typeof process !== "undefined" && (process.env.NEXT_PUBLIC_SENIOR_OFFICER_ROLE_ID || process.env.SENIOR_OFFICER_ROLE_ID)) ||
    "1249512318929342505";
  const isSeniorOfficer = roles.some((r) => String(r.id) === String(SENIOR_OFFICER_ROLE_ID));

  const [tab, setTab] = useState<
    "home" | "about" | "adventures" | "members" | "announcements" | "streams" | "schedule" | "join" | "officer"
  >("home");
  const [booting, setBooting] = useState(true);
  // Üyeler verisini sayfa açılır açılmaz önden ısıt (preload) – görünür olmasa da fetch başlasın
  useEffect(() => {
    // Varsayılan filtrelerle ilk sayfayı önden iste
    try {
      const params = new URLSearchParams();
      params.set("page", "1");
      params.set("limit", "12");
      params.set("sort", "rolePriority");
      params.set("order", "asc");
      // Cache zaten kapalı ve API no-store; yine de bağlantı hazırlığını tetikler
      fetch(`/api/members?${params.toString()}`, { cache: "no-store" }).catch(() => {});
    } catch {}
  }, []);

  const pathname = usePathname();
  const locale = pathname?.split("/")[1] === "en" ? "en" : "tr";

  useEffect(() => {
    const t = setTimeout(() => setBooting(false), 600);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden overflow-y-hidden bg-[#0A0B0D]">
      <LiquidLoader show={booting} />
      <Cursor />

      {/* Background tamamen tek ton: üstte renkli bant yok */}
      {/* Tüm overlay katmanları kalıcı olarak kaldırıldı */}
      {/* <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden" /> */}

      <main
        className="relative z-10"
        onMouseMove={(e) => {
          const root = e.currentTarget as HTMLElement;
          const rect = root.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          root.style.setProperty("--mx", x + "px");
          root.style.setProperty("--my", y + "px");
        }}
      >
        {/* Header */}
{/* Header kaldırıldı: önceki sade tasarım korunuyor (üst bar yok). */}

        {/* Tabs */}
        <div className="px-6 sm:px-10 pb-16">
          <div className="max-w-6xl mx-auto px-1">
            <div className="tablist flex items-center justify-center gap-2 py-5" role="tablist" aria-label="Site sekmeleri">
              {[
                { id: "home", label: "Ana Sayfa" },
                { id: "about", label: "Hakkımızda" },
                { id: "adventures", label: "Maceralarımız" },
                { id: "members", label: "Üyeler" },
                { id: "announcements", label: "Duyurular" },
                { id: "streams", label: "Yayınlar" },
                { id: "schedule", label: "Takvim" },
                { id: "join", label: "Katıl" },
                ...(isSeniorOfficer ? [{ id: "officer", label: "Officer" }] as const : []),
              ].map((t) => (
                <button
                  key={t.id}
                  role="tab"
                  id={`tab-${t.id}`}
                  aria-controls={`panel-${t.id}`}
                  aria-selected={tab === (t.id as any)}
                  onClick={() =>
                    setTab(t.id as typeof tab)
                  }
                  className={`px-4 py-2 text-sm rounded-full border shadow-[inset_0_0_0_1px_rgba(255,255,255,.04)] transition-all ${
                    tab === t.id
                      ? "text-white border-white/20 bg-white/5 shadow-[0_8px_20px_rgba(0,0,0,.25)]"
                      : "text-zinc-300 border-white/10 hover:border-white/20 hover:bg-white/5"
                  }`}
                >
                  {t.id === "adventures" ? (
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#FFE898] via-[#FFE28A] to-[#FFD86F]">
                      {t.label}
                    </span>
                  ) : (
                    t.label
                  )}
                </button>
              ))}
            </div>

            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -12, filter: "blur(4px)" }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            >
              {tab === "home" && (
                <section id="panel-home" role="tabpanel" aria-labelledby="" className="mt-8">
                  {/* Hero */}
                  <div className="relative overflow-hidden">
                    <div className="max-w-5xl mx-auto text-center px-4">
                      {/* Başlık boyutu eski haline (daha büyük) getirildi; üst ve alt iç boşluk artırıldı.
                          Büyük harf İ noktasının kırpılmaması için line-height 1.12 ve padding-top eklendi. */}
                      <h1
                        className="display font-[var(--font-cinzel)] font-semibold tracking-tight text-[clamp(28px,6vw,56px)] leading-[1.12] pt-1 text-[#E6ECEF] px-2 sm:px-0"
                        style={{ wordSpacing: "0.04em", letterSpacing: "0.004em" }}
                      >
                        BİR LONCANIN NİYE{" "}
                        {/* "WEB" için mavi-cyan ağırlıklı açık gradyan */}
                        <span
                          className="bg-clip-text text-transparent"
                          style={{
                            backgroundImage:
                              "linear-gradient(90deg, #35b4ff 0%, #62d8e1 50%, #8bf0cb 100%)",
                            backgroundSize: "200% 100%",
                            backgroundPosition: "0% 0%",
                            WebkitBackgroundClip: "text",
                            filter: "saturate(0.9) brightness(1.02)"
                          }}
                        >
                          WEB
                        </span>{" "}
                        {/* "SİTESİ" için yeşilimsi mavi → açık sarı → altın → turuncu yansıma → sıcak alt ton */}
                        <span
                          className="bg-clip-text text-transparent"
                          style={{
                            backgroundImage:
                              "linear-gradient(90deg, #8bf0cb 0%, #c5f87e 25%, #ffe66d 50%, #ffd144 68%, #ffbb35 84%, #ffe9c0 100%)",
                            backgroundSize: "200% 100%",
                            backgroundPosition: "0% 0%",
                            WebkitBackgroundClip: "text",
                            filter: "saturate(0.9) brightness(1.0)"
                          }}
                        >
                          SİTESİ
                        </span>{" "}
                        <wbr />
                        <span className="block sm:inline">OLUR?</span>
                      </h1>
                      <p className="mt-3 text-[15px] sm:text-[16px] text-[#D6DBE1] max-w-xl sm:max-w-2xl mx-auto leading-[1.7]">
                        Çünkü burası sadece bir oyun listesi değil; iradenin, disiplinin ve kader ortaklığının duvara kazındığı yer.
                        Burası, dağınık sesleri tek bir savaş çığlığına dönüştüren merkez. Ve evet—burası, senin hikâyenin başladığı yer.
                      </p>
                      {/* CTA’lar: buton yüksekliği, padding ve tipografi tam simetri */}
                      <div className="mt-5 flex items-center justify-center gap-3">
                        {/* Discord marka rengi (#5865F2) arka plan ile */}
                        <a
                          href="https://discord.gg/thevoitans"
                          className="inline-flex items-center justify-center gap-2 rounded-full h-12 px-6 text-[15px] font-semibold text-white transition-all duration-300 tracking-[0.01em] hover:brightness-[1.05]"
                          style={{ backgroundColor: "#5865F2" }}
                        >
                          Discord’a Katıl
                        </a>
                        {/* URL hash kullanma; intro panel parlaklığını toggle et */}
                        <button
                          type="button"
                          onClick={() => {
                            const el = document.getElementById("voitans-intro");
                            if (!el) return;
                            // Önce mevcut highlight/dim durumunu temizle
                            el.classList.remove("dimmed");
                            el.classList.add("ring-highlight");
                            // 1 saniye sonra parlaklığı otomatik kapat
                            window.setTimeout(() => {
                              el.classList.remove("ring-highlight");
                              el.classList.add("dimmed");
                            }, 1000);
                          }}
                          className="inline-flex items-center justify-center rounded-full h-12 px-6 text-[15px] font-medium border border-white/10 text-zinc-200 bg-transparent hover:bg-white/5 transition-all duration-300 hover:border-white/20 tracking-[0.01em]"
                        >
                          Neden VOITANS?
                        </button>
                      </div>

                    </div>
                  </div>

                  {/* manifesto & stats section removed for minimal home */}

                  {/* Opening Copy */}
                  <section id="voitans-intro" className="mt-6">
                    {/* Simetri: içerik genişliği, padding ve grid hizaları standardize */}
                    <div
                      className="relative intro-panel max-w-3xl mx-auto p-6 sm:p-7 rounded-2xl border border-white/10 transition-all duration-600 group overflow-hidden"
                      style={{ backgroundColor: "#07090d" }}
                    >
                      {/* Kenar parlamaları: sağ/sol/baslık simetrisi */}
                      <div
                        aria-hidden
                        className="pointer-events-none absolute -inset-px rounded-[18px]"
                        style={{
                          background:
                            "radial-gradient(80% 50% at 50% -10%, rgba(53,180,255,.10), transparent 70%), radial-gradient(80% 60% at 100% 30%, rgba(255,209,68,.08), transparent 60%), radial-gradient(90% 60% at 0% 60%, rgba(139,240,203,.08), transparent 60%)",
                          maskImage: "linear-gradient(to bottom, black 80%, transparent)",
                          WebkitMaskImage: "linear-gradient(to bottom, black 80%, transparent)",
                          filter: "blur(6px)"
                        }}
                      />
                      {/* Üst/alt çizgi simetrisi */}
                      <div aria-hidden className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                      <div aria-hidden className="absolute inset-x-6 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                      {/* Shimmer pass – tam merkezden geçiş */}
                      <div
                        aria-hidden
                        className="pointer-events-none absolute inset-0 translate-x-[-120%] group-hover:translate-x-[120%] transition-transform duration-[1600ms] ease-out"
                        style={{
                          background:
                            "linear-gradient(90deg, transparent, rgba(255,255,255,.06), transparent)"
                        }}
                      />

                      <div className="relative z-10 grid grid-cols-[auto_1fr] gap-4 sm:gap-5 items-start">
                        {/* Sol ikon kutusu: dikey ve yatayda merkez */}
                        <div className="size-12 sm:size-14 rounded-xl bg-white/5 border border-white/10 grid place-items-center overflow-hidden shadow-[inset_0_0_0_1px_rgba(255,255,255,.04)] animate-[crest_4.8s_ease-in-out_infinite]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src="/voitans-logo.svg"
                            alt="VOITANS Crest"
                            className="w-7 h-7 sm:w-8 sm:h-8 object-contain opacity-90"
                          />
                        </div>

                        {/* Metin bloğu: sağ marj ve satır yüksekliği simetrik */}
                        <div className="flex-1 text-[15px] leading-[1.85] text-[#D6DBE1] selection:bg-white/10">
<p className="mb-4">
  Burası THE VOITANS. Sadece bir lonca değil; oyuna girdiğinde sana “kimsin, neredesin, neye ihtiyacın var?” diye soran bir ekip.
  Bazen günaydınla başlarız, bazen “akşam 19:30 Discord” diyerek plan kurarız; kimi gün drop kovalayıp build tartışır,
  kimi gün birimizin sevincine ortak olur, kaybında omuz veririz. Bizim için lonca, listelerde bir isim değil;
  <span className="text-zinc-100">emek veren, birbirini kollayan, aynı çağrıda toplanan insanlar</span> demek.
</p>

<p className="mb-4">
  Burada “hoş geldin” demek bir formalite değil. Yeni katılanın adını anmak, birinin saatler süren emeğini takdir etmek,
  “geliyorum” deyip sözünde durmak, denk geldiğinde yayını açıp paylaşmak… hepsi aynı kültürün parçaları.
  Kimi gün bir tartışma çıkar, kimi gün yalnızca “iyi geceler” yazılır; ama bir sonraki gün yine aynı çağrıda buluşuruz.
</p>

<p className="mb-0">
  Eğer aradığın şey sadece bir etiket, bir rozet ya da rastgele bir kalabalık değilse; doğru yerdesin.
  Burada başarı kibirle değil, yardımla büyür. Kural basittir:
  <strong className="text-zinc-100"> Saygı, disiplin, birlik.</strong>
  Bir şey eksik kaldıysa söyler, birlikte tamamlarız. Çünkü hikâye yazılırken herkesin bir satırı vardır ve belki de seninki,
  <span className="text-zinc-100"> bugün burada başlar.</span>
  <span className="inline-block align-middle ml-1 size-1.5 rounded-full bg-[#8bf0cb] shadow-[0_0_14px_#8bf0cb99] animate-[pulseSoft_2.6s_ease-in-out_infinite]" />
</p>

                          {/* controls removed by request */}
                        </div>
                      </div>

                      {/* Simetrik ışık yayları: solda ve sağda aynı boy/offset */}
                      <div
                        aria-hidden
                        className="absolute -left-14 -bottom-16 w-64 h-64 rounded-full blur-3xl opacity-20"
                        style={{ background: "radial-gradient(circle, #35b4ff, transparent 60%)" }}
                      />
                      <div
                        aria-hidden
                        className="absolute -right-14 -top-16 w-64 h-64 rounded-full blur-3xl opacity-15"
                        style={{ background: "radial-gradient(circle, #ffd144, transparent 60%)" }}
                      />
                    </div>
                  </section>
                </section>
              )}

{tab === "about" && (
  <section
    id="panel-about"
    role="tabpanel"
    aria-labelledby="tab-about"
    className="max-w-6xl mx-auto rounded-2xl border border-white/10 bg-black/30 backdrop-blur p-6"
  >
    <h2 className="text-xl font-semibold mb-2">Hakkımızda</h2>

    {/* Anlatısal ve duygusal akış */}
    <div className="space-y-6 text-[15px] leading-7 text-zinc-300">
      {/* Giriş Hikâyesi */}
      <section className="rounded-xl border border-white/10 bg-white/5 p-4">
        <p>
          Bazen bir “günaydın” ile başlar, bazen tek bir cümle bütün günü toparlar:{" "}
          <strong className="text-zinc-100">“Akşam 19:30 Discord.”</strong> Kimi gün drop kovalarken
          build’ler tartışılır; kimi gün birimizin sevincine ortak olur, kaybında omuz veririz. VOITANS’ta
          bir isimden fazlası vardır: <span className="text-zinc-100">emek, söz ve çağrıya cevap</span>.
        </p>
      </section>

      {/* Kültür */}
      <section>
        <h3 className="text-base font-semibold text-zinc-100 mb-1">Kültür</h3>
        <p>
          “Hoş geldin” bizde bir buton değil, <span className="text-zinc-100">bir ritüel</span>.
          Yeni katılanın adı anılır, saatler süren emek görünür kılınır, “geliyorum” denildiyse gelinir.
          Denk gelindiğinde yayın açılır, paylaşılır. <em className="not-italic text-zinc-200">Kimi gün tartışır, kimi gün yalnızca “iyi geceler” yazarız;</em>{" "}
          ama ertesi gün yine aynı çağrıda buluşuruz.
        </p>
      </section>

      {/* İlkeler */}
      <section>
        <h3 className="text-base font-semibold text-zinc-100 mb-1">İlkeler</h3>
        <ul className="list-disc ml-5 space-y-2">
          <li><strong className="text-zinc-100">Saygı</strong>: Söze, emeğe ve zamana saygı.</li>
          <li><strong className="text-zinc-100">Disiplin</strong>: Hazırlık bir alışkanlıktır; plan duvara kazınır.</li>
          <li><strong className="text-zinc-100">Birlik</strong>: Kibir değil yardımla büyürüz; zaferler paylaşılır.</li>
        </ul>
      </section>

      {/* Aradığımız Oyuncu */}
      <section>
        <h3 className="text-base font-semibold text-zinc-100 mb-1">Aradığımız Oyuncu</h3>
        <p>
          Rozet değil, <span className="text-zinc-100">yol arkadaşlığı</span> arayan;
          safını sözle değil <em className="not-italic text-zinc-200">tutumla</em> belli eden oyuncular.
          Hazırlığı nefes almak kadar isteyen; eksik kaldığında söyleyip birlikte tamamlayan insanlar.
        </p>
      </section>

      {/* Sözümüz */}
      <section className="rounded-xl border border-white/10 bg-white/5 p-4">
        <p>
          Eğer aradığın şey sadece bir etiket ya da rastgele bir kalabalık değilse; doğru yerdesin.
          VOITANS’ta hikâye yazılırken herkesin bir satırı vardır ve belki de seninki{" "}
          <span className="text-zinc-100">bugün burada başlar.</span>
        </p>
      </section>

      {/* Hızlı Eylem butonları kaldırıldı: NavBar üzerinde zaten mevcut */}
      {/* (istem üzerine boş bırakıldı) */}
    </div>
  </section>
)}

              {tab === "adventures" && (
                <section
                  id="panel-adventures"
                  role="tabpanel"
                  aria-labelledby="tab-adventures"
                  className="max-w-6xl mx-auto rounded-2xl border border-white/10 bg-black/30 backdrop-blur p-6"
                >
                  <h2 className="text-xl font-semibold mb-4">Maceralarımız</h2>

                  <AdventuresTabs />
                </section>
              )}

              {tab === "members" && (
                <section id="panel-members" role="tabpanel" aria-labelledby="">
                  <div className="max-w-6xl mx-auto">
                    <MembersSection />
                  </div>
                </section>
              )}

              {tab === "announcements" && (
                <section id="panel-announcements" role="tabpanel" aria-labelledby="tab-announcements">
                  <section className="max-w-6xl mx-auto rounded-2xl border border-white/10 bg-black/30 backdrop-blur p-6">
                    <h2 className="text-xl font-semibold mb-2">Duyurular</h2>
                    <Announcements />
                  </section>
                </section>
              )}

              {tab === "streams" && (
                <section
                  id="panel-streams"
                  role="tabpanel"
                  aria-labelledby="tab-streams"
                  className="max-w-6xl mx-auto rounded-2xl border border-white/10 bg-black/30 backdrop-blur p-6"
                >
                  <h2 className="text-xl font-semibold mb-2">Yayınlar</h2>
                  <p className="text-zinc-400">
                    Twitch içerikleri görünümdeyken yüklenir (lazy).
                  </p>
                  <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
                    <div className="lg:col-span-2">
                      <div className="relative w-full" style={{ aspectRatio: "16 / 9" }}>
{/* Lazy Twitch Player */}<LazyTwitch
  channel="skipperofleague"
  title="Twitch Player"
 parents={["thevoitansgithub.vercel.app","localhost"]} />
                      </div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-black/40 overflow-hidden">
                      <div className="h-10 flex items-center px-3 text-xs text-zinc-400 border-b border-white/10">
                        Twitch Chat
                      </div>
                      <div className="relative w-full" style={{ aspectRatio: "9 / 16" }}>
{/* Lazy Twitch Chat */}
                        <LazyTwitch type="chat" channel="skipperofleague"
                          title="Twitch Chat"
 parents={["thevoitansgithub.vercel.app","localhost"]} />
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {tab === "schedule" && (
                <section
                  id="panel-schedule"
                  role="tabpanel"
                  aria-labelledby="tab-schedule"
                  className="max-w-6xl mx-auto rounded-2xl border border-white/10 bg-black/30 backdrop-blur p-6"
                >
                  <h2 className="text-xl font-semibold mb-2">Takvim</h2>
                  <p className="text-zinc-400">
                    Güncel raid ve etkinlik programı (Pzt–Paz, koyu tema).
                  </p>
                  <WeeklySchedule />
                </section>
              )}

              {tab === "join" && (
                <section
                  id="panel-join"
                  role="tabpanel"
                  aria-labelledby="tab-join"
                  className="max-w-2xl mx-auto rounded-2xl border border-white/10 bg-black/30 backdrop-blur p-6"
                >
                  <h2 className="text-xl font-semibold mb-2">Katıl</h2>
                  <div className="mt-4">
                      <a
                        href="https://discord.gg/thevoitans"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium text-white"
                        style={{ backgroundColor: "#5865F2" }}
                      >
                        Discord’a Katıl
                      </a>
                  </div>
                </section>
              )}

      {tab === "officer" && isSeniorOfficer && (
        <section
          id="panel-officer"
          role="tabpanel"
          aria-labelledby="tab-officer"
          className="max-w-6xl mx-auto rounded-2xl border border-amber-400/20 bg-black/30 backdrop-blur p-6"
        >
          {/* Admin Dashboard, Maceralarımız sekmeleri gibi: Duyuru • Loglar */}
          {/* Hydration uyumsuzluklarını önlemek için dinamik import (SSR kapalı) kullan */}
          <OfficerDashboardTabsDynamic />
        </section>
      )}
      </motion.div>
      </div>
    </div>

      {/* Lightweight components (no external deps) */}
      <MottoStyles />
      <StatsStyles />

      {/* Officer Panel – rol denetimi sayfa seviyesinde yapılmıştır */}
      {/* Inline komponent sayfa sonunda tanımlıdır */}

      {/* Officer Panel – gerçek React bileşeni olarak tanımlandı ve yukarıda <OfficerPanel /> şeklinde kullanılıyor. */}
      {/* Bu inline tanım Home bileşeni kapsamı DIŞINDA olmalıdır, o yüzden footer'dan ÖNCE eklenmiştir. */}
      <></>
      {/* Footer (bir tık daha yukarı) */}
      <footer className="mt-2 px-3 pb-1">
          <div className="max-w-6xl mx-auto rounded-2xl border border-white/10 bg-black/30 backdrop-blur p-2.5 sm:p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 relative overflow-hidden">
            <div className="absolute inset-x-0 -top-1 px-3">
              <div className="max-w-6xl mx-auto h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </div>

            {/* Arka plan sadeleştirildi: GIF kaldırıldı, gradient + mask ile hafif parıltı */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 overflow-hidden"
              style={{
                WebkitMaskImage: "linear-gradient(to top, transparent, black 55%)",
                maskImage: "linear-gradient(to top, transparent, black 55%)",
              }}
            >
              <div
                className="absolute inset-x-0 bottom-0 w-full h-[55%]"
                style={{
                  background:
                    "radial-gradient(120% 120% at 50% 100%, color-mix(in oklab, var(--accent-pink) 12%, transparent), transparent 60%), radial-gradient(140% 140% at 60% 100%, color-mix(in oklab, var(--accent-cyan) 10%, transparent), transparent 65%)",
                  filter: "opacity(0.10) blur(0.8px)",
                }}
              />
            </div>

            <div className="flex items-center gap-3 relative z-10">
              <span className="size-10 rounded-lg bg-white/5 border border-white/10 grid place-items-center overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/voitans-logo.svg"
                  alt="VOITANS Crest"
                  className="w-6 h-6 object-contain opacity-90"
                />
              </span>
              <div className="min-w-[180px]">
                <div className="text-zinc-100 text-sm font-medium">THE VOITANS</div>
                <div className="text-zinc-500 text-xs">Prestij, Disiplin, Birlik.</div>
              </div>
            </div>
            <div className="flex items-center gap-2 relative z-10">
              <a
                href="https://youtube.com/@thevoitans"
                className="rounded-full px-3 py-1.5 text-xs border border-white/10 text-zinc-300 hover:border-white/20"
              >
                YouTube
              </a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

/* Officer Dashboard Tabs – Maceralarımız benzeri sekmeli yapı (Duyuru / Loglar) */
import dynamic from "next/dynamic";

// OfficerDashboardTabs'ı client-only yapmak SSR'da değişken içerikler (Date, window, require) nedeniyle
// yaşanan hydration farklarını engeller.
const OfficerDashboardTabsDynamic = dynamic(() => Promise.resolve(OfficerDashboardTabs), {
  ssr: false,
});

function OfficerDashboardTabs(): React.JSX.Element {
  const [tab, setTab] = useState<"announce" | "logs">("announce");

  // Görünür hata/teşhis UI state'i (announce tabına özel)
  const [diag, setDiag] = useState<{ msg?: string } | null>(null);

  // Announce tab aktif olduğunda küçük bir ping atıp görünür teşhis ver
  useEffect(() => {
    let alive = true;
    async function diagPing() {
      if (tab !== "announce") return;
      try {
        const r = await fetch("/api/discord/channels", { cache: "no-store" });
        if (!alive) return;
        if (!r.ok) {
          const t = await r.text().catch(() => "");
          setDiag({ msg: `/api/discord/channels -> ${r.status} ${t.slice(0, 140)}` });
        } else {
          setDiag(null);
        }
      } catch (e: any) {
        if (!alive) return;
        setDiag({ msg: `channels fetch error: ${e?.message || "unknown"}` });
      }
    }
    diagPing();
    return () => {
      alive = false;
    };
  }, [tab]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Officer sekmeleri">
        <button
          role="tab"
          aria-selected={tab === "announce"}
          onClick={() => setTab("announce")}
          className={`px-3 py-1.5 text-sm rounded-full border ${tab === "announce" ? "text-white border-white/20 bg-white/5" : "text-zinc-300 border-white/10 hover:border-white/20 hover:bg-white/5"}`}
        >
          Duyuru
        </button>
        <button
          role="tab"
          aria-selected={tab === "logs"}
          onClick={() => setTab("logs")}
          className={`px-3 py-1.5 text-sm rounded-full border ${tab === "logs" ? "text-white border-white/20 bg-white/5" : "text-zinc-300 border-white/10 hover:border-white/20 hover:bg-white/5"}`}
        >
          Loglar
        </button>
      </div>

      {tab === "announce" && (
        <div role="tabpanel" aria-labelledby="">
          {/* Hızlı teşhis mesajı (sadece sorun varsa görünür) */}
          {diag?.msg ? (
            <div className="mb-3 rounded-lg border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
              {diag.msg}
            </div>
          ) : null}

          {/* Görünürlüğü bileşen içinde garanti eden bağımsız duyuru formu */}
          <OfficerAnnounce />
        </div>
      )}

      {tab === "logs" && (
        <div role="tabpanel" aria-labelledby="">
          {/* Dinamik import ile client tarafında yüklensin */}
          <LogsEmbed />
        </div>
      )}
    </div>
  );
}

/* Officer Logs embed – client-only dynamic import */
const LogsEmbed = dynamic(async () => {
  // next/dynamic içinde import kullan (require yerine) – stable ve tree-shake friendly
  const mod = await import("./officer/logs/page");
  return mod.default;
}, { ssr: false });

/* Officer Panel – gerçek React bileşeni (inline) */
function OfficerPanel(): React.JSX.Element {
  const { data: session } = useSession() as any;
  const isSeniorOfficer = (session?.user?.guildMember?.roles ?? []).some(
    (r: any) => r?.name?.toLowerCase() === "senior officer"
  );

  // Sadece rol sahibi görür (ek güvenlik)
  if (!isSeniorOfficer) return <></>;

  // OfficerPanel artık yalnızca “Duyuru Gönder” formunu içerir (iç sekme yok)
  // const [innerTab, setInnerTab] = useState<"announce" | "logs">("announce");

  // Duyuru gönderimi state'leri
  const [channels, setChannels] = useState<Array<{ id: string; name: string; type: number }>>([]);
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [form, setForm] = useState({ channelId: "", content: "" });

  // OfficerPanel içindeki log görüntüleme kaldırıldı
  // const [logs, setLogs] = useState<Array<...>>([]);
  // const [logsMeta, setLogsMeta] = useState({ loading: false, error: "", limit: 100, offset: 0, total: 0 });

  // Kategori filtreleri (üst ve alt filtre barı aynı state'i paylaşır)
  type LogCategory =
    | "all"
    | "moderation_ban"
    | "moderation_kick"
    | "message_delete"
    | "message_edit"
    | "link_share"
    | "voice_join"
    | "voice_leave"
    | "voice_switch";

  // const [logFilters, setLogFilters] = useState<...>(...)

  // Kategori -> event adı eşleme (bot tarafı event isimlendirmesini buraya uydurursak server filtrelemeye de eklenebilir)
  const CATEGORY_EVENT_MAP: Record<LogCategory, string[]> = {
    all: [],
    moderation_ban: ["guildBanAdd", "ban", "userBan"],
    moderation_kick: ["kick", "guildKick", "userKick"],
    message_delete: ["messageDelete"],
    message_edit: ["messageUpdate", "messageEdit"],
    link_share: ["messageLink", "linkShare", "messageCreate_link"],
    voice_join: ["voiceStateUpdate_join"],
    voice_leave: ["voiceStateUpdate_leave"],
    voice_switch: ["voiceStateUpdate_switch"],
  };

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
    loadChannels();
    return () => {
      alive = false;
    };
  }, []);

  // OfficerPanel içindeki eski log çekme kodları tamamen kaldırıldı

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

  return (
    <div className="space-y-3">
      {/* Duyuru Gönder */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Sol: Kanal listesi */}
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

        {/* Sağ: Duyuru formu */}
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
              disabled={submitting || !form.content.trim() || !form.channelId.trim()}
              onClick={postAnnouncement}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200 disabled:opacity-50 hover:border-white/20"
            >
              {submitting ? "Gönderiliyor…" : "Duyuruyu Gönder"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
