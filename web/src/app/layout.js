"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.default = RootLayout;
const jsx_runtime_1 = require("react/jsx-runtime");
const google_1 = require("next/font/google");
require("./globals.css");
const cinzel = (0, google_1.Cinzel)({
    variable: "--font-cinzel",
    subsets: ["latin"],
    weight: ["400", "600", "700", "900"],
    display: "swap",
});
const inter = (0, google_1.Inter)({
    variable: "--font-inter",
    subsets: ["latin"],
    display: "swap",
});
/* Display ve Mono fontlar (tasarım rehberi) */
const sora = (0, google_1.Sora)({
    variable: "--font-display",
    subsets: ["latin"],
    weight: ["400", "500", "600", "700", "800"],
    display: "swap",
});
const jetbrains = (0, google_1.JetBrains_Mono)({
    variable: "--font-mono",
    subsets: ["latin"],
    weight: ["400", "600", "700"],
    display: "swap",
});
const unifraktur = (0, google_1.UnifrakturMaguntia)({
    variable: "--font-unifraktur",
    weight: "400",
    subsets: ["latin"],
    display: "swap",
});
const orbitron = (0, google_1.Orbitron)({
    variable: "--font-orbitron",
    subsets: ["latin"],
    weight: ["400", "500", "600", "700", "800", "900"],
    display: "swap",
});
const anton = (0, google_1.Anton)({
    variable: "--font-anton",
    subsets: ["latin"],
    weight: "400",
    display: "swap",
});
// Kullanıcının istediği "Zinc" benzeri sans için Zen Dots'u başlıkta kullanacağız
const zenDots = (0, google_1.Zen_Dots)({
    variable: "--font-zinc",
    subsets: ["latin"],
    weight: "400",
    display: "swap",
});
exports.metadata = {
    title: "THE VOITANS — Forge Your Legend",
    description: "Ultra modern, luxurious dark guild site for THE VOITANS. PvP & PvE excellence. Join and forge your legend.",
    // NOTE: Use env or fallback to current dev port (3031) to prevent mixed origins during dev.
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3031"),
    openGraph: {
        title: "THE VOITANS — Forge Your Legend",
        description: "Ultra modern, luxurious dark guild site for THE VOITANS. PvP & PvE excellence.",
        url: "/",
        siteName: "THE VOITANS",
        images: [{ url: "/og-voitans.png", width: 1200, height: 630 }],
        type: "website",
    },
    icons: { icon: "/favicon.ico" },
};
const dynamic_1 = __importDefault(require("next/dynamic"));
// Server Component içinde ssr:false kullanılamaz; bu nedenle sadece dynamic import kullanıp
// ssr bayrağını kaldırıyoruz. LayoutClientShell zaten "use client" içerir.
const ClientShell = (0, dynamic_1.default)(() => import("../components/LayoutClientShell"));
function RootLayout({ children, }) {
    // Hydration stabilitesi:
    // - className sabit string olarak serverda hesaplanır.
    // - cz-shortcut-listen vb. 3rd-party eklenti attribute farkları için suppressHydrationWarning html seviyesinde zaten aktif.
    const bodyClass = `${cinzel.variable} ${inter.variable} ${unifraktur.variable} ${orbitron.variable} ${anton.variable} ${zenDots.variable} ${sora.variable} ${jetbrains.variable} antialiased ` +
        `text-[color:var(--fg)]`;
    return ((0, jsx_runtime_1.jsx)("html", { lang: "tr", suppressHydrationWarning: true, children: (0, jsx_runtime_1.jsxs)("body", { className: bodyClass, suppressHydrationWarning: true, children: [(0, jsx_runtime_1.jsxs)("div", { "aria-hidden": true, className: "fixed inset-0 pointer-events-none z-0 overflow-hidden", children: [(0, jsx_runtime_1.jsx)("div", { className: "absolute inset-0 grid place-items-center", style: { pointerEvents: "none" }, children: (0, jsx_runtime_1.jsx)("img", { src: "/thevoitanspurple-saturation100.gif", alt: "", style: {
                                    width: "min(60vmin, 560px)",
                                    height: "auto",
                                    opacity: 0.22,
                                    imageRendering: "crisp-edges",
                                    filter: "saturate(1) contrast(1.05) brightness(1.05)",
                                    pointerEvents: "none",
                                } }) }), (0, jsx_runtime_1.jsx)("div", { style: {
                                position: "absolute",
                                inset: "-10%",
                                pointerEvents: "none",
                                mixBlendMode: "normal",
                                background: "radial-gradient(60% 60% at 50% 40%, rgba(80,80,120,0.20), transparent 65%)," +
                                    "radial-gradient(80% 80% at 50% 80%, rgba(0,0,0,0.45), transparent 60%)," +
                                    "linear-gradient(to bottom, rgba(0,0,0,0.35), rgba(0,0,0,0.60))",
                            } })] }), (0, jsx_runtime_1.jsx)("script", { dangerouslySetInnerHTML: {
                        __html: `(function(){
  try {
    var b = document.body;
    if(!b) return;
    var allowed = new Set(["class","style"]); // sadece class ve style'a izin
    // cz-shortcut-listen gibi beklenmeyen attr'ları kaldır
    Array.from(b.attributes).forEach(function(attr){
      if(!allowed.has(attr.name)) {
        try { b.removeAttribute(attr.name); } catch(e){}
      }
    });
  } catch(e){}
})();`
                    } }), (0, jsx_runtime_1.jsx)(ClientShell, { children: children })] }) }));
}
