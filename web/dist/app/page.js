"use client";
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Home;
const jsx_runtime_1 = require("react/jsx-runtime");
const framer_motion_1 = require("framer-motion");
const react_1 = require("react");
const navigation_1 = require("next/navigation");
const react_2 = require("next-auth/react");
const ui_1 = require("../components/ui");
const LazyTwitch_1 = __importDefault(require("../components/LazyTwitch"));
const MemberCard_1 = require("../components/MemberCard");
const AdventuresTabs_1 = __importDefault(require("../components/AdventuresTabs"));
const Cursor_1 = __importDefault(require("../components/Cursor"));
const BackgroundFX_1 = __importDefault(require("../components/BackgroundFX"));
const AdvancedTeamCursor_1 = __importDefault(require("../components/AdvancedTeamCursor"));
/* rotator removed for simpler hero */
/* stats bar removed for simpler layout */
/* style helpers as inline components to keep file self-contained */
function MottoStyles() {
    return ((0, jsx_runtime_1.jsx)("style", { jsx: true, global: true, children: `
      .duration-600 {
        transition-duration: 600ms !important;
      }
    ` }));
}
function StatsStyles() {
    return null;
}
function escapeHtml(s) {
    // Proper HTML escaping before markdown-like transforms
    return s
        .replaceAll("&", "&")
        .replaceAll("<", "<")
        .replaceAll(">", ">");
}
// very small markdown subset + mention badge conversion
function renderMarkdownSubset(input) {
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
            var _a;
            try {
                if (typeof window !== "undefined") {
                    const state = window.__ROLE_NAME_CACHE__;
                    const nm = (_a = state === null || state === void 0 ? void 0 : state.roles) === null || _a === void 0 ? void 0 : _a[key];
                    if (nm && typeof nm === "string")
                        return nm;
                }
            }
            catch (_b) { }
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
function AnnounceRoleColorizer({ roleColors }) {
    // Rol id’si içeren pill’lara özel arka plan uygular
    (0, react_1.useEffect)(() => {
        try {
            const nodes = document.querySelectorAll(".discord-pill.role");
            nodes.forEach((n) => {
                // İç metinden role id yakalamayı dener: "@RoleName (1234567890)" veya data-role-id attr
                const attrId = n.getAttribute("data-role-id");
                let roleId = attrId || "";
                if (!roleId) {
                    const txt = n.textContent || "";
                    const m = txt.match(/\((\d{5,})\)$/);
                    if (m)
                        roleId = m[1];
                }
                if (roleId && roleColors[roleId]) {
                    const col = roleColors[roleId];
                    // Rengi gradiente uygula, okunabilirlik için beyaz metin ve border
                    n.style.background = `linear-gradient(180deg, ${col} 0%, ${col} 85%)`;
                    n.style.color = "#fff";
                    n.style.borderColor = "rgba(0,0,0,.25)";
                    n.setAttribute("data-role-id", roleId);
                }
                else {
                    // fallback: varsayılan mavi gradient kalır, yalnızca data-role-id işaretle
                    if (roleId)
                        n.setAttribute("data-role-id", roleId);
                }
            });
        }
        catch (_a) { }
    }, [roleColors]);
    return null;
}
function Announcements() {
    const [items, setItems] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    // Rol etiket renkleri (roleId -> hex/rgb)
    const [roleColors, setRoleColors] = (0, react_1.useState)({});
    // Rol adlarını ve renklerini önceden doldur: /api/resolve/roles
    (0, react_1.useEffect)(() => {
        let alive = true;
        function primeRoles() {
            return __awaiter(this, void 0, void 0, function* () {
                var _a;
                try {
                    const r = yield fetch("/api/resolve/roles", { cache: "no-store" });
                    if (!r.ok)
                        return;
                    // Beklenen: { roles: { [id]: name }, colors?: { [id]: colorHex } }
                    const payload = (yield r.json());
                    if (!alive)
                        return;
                    if (typeof window !== "undefined") {
                        window.__ROLE_NAME_CACHE__ = { roles: (_a = payload === null || payload === void 0 ? void 0 : payload.roles) !== null && _a !== void 0 ? _a : {} };
                    }
                    if ((payload === null || payload === void 0 ? void 0 : payload.colors) && typeof payload.colors === "object") {
                        setRoleColors(payload.colors);
                    }
                    // Duyuruları rol isimleri ile yeniden işlemek için reflow tetikle
                    setItems((prev) => [...prev]);
                }
                catch (_b) { }
            });
        }
        primeRoles();
        return () => { alive = false; };
    }, []);
    (0, react_1.useEffect)(() => {
        let alive = true;
        function load() {
            return __awaiter(this, void 0, void 0, function* () {
                var _a;
                try {
                    const r = yield fetch("/api/announcements", { cache: "no-store" });
                    const j = yield r.json();
                    if (!alive)
                        return;
                    const arr = ((_a = j.items) !== null && _a !== void 0 ? _a : []);
                    setItems(arr);
                }
                catch (_b) {
                    if (!alive)
                        return;
                    setItems([]);
                }
                finally {
                    if (alive)
                        setLoading(false);
                }
            });
        }
        load();
        return () => {
            alive = false;
        };
    }, []);
    if (loading) {
        return (0, jsx_runtime_1.jsx)("div", { className: "text-sm text-zinc-400", children: "Y\u00FCkleniyor\u2026" });
    }
    if (!items.length) {
        return (0, jsx_runtime_1.jsx)("div", { className: "text-sm text-zinc-500", children: "G\u00F6sterilecek duyuru yok." });
    }
    return ((0, jsx_runtime_1.jsx)("div", { className: "space-y-4", children: items.map((m) => {
            var _a;
            const safe = escapeHtml((_a = m.content) !== null && _a !== void 0 ? _a : "");
            const html = renderMarkdownSubset(safe);
            return ((0, jsx_runtime_1.jsxs)("article", { className: "rounded-xl border border-white/10 bg-white/5 p-4 transition-all duration-300 hover:border-white/20 hover:shadow-lg hover:shadow-white/10", children: [m.createdAt ? ((0, jsx_runtime_1.jsx)("div", { className: "mb-2", children: (0, jsx_runtime_1.jsx)("time", { className: "inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-[11px] text-zinc-400", dateTime: new Date(m.createdAt).toISOString(), children: new Date(m.createdAt).toLocaleString("tr-TR", {
                                day: "2-digit",
                                month: "long",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: false,
                            })
                                .replaceAll(".", " ")
                                .replace(/\s(\d{2}):(\d{2}).*$/, " $1:$2") }) })) : null, (0, jsx_runtime_1.jsx)("style", { jsx: true, global: true, children: `
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
            ` }), (0, jsx_runtime_1.jsx)("div", { className: "prose prose-invert max-w-none", children: (0, jsx_runtime_1.jsx)("div", { dangerouslySetInnerHTML: {
                                __html: html,
                            } }) }), (0, jsx_runtime_1.jsx)("style", { jsx: true, children: `
              :global(.discord-pill.role[data-role-id]) {
                /* Varsayılan rol kapsülü rengi – JS inline style ile override edilebilir */
                background: linear-gradient(180deg, rgba(88,101,242,0.95) 0%, rgba(71,82,196,0.95) 100%);
              }
            ` }), (0, jsx_runtime_1.jsx)(AnnounceRoleColorizer, { roleColors: roleColors })] }, m.id));
        }) }));
}
/* Minimal cursor client component - removed (using imported Cursor component) */
/* Weekly schedule (kept from working logic) */
function WeeklySchedule() {
    const [weekOffset, setWeekOffset] = (0, react_1.useState)(0);
    const [data, setData] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(true);
    (0, react_1.useEffect)(() => {
        let alive = true;
        setLoading(true);
        fetch(`/api/schedule/weekly?weekOffset=${weekOffset}`, { cache: "no-store" })
            .then((r) => r.json())
            .then((j) => {
            if (alive)
                setData(j);
        })
            .catch(() => {
            if (alive)
                setData(null);
        })
            .finally(() => {
            if (alive)
                setLoading(false);
        });
        return () => {
            alive = false;
        };
    }, [weekOffset]);
    const fmtDay = (d) => d.toLocaleDateString("tr-TR", {
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
    });
    const isoToLocalDate = (iso) => new Date(iso);
    const range = (() => {
        if (!data || !data.week || !data.week.start)
            return [];
        const start = new Date(data.week.start);
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(start);
            d.setUTCDate(d.getUTCDate() + i);
            d.setUTCHours(0, 0, 0, 0);
            return d;
        });
    })();
    const eventsByDay = (() => {
        var _a;
        const map = {};
        if (!data)
            return map;
        for (const d of range)
            map[d.toISOString().slice(0, 10)] = [];
        for (const ev of (_a = data.events) !== null && _a !== void 0 ? _a : []) {
            const sd = new Date(ev.start);
            const key = sd.toISOString().slice(0, 10);
            if (map[key])
                map[key].push(ev);
        }
        for (const k of Object.keys(map)) {
            map[k].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
        }
        return map;
    })();
    const now = new Date();
    return ((0, jsx_runtime_1.jsxs)("div", { className: "mt-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between gap-3", children: [(0, jsx_runtime_1.jsx)("div", { className: "text-sm text-zinc-400", children: data && data.week ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: ["Hafta:", " ", new Date(data.week.start).toLocaleDateString("tr-TR", {
                                    day: "2-digit",
                                    month: "2-digit",
                                }), " ", "\u2013", " ", new Date(data.week.end).toLocaleDateString("tr-TR", {
                                    day: "2-digit",
                                    month: "2-digit",
                                })] })) : loading ? ("Yükleniyor…") : ("Takvim verisi alınamadı") }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)(ui_1.NeonButton, { variant: "outline", onClick: () => setWeekOffset((w) => w - 1), children: "\u00D6nceki" }), (0, jsx_runtime_1.jsx)(ui_1.NeonButton, { onClick: () => setWeekOffset(0), children: "Bu Hafta" }), (0, jsx_runtime_1.jsx)(ui_1.NeonButton, { variant: "outline", onClick: () => setWeekOffset((w) => w + 1), children: "Sonraki" })] })] }), (0, jsx_runtime_1.jsx)("div", { className: "mt-3 grid grid-cols-1 sm:grid-cols-7 gap-3", children: range.map((d, i) => {
                    var _a, _b;
                    const key = d.toISOString().slice(0, 10);
                    const isToday = now.toDateString() ===
                        new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()).toDateString();
                    return ((0, jsx_runtime_1.jsxs)("div", { className: "rounded-xl border border-white/10 bg-black/40 p-3 backdrop-blur", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between", children: [(0, jsx_runtime_1.jsx)("div", { className: "text-xs uppercase tracking-wide text-zinc-400", children: fmtDay(d) }), isToday && ((0, jsx_runtime_1.jsx)("span", { className: "text-[10px] px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-zinc-300", children: "Bug\u00FCn" }))] }), (0, jsx_runtime_1.jsxs)("div", { className: "mt-2 space-y-2", children: [((_a = eventsByDay[key]) !== null && _a !== void 0 ? _a : []).length === 0 && ((0, jsx_runtime_1.jsx)("div", { className: "text-xs text-zinc-500", children: "Etkinlik yok" })), ((_b = eventsByDay[key]) !== null && _b !== void 0 ? _b : []).map((ev) => {
                                        const s = isoToLocalDate(ev.start).toLocaleTimeString("tr-TR", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        });
                                        const e = isoToLocalDate(ev.end).toLocaleTimeString("tr-TR", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        });
                                        return ((0, jsx_runtime_1.jsxs)("div", { className: "rounded-lg border border-white/10 bg-white/5 p-2 hover:border-white/20 transition-colors", children: [(0, jsx_runtime_1.jsx)("div", { className: "text-[13px] text-zinc-100", children: ev.title }), (0, jsx_runtime_1.jsxs)("div", { className: "text-[11px] text-zinc-400", children: [ev.allDay ? "Tüm gün" : `${s} – ${e}`, ev.location ? ` • ${ev.location}` : ""] })] }, ev.id));
                                    })] })] }, i));
                }) }), loading && ((0, jsx_runtime_1.jsx)("div", { className: "mt-3 text-xs text-zinc-500", children: "Takvim y\u00FCkleniyor\u2026" })), !loading && (!data || !data.week) && ((0, jsx_runtime_1.jsx)("div", { className: "mt-3 text-xs text-rose-400", children: "Takvim verisi al\u0131namad\u0131. L\u00FCtfen .env.local i\u00E7inde CALENDAR_ICS_URL tan\u0131ml\u0131 ve dev sunucusu yeniden ba\u015Flat\u0131lm\u0131\u015F olsun." }))] }));
}
function MembersSection() {
    // PERF: render sayısını azaltmak için controlled state'leri bir arada tut ve memoize et
    const [members, setMembers] = (0, react_1.useState)([]);
    const [meta, setMeta] = (0, react_1.useState)({
        loading: true,
        error: null,
        page: 1,
        totalPages: 1,
    });
    const [q, setQ] = (0, react_1.useState)("");
    const [roleFilter, setRoleFilter] = (0, react_1.useState)("all");
    // Sıralama sabit (API default)
    const sort = "rolePriority";
    const order = "asc";
    // debounce search (useMemo + setTimeout ile stable)
    const debouncedQ = (0, react_1.useMemo)(() => q.trim(), [q]);
    (0, react_1.useEffect)(() => {
        const id = setTimeout(() => {
            // sadece trigger amacıyla state'i aynı değere set etmiyoruz; fetch effect debouncedQ'yu dependency olarak kullanacak
        }, 0);
        return () => clearTimeout(id);
    }, [debouncedQ]);
    // PREFETCH: İlk mount’ta 1. sayfayı prefetch eden üst Home effect’i var. Burada ayrıca network çakışmasını azaltmak için
    // küçük bir bekleme penceresi ekle.
    const controls = (0, react_1.useMemo)(() => ({
        page: meta.page,
        q: debouncedQ,
        role: roleFilter,
        sort,
        order,
        limit: 12,
    }), [meta.page, debouncedQ, roleFilter, sort, order]);
    // fetch members with AbortController to cancel stale requests
    (0, react_1.useEffect)(() => {
        const ctrl = new AbortController();
        const run = () => __awaiter(this, void 0, void 0, function* () {
            var _a;
            setMeta((m) => (Object.assign(Object.assign({}, m), { loading: true, error: null })));
            try {
                const params = new URLSearchParams();
                params.set("page", String(controls.page));
                params.set("limit", String(controls.limit));
                if (controls.q)
                    params.set("q", controls.q);
                if (controls.role !== "all")
                    params.set("role", controls.role);
                params.set("sort", controls.sort);
                params.set("order", controls.order);
                const r = yield fetch(`/api/members?${params.toString()}`, { cache: "no-store", signal: ctrl.signal });
                const j = yield r.json().catch(() => ({}));
                if (ctrl.signal.aborted)
                    return;
                if (!r.ok) {
                    setMembers([]);
                    setMeta((m) => (Object.assign(Object.assign({}, m), { loading: false, totalPages: 1, error: (j === null || j === void 0 ? void 0 : j.error) || "Üyeler yüklenemedi" })));
                }
                else {
                    const list = ((_a = j.members) !== null && _a !== void 0 ? _a : []);
                    // STABLE KEYS: id zaten mevcut, render sırasında Order değişimini min. tut
                    setMembers(list);
                    setMeta((m) => {
                        var _a;
                        return (Object.assign(Object.assign({}, m), { loading: false, totalPages: Number((_a = j.totalPages) !== null && _a !== void 0 ? _a : 1), error: null }));
                    });
                }
            }
            catch (e) {
                if (ctrl.signal.aborted)
                    return;
                setMembers([]);
                setMeta((m) => (Object.assign(Object.assign({}, m), { loading: false, totalPages: 1, error: "Bağlantı hatası. Lütfen tekrar deneyin." })));
            }
        });
        run();
        return () => ctrl.abort();
    }, [controls]);
    // Memoize edilen kart listesi (re-render azaltma)
    const cards = (0, react_1.useMemo)(() => {
        return members.map((m) => {
            var _a;
            const roleName = (_a = m.dominantRoleName) !== null && _a !== void 0 ? _a : (m.dominantRole ? undefined : undefined);
            let roleColor = m.dominantRoleColor || undefined;
            if (!roleColor && roleName) {
                const map = {
                    "Guild Master": "#f59e0b",
                    "Senior Officer": "#22d3ee",
                    "Marshal": "#a78bfa",
                    "Field Officer": "#34d399",
                    "Veteran": "#60a5fa",
                    "Voitans": "#9ca3af",
                };
                roleColor = map[roleName] || undefined;
            }
            return ((0, jsx_runtime_1.jsx)(MemberCard_1.MemberCard, { username: m.username || "Discord User", avatarUrl: m.avatarUrl, dominantRole: m.dominantRole || undefined, dominantRoleColor: roleColor, dominantRoleName: roleName }, m.id));
        });
    }, [members]);
    // Basit sanal listeleme (CSS contain + will-change) – gerçek virtualization olmadan paint maliyetini azalt
    // Not: Üye sayısı çok büyürse react-virtualized/virtual ile ilerlenebilir.
    return ((0, jsx_runtime_1.jsxs)("section", { className: "space-y-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col sm:flex-row gap-3 items-stretch sm:items-center", children: [(0, jsx_runtime_1.jsx)("style", { jsx: true, children: `
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
        ` }), (0, jsx_runtime_1.jsxs)("div", { className: "relative", children: [(0, jsx_runtime_1.jsx)("input", { "aria-label": "\u00DCye ara", placeholder: "Ara...", value: q, onChange: (e) => {
                                    setQ(e.target.value);
                                    setMeta((m) => (Object.assign(Object.assign({}, m), { page: 1 })));
                                }, className: "rounded-xl border border-white/10 bg-black/30 text-sm px-3 py-2 text-zinc-200 outline-none focus:border-white/20" }), !!q && ((0, jsx_runtime_1.jsx)("button", { "aria-label": "Aramay\u0131 temizle", className: "absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200", onClick: () => {
                                    setQ("");
                                    setMeta((m) => (Object.assign(Object.assign({}, m), { page: 1 })));
                                }, children: "\u00D7" }))] }), (0, jsx_runtime_1.jsx)("div", { className: "flex-1" }), (0, jsx_runtime_1.jsxs)("label", { className: "inline-flex items-center gap-2 text-sm text-zinc-300", children: ["Rol:", (0, jsx_runtime_1.jsx)("span", { className: "tv-select-wrap", children: (0, jsx_runtime_1.jsxs)("select", { value: roleFilter, onChange: (e) => {
                                        setRoleFilter(e.target.value);
                                        setMeta((m) => (Object.assign(Object.assign({}, m), { page: 1 })));
                                    }, className: "tv-select", "aria-label": "Rol filtresi", children: [(0, jsx_runtime_1.jsx)("option", { value: "all", children: "T\u00FCm\u00FC" }), (0, jsx_runtime_1.jsx)("option", { value: "guildmaster", children: "Guild Master" }), (0, jsx_runtime_1.jsx)("option", { value: "seniorofficer", children: "Senior Officer" }), (0, jsx_runtime_1.jsx)("option", { value: "marshal", children: "Marshal" }), (0, jsx_runtime_1.jsx)("option", { value: "fieldofficer", children: "Field Officer" }), (0, jsx_runtime_1.jsx)("option", { value: "veteran", children: "Veteran" }), (0, jsx_runtime_1.jsx)("option", { value: "voitans", children: "Voitans" })] }) })] })] }), meta.loading ? ((0, jsx_runtime_1.jsx)("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6", "aria-live": "polite", "aria-busy": "true", children: Array.from({ length: 6 }).map((_, i) => ((0, jsx_runtime_1.jsxs)("div", { className: "skeleton", children: [(0, jsx_runtime_1.jsx)("div", { className: "sk-avatar shimmer" }), (0, jsx_runtime_1.jsxs)("div", { className: "sk-lines", children: [(0, jsx_runtime_1.jsx)("div", { className: "sk-line shimmer" }), (0, jsx_runtime_1.jsx)("div", { className: "sk-badge shimmer" })] })] }, i))) })) : meta.error ? ((0, jsx_runtime_1.jsx)("div", { role: "alert", className: "text-sm text-rose-400 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2", children: meta.error })) : members.length === 0 ? ((0, jsx_runtime_1.jsx)("div", { className: "text-sm text-zinc-400 rounded-xl border border-white/10 bg-white/5 px-3 py-6 text-center", children: "Kriterlere uyan \u00FCye bulunamad\u0131." })) : ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 [contain:content] will-change-[contents]", style: { contentVisibility: "auto" }, children: cards }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-center gap-3 mt-2", "aria-live": "polite", children: [(0, jsx_runtime_1.jsx)("button", { className: "rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-zinc-200 disabled:opacity-50", onClick: () => setMeta((m) => (Object.assign(Object.assign({}, m), { page: Math.max(1, m.page - 1) }))), disabled: meta.page <= 1, children: "\u00D6nceki" }), (0, jsx_runtime_1.jsxs)("span", { className: "text-sm text-zinc-400", children: [meta.page, " / ", meta.totalPages] }), (0, jsx_runtime_1.jsx)("button", { className: "rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-zinc-200 disabled:opacity-50", onClick: () => setMeta((m) => (Object.assign(Object.assign({}, m), { page: Math.min(m.totalPages, m.page + 1) }))), disabled: meta.page >= meta.totalPages, children: "Sonraki" })] })] }))] }));
}
/**
 * OfficerAnnounce inline – görünürlük garantisi için bağımsız duyuru formu
 * Tanım: Home bileşeninden ÖNCE olmalı, aksi halde JSX referansı bulunamaz.
 * - Kanal listesi: GET /api/discord/channels
 * - Gönderim: POST /api/officer/announce
 * - Görünürlük: ID ve isim bazlı kontrol (SENIOR_OFFICER_ROLE_ID veya "Senior Officer")
 */
function OfficerAnnounce() {
    var _a, _b;
    const { data: session } = (0, react_2.useSession)();
    const raw = Array.isArray((_b = (_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.guildMember) === null || _b === void 0 ? void 0 : _b.roles) ? session.user.guildMember.roles : [];
    const roles = raw.map((r) => { var _a; return ({ id: String((_a = r === null || r === void 0 ? void 0 : r.id) !== null && _a !== void 0 ? _a : r), name: r === null || r === void 0 ? void 0 : r.name }); });
    const SENIOR_OFFICER_ROLE_ID = (typeof process !== "undefined" && (process.env.NEXT_PUBLIC_SENIOR_OFFICER_ROLE_ID || process.env.SENIOR_OFFICER_ROLE_ID)) ||
        "1249512318929342505";
    const canView = roles.some((r) => String(r.id) === String(SENIOR_OFFICER_ROLE_ID)) ||
        roles.some((r) => ((r === null || r === void 0 ? void 0 : r.name) || "").toLowerCase() === "senior officer");
    const [channels, setChannels] = (0, react_1.useState)([]);
    const [loadingChannels, setLoadingChannels] = (0, react_1.useState)(true);
    const [form, setForm] = (0, react_1.useState)({ channelId: "", content: "" });
    const [submitting, setSubmitting] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const [ok, setOk] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        let alive = true;
        function loadChannels() {
            return __awaiter(this, void 0, void 0, function* () {
                setLoadingChannels(true);
                try {
                    const r = yield fetch("/api/discord/channels", { cache: "no-store" });
                    const j = yield r.json().catch(() => ({}));
                    if (!alive)
                        return;
                    setChannels(Array.isArray(j === null || j === void 0 ? void 0 : j.channels) ? j.channels : []);
                }
                catch (_a) {
                    if (!alive)
                        return;
                    setChannels([]);
                }
                finally {
                    if (alive)
                        setLoadingChannels(false);
                }
            });
        }
        if (canView)
            loadChannels();
        return () => {
            alive = false;
        };
    }, [canView]);
    const disabled = submitting || !form.content.trim() || !form.channelId.trim();
    const postAnnouncement = () => __awaiter(this, void 0, void 0, function* () {
        setSubmitting(true);
        setError(null);
        setOk(false);
        try {
            const r = yield fetch("/api/officer/announce", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ channelId: form.channelId, content: form.content }),
            });
            const j = yield r.json().catch(() => ({}));
            if (!r.ok)
                throw new Error((j === null || j === void 0 ? void 0 : j.error) || "Gönderilemedi");
            setOk(true);
            setForm((f) => (Object.assign(Object.assign({}, f), { content: "" })));
        }
        catch (e) {
            setError((e === null || e === void 0 ? void 0 : e.message) || "Gönderim sırasında hata oluştu");
        }
        finally {
            setSubmitting(false);
        }
    });
    if (!canView)
        return (0, jsx_runtime_1.jsx)("div", { className: "text-sm text-zinc-400", children: "Bu alan yaln\u0131zca Senior Officer i\u00E7indir." });
    return ((0, jsx_runtime_1.jsxs)("div", { className: "grid md:grid-cols-2 gap-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "rounded-xl border border-white/10 bg-white/5 p-3", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between mb-2", children: [(0, jsx_runtime_1.jsx)("h3", { className: "text-sm font-semibold text-zinc-100", children: "Kanallar" }), loadingChannels && (0, jsx_runtime_1.jsx)("span", { className: "text-xs text-zinc-400", children: "Y\u00FCkleniyor\u2026" })] }), (0, jsx_runtime_1.jsx)("div", { className: "max-h-72 overflow-auto pr-1", children: !channels.length && !loadingChannels ? ((0, jsx_runtime_1.jsx)("div", { className: "text-xs text-zinc-500", children: "Kanal bulunamad\u0131." })) : ((0, jsx_runtime_1.jsx)("ul", { className: "space-y-1", children: channels.map((c) => ((0, jsx_runtime_1.jsx)("li", { children: (0, jsx_runtime_1.jsxs)("button", { className: `w-full text-left rounded-md border border-white/10 px-2 py-1.5 text-xs hover:border-white/20 ${form.channelId === c.id ? "bg-white/10" : "bg-transparent"}`, onClick: () => setForm((f) => (Object.assign(Object.assign({}, f), { channelId: c.id }))), title: c.id, children: ["#", c.name, " ", c.type === 5 ? "(announcement)" : ""] }) }, c.id))) })) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "rounded-xl border border-white/10 bg-white/5 p-3", children: [(0, jsx_runtime_1.jsx)("h3", { className: "text-sm font-semibold text-zinc-100 mb-2", children: "Duyuru G\u00F6nder" }), (0, jsx_runtime_1.jsxs)("div", { className: "grid gap-1.5", children: [(0, jsx_runtime_1.jsx)("label", { className: "text-sm text-zinc-300", children: "Hedef Kanal" }), (0, jsx_runtime_1.jsxs)("select", { value: form.channelId, onChange: (e) => setForm((f) => (Object.assign(Object.assign({}, f), { channelId: e.target.value }))), className: "rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-white/20", disabled: loadingChannels, children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: loadingChannels ? "Kanallar yükleniyor…" : "Kanal seçin" }), channels.map((c) => ((0, jsx_runtime_1.jsxs)("option", { value: c.id, children: ["#", c.name, " ", c.type === 5 ? "(announcement)" : ""] }, c.id)))] }), (0, jsx_runtime_1.jsx)("label", { className: "text-sm text-zinc-300 mt-2", children: "\u0130\u00E7erik" }), (0, jsx_runtime_1.jsx)("textarea", { value: form.content, onChange: (e) => setForm((f) => (Object.assign(Object.assign({}, f), { content: e.target.value }))), rows: 6, placeholder: "Duyuru i\u00E7eri\u011Fini yaz\u0131n\u2026", className: "rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-white/20" })] }), error && ((0, jsx_runtime_1.jsx)("div", { className: "mt-2 rounded-lg border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-300", children: error })), ok && ((0, jsx_runtime_1.jsx)("div", { className: "mt-2 rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300", children: "Duyuru g\u00F6nderildi." })), (0, jsx_runtime_1.jsx)("div", { className: "mt-3", children: (0, jsx_runtime_1.jsx)("button", { disabled: disabled, onClick: postAnnouncement, className: "rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200 disabled:opacity-50 hover:border-white/20", children: submitting ? "Gönderiliyor…" : "Duyuruyu Gönder" }) })] })] }));
}
function Home() {
    var _a, _b, _c, _d;
    const { data: session } = (0, react_2.useSession)();
    const roles = (_d = (_c = (_b = (_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.guildMember) === null || _b === void 0 ? void 0 : _b.roles) === null || _c === void 0 ? void 0 : _c.map((r) => ({ id: String(r.id), name: r.name }))) !== null && _d !== void 0 ? _d : [];
    // ID bazlı kontrol (isim bağımsız)
    const SENIOR_OFFICER_ROLE_ID = (typeof process !== "undefined" && (process.env.NEXT_PUBLIC_SENIOR_OFFICER_ROLE_ID || process.env.SENIOR_OFFICER_ROLE_ID)) ||
        "1249512318929342505";
    const isSeniorOfficer = roles.some((r) => String(r.id) === String(SENIOR_OFFICER_ROLE_ID));
    const [tab, setTab] = (0, react_1.useState)("home");
    const [booting, setBooting] = (0, react_1.useState)(true);
    // Üyeler verisini sayfa açılır açılmaz önden ısıt (preload) – görünür olmasa da fetch başlasın
    (0, react_1.useEffect)(() => {
        // Varsayılan filtrelerle ilk sayfayı önden iste
        try {
            const params = new URLSearchParams();
            params.set("page", "1");
            params.set("limit", "12");
            params.set("sort", "rolePriority");
            params.set("order", "asc");
            // Cache zaten kapalı ve API no-store; yine de bağlantı hazırlığını tetikler
            fetch(`/api/members?${params.toString()}`, { cache: "no-store" }).catch(() => { });
        }
        catch (_a) { }
    }, []);
    const pathname = (0, navigation_1.usePathname)();
    const locale = (pathname === null || pathname === void 0 ? void 0 : pathname.split("/")[1]) === "en" ? "en" : "tr";
    (0, react_1.useEffect)(() => {
        const t = setTimeout(() => setBooting(false), 600);
        return () => clearTimeout(t);
    }, []);
    return ((0, jsx_runtime_1.jsxs)("div", { className: "relative min-h-screen overflow-hidden overflow-y-auto bg-black demo-page", children: [(0, jsx_runtime_1.jsx)(ui_1.LiquidLoader, { show: false }), (0, jsx_runtime_1.jsx)(Cursor_1.default, {}), (0, jsx_runtime_1.jsx)(BackgroundFX_1.default, {}), (0, jsx_runtime_1.jsx)(AdvancedTeamCursor_1.default, {}), (0, jsx_runtime_1.jsxs)("main", { className: "relative z-10", onMouseMove: (e) => {
                    const root = e.currentTarget;
                    const rect = root.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    root.style.setProperty("--mx", x + "px");
                    root.style.setProperty("--my", y + "px");
                }, children: [(0, jsx_runtime_1.jsx)("div", { className: "px-6 sm:px-10 pb-16", children: (0, jsx_runtime_1.jsxs)("div", { className: "max-w-6xl mx-auto px-1", children: [(0, jsx_runtime_1.jsx)("div", { className: "tablist flex items-center justify-center gap-2 py-5", role: "tablist", "aria-label": "Site sekmeleri", children: [
                                        { id: "home", label: "Ana Sayfa" },
                                        { id: "about", label: "Hakkımızda" },
                                        { id: "adventures", label: "Maceralarımız" },
                                        { id: "members", label: "Üyeler" },
                                        { id: "announcements", label: "Duyurular" },
                                        { id: "streams", label: "Yayınlar" },
                                        { id: "schedule", label: "Takvim" },
                                        ...(isSeniorOfficer ? [{ id: "officer", label: "Officer" }] : []),
                                    ].map((t) => ((0, jsx_runtime_1.jsx)("button", { role: "tab", id: `tab-${t.id}`, "aria-controls": `panel-${t.id}`, "aria-selected": tab === t.id, onClick: () => setTab(t.id), className: `px-4 py-2 text-sm rounded-full border shadow-[inset_0_0_0_1px_rgba(255,255,255,.04)] transition-all ${tab === t.id
                                            ? "text-white border-white/20 bg-white/5 shadow-[0_8px_20px_rgba(0,0,0,.25)]"
                                            : "text-zinc-300 border-white/10 hover:border-white/20 hover:bg-white/5"}`, children: t.id === "adventures" ? ((0, jsx_runtime_1.jsx)("span", { className: "bg-clip-text text-transparent bg-gradient-to-r from-[#FFE898] via-[#FFE28A] to-[#FFD86F]", children: t.label })) : (t.label) }, t.id))) }), (0, jsx_runtime_1.jsxs)(framer_motion_1.motion.div, { initial: { opacity: 0, y: 12, filter: "blur(4px)" }, animate: { opacity: 1, y: 0, filter: "blur(0px)" }, exit: { opacity: 0, y: -12, filter: "blur(4px)" }, transition: { duration: 0.35, ease: "easeOut" }, children: [tab === "home" && ((0, jsx_runtime_1.jsxs)("section", { id: "panel-home", role: "tabpanel", "aria-labelledby": "", className: "mt-8", children: [(0, jsx_runtime_1.jsx)("div", { className: "relative overflow-hidden", children: (0, jsx_runtime_1.jsxs)("div", { className: "max-w-5xl mx-auto text-center px-4", children: [(0, jsx_runtime_1.jsxs)("h1", { className: "display font-[var(--font-cinzel)] font-semibold tracking-tight text-[clamp(28px,6vw,56px)] leading-[1.12] pt-1 text-[#E6ECEF] px-2 sm:px-0", style: { wordSpacing: "0.04em", letterSpacing: "0.004em" }, children: ["B\u0130R LONCANIN N\u0130YE", " ", (0, jsx_runtime_1.jsx)("span", { className: "bg-clip-text text-transparent", style: {
                                                                            backgroundImage: "linear-gradient(90deg, #35b4ff 0%, #62d8e1 50%, #8bf0cb 100%)",
                                                                            backgroundSize: "200% 100%",
                                                                            backgroundPosition: "0% 0%",
                                                                            WebkitBackgroundClip: "text",
                                                                            filter: "saturate(0.9) brightness(1.02)"
                                                                        }, children: "WEB" }), " ", (0, jsx_runtime_1.jsx)("span", { className: "bg-clip-text text-transparent", style: {
                                                                            backgroundImage: "linear-gradient(90deg, #8bf0cb 0%, #c5f87e 25%, #ffe66d 50%, #ffd144 68%, #ffbb35 84%, #ffe9c0 100%)",
                                                                            backgroundSize: "200% 100%",
                                                                            backgroundPosition: "0% 0%",
                                                                            WebkitBackgroundClip: "text",
                                                                            filter: "saturate(0.9) brightness(1.0)"
                                                                        }, children: "S\u0130TES\u0130" }), " ", (0, jsx_runtime_1.jsx)("wbr", {}), (0, jsx_runtime_1.jsx)("span", { className: "block sm:inline", children: "OLUR?" })] }), (0, jsx_runtime_1.jsx)("p", { className: "mt-3 text-[15px] sm:text-[16px] text-[#D6DBE1] max-w-xl sm:max-w-2xl mx-auto leading-[1.7]", children: "\u00C7\u00FCnk\u00FC buras\u0131 sadece bir oyun listesi de\u011Fil; iradenin, disiplinin ve kader ortakl\u0131\u011F\u0131n\u0131n duvara kaz\u0131nd\u0131\u011F\u0131 yer. Buras\u0131, da\u011F\u0131n\u0131k sesleri tek bir sava\u015F \u00E7\u0131\u011Fl\u0131\u011F\u0131na d\u00F6n\u00FC\u015Ft\u00FCren merkez. Ve evet\u2014buras\u0131, senin hik\u00E2yenin ba\u015Flad\u0131\u011F\u0131 yer." }), (0, jsx_runtime_1.jsxs)("div", { className: "mt-5 flex items-center justify-center gap-3", children: [(0, jsx_runtime_1.jsx)("a", { href: "https://discord.gg/thevoitans", className: "inline-flex items-center justify-center gap-2 rounded-full h-12 px-6 text-[15px] font-semibold text-white transition-all duration-300 tracking-[0.01em] hover:brightness-[1.05]", style: { backgroundColor: "#5865F2" }, children: "Discord\u2019a Kat\u0131l" }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => {
                                                                            const el = document.getElementById("voitans-intro");
                                                                            if (!el)
                                                                                return;
                                                                            // Önce mevcut highlight/dim durumunu temizle
                                                                            el.classList.remove("dimmed");
                                                                            el.classList.add("ring-highlight");
                                                                            // 1 saniye sonra parlaklığı otomatik kapat
                                                                            window.setTimeout(() => {
                                                                                el.classList.remove("ring-highlight");
                                                                                el.classList.add("dimmed");
                                                                            }, 1000);
                                                                        }, className: "inline-flex items-center justify-center rounded-full h-12 px-6 text-[15px] font-medium border border-white/10 text-zinc-200 bg-transparent hover:bg-white/5 hover:border-white/20 transition-all duration-300 hover:scale-105 tracking-[0.01em]", children: "Neden VOITANS?" })] })] }) }), (0, jsx_runtime_1.jsx)("section", { id: "voitans-intro", className: "mt-6", children: (0, jsx_runtime_1.jsxs)("div", { className: "relative intro-panel max-w-3xl mx-auto p-6 sm:p-7 rounded-2xl border border-white/10 transition-all duration-600 group overflow-hidden", style: { backgroundColor: "#07090d" }, children: [(0, jsx_runtime_1.jsx)("div", { "aria-hidden": true, className: "pointer-events-none absolute -inset-px rounded-[18px]", style: {
                                                                    background: "radial-gradient(80% 50% at 50% -10%, rgba(53,180,255,.10), transparent 70%), radial-gradient(80% 60% at 100% 30%, rgba(255,209,68,.08), transparent 60%), radial-gradient(90% 60% at 0% 60%, rgba(139,240,203,.08), transparent 60%)",
                                                                    maskImage: "linear-gradient(to bottom, black 80%, transparent)",
                                                                    WebkitMaskImage: "linear-gradient(to bottom, black 80%, transparent)",
                                                                    filter: "blur(6px)"
                                                                } }), (0, jsx_runtime_1.jsx)("div", { "aria-hidden": true, className: "absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" }), (0, jsx_runtime_1.jsx)("div", { "aria-hidden": true, className: "absolute inset-x-6 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" }), (0, jsx_runtime_1.jsx)("div", { "aria-hidden": true, className: "pointer-events-none absolute inset-0 translate-x-[-120%] group-hover:translate-x-[120%] transition-transform duration-[1600ms] ease-out", style: {
                                                                    background: "linear-gradient(90deg, transparent, rgba(255,255,255,.06), transparent)"
                                                                } }), (0, jsx_runtime_1.jsxs)("div", { className: "relative z-10 grid grid-cols-[auto_1fr] gap-4 sm:gap-5 items-start", children: [(0, jsx_runtime_1.jsx)("div", { className: "size-12 sm:size-14 rounded-xl bg-white/5 border border-white/10 grid place-items-center overflow-hidden shadow-[inset_0_0_0_1px_rgba(255,255,255,.04)] animate-[crest_4.8s_ease-in-out_infinite]", children: (0, jsx_runtime_1.jsx)("img", { src: "/thevoitanspurple-saturation100.gif", alt: "VOITANS Crest", className: "w-full h-full object-contain opacity-90", loading: "lazy", decoding: "async" }) }), (0, jsx_runtime_1.jsxs)("div", { className: "flex-1 text-[15px] leading-[1.85] text-[#D6DBE1] selection:bg-white/10", children: [(0, jsx_runtime_1.jsxs)("p", { className: "mb-4", children: ["Buras\u0131 THE VOITANS. Sadece bir lonca de\u011Fil; oyuna girdi\u011Finde sana \u201Ckimsin, neredesin, neye ihtiyac\u0131n var?\u201D diye soran bir ekip. Bazen g\u00FCnayd\u0131nla ba\u015Flar\u0131z, bazen \u201Cak\u015Fam 19:30 Discord\u201D diyerek plan kurar\u0131z; kimi g\u00FCn drop kovalay\u0131p build tart\u0131\u015F\u0131r, kimi g\u00FCn birimizin sevincine ortak olur, kayb\u0131nda omuz veririz. Bizim i\u00E7in lonca, listelerde bir isim de\u011Fil;", (0, jsx_runtime_1.jsx)("span", { className: "text-zinc-100", children: "emek veren, birbirini kollayan, ayn\u0131 \u00E7a\u011Fr\u0131da toplanan insanlar" }), " demek."] }), (0, jsx_runtime_1.jsx)("p", { className: "mb-4", children: "Burada \u201Cho\u015F geldin\u201D demek bir formalite de\u011Fil. Yeni kat\u0131lan\u0131n ad\u0131n\u0131 anmak, birinin saatler s\u00FCren eme\u011Fini takdir etmek, \u201Cgeliyorum\u201D deyip s\u00F6z\u00FCnde durmak, denk geldi\u011Finde yay\u0131n\u0131 a\u00E7\u0131p payla\u015Fmak\u2026 hepsi ayn\u0131 k\u00FClt\u00FCr\u00FCn par\u00E7alar\u0131. Kimi g\u00FCn bir tart\u0131\u015Fma \u00E7\u0131kar, kimi g\u00FCn yaln\u0131zca \u201Ciyi geceler\u201D yaz\u0131l\u0131r; ama bir sonraki g\u00FCn yine ayn\u0131 \u00E7a\u011Fr\u0131da bulu\u015Furuz." }), (0, jsx_runtime_1.jsxs)("p", { className: "mb-0", children: ["E\u011Fer arad\u0131\u011F\u0131n \u015Fey sadece bir etiket, bir rozet ya da rastgele bir kalabal\u0131k de\u011Filse; do\u011Fru yerdesin. Burada ba\u015Far\u0131 kibirle de\u011Fil, yard\u0131mla b\u00FCy\u00FCr. Kural basittir:", (0, jsx_runtime_1.jsx)("strong", { className: "text-zinc-100", children: " Sayg\u0131, disiplin, birlik." }), "Bir \u015Fey eksik kald\u0131ysa s\u00F6yler, birlikte tamamlar\u0131z. \u00C7\u00FCnk\u00FC hik\u00E2ye yaz\u0131l\u0131rken herkesin bir sat\u0131r\u0131 vard\u0131r ve belki de seninki,", (0, jsx_runtime_1.jsx)("span", { className: "text-zinc-100", children: " bug\u00FCn burada ba\u015Flar." }), (0, jsx_runtime_1.jsx)("span", { className: "inline-block align-middle ml-1 size-1.5 rounded-full bg-[#8bf0cb] shadow-[0_0_14px_#8bf0cb99] animate-[pulseSoft_2.6s_ease-in-out_infinite]" })] })] })] }), (0, jsx_runtime_1.jsx)("div", { "aria-hidden": true, className: "absolute -left-14 -bottom-16 w-64 h-64 rounded-full blur-3xl opacity-20", style: { background: "radial-gradient(circle, #35b4ff, transparent 60%)" } }), (0, jsx_runtime_1.jsx)("div", { "aria-hidden": true, className: "absolute -right-14 -top-16 w-64 h-64 rounded-full blur-3xl opacity-15", style: { background: "radial-gradient(circle, #ffd144, transparent 60%)" } })] }) })] })), tab === "about" && ((0, jsx_runtime_1.jsxs)("section", { id: "panel-about", role: "tabpanel", "aria-labelledby": "tab-about", className: "max-w-6xl mx-auto rounded-2xl border border-white/10 bg-black/30 backdrop-blur p-6", children: [(0, jsx_runtime_1.jsx)("h2", { className: "text-xl font-semibold mb-2", children: "Hakk\u0131m\u0131zda" }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-6 text-[15px] leading-7 text-zinc-300", children: [(0, jsx_runtime_1.jsx)("section", { className: "rounded-xl border border-white/10 bg-white/5 p-4", children: (0, jsx_runtime_1.jsxs)("p", { children: ["Bazen bir \u201Cg\u00FCnayd\u0131n\u201D ile ba\u015Flar, bazen tek bir c\u00FCmle b\u00FCt\u00FCn g\u00FCn\u00FC toparlar:", " ", (0, jsx_runtime_1.jsx)("strong", { className: "text-zinc-100", children: "\u201CAk\u015Fam 19:30 Discord.\u201D" }), " Kimi g\u00FCn drop kovalarken build\u2019ler tart\u0131\u015F\u0131l\u0131r; kimi g\u00FCn birimizin sevincine ortak olur, kayb\u0131nda omuz veririz. VOITANS\u2019ta bir isimden fazlas\u0131 vard\u0131r: ", (0, jsx_runtime_1.jsx)("span", { className: "text-zinc-100", children: "emek, s\u00F6z ve \u00E7a\u011Fr\u0131ya cevap" }), "."] }) }), (0, jsx_runtime_1.jsxs)("section", { children: [(0, jsx_runtime_1.jsx)("h3", { className: "text-base font-semibold text-zinc-100 mb-1", children: "K\u00FClt\u00FCr" }), (0, jsx_runtime_1.jsxs)("p", { children: ["\u201CHo\u015F geldin\u201D bizde bir buton de\u011Fil, ", (0, jsx_runtime_1.jsx)("span", { className: "text-zinc-100", children: "bir rit\u00FCel" }), ". Yeni kat\u0131lan\u0131n ad\u0131 an\u0131l\u0131r, saatler s\u00FCren emek g\u00F6r\u00FCn\u00FCr k\u0131l\u0131n\u0131r, \u201Cgeliyorum\u201D denildiyse gelinir. Denk gelindi\u011Finde yay\u0131n a\u00E7\u0131l\u0131r, payla\u015F\u0131l\u0131r. ", (0, jsx_runtime_1.jsx)("em", { className: "not-italic text-zinc-200", children: "Kimi g\u00FCn tart\u0131\u015F\u0131r, kimi g\u00FCn yaln\u0131zca \u201Ciyi geceler\u201D yazar\u0131z;" }), " ", "ama ertesi g\u00FCn yine ayn\u0131 \u00E7a\u011Fr\u0131da bulu\u015Furuz."] })] }), (0, jsx_runtime_1.jsxs)("section", { children: [(0, jsx_runtime_1.jsx)("h3", { className: "text-base font-semibold text-zinc-100 mb-1", children: "\u0130lkeler" }), (0, jsx_runtime_1.jsxs)("ul", { className: "list-disc ml-5 space-y-2", children: [(0, jsx_runtime_1.jsxs)("li", { children: [(0, jsx_runtime_1.jsx)("strong", { className: "text-zinc-100", children: "Sayg\u0131" }), ": S\u00F6ze, eme\u011Fe ve zamana sayg\u0131."] }), (0, jsx_runtime_1.jsxs)("li", { children: [(0, jsx_runtime_1.jsx)("strong", { className: "text-zinc-100", children: "Disiplin" }), ": Haz\u0131rl\u0131k bir al\u0131\u015Fkanl\u0131kt\u0131r; plan duvara kaz\u0131n\u0131r."] }), (0, jsx_runtime_1.jsxs)("li", { children: [(0, jsx_runtime_1.jsx)("strong", { className: "text-zinc-100", children: "Birlik" }), ": Kibir de\u011Fil yard\u0131mla b\u00FCy\u00FCr\u00FCz; zaferler payla\u015F\u0131l\u0131r."] })] })] }), (0, jsx_runtime_1.jsxs)("section", { children: [(0, jsx_runtime_1.jsx)("h3", { className: "text-base font-semibold text-zinc-100 mb-1", children: "Arad\u0131\u011F\u0131m\u0131z Oyuncu" }), (0, jsx_runtime_1.jsxs)("p", { children: ["Rozet de\u011Fil, ", (0, jsx_runtime_1.jsx)("span", { className: "text-zinc-100", children: "yol arkada\u015Fl\u0131\u011F\u0131" }), " arayan; saf\u0131n\u0131 s\u00F6zle de\u011Fil ", (0, jsx_runtime_1.jsx)("em", { className: "not-italic text-zinc-200", children: "tutumla" }), " belli eden oyuncular. Haz\u0131rl\u0131\u011F\u0131 nefes almak kadar isteyen; eksik kald\u0131\u011F\u0131nda s\u00F6yleyip birlikte tamamlayan insanlar."] })] }), (0, jsx_runtime_1.jsx)("section", { className: "rounded-xl border border-white/10 bg-white/5 p-4", children: (0, jsx_runtime_1.jsxs)("p", { children: ["E\u011Fer arad\u0131\u011F\u0131n \u015Fey sadece bir etiket ya da rastgele bir kalabal\u0131k de\u011Filse; do\u011Fru yerdesin. VOITANS\u2019ta hik\u00E2ye yaz\u0131l\u0131rken herkesin bir sat\u0131r\u0131 vard\u0131r ve belki de seninki", " ", (0, jsx_runtime_1.jsx)("span", { className: "text-zinc-100", children: "bug\u00FCn burada ba\u015Flar." })] }) })] })] })), tab === "adventures" && ((0, jsx_runtime_1.jsxs)("section", { id: "panel-adventures", role: "tabpanel", "aria-labelledby": "tab-adventures", className: "max-w-6xl mx-auto rounded-2xl border border-white/10 bg-black/30 backdrop-blur p-6", children: [(0, jsx_runtime_1.jsx)("h2", { className: "text-xl font-semibold mb-4", children: "Maceralar\u0131m\u0131z" }), (0, jsx_runtime_1.jsx)(AdventuresTabs_1.default, {})] })), tab === "members" && ((0, jsx_runtime_1.jsx)("section", { id: "panel-members", role: "tabpanel", "aria-labelledby": "", children: (0, jsx_runtime_1.jsx)("div", { className: "max-w-6xl mx-auto", children: (0, jsx_runtime_1.jsx)(MembersSection, {}) }) })), tab === "announcements" && ((0, jsx_runtime_1.jsx)("section", { id: "panel-announcements", role: "tabpanel", "aria-labelledby": "tab-announcements", children: (0, jsx_runtime_1.jsxs)("section", { className: "max-w-6xl mx-auto rounded-2xl border border-white/10 bg-black/30 backdrop-blur p-6", children: [(0, jsx_runtime_1.jsx)("h2", { className: "text-xl font-semibold mb-2", children: "Duyurular" }), (0, jsx_runtime_1.jsx)(Announcements, {})] }) })), tab === "streams" && ((0, jsx_runtime_1.jsxs)("section", { id: "panel-streams", role: "tabpanel", "aria-labelledby": "tab-streams", className: "max-w-6xl mx-auto rounded-2xl border border-white/10 bg-black/30 backdrop-blur p-6", children: [(0, jsx_runtime_1.jsx)("h2", { className: "text-xl font-semibold mb-2", children: "Yay\u0131nlar" }), (0, jsx_runtime_1.jsx)("p", { className: "text-zinc-400", children: "Twitch i\u00E7erikleri g\u00F6r\u00FCn\u00FCmdeyken y\u00FCklenir (lazy)." }), (0, jsx_runtime_1.jsxs)("div", { className: "mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4 items-start", children: [(0, jsx_runtime_1.jsx)("div", { className: "lg:col-span-2", children: (0, jsx_runtime_1.jsx)("div", { className: "relative w-full", style: { aspectRatio: "16 / 9" }, children: (0, jsx_runtime_1.jsx)(LazyTwitch_1.default, { channel: "skipperofleague", title: "Twitch Player", parents: ["thevoitansgithub.vercel.app", "localhost"] }) }) }), (0, jsx_runtime_1.jsxs)("div", { className: "rounded-xl border border-white/10 bg-black/40 overflow-hidden", children: [(0, jsx_runtime_1.jsx)("div", { className: "h-10 flex items-center px-3 text-xs text-zinc-400 border-b border-white/10", children: "Twitch Chat" }), (0, jsx_runtime_1.jsx)("div", { className: "relative w-full", style: { aspectRatio: "9 / 16" }, children: (0, jsx_runtime_1.jsx)(LazyTwitch_1.default, { type: "chat", channel: "skipperofleague", title: "Twitch Chat", parents: ["thevoitansgithub.vercel.app", "localhost"] }) })] })] })] })), tab === "schedule" && ((0, jsx_runtime_1.jsxs)("section", { id: "panel-schedule", role: "tabpanel", "aria-labelledby": "tab-schedule", className: "max-w-6xl mx-auto rounded-2xl border border-white/10 bg-black/30 backdrop-blur p-6", children: [(0, jsx_runtime_1.jsx)("h2", { className: "text-xl font-semibold mb-2", children: "Takvim" }), (0, jsx_runtime_1.jsx)("p", { className: "text-zinc-400", children: "G\u00FCncel raid ve etkinlik program\u0131 (Pzt\u2013Paz, koyu tema)." }), (0, jsx_runtime_1.jsx)(WeeklySchedule, {})] })), tab === "officer" && isSeniorOfficer && ((0, jsx_runtime_1.jsx)("section", { id: "panel-officer", role: "tabpanel", "aria-labelledby": "tab-officer", className: "max-w-6xl mx-auto rounded-2xl border border-amber-400/20 bg-black/30 backdrop-blur p-6", children: (0, jsx_runtime_1.jsx)(OfficerDashboardTabsDynamic, {}) }))] }, tab)] }) }), (0, jsx_runtime_1.jsx)(MottoStyles, {}), (0, jsx_runtime_1.jsx)(StatsStyles, {}), (0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, {}), (0, jsx_runtime_1.jsx)("footer", { className: "mt-2 px-3 pb-1", children: (0, jsx_runtime_1.jsxs)("div", { className: "max-w-6xl mx-auto rounded-2xl border border-white/10 bg-black/30 backdrop-blur p-2.5 sm:p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 relative overflow-hidden", children: [(0, jsx_runtime_1.jsx)("div", { className: "absolute inset-x-0 -top-1 px-3", children: (0, jsx_runtime_1.jsx)("div", { className: "max-w-6xl mx-auto h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" }) }), (0, jsx_runtime_1.jsx)("div", { "aria-hidden": true, className: "pointer-events-none absolute inset-0 overflow-hidden", style: {
                                        WebkitMaskImage: "linear-gradient(to top, transparent, black 55%)",
                                        maskImage: "linear-gradient(to top, transparent, black 55%)",
                                    }, children: (0, jsx_runtime_1.jsx)("div", { className: "absolute inset-x-0 bottom-0 w-full h-[55%]", style: {
                                            background: "radial-gradient(120% 120% at 50% 100%, color-mix(in oklab, var(--accent-pink) 12%, transparent), transparent 60%), radial-gradient(140% 140% at 60% 100%, color-mix(in oklab, var(--accent-cyan) 10%, transparent), transparent 65%)",
                                            filter: "opacity(0.10) blur(0.8px)",
                                        } }) }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-3 relative z-10", children: [(0, jsx_runtime_1.jsx)("span", { className: "size-10 rounded-lg bg-white/5 border border-white/10 grid place-items-center overflow-hidden relative z-20", children: (0, jsx_runtime_1.jsx)("img", { src: "/thevoitanspurple-saturation100.gif", alt: "VOITANS Crest", className: "w-6 h-6 object-contain opacity-90 relative z-30", loading: "lazy", decoding: "async" }) }), (0, jsx_runtime_1.jsxs)("div", { className: "min-w-[180px]", children: [(0, jsx_runtime_1.jsx)("div", { className: "text-zinc-100 text-sm font-medium", children: "THE VOITANS" }), (0, jsx_runtime_1.jsx)("div", { className: "text-zinc-500 text-xs", children: "Prestij, Disiplin, Birlik." })] })] }), (0, jsx_runtime_1.jsx)("div", { className: "flex items-center gap-2 relative z-10", children: (0, jsx_runtime_1.jsx)("a", { href: "https://youtube.com/@thevoitans", className: "rounded-full px-3 py-1.5 text-xs border border-white/10 text-zinc-300 hover:border-white/20", children: "YouTube" }) })] }) })] })] }));
}
/* Officer Dashboard Tabs – Maceralarımız benzeri sekmeli yapı (Duyuru / Loglar) */
const dynamic_1 = __importDefault(require("next/dynamic"));
// OfficerDashboardTabs'ı client-only yapmak SSR'da değişken içerikler (Date, window, require) nedeniyle
// yaşanan hydration farklarını engeller.
const OfficerDashboardTabsDynamic = (0, dynamic_1.default)(() => Promise.resolve(OfficerDashboardTabs), {
    ssr: false,
});
function OfficerDashboardTabs() {
    const [tab, setTab] = (0, react_1.useState)("announce");
    // Görünür hata/teşhis UI state'i (announce tabına özel)
    const [diag, setDiag] = (0, react_1.useState)(null);
    // Announce tab aktif olduğunda küçük bir ping atıp görünür teşhis ver
    (0, react_1.useEffect)(() => {
        let alive = true;
        function diagPing() {
            return __awaiter(this, void 0, void 0, function* () {
                if (tab !== "announce")
                    return;
                try {
                    const r = yield fetch("/api/discord/channels", { cache: "no-store" });
                    if (!alive)
                        return;
                    if (!r.ok) {
                        const t = yield r.text().catch(() => "");
                        setDiag({ msg: `/api/discord/channels -> ${r.status} ${t.slice(0, 140)}` });
                    }
                    else {
                        setDiag(null);
                    }
                }
                catch (e) {
                    if (!alive)
                        return;
                    setDiag({ msg: `channels fetch error: ${(e === null || e === void 0 ? void 0 : e.message) || "unknown"}` });
                }
            });
        }
        diagPing();
        return () => {
            alive = false;
        };
    }, [tab]);
    return ((0, jsx_runtime_1.jsxs)("div", { className: "space-y-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex flex-wrap items-center gap-2", role: "tablist", "aria-label": "Officer sekmeleri", children: [(0, jsx_runtime_1.jsx)("button", { role: "tab", "aria-selected": tab === "announce", onClick: () => setTab("announce"), className: `px-3 py-1.5 text-sm rounded-full border ${tab === "announce" ? "text-white border-white/20 bg-white/5" : "text-zinc-300 border-white/10 hover:border-white/20 hover:bg-white/5"}`, children: "Duyuru" }), (0, jsx_runtime_1.jsx)("button", { role: "tab", "aria-selected": tab === "logs", onClick: () => setTab("logs"), className: `px-3 py-1.5 text-sm rounded-full border ${tab === "logs" ? "text-white border-white/20 bg-white/5" : "text-zinc-300 border-white/10 hover:border-white/20 hover:bg-white/5"}`, children: "Loglar" })] }), tab === "announce" && ((0, jsx_runtime_1.jsxs)("div", { role: "tabpanel", "aria-labelledby": "", children: [(diag === null || diag === void 0 ? void 0 : diag.msg) ? ((0, jsx_runtime_1.jsx)("div", { className: "mb-3 rounded-lg border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-300", children: diag.msg })) : null, (0, jsx_runtime_1.jsx)(OfficerAnnounce, {})] })), tab === "logs" && ((0, jsx_runtime_1.jsx)("div", { role: "tabpanel", "aria-labelledby": "", children: (0, jsx_runtime_1.jsx)(LogsEmbed, {}) }))] }));
}
/* Officer Logs embed – client-only dynamic import KALDIRILDI (tek URL mimarisi) */
function LogsEmbed() {
    return ((0, jsx_runtime_1.jsx)("div", { className: "rounded-2xl border border-white/10 bg-black/30 backdrop-blur p-4 text-sm text-zinc-300", children: "Loglar sekmesi tek URL mimarisine uyarland\u0131. Ak\u0131\u015F: Officer \u2192 Loglar. Buraya inline log aray\u00FCz\u00FC entegre edilecek." }));
}
/* Officer Panel – gerçek React bileşeni (inline) */
function OfficerPanel() {
    var _a, _b, _c;
    const { data: session } = (0, react_2.useSession)();
    const isSeniorOfficer = ((_c = (_b = (_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.guildMember) === null || _b === void 0 ? void 0 : _b.roles) !== null && _c !== void 0 ? _c : []).some((r) => { var _a; return ((_a = r === null || r === void 0 ? void 0 : r.name) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === "senior officer"; });
    // Sadece rol sahibi görür (ek güvenlik)
    if (!isSeniorOfficer)
        return (0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, {});
    // OfficerPanel artık yalnızca “Duyuru Gönder” formunu içerir (iç sekme yok)
    // const [innerTab, setInnerTab] = useState<"announce" | "logs">("announce");
    // Duyuru gönderimi state'leri
    const [channels, setChannels] = (0, react_1.useState)([]);
    const [loadingChannels, setLoadingChannels] = (0, react_1.useState)(true);
    const [submitting, setSubmitting] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const [ok, setOk] = (0, react_1.useState)(false);
    const [form, setForm] = (0, react_1.useState)({ channelId: "", content: "" });
    // const [logFilters, setLogFilters] = useState<...>(...)
    // Kategori -> event adı eşleme (bot tarafı event isimlendirmesini buraya uydurursak server filtrelemeye de eklenebilir)
    const CATEGORY_EVENT_MAP = {
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
    (0, react_1.useEffect)(() => {
        let alive = true;
        function loadChannels() {
            return __awaiter(this, void 0, void 0, function* () {
                setLoadingChannels(true);
                try {
                    const r = yield fetch("/api/discord/channels", { cache: "no-store" });
                    const j = yield r.json().catch(() => ({}));
                    if (!alive)
                        return;
                    setChannels(Array.isArray(j === null || j === void 0 ? void 0 : j.channels) ? j.channels : []);
                }
                catch (_a) {
                    if (!alive)
                        return;
                    setChannels([]);
                }
                finally {
                    if (alive)
                        setLoadingChannels(false);
                }
            });
        }
        loadChannels();
        return () => {
            alive = false;
        };
    }, []);
    // OfficerPanel içindeki eski log çekme kodları tamamen kaldırıldı
    const disabled = submitting || !form.content.trim() || !form.channelId.trim();
    const postAnnouncement = () => __awaiter(this, void 0, void 0, function* () {
        setSubmitting(true);
        setError(null);
        setOk(false);
        try {
            const r = yield fetch("/api/officer/announce", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ channelId: form.channelId, content: form.content }),
            });
            const j = yield r.json().catch(() => ({}));
            if (!r.ok)
                throw new Error((j === null || j === void 0 ? void 0 : j.error) || "Gönderilemedi");
            setOk(true);
            setForm((f) => (Object.assign(Object.assign({}, f), { content: "" })));
        }
        catch (e) {
            setError((e === null || e === void 0 ? void 0 : e.message) || "Gönderim sırasında hata oluştu");
        }
        finally {
            setSubmitting(false);
        }
    });
    return ((0, jsx_runtime_1.jsx)("div", { className: "space-y-3", children: (0, jsx_runtime_1.jsxs)("div", { className: "grid md:grid-cols-2 gap-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "rounded-xl border border-white/10 bg-white/5 p-3", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between mb-2", children: [(0, jsx_runtime_1.jsx)("h3", { className: "text-sm font-semibold text-zinc-100", children: "Kanallar" }), loadingChannels && (0, jsx_runtime_1.jsx)("span", { className: "text-xs text-zinc-400", children: "Y\u00FCkleniyor\u2026" })] }), (0, jsx_runtime_1.jsx)("div", { className: "max-h-72 overflow-auto pr-1", children: !channels.length && !loadingChannels ? ((0, jsx_runtime_1.jsx)("div", { className: "text-xs text-zinc-500", children: "Kanal bulunamad\u0131." })) : ((0, jsx_runtime_1.jsx)("ul", { className: "space-y-1", children: channels.map((c) => ((0, jsx_runtime_1.jsx)("li", { children: (0, jsx_runtime_1.jsxs)("button", { className: `w-full text-left rounded-md border border-white/10 px-2 py-1.5 text-xs hover:border-white/20 ${form.channelId === c.id ? "bg-white/10" : "bg-transparent"}`, onClick: () => setForm((f) => (Object.assign(Object.assign({}, f), { channelId: c.id }))), title: c.id, children: ["#", c.name, " ", c.type === 5 ? "(announcement)" : ""] }) }, c.id))) })) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "rounded-xl border border-white/10 bg-white/5 p-3", children: [(0, jsx_runtime_1.jsx)("h3", { className: "text-sm font-semibold text-zinc-100 mb-2", children: "Duyuru G\u00F6nder" }), (0, jsx_runtime_1.jsxs)("div", { className: "grid gap-1.5", children: [(0, jsx_runtime_1.jsx)("label", { className: "text-sm text-zinc-300", children: "Hedef Kanal" }), (0, jsx_runtime_1.jsxs)("select", { value: form.channelId, onChange: (e) => setForm((f) => (Object.assign(Object.assign({}, f), { channelId: e.target.value }))), className: "rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-white/20", disabled: loadingChannels, children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: loadingChannels ? "Kanallar yükleniyor…" : "Kanal seçin" }), channels.map((c) => ((0, jsx_runtime_1.jsxs)("option", { value: c.id, children: ["#", c.name, " ", c.type === 5 ? "(announcement)" : ""] }, c.id)))] }), (0, jsx_runtime_1.jsx)("label", { className: "text-sm text-zinc-300 mt-2", children: "\u0130\u00E7erik" }), (0, jsx_runtime_1.jsx)("textarea", { value: form.content, onChange: (e) => setForm((f) => (Object.assign(Object.assign({}, f), { content: e.target.value }))), rows: 6, placeholder: "Duyuru i\u00E7eri\u011Fini yaz\u0131n\u2026", className: "rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-white/20" })] }), error && ((0, jsx_runtime_1.jsx)("div", { className: "mt-2 rounded-lg border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-300", children: error })), ok && ((0, jsx_runtime_1.jsx)("div", { className: "mt-2 rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300", children: "Duyuru g\u00F6nderildi." })), (0, jsx_runtime_1.jsx)("div", { className: "mt-3", children: (0, jsx_runtime_1.jsx)("button", { disabled: disabled, onClick: postAnnouncement, className: "rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200 disabled:opacity-50 hover:border-white/20", children: submitting ? "Gönderiliyor…" : "Duyuruyu Gönder" }) })] })] }) }));
}
