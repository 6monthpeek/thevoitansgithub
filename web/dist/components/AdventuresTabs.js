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
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AdventuresTabs;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const tabs = [
    { id: "aoc", label: "Ashes of Creation", subtitle: "Guild odaklı epik hazırlık" },
    { id: "bdo", label: "Black Desert Online", subtitle: "Ekonomi, node savaşları, boss rotaları" },
    { id: "nw", label: "New World", subtitle: "Savaş, bölge hakimiyeti ve crafting düzeni" },
];
function AdventuresTabs() {
    const [active, setActive] = (0, react_1.useState)("aoc");
    return ((0, jsx_runtime_1.jsxs)("div", { className: "space-y-4", children: [(0, jsx_runtime_1.jsx)("div", { className: "flex flex-wrap items-center gap-2", role: "tablist", "aria-label": "Maceralar\u0131m\u0131z sekmeleri", children: tabs.map((t) => {
                    const selected = active === t.id;
                    return ((0, jsx_runtime_1.jsx)("button", { role: "tab", "aria-selected": selected, "aria-controls": `adv-panel-${t.id}`, id: `adv-tab-${t.id}`, onClick: () => setActive(t.id), className: `px-4 py-2 text-sm rounded-full border transition-all ${selected
                            ? "text-white border-white/20 bg-white/5 shadow-[0_8px_20px_rgba(0,0,0,.25)]"
                            : "text-zinc-300 border-white/10 hover:border-white/20 hover:bg-white/5"}`, children: t.label }, t.id));
                }) }), (0, jsx_runtime_1.jsxs)("div", { className: "rounded-2xl border border-white/10 bg-black/30 backdrop-blur p-6", children: [active === "aoc" && (0, jsx_runtime_1.jsx)(AOCPanel, {}), active === "bdo" && (0, jsx_runtime_1.jsx)(BDOPanel, {}), active === "nw" && (0, jsx_runtime_1.jsx)(NWPanel, {})] })] }));
}
function Section({ title, children }) {
    return ((0, jsx_runtime_1.jsxs)("section", { className: "space-y-2", children: [(0, jsx_runtime_1.jsx)("h3", { className: "text-base font-semibold text-zinc-100", children: title }), (0, jsx_runtime_1.jsx)("div", { className: "text-sm text-zinc-400", children: children })] }));
}
function useAOCMedia() {
    const [items, setItems] = (0, react_1.useState)([]);
    (0, react_1.useEffect)(() => {
        let alive = true;
        // Dinamik import: build’a dahil etmeyelim, yalnızca client’ta yükleyelim
        (() => __awaiter(this, void 0, void 0, function* () {
            try {
                const res = yield fetch("/aoc-channel.json").catch(() => null);
                // Public’te yoksa, çalışma klasöründeki output yolunu deneyelim (dev ortamında static serve edilmeyebilir)
                let json = null;
                if (res && res.ok) {
                    json = yield res.json();
                }
                else {
                    // fallback: relative fetch denemesi (başarısız olabilir)
                    const r2 = yield fetch("/output/aoc-channel.json").catch(() => null);
                    if (r2 && r2.ok)
                        json = yield r2.json();
                }
                if (!json)
                    return;
                const messages = json.messages || [];
                const collected = [];
                for (const m of messages) {
                    const atts = m.attachments || [];
                    for (const a of atts) {
                        const ext = (a.filename || "").toLowerCase();
                        const isImg = /\.(png|jpg|jpeg|webp|gif)$/i.test(ext) || (a.content_type || "").startsWith("image/");
                        const isVid = /\.(mp4|webm|mov)$/i.test(ext) || (a.content_type || "").startsWith("video/");
                        if (isImg) {
                            collected.push({
                                id: `${m.id}-${a.id}`,
                                type: "image",
                                url: a.url,
                                localPath: a.localPath ? `/aoc-attachments/${a.localPath.split("/").pop()}` : undefined,
                                filename: a.filename,
                                timestamp: m.timestamp,
                            });
                        }
                        else if (isVid) {
                            collected.push({
                                id: `${m.id}-${a.id}`,
                                type: "video",
                                url: a.url,
                                localPath: a.localPath ? `/aoc-attachments/${a.localPath.split("/").pop()}` : undefined,
                                filename: a.filename,
                                timestamp: m.timestamp,
                            });
                        }
                    }
                }
                // Yeni -> eski sıralama
                collected.sort((a, b) => (b.timestamp || "").localeCompare(a.timestamp || ""));
                if (alive)
                    setItems(collected);
            }
            catch (_a) { }
        }))();
        return () => {
            alive = false;
        };
    }, []);
    return items;
}
function MediaThumb({ it }) {
    const src = it.localPath || it.url;
    if (it.type === "video") {
        return ((0, jsx_runtime_1.jsx)("div", { className: "rounded-xl overflow-hidden border border-white/10 bg-black/30", children: (0, jsx_runtime_1.jsx)("video", { src: src, controls: true, preload: "none", className: "w-full h-full object-cover", style: { aspectRatio: "16 / 9" } }) }));
    }
    return ((0, jsx_runtime_1.jsx)("div", { className: "rounded-xl overflow-hidden border border-white/10 bg-black/30", children: (0, jsx_runtime_1.jsx)("img", { src: src, alt: it.filename || "AOC media", loading: "lazy", className: "w-full h-full object-cover", style: { aspectRatio: "16 / 9" } }) }));
}
function AOCPanel() {
    const media = useAOCMedia();
    const [limit, setLimit] = (0, react_1.useState)(12);
    const hasMore = media.length > limit;
    const featured = media[0];
    const grid = media.slice(1, limit);
    return ((0, jsx_runtime_1.jsxs)("div", { id: "adv-panel-aoc", role: "tabpanel", "aria-labelledby": "adv-tab-aoc", className: "space-y-6", children: [(0, jsx_runtime_1.jsxs)("header", { className: "flex items-start gap-4", children: [(0, jsx_runtime_1.jsx)("div", { className: "size-12 rounded-xl bg-white/5 border border-white/10 grid place-items-center overflow-hidden", children: (0, jsx_runtime_1.jsx)("img", { src: "/voitans-logo.svg", alt: "VOITANS Crest", className: "w-7 h-7 object-contain opacity-90" }) }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h2", { className: "text-lg font-semibold text-zinc-100", children: "Ashes of Creation" }), (0, jsx_runtime_1.jsx)("p", { className: "text-zinc-400 text-sm", children: "MMORPG\u2019lere d\u00F6n\u00FC\u015F yolculu\u011Fu \u2013 lonca merkezli, riskli ve anlaml\u0131 sava\u015Flara \u00F6zlem." })] })] }), featured && ((0, jsx_runtime_1.jsx)("div", { className: "rounded-2xl border border-white/10 bg-black/30 p-3", children: (0, jsx_runtime_1.jsx)(MediaThumb, { it: featured }) })), (0, jsx_runtime_1.jsxs)("div", { className: "grid lg:grid-cols-3 gap-6", children: [(0, jsx_runtime_1.jsxs)("article", { className: "lg:col-span-2 rounded-2xl border border-white/10 bg-black/30 p-5 leading-7 text-[15px] text-zinc-300", children: [(0, jsx_runtime_1.jsx)("h3", { className: "font-semibold text-zinc-100 text-base mb-2", children: "Y\u0131llar Ge\u00E7ti\u2026" }), (0, jsx_runtime_1.jsx)("p", { className: "mb-3", children: "Ne kadar oyun oynad\u0131k bilmiyorum. Baz\u0131lar\u0131 bir heves s\u00FCrd\u00FC, baz\u0131lar\u0131 bir \u00F6m\u00FCr gibi\u2026 Ama baz\u0131lar\u0131 vard\u0131 ki\u2026 dokundu. Ger\u00E7ekmi\u015F gibi. \u0130\u00E7indeymi\u015Fiz gibi. Ve biz\u2026 biz o d\u00FCnyalar\u0131n bir par\u00E7as\u0131 olduk." }), (0, jsx_runtime_1.jsx)("p", { className: "mb-3", children: "Kimi h\u00E2l\u00E2 orada; h\u00E2l\u00E2 bir karakterin i\u00E7inde nefes al\u0131yor, sava\u015F\u0131yor. Kimi \u00E7oktan silinmi\u015F, ama silinememi\u015F. \u00C7\u00FCnk\u00FC baz\u0131 karakterler oyunda \u00F6l\u00FCr, ama bizde ya\u015Famaya devam eder. Sonra fark edersin: O karakter hep sendi. Biz ka\u00E7mad\u0131k\u2026 sadece sistem kapand\u0131. Ama i\u00E7imizde bir d\u00FCnya h\u00E2l\u00E2 a\u00E7\u0131k kald\u0131." }), (0, jsx_runtime_1.jsx)("h3", { className: "font-semibold text-zinc-100 text-base mt-5 mb-2", children: "Neden H\u00E2l\u00E2 \u00D6zl\u00FCyoruz?" }), (0, jsx_runtime_1.jsx)("p", { className: "mb-3", children: "Belki de bu d\u00FCnyada tutunacak bir yer bulamad\u0131\u011F\u0131m\u0131zda, ba\u015Fka bir evren ar\u0131yoruz. Bir kamp ate\u015Fi etraf\u0131nda yeniden toplanmak, tan\u0131mad\u0131\u011F\u0131n biriyle yan yana sava\u015F\u0131p ad\u0131n\u0131 hi\u00E7 unutmamak istiyoruz." }), (0, jsx_runtime_1.jsx)("p", { className: "mb-3", children: "Benim i\u00E7in MMORPG\u2019ler yaln\u0131zca vakit ge\u00E7irmek olmad\u0131. Orada olmak bir \u015Feydi: bir ama\u00E7 i\u00E7in, bir ekip i\u00E7in, bazen sadece kendin i\u00E7in m\u00FCcadele etmek. Yaln\u0131z ba\u015Flars\u0131n; sonra bir bakm\u0131\u015Fs\u0131n bir grubun i\u00E7indesin. Beraber kasars\u0131n, beraber d\u00FC\u015Fersin\u2026 sonra tekrar denersin." }), (0, jsx_runtime_1.jsx)("p", { className: "mb-3", children: "Boss\u2019lar \u00F6\u011Fretir; ama beni i\u00E7ine \u00E7eken PvP\u2019dir: Kalabal\u0131k meydanlarda y\u00FCzlerce ki\u015Finin \u00E7arp\u0131\u015Ft\u0131\u011F\u0131 anlar\u2026 Orada sadece refleks de\u011Fil, ruh da devreye girer. Bir ad\u0131m geri \u00E7ekilsen tak\u0131m\u0131n da\u011F\u0131l\u0131r, bir ad\u0131m ileri atsan herkesin kaderi de\u011Fi\u015Fir. Do\u011Fru zamanda do\u011Fru ad\u0131m \u2013 i\u015Fte o an, ger\u00E7ekten \u00F6nemlisin." }), (0, jsx_runtime_1.jsx)("h3", { className: "font-semibold text-zinc-100 text-base mt-5 mb-2", children: "Ne De\u011Fi\u015Fti?" }), (0, jsx_runtime_1.jsx)("p", { className: "mb-3", children: "Yeni \u00E7\u0131kan MMORPG\u2019ler \u00E7o\u011Fu zaman eskisinin izini s\u00FCrmekten \u00F6teye ge\u00E7emedi. Grafikler g\u00FCzelle\u015Firken ruh kayboldu; yap\u0131mc\u0131lar oyuncuyu de\u011Fil algoritmay\u0131 d\u00FC\u015F\u00FCnd\u00FC. G\u00F6steri\u015Fli ama risksiz sava\u015Flar, pay-to-win ya da say\u0131 k\u0131yas\u0131na d\u00F6nen PvP\u2019ler\u2026 \u201CD\u00FCnya b\u00FCy\u00FCk\u201D dediler, i\u00E7i bo\u015F kald\u0131. Guild sistemleri vard\u0131 ama herkes yaln\u0131zd\u0131." }), (0, jsx_runtime_1.jsx)("p", { className: "mb-3", children: "G\u00F6rev listesi gibi oyunlar: \u201CGit-kes-getir-ver\u201D d\u00F6ng\u00FCs\u00FCnde anlam yitip gitti. Ba\u015Farman\u0131n yerine \u201Cbitirme\u201D kondu. Bekledik; \u00E7\u0131kt\u0131\u011F\u0131nda iki hafta sonra sildi\u011Fimiz oyunlar oldular." }), (0, jsx_runtime_1.jsx)("h3", { className: "font-semibold text-zinc-100 text-base mt-5 mb-2", children: "Ashes of Creation Neden?" }), (0, jsx_runtime_1.jsx)("p", { className: "mb-0", children: "Ashes of Creation, o \u00F6zlemle yap\u0131lm\u0131\u015F gibi. \u201CBen de oyuncuyum\u201D diyen biri taraf\u0131ndan yaz\u0131lm\u0131\u015F gibi. Bu kez bir \u015Firket de\u011Fil, bizim gibiler yap\u0131yormu\u015F gibi hissettiriyor. Bu y\u00FCzden \u00F6nem veriyoruz. \u00C7\u00FCnk\u00FC bu kez ger\u00E7ekten eve d\u00F6n\u00FCyor olabiliriz." })] }), (0, jsx_runtime_1.jsxs)("aside", { className: "space-y-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "rounded-xl border border-white/10 bg-white/5 p-4", children: [(0, jsx_runtime_1.jsx)("h4", { className: "text-sm font-semibold text-zinc-100", children: "VOITANS AOC Yakla\u015F\u0131m\u0131" }), (0, jsx_runtime_1.jsxs)("ul", { className: "mt-2 text-[13px] text-zinc-300 space-y-1.5", children: [(0, jsx_runtime_1.jsx)("li", { children: "\u2022 Uzun soluklu, lonca merkezli plan" }), (0, jsx_runtime_1.jsx)("li", { children: "\u2022 Risk-getiri dengesi: ger\u00E7ek kay\u0131p, ger\u00E7ek zafer" }), (0, jsx_runtime_1.jsx)("li", { children: "\u2022 Net rol da\u011F\u0131l\u0131m\u0131 ve disiplinli PvP" }), (0, jsx_runtime_1.jsx)("li", { children: "\u2022 Ekonomi ve lojistik omurgas\u0131" })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "rounded-xl border border-white/10 bg-white/5 p-4", children: [(0, jsx_runtime_1.jsx)("h4", { className: "text-sm font-semibold text-zinc-100", children: "Bizi \u00C7eken \u00D6z" }), (0, jsx_runtime_1.jsxs)("ul", { className: "mt-2 text-[13px] text-zinc-300 space-y-1.5", children: [(0, jsx_runtime_1.jsx)("li", { children: "\u2022 Oyuncu merkezli tasar\u0131m" }), (0, jsx_runtime_1.jsx)("li", { children: "\u2022 Anlaml\u0131 d\u00FCnya ve guild etkisi" }), (0, jsx_runtime_1.jsx)("li", { children: "\u2022 G\u00F6steriden \u00E7ok strateji ve emek" })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "rounded-xl border border-white/10 bg-white/5 p-4", children: [(0, jsx_runtime_1.jsx)("h4", { className: "text-sm font-semibold text-zinc-100", children: "Hedef" }), (0, jsx_runtime_1.jsx)("p", { className: "mt-1 text-[13px] text-zinc-300", children: "\u201CS\u0131radaki MMO\u201D de\u011Fil; \u201Ceve d\u00F6n\u00FC\u015F\u201D. Hat\u0131rlad\u0131\u011F\u0131m\u0131z o duyguyu yeniden bulmak." })] })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-3", children: [(0, jsx_runtime_1.jsx)("h3", { className: "text-sm font-semibold text-zinc-100", children: "AOC Medya Ar\u015Fivi" }), (0, jsx_runtime_1.jsx)("div", { className: "grid sm:grid-cols-2 lg:grid-cols-3 gap-4", children: grid.map((it) => ((0, jsx_runtime_1.jsx)(MediaThumb, { it: it }, it.id))) }), hasMore && ((0, jsx_runtime_1.jsx)("div", { className: "flex justify-center", children: (0, jsx_runtime_1.jsx)("button", { className: "rounded-full px-4 py-2 text-sm border border-white/10 text-zinc-200 hover:border-white/20 hover:bg-white/5", onClick: () => setLimit((n) => n + 12), children: "Daha Fazla" }) }))] })] }));
}
/* Medya tipleri ve bileşenleri kaldırıldı */
function formatMonth(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString("tr-TR", { year: "numeric", month: "long" });
}
function formatShort(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString("tr-TR", { month: "short", day: "2-digit" }) + " " + d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}
function useBdoData() {
    const [merged, setMerged] = (0, react_1.useState)([]);
    (0, react_1.useEffect)(() => {
        let alive = true;
        (() => __awaiter(this, void 0, void 0, function* () {
            try {
                const mj = yield fetch("/bdo-merged.json", { cache: "no-store" })
                    .then(r => r.ok ? r.json() : null)
                    .catch(() => null);
                if (!alive)
                    return;
                if (mj === null || mj === void 0 ? void 0 : mj.messages)
                    setMerged(mj.messages);
            }
            catch (_a) { }
        }))();
        return () => { alive = false; };
    }, []);
    return { merged };
}
/* Medya thumb kaldırıldı */
function pickHighlights(messages, max = 6) {
    // Basit kriter: medyası olan/uzun içerikli mesajlardan seç
    const scored = messages.map(m => {
        const hasMedia = (m.attachments || []).length > 0;
        const len = (m.content || "").length;
        const score = (hasMedia ? 2 : 0) + Math.min(1, len / 180);
        return { m, score };
    }).sort((a, b) => b.score - a.score);
    return scored.slice(0, max).map(s => s.m);
}
function groupByMonth(messages) {
    const map = new Map();
    for (const m of messages) {
        if (!m.timestamp)
            continue;
        const key = m.timestamp.slice(0, 7); // YYYY-MM
        if (!map.has(key))
            map.set(key, []);
        map.get(key).push(m);
    }
    // Eski -> yeni
    for (const [k, arr] of map)
        arr.sort((a, b) => (a.timestamp || "").localeCompare(b.timestamp || ""));
    const keys = Array.from(map.keys()).sort((a, b) => a.localeCompare(b));
    return keys.map(k => ({ key: k, title: formatMonth(k + "-01"), items: map.get(k) }));
}
function BDOPanel() {
    // Medya ve filtre KALDIRILDI (istek üzerine)
    const { merged } = useBdoData();
    // BDO odaklı anlatım bloğu (küratörlü metin) + kritik savaş videosu
    const story = ((0, jsx_runtime_1.jsxs)("section", { className: "rounded-2xl border border-white/10 bg-black/30 p-5 leading-7 text-[15px] text-zinc-300 space-y-4", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h3", { className: "text-base font-semibold text-zinc-100 mb-2", children: "2017 \u2014 Ba\u015Flang\u0131\u00E7" }), (0, jsx_runtime_1.jsx)("p", { className: "mb-3", children: "\u0130lk ad\u0131mlar\u2026 Hen\u00FCz sahnenin \u0131\u015F\u0131klar\u0131 s\u00F6nmemi\u015Fti. Bir d\u00FCnyaya girdik ve geri d\u00F6nmek gibi bir niyetimiz yoktu. Zamanla \u201Cbiz\u201D olduk; tek tek oyunculardan, omuz omuza duran bir toplulu\u011Fa d\u00F6n\u00FC\u015Ft\u00FCk." }), (0, jsx_runtime_1.jsx)("h3", { className: "text-base font-semibold text-zinc-100 mt-4 mb-2", children: "Kamasylvia D\u00F6nemi \u2014 Miru, OldmanClub" }), (0, jsx_runtime_1.jsx)("p", { className: "mb-3", children: "Kamasylvia geni\u015Flemesiyle birlikte Miru\u2019da \u00E7ok say\u0131da TF ya\u015Fad\u0131k. OldmanClub b\u00FCnyesinde \u00E7arp\u0131\u015Ft\u0131k, \u00F6\u011Frendik, al\u0131\u015Ft\u0131k, d\u00FC\u015Ft\u00FCk ve aya\u011Fa kalkt\u0131k. Haritan\u0131n damarlar\u0131n\u0131, taktiklerin ritmini ezberledik." }), (0, jsx_runtime_1.jsx)("h3", { className: "text-base font-semibold text-zinc-100 mt-4 mb-2", children: "2023 \u2014 WillOfFire ile D\u00F6n\u00FC\u015F" }), (0, jsx_runtime_1.jsx)("p", { className: "mb-0", children: "Geri d\u00F6nd\u00FC\u011F\u00FCm\u00FCzde bir isim se\u00E7tik: WillOfFire. Ate\u015Fin iradesini g\u00F6stermek i\u00E7in dezavantajl\u0131 sava\u015Flar\u0131 \u00F6zellikle se\u00E7tik; k\u0131sa yolu de\u011Fil, zoru tercih ettik. \u0130ttifak tekliflerini reddettik; \u00E7\u00FCnk\u00FC kimsenin g\u00FCc\u00FCne ihtiyac\u0131m\u0131z yoktu. Biz sahada yaz\u0131lan hik\u00E2yeye inand\u0131k ve bu hik\u00E2ye m\u00FCcadeleyle b\u00FCy\u00FCd\u00FC." })] }), (0, jsx_runtime_1.jsxs)("div", { className: "rounded-xl border border-white/10 bg-white/5 p-3", children: [(0, jsx_runtime_1.jsx)("div", { className: "text-xs text-zinc-400 mb-2", children: "\u00D6nemli Sava\u015F \u2014 Zafer Kayd\u0131" }), (0, jsx_runtime_1.jsx)("video", { src: "/bdo-attachments/ArcherBDO1.mp4", controls: true, preload: "metadata", 
                        // Poster yok: siyah placeholder still ile
                        className: "w-full h-full object-cover rounded-lg bg-black", style: { aspectRatio: "16 / 9" }, controlsList: "nodownload noplaybackrate" })] })] }));
    // Öne çıkanlar ve kronoloji kaldırıldı
    return ((0, jsx_runtime_1.jsxs)("div", { id: "adv-panel-bdo", role: "tabpanel", "aria-labelledby": "adv-tab-bdo", className: "space-y-6 [contain:content]", style: { contentVisibility: "auto" }, children: [(0, jsx_runtime_1.jsxs)("header", { className: "flex items-start gap-4", children: [(0, jsx_runtime_1.jsx)("div", { className: "size-12 rounded-xl bg-white/5 border border-white/10 grid place-items-center overflow-hidden", children: (0, jsx_runtime_1.jsx)("img", { src: "/voitans-logo.svg", alt: "VOITANS Crest", className: "w-7 h-7 object-contain opacity-90" }) }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h2", { className: "text-lg font-semibold text-zinc-100", children: "Black Desert Online" }), (0, jsx_runtime_1.jsx)("p", { className: "text-zinc-400 text-sm", children: "2017\u2019den WillOfFire\u2019a uzanan yol: sahada yaz\u0131lan hik\u00E2ye." })] })] }), (0, jsx_runtime_1.jsx)("div", { className: "grid lg:grid-cols-1 gap-6", children: (0, jsx_runtime_1.jsx)("div", { className: "lg:col-span-1", children: story }) })] }));
}
/* 3) New World */
function NWPanel() {
    return ((0, jsx_runtime_1.jsxs)("div", { id: "adv-panel-nw", role: "tabpanel", "aria-labelledby": "adv-tab-nw", className: "space-y-5", children: [(0, jsx_runtime_1.jsxs)("header", { className: "flex items-start gap-4", children: [(0, jsx_runtime_1.jsx)("div", { className: "size-12 rounded-xl bg-white/5 border border-white/10 grid place-items-center overflow-hidden", children: (0, jsx_runtime_1.jsx)("img", { src: "/voitans-logo.svg", alt: "VOITANS Crest", className: "w-7 h-7 object-contain opacity-90" }) }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h2", { className: "text-lg font-semibold text-zinc-100", children: "New World" }), (0, jsx_runtime_1.jsx)("p", { className: "text-zinc-400 text-sm", children: "B\u00F6lge savunmas\u0131, sava\u015F d\u00FCzeni ve crafting omurgas\u0131." })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "grid md:grid-cols-2 gap-6", children: [(0, jsx_runtime_1.jsxs)(Section, { title: "Sava\u015F D\u00FCzeni", children: ["- Roller: frontline, bruiser, ranged, healer", (0, jsx_runtime_1.jsx)("br", {}), "- \u00C7a\u011Fr\u0131 ve rotasyon planlar\u0131", (0, jsx_runtime_1.jsx)("br", {}), "- Siege ve savunma da\u011F\u0131l\u0131m\u0131"] }), (0, jsx_runtime_1.jsxs)(Section, { title: "\u00DCretim ve Lojistik", children: ["- Crafting/rafting plan\u0131 ve depo y\u00F6netimi", (0, jsx_runtime_1.jsx)("br", {}), "- Toplu kaynak temini ve da\u011F\u0131t\u0131m", (0, jsx_runtime_1.jsx)("br", {}), "- Ekipman bak\u0131m\u0131 ve tamir protokolleri"] }), (0, jsx_runtime_1.jsx)(Section, { title: "G\u00FCnl\u00FCk Ak\u0131\u015F", children: "G\u00F6rev, dungeon ve etkinlik rotalar\u0131 ile haftal\u0131k plan." }), (0, jsx_runtime_1.jsx)(Section, { title: "Hedef", children: "B\u00F6lge y\u00F6netiminde s\u00FCreklilik, war performans\u0131nda istikrar ve ekonomik g\u00FC\u00E7." })] })] }));
}
